/* js/core/StateManager.js */
import { globalEventBus } from './EventBus.js';

class StateManager {
  constructor() {
    this.state = {
      currentWorld: null,
      searchQuery: '',
      selectedGenres: [],
      sortBy: 'featured', // featured, newest, alphabetical, popular
      theme: 'dark-theme',
      favorites: []
    };

    this.loadFromStorage();
  }

  /**
   * Loads initial state from localStorage if available.
   */
  loadFromStorage() {
    try {
      const savedTheme = localStorage.getItem('world_nexus_theme');
      if (savedTheme) {
        this.state.theme = savedTheme;
      } else {
        // Dark mode on by default
        this.state.theme = 'dark-theme';
      }

      const savedFavorites = localStorage.getItem('world_nexus_favorites');
      if (savedFavorites) {
        this.state.favorites = JSON.parse(savedFavorites);
      }
    } catch (err) {
      console.warn('Could not restore state from localStorage:', err);
    }
  }

  /**
   * Sets a value in the state registry and broadcasts changes.
   * @param {string} key - State key
   * @param {any} value - Value to set
   * @param {boolean} [silent=false] - If true, do not emit events
   */
  setState(key, value, silent = false) {
    // Basic structural equality check for simple variables or arrays
    if (JSON.stringify(this.state[key]) === JSON.stringify(value)) return;
    
    this.state[key] = value;

    // Side-effects persistence
    try {
      if (key === 'theme') {
        localStorage.setItem('world_nexus_theme', value);
      } else if (key === 'favorites') {
        localStorage.setItem('world_nexus_favorites', JSON.stringify(value));
      }
    } catch (err) {
      console.warn(`Could not save state field ${key} to localStorage:`, err);
    }

    if (!silent) {
      globalEventBus.emit(`state:${key}`, value);
      globalEventBus.emit('state:change', this.state);
    }
  }

  /**
   * Retrieves a value from state registry.
   * @param {string} key - State key
   * @returns {any}
   */
  getState(key) {
    return this.state[key];
  }

  /**
   * Toggles the favorited status of a bot.
   * @param {string} botId - Unique bot identifier
   */
  toggleFavorite(botId) {
    const favorites = [...this.state.favorites];
    const index = favorites.indexOf(botId);
    
    if (index > -1) {
      favorites.splice(index, 1);
    } else {
      favorites.push(botId);
    }
    
    this.setState('favorites', favorites);
  }

  /**
   * Checks if a bot is in favorites.
   * @param {string} botId
   * @returns {boolean}
   */
  isFavorite(botId) {
    return this.state.favorites.includes(botId);
  }

  /**
   * Reset filtering criteria
   */
  clearFilters() {
    this.setState('searchQuery', '', true);
    this.setState('selectedGenres', [], true);
    this.setState('sortBy', 'featured'); // triggers event
  }
}

export const stateManager = new StateManager();
