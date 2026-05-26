/* js/core/EventBus.js */

export class EventBus {
  constructor() {
    this.listeners = {};
  }

  /**
   * Subscribe to an event.
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from an event.
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  /**
   * Emit an event to all subscribers.
   * @param {string} event - Event name
   * @param {any} data - Event cargo/payload
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error(`EventBus handler error for event "${event}":`, err);
      }
    });
  }
}

export const globalEventBus = new EventBus();
