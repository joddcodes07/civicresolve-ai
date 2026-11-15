const fs = require('fs/promises');
const path = require('path');

const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10 MB safety limit per image
const MAX_DOCUMENT_FILE_SIZE = 15 * 1024 * 1024; // 15 MB safety limit per document

const IMAGE_MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
};

const DOCUMENT_MIME_TYPES = {
  ...IMAGE_MIME_TYPES,
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json'
};

/**
 * Safely reads an image from disk with size and extension validation.
 * @param {string} filePath
 * @returns {Promise<{name: string, mimeType: string, base64: string}>}
 */
async function readImageFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = IMAGE_MIME_TYPES[extension];
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

/**
 * Safely reads a document from disk with size and extension validation.
 * @param {string} filePath
 * @returns {Promise<{name: string, mimeType: string, size: number, base64: string}>}
 */
async function readDocumentFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = DOCUMENT_MIME_TYPES[extension];
  if (!mimeType) {
    throw new Error(`Unsupported document extension: ${extension}`);
  }

  const stat = await fs.stat(filePath);
  if (stat.size > MAX_DOCUMENT_FILE_SIZE) {
    throw new Error(`Document ${path.basename(filePath)} exceeds maximum allowed size of 15MB`);
  }

  const buffer = await fs.readFile(filePath);
  return {
    name: path.basename(filePath),
    mimeType,
    size: stat.size,
    base64: buffer.toString('base64')
  };
}

module.exports = {
  readImageFile,
  readDocumentFile,
  MIME_TYPES: IMAGE_MIME_TYPES,
  IMAGE_MIME_TYPES,
  DOCUMENT_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE,
  MAX_DOCUMENT_FILE_SIZE
};
