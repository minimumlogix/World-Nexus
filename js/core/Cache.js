/* js/core/Cache.js */

export class Cache {
  constructor() {
    this.storage = new Map();
  }

  /**
   * Get cached element. Returns null if expired.
   * @param {string} key - Cache identifier
   * @returns {any}
   */
  get(key) {
    if (!this.storage.has(key)) return null;

    const data = this.storage.get(key);
    if (Date.now() > data.expiresAt) {
      this.storage.delete(key);
      return null;
    }

    return data.value;
  }

  /**
   * Save element to cache.
   * @param {string} key - Cache identifier
   * @param {any} value - Value to store
   * @param {number} [ttl=300000] - Lifespan in milliseconds (default 5m)
   */
  set(key, value, ttl = 300000) {
    this.storage.set(key, {
      value,
      expiresAt: Date.now() + ttl
    });
  }

  /**
   * Checks if cache contains key.
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Evicts a specific key.
   * @param {string} key
   */
  delete(key) {
    this.storage.delete(key);
  }

  /**
   * Resets entire cache store.
   */
  clear() {
    this.storage.clear();
  }
}

export const globalCache = new Cache();
