const fs = require('fs/promises');
const path = require('path');

const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10 MB safety limit per image

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
};

/**
 * Safely reads an image from disk with size and extension validation.
 * @param {string} filePath
 * @returns {Promise<{name: string, mimeType: string, base64: string}>}
 */
async function readImageFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[extension];
  if (!mimeType) {
    throw new Error(`Unsupported image extension: ${extension}`);
  }

  const stat = await fs.stat(filePath);
  if (stat.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error(`File ${path.basename(filePath)} exceeds maximum allowed size of 10MB`);
  }

  const buffer = await fs.readFile(filePath);
  return {
    name: path.basename(filePath),
    mimeType,
    base64: buffer.toString('base64')
  };
}

module.exports = {
  readImageFile,
  MIME_TYPES,
  MAX_IMAGE_FILE_SIZE
};
