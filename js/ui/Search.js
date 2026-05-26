/* js/ui/Search.js */
import { stateManager } from '../core/StateManager.js';
import { globalEventBus } from '../core/EventBus.js';

export class Search {
  /**
   * Binds search input nodes to the global StateManager query state.
   * @param {HTMLInputElement} inputElement - Text search input node
   */
  constructor(inputElement) {
    this.input = inputElement;
    this.debounceTimer = null;

    this.init();
  }

  init() {
    if (!this.input) return;

    // Synchronize initial input value
    this.input.value = stateManager.getState('searchQuery') || '';

    // Handle user keyboard inputs
    this.input.addEventListener('input', (e) => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      
      this.debounceTimer = setTimeout(() => {
        stateManager.setState('searchQuery', e.target.value.trim());
      }, 150);
    });

    // Sync input box if query is updated globally (e.g., cleared by clear-filters button)
    this.unsubscribe = globalEventBus.on('state:searchQuery', (newQuery) => {
      if (this.input.value !== newQuery) {
        this.input.value = newQuery || '';
      }
    });
  }

  /**
   * Cleans event handles on destruct.
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
export default Search;
