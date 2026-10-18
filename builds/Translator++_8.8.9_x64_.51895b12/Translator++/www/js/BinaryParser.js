const path = require('path');
const fs = require('fs').promises;

const bufferUtil = {};
bufferUtil.getBufferAt = function(buffer, offset, length) {
    // if zero length, return empty buffer
    if (length === 0) return Buffer.alloc(0);
    buffer = Buffer.from(buffer); // Ensure buffer is a Buffer object

    if (offset < 0 || offset >= buffer.length) {
        throw new Error('Invalid offset value.');
    }

    if (length <= 0 || offset + length > buffer.length) {
        throw new Error('Invalid length value. Offset: ' + offset + ', Length: ' + length + ', Buffer length: ' + buffer.length);
    }

    // Create a new buffer to hold the extracted data
    const extractedBuffer = Buffer.alloc(length);
    buffer.copy(extractedBuffer, 0, offset, offset + length);

    return extractedBuffer;
}

bufferUtil.createInt32LE = function(value) {
    const buffer = Buffer.alloc(4);
    buffer.writeInt32LE(value);
    return buffer;
}

class BinaryParser {
    constructor(filePath) {
        this.filePath = filePath;
        this.data = null;
        this.offset = 0;
        // holds chunks of buffer
        this.chunks = [];
        this.chunkInfo = [];
        this.translatable = []; // holds translatable strings with the offset information

        this.skipRegister = false;
        this.currentLabel = null;
    }

    setLabel(label) {
        this.currentLabel = label;
    }

    /**
     * Register a chunk of buffer from the current offset upto the specified size.
     * @param {number} length - The size of the chunk to register.
     * @returns {Object} - The chunk information
     */
    registerBy(length) {
        if (this.skipRegister) return;
        const chunkInfo = {
            offset: this.offset,
            length: length
        };
        if (this.currentLabel) {
            chunkInfo.label = this.currentLabel;
            this.currentLabel = null;
        }
        let newLen = this.chunkInfo.push(chunkInfo);
        chunkInfo.index = newLen - 1;
        this.chunks.push(bufferUtil.getBufferAt(this.data, this.offset, length));
        this.offset += length;

        return chunkInfo;
    }

    registerTranslatable(length) {
        const chunkInfo = this.registerBy(length);
        this.translatable.push(chunkInfo);
        return chunkInfo;
    }

    readInt8() {
        const value = this.data.readInt8(this.offset);
        this.registerBy(1);
        return value;
    }

    readInt16LE() {
        const value = this.data.readInt16LE(this.offset);
        this.registerBy(2);
        return value;
    }

    readInt16BE() {
        const value = this.data.readInt16BE(this.offset);
        this.registerBy(2);
        return value;
    }

    readInt32LE() {
        const value = this.data.readInt32LE(this.offset);
        this.registerBy(4);
        return value;
    }

    readInt32BE() {
        const value = this.data.readInt32BE(this.offset);
        this.registerBy(4);
        return value;
    }


    readString(length, encoding = 'utf8') {
        const str = this.data.toString(encoding, this.offset, this.offset + length);
        this.registerBy(length);
        return str;
    }

    readBufferBy(length) {
        const buffer = bufferUtil.getBufferAt(this.data, this.offset, length);
        this.registerBy(length);
        return buffer;
    }

    mock() {
        this.skipRegister = true;
    }

    unmock() {
        this.skipRegister = false;
    }

    replaceChunk(chunkIndex, buffer) {
        this.chunks[chunkIndex] = buffer;
        // update the chunk info
        this.chunkInfo[chunkIndex].length = buffer.length;

        // update the following chunkInfo offsets
        for (let i = chunkIndex + 1; i < this.chunkInfo.length; i++) {
            this.chunkInfo[i].offset = this.chunkInfo[i - 1].offset + this.chunkInfo[i - 1].length;
        }
    }

    getChunkByIndex(index) {
        return this.chunks[index];
    }

    getLastChunkIndex() {
        return this.chunks.length - 1;
    }

    getLastBuffer() {
        return this.chunks[this.getLastChunkIndex()];
    }

    /**
     * Search the specified buffer.
     * move the offset to the start of the first found buffer.
     * Return true if found, false otherwise.
     * @param {Buffer} buffer - The buffer to search.
     * @returns {boolean} - True if found, false otherwise.
     */
    seek(buffer) {
        let index = this.data.indexOf(buffer, this.offset);
        if (index === -1) return false;
        // register the buffer from the previous offset upto the found index
        this.registerBy(index - this.offset);
        this.offset = index;
        return true;
    }

    rollBack(numberOfRegisters = 1) {
        if (this.chunkInfo.length < numberOfRegisters) {
            throw new Error('Cannot roll back beyond the first register');
        }
        this.offset = this.chunkInfo[this.chunkInfo.length - numberOfRegisters].offset;
        this.chunkInfo = this.chunkInfo.slice(0, this.chunkInfo.length - numberOfRegisters);
        this.chunks = this.chunks.slice(0, this.chunks.length - numberOfRegisters);
        // check the translatable from the last record, if the chunk is removed
        if (!this.translatable.length) return;
        
        // iterate the translatable from the last record, check if refernced chunk is removed
        for (let i = this.translatable.length - 1; i >= 0; i--) {
            if (this.translatable[i].index >= this.chunkInfo.length) {
                this.translatable.splice(i, 1);
            }
        }
            
    }

    /**
     * Register the buffer from the current offset up to the end of the file/data.
     */
    end() {
        this.registerBy(this.data.length - this.offset);
    }

    reset() {
        this.offset = 0;
        this.chunks = [];
        this.chunkInfo = [];
        this.translatable = [];
    }

    goTo(offset) {
        // can only go forward from the current offset
        if (offset < this.offset) {
            console.error('goTo error:', this);
            throw new Error(`Cannot go back to a previous offset. Current offset: ${this.offset}, Target offset: ${offset}`);
        }

        // if designed offset is bigger than the data length, just go to the end with warning
        if (offset >= this.data.length) {
            console.warn('goTo offset is bigger than the data length. Going to the end of the data.');
            this.end();
            return;
        }
        this.registerBy(offset - this.offset);
    }



    async writeTo(targetFilePath) {
        await fs.mkdir(path.dirname(targetFilePath), { recursive: true });
        await fs.writeFile(targetFilePath, Buffer.concat(this.chunks));
    }

}


module.exports = {
    BinaryParser,
    bufferUtil
}