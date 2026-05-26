/* js/ui/GridManager.js */
import { DOM } from '../utils/DOM.js';
import { WorldCard } from './WorldCard.js';
import { BotCard } from './BotCard.js';
import { stateManager } from '../core/StateManager.js';

export class GridManager {
  /**
   * Coordinates list items rendering inside responsive CSS grids.
   * @param {HTMLElement} container - Target grid element wrapper
   * @param {string} [type='world'] - Type of cards ('world' | 'bot')
   */
  constructor(container, type = 'world') {
    this.container = container;
    this.type = type;
  }

  /**
   * Renders cards in grid. Handles empty array scenarios gracefully.
   * @param {Array<Object>} items - Array of world or bot details metadata
   */
  render(items) {
    if (!this.container) return;

    DOM.clear(this.container);
    this.container.classList.remove('grid-blur-siblings');

    if (!items || items.length === 0) {
      this.renderEmptyState();
      return;
    }

    const cards = items.map(item => {
      if (this.type === 'world') {
        return WorldCard.render(item);
      } else {
        return BotCard.render(item);
      }
    });

    cards.forEach(card => this.container.appendChild(card));
  }

  /**
   * Renders empty state layout and resets inputs on click.
   */
  renderEmptyState() {
    const message = this.type === 'world' 
      ? 'No worlds match your search criteria.' 
      : 'No bots match your current criteria.';

    const emptyBox = DOM.el('div', {
      class: 'grid-empty-state',
      style: {
        gridColumn: '1 / -1',
        textAlign: 'center',
        padding: '64px 24px',
        color: 'var(--text-muted)'
      }
    },
      DOM.el('div', { style: { fontSize: '3rem', marginBottom: '16px' } }, '📡'),
      DOM.el('p', { style: { fontSize: '1.1rem', fontWeight: '500', marginBottom: '16px' } }, message),
      DOM.el('button', {
        class: 'btn btn-secondary',
        onclick: () => stateManager.clearFilters()
      }, 'Reset Search Filters')
    );

    this.container.appendChild(emptyBox);
  }
}
export default GridManager;
