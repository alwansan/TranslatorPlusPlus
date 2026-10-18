const fs = require('graceful-fs');
const readline = require('readline');
const os = require('os');


const JSONL = {
  /**
   * The number of index of the very first line in the file.
   */
  baseIndex : 0
};

JSONL.read = async function(filePath) {
    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        return data.split(os.EOL).map(line => JSON.parse(line));
    }
    catch (err) {
        console.error(err);
        return [];
    }
}


JSONL.append = async function(filePath, data) {
    try {
        await fs.promises.appendFile(filePath, JSON.stringify(data) + '\n');
    } catch (err) {
        console.error(err);
    }
}

JSONL.getAtIndex = async function(filePath, lineNumber) {
    return new Promise((resolve, reject) => {
        let currentLine = this.baseIndex - 1;
        let buffer = '';
        
        const readStream = fs.createReadStream(filePath, {
            encoding: 'utf8',
            highWaterMark: 1024 // 1KB buffer size
        });
        
        readStream.on('data', (chunk) => {
            buffer += chunk;
            let lines = buffer.split('\n');
            
            // Process all lines except the last part buffer (may be incomplete)
            while (lines.length > 1) {
                let line = lines.shift();
                currentLine += 1;
                
                if (currentLine === lineNumber) {
                    readStream.destroy();
                    resolve(JSON.parse(line));
                    return;
                }
            }
            
            // Retain the last part buffer (may be incomplete) for the next chunk
            buffer = lines[0];
        });
        
        readStream.on('error', (err) => {
            reject(err);
        });
        
        readStream.on('close', () => {
            // Handle case when the requested line is beyond the total lines in the file
            if (currentLine < lineNumber) {
                reject(new Error('Line number out of range'));
            }
        });
    });
}

JSONL.getOffsetForIndex = async function(filePath, lineNumber) {
    return new Promise((resolve, reject) => {
        let currentLine = this.baseIndex - 1;
        let buffer = '';
        let startOffset = 0;
        let endOffset = 0;
        
        const readStream = fs.createReadStream(filePath, {
            encoding: 'utf8',
            highWaterMark: 1024 // 1KB buffer size
        });
        
        readStream.on('data', (chunk) => {
            buffer += chunk;
            let lines = buffer.split('\n');
            
            while (lines.length > 1) {
                let line = lines.shift();
                currentLine += 1;
                endOffset = startOffset + Buffer.byteLength(line, 'utf8');
                
                if (currentLine === lineNumber) {
                    readStream.destroy();
                    resolve({ start: startOffset, end: endOffset });
                    return;
                }
                
                startOffset = endOffset + 1; // +1 to account for the newline character
            }
            
            buffer = lines[0];
        });
        
        readStream.on('error', (err) => {
            reject(err);
        });
        
        readStream.on('close', () => {
            if (currentLine < lineNumber) {
                reject(new Error('Line number out of range'));
            }
        });
    });
}

JSONL.writeAtLine = async function(filePath, lineNumber, content) {
    const tempFilePath = filePath + '.tmp';

    return new Promise((resolve, reject) => {
      if (typeof content === 'object') {
        content = JSON.stringify(content);
      }

      let currentLine = this.baseIndex - 1;
      let buffer = '';
      let writeStream = fs.createWriteStream(tempFilePath);

      const readStream = fs.createReadStream(filePath, {
        encoding: 'utf8',
        highWaterMark: 1024 // 1KB buffer size
      });

      readStream.on('data', (chunk) => {
        buffer += chunk;
        let lines = buffer.split('\n');

        while (lines.length > 1) {
          let line = lines.shift();
          currentLine += 1;

          if (currentLine === lineNumber) {
            writeStream.write(content + '\n');
          } else {
            writeStream.write(line + '\n');
          }
        }

        buffer = lines[0];
      });

      readStream.on('error', (err) => {
        if (err.code === 'ENOENT') {
          // File does not exist, create new file
          let newContent = '';
          for (let i = 1; i < lineNumber; i++) {
            newContent += '\n';
          }
          newContent += content + '\n';
          fs.writeFile(filePath, newContent, (writeErr) => {
            if (writeErr) {
              reject(writeErr);
            } else {
              resolve();
            }
          });
        } else {
          reject(err);
        }
      });

      readStream.on('close', () => {
        // Handle the last buffer part and write remaining lines
        if (buffer.length > 0) {
          let lines = buffer.split('\n');
          currentLine += 1;

          if (currentLine === lineNumber) {
            writeStream.write(content + '\n');
          } else {
            writeStream.write(lines.shift() + '\n');
          }

          lines.forEach(line => {
            currentLine += 1;
            if (currentLine === lineNumber) {
              writeStream.write(content + '\n');
            } else {
              writeStream.write(line + '\n');
            }
          });
        }

        // Add blank lines if the specified line number is beyond the current end
        while (currentLine < lineNumber - 1) {
          writeStream.write('\n');
          currentLine += 1;
        }

        if (currentLine === lineNumber - 1) {
          writeStream.write(content + '\n');
        }

        writeStream.end();
      });

      writeStream.on('finish', () => {
        fs.rename(tempFilePath, filePath, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    });
}


JSONL.getLastLine = async function(filePath) {
  const bufferSize = 1024; // 1KB buffer size

  return new Promise((resolve, reject) => {
    fs.stat(filePath, (err, stats) => {
      if (err) {
        return reject(err);
      }

      const fileSize = stats.size;
      if (fileSize === 0) {
        return resolve(null); // Empty file
      }

      let position = fileSize - bufferSize;
      let buffer = '';

      const readNextChunk = () => {
        if (position < 0) {
          position = 0;
        }

        const chunkSize = position === 0 ? fileSize % bufferSize : bufferSize;
        const bufferChunk = Buffer.alloc(chunkSize);

        fs.open(filePath, 'r', (err, fd) => {
          if (err) {
            return reject(err);
          }

          fs.read(fd, bufferChunk, 0, chunkSize, position, (err, bytesRead) => {
            if (err) {
              return reject(err);
            }

            buffer = bufferChunk.toString('utf8') + buffer;

            const lines = buffer.split('\n').filter(line => line.trim() !== '');

            if (lines.length > 0) {
              resolve(lines[lines.length - 1]);
              fs.close(fd, () => {});
            } else if (position === 0) {
              resolve(null); // No non-blank lines found
              fs.close(fd, () => {});
            } else {
              position -= bufferSize;
              buffer = ''; // Clear buffer and read the next chunk
              fs.close(fd, readNextChunk);
            }
          });
        });
      };

      readNextChunk();
    });
  });
}


JSONL.countLines = async function(filePath) {
  return new Promise((resolve, reject) => {
    let lineCount = 0;
    let buffer = '';

    const readStream = fs.createReadStream(filePath, {
      encoding: 'utf8',
      highWaterMark: 1024 // 1KB buffer size
    });

    readStream.on('data', (chunk) => {
      buffer += chunk;
      let lines = buffer.split('\n');
      lineCount += lines.length - 1;
      buffer = lines[lines.length - 1]; // Save the last part for the next chunk
    });

    readStream.on('end', () => {
      if (buffer.length > 0) {
        lineCount += 1; // Count the last line if there is any content
      }
      resolve(lineCount);
    });

    readStream.on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = JSONL;