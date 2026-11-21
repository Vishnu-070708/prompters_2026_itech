/**
 * Safe storage utility that gracefully handles QuotaExceededError and SecurityError
 * in restrictive, private browsing, or sandboxed iframe environments.
 */
const inMemoryStore = new Map();

export const safeStorage = {
  /**
   * Safely retrieve an item from localStorage or in-memory fallback.
   * @param {string} key
   * @returns {string|null}
   */
  getItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const value = window.localStorage.getItem(key);
        if (value !== null) return value;
      }
    } catch {
      // SecurityError or localStorage disabled
    }
    return inMemoryStore.has(key) ? inMemoryStore.get(key) : null;
  },

  /**
   * Safely persist an item to localStorage with in-memory fallback.
   * @param {string} key
   * @param {string} value
   * @returns {boolean} True if persisted to localStorage, false if fallback used or failed
   */
  setItem(key, value) {
    const stringValue = String(value);
    inMemoryStore.set(key, stringValue);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, stringValue);
        return true;
      }
    } catch {
      // QuotaExceededError or SecurityError
    }
    return false;
  },

  /**
   * Safely remove an item from localStorage and in-memory fallback.
   * @param {string} key
   */
  removeItem(key) {
    inMemoryStore.delete(key);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // SecurityError or localStorage disabled
    }
  }
};
