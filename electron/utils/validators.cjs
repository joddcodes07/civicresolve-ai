/**
 * Validates and constrains positive integers within safe bounds.
 * @param {any} value
 * @param {number} fallback
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function validatePositiveInteger(value, fallback = 1, min = 1, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) {
    return fallback;
  }
  return Math.min(Math.floor(parsed), max);
}

/**
 * Validates that an input is a non-empty string under a given length.
 * @param {any} value
 * @param {number} maxLength
 * @returns {string|null}
 */
function validateSafeString(value, maxLength = 255) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

module.exports = {
  validatePositiveInteger,
  validateSafeString
};
