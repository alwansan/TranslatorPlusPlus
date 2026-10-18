const fs = require('fs');
const { Buffer } = require('buffer');

// Utility functions for string conversions (utf-8 encoding)
const fileAccessUtils = {
  s2ws: (str) => Buffer.from(str, 'utf8').toString('utf16le'),
  ws2s: (wstr) => Buffer.from(wstr, 'utf16le').toString('utf8')
};

class FileWalkerException extends Error {
  constructor(message) {
    super(message);
    this.name = 'FileWalkerException';
  }
}

class FileReader {
  constructor(filename, startOffset = -1) {
    this.init = false;
    if (filename) {
      this.open(filename, startOffset);
    }
  }

  open(filename, startOffset = -1) {
    try {
      this.data = fs.readFileSync(filename);
      this.offset = startOffset === -1 ? 0 : startOffset;
      this.size = this.data.length;
      this.init = true;
    } catch (error) {
      throw new FileWalkerException(`Failed to open file: ${filename}`);
    }
  }

  isEoF() {
    return this.offset >= this.size;
  }

  readUInt64() {
    return this.read(8).readBigUInt64LE();
  }

  readUInt32() {
    return this.read(4).readUInt32LE();
  }

  readUInt16() {
    return this.read(2).readUInt16LE();
  }

  readUInt8() {
    return this.read(1).readUInt8();
  }

  readInt64() {
    return this.read(8).readBigInt64LE();
  }

  readInt32() {
    return this.read(4).readInt32LE();
  }

  readInt16() {
    return this.read(2).readInt16LE();
  }

  readInt8() {
    return this.read(1).readInt8();
  }

  readBytes(size) {
    if (!this.init) throw new FileWalkerException('FileWalker not initialized');
    if (this.offset + size > this.size) throw new FileWalkerException('ReadBytes: End of file reached');

    const bytes = this.data.slice(this.offset, this.offset + size);
    this.offset += size;
    return bytes;
  }

  read(size) {
    return this.readBytes(size);
  }

  seek(offset) {
    if (!this.init) throw new FileWalkerException('FileWalker not initialized');
    if (offset > this.size) throw new FileWalkerException('Seek: Out of bounds');
    this.offset = offset;
  }

  skip(size) {
    if (!this.init) throw new FileWalkerException('FileWalker not initialized');
    if (this.offset + size > this.size) throw new FileWalkerException('Skip: Out of bounds');
    this.offset += size;
  }

  at(offset) {
    if (!this.init) throw new FileWalkerException('FileWalker not initialized');
    if (offset >= this.size) throw new FileWalkerException('At: Out of bounds');
    return this.data[offset];
  }
}

class FileWriter {
  constructor(filename) {
    this.buffer = [];
    if (filename) {
      this.open(filename);
    }
  }

  open(filename) {
    this.file = fs.createWriteStream(filename, { flags: 'w' });
  }

  write(data) {
    if (Buffer.isBuffer(data)) {
      this.file.write(data);
    } else {
      this.file.write(Buffer.from(data));
    }
  }

  writeBytes(data) {
    this.write(data);
  }

  close() {
    if (this.file) {
      this.file.end();
    }
  }

  writeToFile(filename) {
    fs.writeFileSync(filename, Buffer.concat(this.buffer));
  }
}

module.exports = {
  FileReader,
  FileWriter,
  FileWalkerException,
  fileAccessUtils
};
