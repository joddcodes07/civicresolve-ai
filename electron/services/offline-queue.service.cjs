'use strict';

/**
 * Offline Queue & Draft Storage Service — Milestone 28
 *
 * Provides persistent outbox queueing for offline grievance submissions and
 * resilient draft auto-saving to prevent citizen input loss during connectivity
 * outages or unexpected application shutdowns.
 *
 * Capabilities:
 *   • Outbox Queue: addToQueue(), getQueue(), removeFromQueue(), updateQueueItem(), clearQueue()
 *   • Draft Storage: saveDraft(), getDraft(), clearDraft()
 */

const { app } = require('electron');
const fs = require('fs');
const path = require('path');

let _outboxCache = null;
let _draftsCache = null;

function getOutboxPath() {
  return path.join(app.getPath('userData'), 'offline-outbox.json');
}

function getDraftsPath() {
  return path.join(app.getPath('userData'), 'offline-drafts.json');
}

// ── Outbox Queue ─────────────────────────────────────────────────────────────

function loadOutbox() {
  if (_outboxCache) return _outboxCache;

  const filePath = getOutboxPath();
  try {
    if (fs.existsSync(filePath)) {
      _outboxCache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else {
      _outboxCache = [];
    }
  } catch (err) {
    console.error('[OfflineQueue] Error reading outbox, resetting:', err);
    _outboxCache = [];
  }

  return _outboxCache;
}

function saveOutbox() {
  try {
    fs.writeFileSync(getOutboxPath(), JSON.stringify(_outboxCache || [], null, 2), 'utf8');
  } catch (err) {
    console.error('[OfflineQueue] Failed to persist outbox:', err);
  }
}

/**
 * Adds an item to the offline submission queue.
 * @param {object} payload
 * @returns {{ success: boolean, item?: object, error?: string }}
 */
function addToQueue(payload) {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Payload must be an object' };
  }

  const outbox = loadOutbox();
  const id = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const item = {
    id,
    payload,
    status: 'pending',
    retryCount: 0,
    createdAt: new Date().toISOString()
  };

  outbox.push(item);
  saveOutbox();
  console.log(`[OfflineQueue] Queued item #${id}`);
  return { success: true, item };
}

/**
 * Returns all queued outbox items.
 * @returns {Array<object>}
 */
function getQueue() {
  return [...loadOutbox()];
}

/**
 * Removes an item from the queue after successful synchronization.
 * @param {string} id
 * @returns {{ success: boolean }}
 */
function removeFromQueue(id) {
  const outbox = loadOutbox();
  const index = outbox.findIndex((i) => i.id === id);
  if (index !== -1) {
    outbox.splice(index, 1);
    saveOutbox();
    console.log(`[OfflineQueue] Removed synced item #${id}`);
    return { success: true };
  }
  return { success: false };
}

/**
 * Updates status or metadata of a queue item.
 * @param {string} id
 * @param {object} updates
 * @returns {{ success: boolean }}
 */
function updateQueueItem(id, updates = {}) {
  const outbox = loadOutbox();
  const item = outbox.find((i) => i.id === id);
  if (item) {
    Object.assign(item, updates);
    saveOutbox();
    return { success: true };
  }
  return { success: false };
}

/**
 * Clears all queued items.
 * @returns {{ success: boolean }}
 */
function clearQueue() {
  _outboxCache = [];
  saveOutbox();
  return { success: true };
}

// ── Form Draft Storage ───────────────────────────────────────────────────────

function loadDrafts() {
  if (_draftsCache) return _draftsCache;

  const filePath = getDraftsPath();
  try {
    if (fs.existsSync(filePath)) {
      _draftsCache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else {
      _draftsCache = {};
    }
  } catch (err) {
    console.error('[OfflineQueue] Error reading drafts, resetting:', err);
    _draftsCache = {};
  }

  return _draftsCache;
}

function saveDrafts() {
  try {
    fs.writeFileSync(getDraftsPath(), JSON.stringify(_draftsCache || {}, null, 2), 'utf8');
  } catch (err) {
    console.error('[OfflineQueue] Failed to persist drafts:', err);
  }
}

/**
 * Auto-saves a form draft.
 * @param {string} key
 * @param {object} data
 * @returns {{ success: boolean }}
 */
function saveDraft(key, data) {
  if (!key || typeof key !== 'string') return { success: false };

  const drafts = loadDrafts();
  drafts[key] = {
    data,
    updatedAt: new Date().toISOString()
  };

  saveDrafts();
  return { success: true };
}

/**
 * Retrieves a previously saved form draft.
 * @param {string} key
 * @returns {object | null}
 */
function getDraft(key) {
  if (!key || typeof key !== 'string') return null;
  const drafts = loadDrafts();
  return drafts[key] ? drafts[key].data : null;
}

/**
 * Clears a specific form draft upon successful form submission.
 * @param {string} key
 * @returns {{ success: boolean }}
 */
function clearDraft(key) {
  if (!key || typeof key !== 'string') return { success: false };
  const drafts = loadDrafts();
  if (key in drafts) {
    delete drafts[key];
    saveDrafts();
    return { success: true };
  }
  return { success: false };
}

module.exports = {
  addToQueue,
  getQueue,
  removeFromQueue,
  updateQueueItem,
  clearQueue,
  saveDraft,
  getDraft,
  clearDraft
};
