/* js/pages/FeedPage.js */
import { DOM } from '../utils/DOM.js';
import { WorldService } from '../services/WorldService.js';
import { BotService } from '../services/BotService.js';
import { stateManager } from '../core/StateManager.js';
import { globalEventBus } from '../core/EventBus.js';

export class FeedPage {
  /**
   * Controller for the global timeline feed.
   * @param {HTMLElement} appRoot - App insertion parent node
   */
  constructor(appRoot) {
    this.appRoot = appRoot;
    this.worlds = [];
    this.bots = [];
    this.activities = [];
  }

  /**
   * Loads necessary datasets and renders the timeline page.
   */
  async load() {
    this.worlds = await WorldService.getWorlds();
    const customWorlds = stateManager.getState('customWorlds') || [];
    this.allWorlds = [...this.worlds, ...customWorlds];

    this.bots = await BotService.getAllBots();
    const customBots = stateManager.getState('customCharacters') || [];
    this.allBots = [...this.bots, ...customBots];

    this.activities = stateManager.getState('worldActivities') || [];

    document.title = 'Global Feed - World Nexus';

    // Disable header search wrapper on feed page
    const headerSearchWrapper = document.getElementById('header-search-wrapper');
    if (headerSearchWrapper) {
      headerSearchWrapper.style.display = 'none';
    }

    this.render();
  }

  /**
   * Renders the Feed Page layout.
   */
  render() {
    DOM.clear(this.appRoot);

    const timelineContainer = DOM.el('div', { class: 'timeline-container' });

    if (this.activities.length === 0) {
      timelineContainer.appendChild(
        DOM.el('div', { class: 'feed-empty-state' },
          DOM.el('i', { class: 'bi bi-mailbox2 feed-empty-icon' }),
          DOM.el('h3', {}, 'The Multiverse is Silent'),
          DOM.el('p', {}, 'No timeline logs have been recorded in this quadrant yet.')
        )
      );
    } else {
      this.activities.forEach(act => {
        const card = this.renderActivityCard(act);
        timelineContainer.appendChild(card);
      });
    }

    const pageContainer = DOM.el('div', { class: 'page-container feed-page-view fade-in-up-page' },
      DOM.el('div', { class: 'feed-header-section' },
        DOM.el('h1', { class: 'feed-page-title' }, 'MULTIVERSE CHRONICLES'),
        DOM.el('p', { class: 'feed-page-subtitle' }, 'Real-time telemetry and contributions across all registered worlds')
      ),
      timelineContainer
    );

    this.appRoot.appendChild(pageContainer);
  }

  /**
   * Renders an individual activity log card.
   */
  renderActivityCard(activity) {
    // Determine action icon
    let iconClass = 'bi-activity';
    let iconColor = 'var(--accent-gold)';
    if (activity.action === 'created' || activity.action === 'created_world') {
      iconClass = 'bi-plus-circle-fill';
      iconColor = '#10b981'; // green
    } else if (activity.action === 'updated' || activity.action === 'updated_bot' || activity.action === 'updated_world') {
      iconClass = 'bi-pencil-square';
      iconColor = '#3b82f6'; // blue
    } else if (activity.action === 'uploaded_image') {
      iconClass = 'bi-image-fill';
      iconColor = '#a855f7'; // purple
    } else if (activity.action === 'approved_character' || activity.action === 'created_character') {
      iconClass = 'bi-person-plus-fill';
      iconColor = '#ec4899'; // pink
    } else if (activity.action === 'approved_lore') {
      iconClass = 'bi-journal-check';
      iconColor = '#eab308'; // gold
    }

    const world = this.allWorlds.find(w => w.id === activity.worldId);
    const worldName = world ? world.title : activity.worldId;

    const detailsNode = DOM.el('div', { class: 'activity-card-details' });
    this.parseAndInjectMentions(detailsNode, activity.details || '');

    return DOM.el('div', { class: 'activity-card' },
      DOM.el('div', { class: 'activity-card-icon-wrapper', style: { backgroundColor: `${iconColor}1a`, color: iconColor } },
        DOM.el('i', { class: `bi ${iconClass}` })
      ),
      DOM.el('div', { class: 'activity-card-content' },
        DOM.el('div', { class: 'activity-card-header' },
          DOM.el('a', { href: `#/world/${activity.worldId}`, class: 'activity-card-world-link' }, worldName),
          DOM.el('span', { class: 'activity-card-time' }, activity.timestamp)
        ),
        detailsNode,
        DOM.el('div', { class: 'activity-card-footer' },
          'Logged by ',
          DOM.el('a', { href: `#/profile/${activity.author}`, class: 'activity-card-author-link' }, `@${activity.author}`)
        )
      )
    );
  }

  /**
   * Safe parser for timeline detail fields to resolve mentions.
   */
  parseAndInjectMentions(container, text) {
    const parts = text.split(/(\s+)/);
    parts.forEach(part => {
      if (part.startsWith('@')) {
        const handle = part.replace(/^@/, '').replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
        const handleLower = handle.toLowerCase();

        // Check world match
        const matchedWorld = this.allWorlds.find(w => w.id === handleLower);
        if (matchedWorld) {
          container.appendChild(
            DOM.el('a', {
              href: `#/world/${matchedWorld.id}`,
              class: 'mention-tag mention-tag-world',
              'data-mention-type': 'world',
              'data-mention-id': matchedWorld.id
            }, `@${matchedWorld.title}`)
          );
          const trailing = part.slice(matchedWorld.id.length + 1);
          if (trailing) container.appendChild(document.createTextNode(trailing));
          return;
        }

        // Check character match
        const matchedBot = this.allBots.find(b => b.id === handleLower || b.name.toLowerCase() === handleLower);
        if (matchedBot) {
          container.appendChild(
            DOM.el('a', {
              href: `#/bot/${matchedBot.id}`,
              class: 'mention-tag mention-tag-character',
              'data-mention-type': 'character',
              'data-mention-id': matchedBot.id
            }, `@${matchedBot.name}`)
          );
          const trailing = part.slice(handle.length + 1);
          if (trailing) container.appendChild(document.createTextNode(trailing));
          return;
        }

        // Otherwise user profile link
        container.appendChild(
          DOM.el('a', {
            href: `#/profile/${handle}`,
            class: 'mention-tag mention-tag-user',
            'data-mention-type': 'user',
            'data-mention-id': handle
          }, `@${handle}`)
        );
        const trailing = part.slice(handle.length + 1);
        if (trailing) container.appendChild(document.createTextNode(trailing));
        return;
      }
      container.appendChild(document.createTextNode(part));
    });
  }

  unload() {
    // Cleanup if any
  }
}
export default FeedPage;
