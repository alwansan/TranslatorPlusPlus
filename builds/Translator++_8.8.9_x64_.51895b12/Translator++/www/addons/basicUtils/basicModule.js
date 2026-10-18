const crypto = require('crypto');

const algorithm = 'aes-256-gcm'; // Encryption algorithm
const saltLength = 16; // Length of the salt
const ivLength = 12; // Length of the initialization vector (IV)
const keyLength = 32; // Length of the encryption key
const packHeader = 'TPk01+';

/**
 * Derive an encryption key from a password using PBKDF2
 * @param {string} password - The password to derive the key from
 * @param {Buffer} salt - The salt to use for key derivation
 * @returns {Promise<Buffer>} - The derived encryption key
 */
function deriveKey(password="Translator++", salt) {
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, 100000, keyLength, 'sha256', (err, derivedKey) => {
            if (err) return reject(err);
            resolve(derivedKey);
        });
    });
}

/**
 * Encrypt a string using a password
 * @param {string} data - The string to encrypt
 * @param {string} password - The password to encrypt the string with
 * @returns {Promise<string>} - The encrypted string in base64 format
 */
async function encrypt(data, password) {
    const salt = crypto.randomBytes(saltLength);
    const iv = crypto.randomBytes(ivLength);
    const key = await deriveKey(password, salt);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Combine salt, IV, auth tag, and encrypted data
    const combined = Buffer.concat([salt, iv, authTag, encrypted]);
    return combined.toString('base64');
}

/**
 * Decrypt a string using a password
 * @param {string} encryptedData - The encrypted string in base64 format
 * @param {string} password - The password to decrypt the string with
 * @returns {Promise<string>} - The decrypted string
 */
async function decrypt(encryptedData, password) {
    const combined = Buffer.from(encryptedData, 'base64');

    const salt = combined.slice(0, saltLength);
    const iv = combined.slice(saltLength, saltLength + ivLength);
    const authTag = combined.slice(saltLength + ivLength, saltLength + ivLength + 16);
    const encrypted = combined.slice(saltLength + ivLength + 16);

    const key = await deriveKey(password, salt);

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
}

async function pack(data, password) {
    if (typeof data !== 'string') return data;
    const encrypted = await encrypt(data, password);
    return packHeader + encrypted;
}

async function unpack(data, password) {
    if (typeof data !== 'string') return data;
    if (!data.startsWith(packHeader)) return data;
    // string body
    const stringBody = data.substring(packHeader.length);
    return decrypt(stringBody, password);
}

module.exports = { 
    decrypt,
    encrypt,
    pack, 
    unpack,
};