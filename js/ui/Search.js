/* js/ui/Search.js */
import { stateManager } from '../core/StateManager.js';
import { globalEventBus } from '../core/EventBus.js';
import { WorldService } from '../services/WorldService.js';
import { BotService } from '../services/BotService.js';
import { DOM } from '../utils/DOM.js';

export class Search {
  /**
   * Binds search input nodes to the global StateManager query state.
   * Also implements interactive syntax autocomplete suggestions.
   * @param {HTMLInputElement} inputElement - Text search input node
   */
  constructor(inputElement) {
    this.input = inputElement;
    this.debounceTimer = null;
    this.dropdown = null;
    this.highlightedIndex = -1;
    
    // Autocomplete indexes
    this.allTags = [];
    this.allCreators = [];
    this.allCharacters = [];
    this.allBots = [];

    this.init();
  }

  async init() {
    if (!this.input) return;

    // Load autocomplete metadata in background
    this.loadMetadata();

    // Synchronize initial input value
    this.input.value = stateManager.getState('searchQuery') || '';

    // Handle user inputs
    this.inputListener = (e) => {
      this.showDropdown();
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      
      this.debounceTimer = setTimeout(() => {
        stateManager.setState('searchQuery', e.target.value.trim());
      }, 150);
    };
    this.input.addEventListener('input', this.inputListener);

    // Show suggestions on focus
    this.focusListener = () => {
      this.showDropdown();
    };
    this.input.addEventListener('focus', this.focusListener);

    // Keyboard navigation
    this.keydownListener = (e) => {
      const items = this.dropdown ? this.dropdown.querySelectorAll('.search-suggestion-item') : [];
      if (items.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.highlightedIndex = (this.highlightedIndex + 1) % items.length;
        this.updateHighlightedItem(items, this.highlightedIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.highlightedIndex = (this.highlightedIndex - 1 + items.length) % items.length;
        this.updateHighlightedItem(items, this.highlightedIndex);
      } else if (e.key === 'Enter') {
        if (this.highlightedIndex > -1 && items[this.highlightedIndex]) {
          e.preventDefault();
          items[this.highlightedIndex].click();
        }
      } else if (e.key === 'Escape') {
        this.closeDropdown();
      }
    };
    this.input.addEventListener('keydown', this.keydownListener);

    // Close dropdown on click outside
    this.outsideClickListener = (e) => {
      if (this.dropdown && !this.input.contains(e.target) && !this.dropdown.contains(e.target)) {
        this.closeDropdown();
      }
    };
    document.addEventListener('click', this.outsideClickListener);

    // Sync input box if query is updated globally (e.g., cleared by clear-filters button)
    this.unsubscribe = globalEventBus.on('state:searchQuery', (newQuery) => {
      if (this.input.value !== newQuery) {
        this.input.value = newQuery || '';
      }
    });
  }

  /**
   * Pre-fetches world and character records to build autocomplete lists.
   */
  async loadMetadata() {
    try {
      const worlds = await WorldService.getWorlds();
      const bots = await BotService.getAllBots();

      // Extract unique genres/tags
      const worldGenres = worlds.flatMap(w => w.genres || []);
      const botGenres = bots.flatMap(b => b.genres || b.tags || []);
      this.allTags = Array.from(new Set([...worldGenres, ...botGenres])).filter(Boolean);

      // Extract unique authors/creators
      const worldAuthors = worlds.map(w => w.author);
      const botCreators = bots.map(b => b.creator || b.author || b.worldAuthor);
      this.allCreators = Array.from(new Set([...worldAuthors, ...botCreators])).filter(Boolean);

      // Extract unique character names
      this.allCharacters = Array.from(new Set(bots.map(b => b.name))).filter(Boolean);

      // Extract active bots (only those with working chat links)
      this.allBots = Array.from(new Set(bots.filter(b => BotService.hasActualChatLink(b)).map(b => b.name))).filter(Boolean);
    } catch (e) {
      console.warn('[Search] Autocomplete indexing failed:', e);
    }
  }

  /**
   * Evaluates text and generates suggestion options array.
   * @param {string} text
   * @returns {Array<Object>}
   */
  getSuggestions(text) {
    const trimmed = text.trim();
    
    // 1. If empty or ends with space, show syntax helper keys
    if (!trimmed || text.endsWith(' ')) {
      return [
        { type: 'prefix', display: 'tag:', label: 'Filter by tag', value: 'tag:' },
        { type: 'prefix', display: 'character:', label: 'Filter by character name', value: 'character:' },
        { type: 'prefix', display: 'bot:', label: 'Filter by active bot', value: 'bot:' },
        { type: 'prefix', display: 'creator:', label: 'Filter by creator', value: 'creator:' }
      ];
    }

    // 2. Parse if user is typing values for a specific prefix (e.g. tag:cyberpunk)
    // Matches the last word/clause being typed
    const words = trimmed.split(/\s+/);
    const lastWord = words[words.length - 1];

    const prefixMatch = lastWord.match(/^(tag|tags|character|characters|bot|bots|creator|author|authors):(.*)$/i);
    if (prefixMatch) {
      const prefix = prefixMatch[1].toLowerCase();
      const value = prefixMatch[2].trim().toLowerCase();

      let list = [];
      let displayPrefix = '';

      if (prefix.startsWith('tag')) {
        list = this.allTags;
        displayPrefix = 'tag:';
      } else if (prefix.startsWith('character')) {
        list = this.allCharacters;
        displayPrefix = 'character:';
      } else if (prefix.startsWith('bot')) {
        list = this.allBots;
        displayPrefix = 'bot:';
      } else if (prefix.startsWith('creator') || prefix.startsWith('author')) {
        list = this.allCreators;
        displayPrefix = 'creator:';
      }

      let filtered = list;
      if (value) {
        filtered = list.filter(item => item.toLowerCase().includes(value));
      }

      return filtered.slice(0, 8).map(item => {
        const formattedVal = item.includes(' ') ? `"${item}"` : item;
        return {
          type: 'value',
          display: `${displayPrefix}${formattedVal}`,
          label: `Filter by ${prefix}: ${item}`,
          value: `${displayPrefix}${formattedVal}`
        };
      });
    }

    // 3. General typing - suggest matching prefixes or matching tags
    const lowerText = lastWord.toLowerCase();
    const suggestions = [];

    const prefixes = [
      { display: 'tag:', label: 'Filter by tag', value: 'tag:' },
      { display: 'character:', label: 'Filter by character name', value: 'character:' },
      { display: 'bot:', label: 'Filter by active bot', value: 'bot:' },
      { display: 'creator:', label: 'Filter by creator', value: 'creator:' }
    ];

    // Suggest matching prefixes
    prefixes.forEach(p => {
      if (p.display.includes(lowerText)) {
        suggestions.push({ type: 'prefix', ...p });
      }
    });

    // Suggest matching tags directly
    if (this.allTags) {
      const matchingTags = this.allTags.filter(t => t.toLowerCase().includes(lowerText));
      matchingTags.slice(0, 4).forEach(t => {
        const formattedVal = t.includes(' ') ? `"${t}"` : t;
        suggestions.push({
          type: 'tag-suggest',
          display: `tag:${formattedVal}`,
          label: `Filter by tag: ${t}`,
          value: `tag:${formattedVal}`
        });
      });
    }

    return suggestions.slice(0, 6);
  }

  /**
   * Generates dropdown HTML elements list.
   */
  showDropdown() {
    if (!this.dropdown) {
      this.dropdown = document.createElement('div');
      this.dropdown.className = 'search-suggestions-dropdown';
      
      // Enforce position: relative on parent node for correct anchoring
      if (this.input.parentNode) {
        const style = window.getComputedStyle(this.input.parentNode);
        if (style.position === 'static') {
          this.input.parentNode.style.position = 'relative';
        }
        this.input.parentNode.appendChild(this.dropdown);
      }
    }

    const suggestions = this.getSuggestions(this.input.value);

    if (suggestions.length === 0) {
      this.closeDropdown();
      return;
    }

    this.dropdown.innerHTML = '';
    this.highlightedIndex = -1;

    suggestions.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'search-suggestion-item';
      el.dataset.index = index;

      const syntaxSpan = document.createElement('span');
      syntaxSpan.className = 'suggestion-syntax';
      syntaxSpan.textContent = item.display;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'suggestion-label';
      labelSpan.textContent = item.label;

      el.appendChild(syntaxSpan);
      el.appendChild(labelSpan);

      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectSuggestion(item);
      });

      this.dropdown.appendChild(el);
    });

    this.dropdown.style.display = 'block';
  }

  /**
   * Updates CSS highlighted visual state.
   */
  updateHighlightedItem(items, activeIndex) {
    items.forEach((el, index) => {
      el.classList.toggle('highlighted', index === activeIndex);
      if (index === activeIndex) {
        el.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  /**
   * Appends or inserts the selected suggestion value to the input value list.
   */
  selectSuggestion(item) {
    const currentValue = this.input.value;
    const words = currentValue.trim().split(/\s+/);
    
    // Replace the last word typed
    if (words.length > 0) {
      words.pop();
    }
    words.push(item.value);

    const newValue = words.join(' ').trim() + (item.type === 'prefix' ? '' : ' ');
    this.input.value = newValue;
    this.input.focus();

    // Trigger state change immediately
    stateManager.setState('searchQuery', newValue.trim());

    // Regenerate suggestions based on updated value
    this.showDropdown();
  }

  /**
   * Closes and hides the dropdown popup list.
   */
  closeDropdown() {
    if (this.dropdown) {
      this.dropdown.style.display = 'none';
    }
    this.highlightedIndex = -1;
  }

  /**
   * Cleans event handles on destruct.
   */
  destroy() {
    if (this.input) {
      this.input.removeEventListener('input', this.inputListener);
      this.input.removeEventListener('focus', this.focusListener);
      this.input.removeEventListener('keydown', this.keydownListener);
    }
    document.removeEventListener('click', this.outsideClickListener);
    
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.dropdown) {
      this.dropdown.remove();
      this.dropdown = null;
    }
  }
}
export default Search;
