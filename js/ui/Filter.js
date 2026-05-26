/* js/ui/Filter.js */
import { DOM } from '../utils/DOM.js';
import { stateManager } from '../core/StateManager.js';
import { globalEventBus } from '../core/EventBus.js';

export class Filter {
  /**
   * Filter controls for tags lists.
   * @param {HTMLElement} container - Node inside which to render tags
   * @param {Array<string>} genresList - List of all possible genres to display
   * @param {boolean} [isWorldAccent=false] - If true, applies world-specific styling variables
   */
  constructor(container, genresList = [], isWorldAccent = false) {
    this.container = container;
    this.genres = genresList;
    this.isWorldAccent = isWorldAccent;

    this.init();
  }

  init() {
    this.render();

    // Watch global filter updates to keep pills active state in sync
    this.unsubscribe = globalEventBus.on('state:selectedGenres', (activeGenres) => {
      this.updateActiveTags(activeGenres);
    });
  }

  /**
   * Renders the filter buttons list with prepended vector icons.
   */
  render() {
    DOM.clear(this.container);

    const activeList = stateManager.getState('selectedGenres') || [];

    // Genre Icons SVG registry to match mockup design
    const genreIcons = {
      scifi: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="12" y1="3" x2="12" y2="7"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="3" y1="12" x2="7" y2="12"/><line x1="17" y1="12" x2="21" y2="12"/><polygon points="12,9 13.5,12 12,15 10.5,12" fill="currentColor"/></svg>`,
      'dark fantasy': `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L3 9v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9L12 2z"/><line x1="12" y1="11" x2="12" y2="18"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`,
      mecha: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="12" cy="12" r="4"/><path d="M12 3v5M12 16v5M3 12h5M16 12h5"/></svg>`,
      cyberpunk: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><polyline points="7 8 10 10 7 12"/></svg>`,
      action: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>`,
      synthwave: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"/><circle cx="8" cy="12" r="2.5"/><circle cx="16" cy="12" r="2.5"/><line x1="10.5" y1="12" x2="13.5" y2="12"/></svg>`
    };

    const tags = this.genres.map(genre => {
      const isActive = activeList.includes(genre);
      const iconMarkup = genreIcons[genre.toLowerCase()] || '';

      const tagButton = DOM.el('button', {
        class: `tag ${this.isWorldAccent ? 'tag-accent' : ''} ${isActive ? 'active' : ''}`,
        dataset: { genre },
        'aria-pressed': isActive ? 'true' : 'false',
        onclick: () => this.toggleGenre(genre)
      });

      // Inject custom icon if configured
      if (iconMarkup) {
        const temp = document.createElement('div');
        temp.innerHTML = iconMarkup;
        const svgNode = temp.firstChild;
        tagButton.appendChild(svgNode);
      }

      // Add text label
      tagButton.appendChild(document.createTextNode(genre));
      return tagButton;
    });

    tags.forEach(tag => this.container.appendChild(tag));
  }

  /**
   * Adds or removes a genre tag from selection lists.
   * @param {string} genre
   */
  toggleGenre(genre) {
    const selected = [...(stateManager.getState('selectedGenres') || [])];
    const index = selected.indexOf(genre);

    if (index > -1) {
      selected.splice(index, 1);
    } else {
      selected.push(genre);
    }

    stateManager.setState('selectedGenres', selected);
  }

  /**
   * Updates visual active states on buttons.
   * @param {Array<string>} activeGenres
   */
  updateActiveTags(activeGenres) {
    const pills = this.container.querySelectorAll('.tag');
    pills.forEach(pill => {
      const genre = pill.dataset.genre;
      const isSelected = activeGenres.includes(genre);
      
      pill.classList.toggle('active', isSelected);
      pill.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
export default Filter;
