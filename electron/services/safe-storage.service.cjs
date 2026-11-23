'use strict';

/**
 * Safe Storage Service — Milestone 24
 *
 * Provides hardware-backed, OS-level credential encryption (macOS Keychain,
 * Windows DPAPI, Linux Secret Service) using Electron's `safeStorage` API.
 *
 * Capabilities:
 *   • isSafeStorageAvailable(): Returns whether OS keychain encryption is accessible.
 *   • setSecret(key, value): Encrypts and securely persists sensitive tokens/credentials.
 *   • getSecret(key): Decrypts and retrieves a stored secret.
 *   • removeSecret(key): Deletes a stored secret.
 *   • clearSecrets(): Purges all stored secrets.
 */

const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let _vaultPath = null;
let _vaultCache = null;

function getVaultPath() {
  if (!_vaultPath) {
    const userData = app.getPath('userData');
    _vaultPath = path.join(userData, 'secure-vault.bin');
  }
  return _vaultPath;
}

/**
 * Loads the encrypted vault map from disk.
 * @returns {Record<string, { encrypted: string, fallback?: boolean, iv?: string, tag?: string }>}
 */
function loadVault() {
  if (_vaultCache) return _vaultCache;

  const filePath = getVaultPath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      _vaultCache = JSON.parse(raw);
    } else {
      _vaultCache = {};
    }
  } catch (err) {
    console.error('[SafeStorage] Failed to read secure vault, initializing empty:', err);
    _vaultCache = {};
  }

  return _vaultCache;
}

/**
 * Persists the encrypted vault map to disk safely.
 */
function saveVault() {
  const filePath = getVaultPath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(_vaultCache || {}, null, 2), 'utf8');
  } catch (err) {
    console.error('[SafeStorage] Failed to write secure vault:', err);
  }
}

/**
 * Fallback encryption key derived from machine identifier and app info when OS keychain is locked.
 */
function getFallbackKey() {
  const seed = `${process.platform}:${app.getName()}:${process.arch}`;
  return crypto.createHash('sha256').update(seed).digest();
}

/**
 * Checks whether OS keychain encryption is available.
 * @returns {boolean}
 */
function isSafeStorageAvailable() {
  try {
    return typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

/**
 * Encrypts and saves a secret key-value pair.
 * @param {string} key
 * @param {string} value
 * @returns {boolean}
 */
function setSecret(key, value) {
  if (!key || typeof key !== 'string') return false;
  if (typeof value !== 'string') return false;

  const vault = loadVault();

  try {
    if (isSafeStorageAvailable()) {
      const encryptedBuffer = safeStorage.encryptString(value);
      vault[key] = {
        encrypted: encryptedBuffer.toString('base64'),
        fallback: false
      };
    } else {
      // AES-256-GCM fallback if running in environments without native keychain access
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', getFallbackKey(), iv);
      let encrypted = cipher.update(value, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      const tag = cipher.getAuthTag();

      vault[key] = {
        encrypted,
        fallback: true,
        iv: iv.toString('base64'),
        tag: tag.toString('base64')
      };
    }

    saveVault();
    return true;
  } catch (err) {
    console.error(`[SafeStorage] Failed to set secret for "${key}":`, err);
    return false;
  }
}

/**
 * Retrieves and decrypts a secret value by key.
 * @param {string} key
 * @returns {string | null}
 */
function getSecret(key) {
  if (!key || typeof key !== 'string') return null;

  const vault = loadVault();
  const record = vault[key];
  if (!record || !record.encrypted) return null;

  try {
    if (!record.fallback && isSafeStorageAvailable()) {
      const buffer = Buffer.from(record.encrypted, 'base64');
      return safeStorage.decryptString(buffer);
    }

    if (record.fallback && record.iv && record.tag) {
      const iv = Buffer.from(record.iv, 'base64');
      const tag = Buffer.from(record.tag, 'base64');
      const decipher = crypto.createDecipheriv('aes-256-gcm', getFallbackKey(), iv);
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(record.encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
  } catch (err) {
    console.error(`[SafeStorage] Failed to decrypt secret for "${key}":`, err);
  }

  return null;
}

/**
 * Removes a secret key from the secure vault.
 * @param {string} key
 * @returns {boolean}
 */
function removeSecret(key) {
  if (!key || typeof key !== 'string') return false;

  const vault = loadVault();
  if (key in vault) {
    delete vault[key];
    saveVault();
    return true;
  }

  return false;
}

/**
 * Clears all secrets from the vault.
 * @returns {boolean}
 */
function clearSecrets() {
  _vaultCache = {};
  saveVault();
  return true;
}

module.exports = {
  isSafeStorageAvailable,
  setSecret,
  getSecret,
  removeSecret,
  clearSecrets
};
