/* js/ui/Breadcrumbs.js */
import { DOM } from '../utils/DOM.js';
import { WorldService } from '../services/WorldService.js';
import { BotService } from '../services/BotService.js';

export class Breadcrumbs {
  /**
   * Generates a breadcrumb trail based on the current context and prepends it to the container
   * @param {HTMLElement} container 
   * @param {Object} context - { page: 'world'|'bot', worldId: '...', botId: '...' }
   */
  static async render(container, context) {
    if (!container) return;
    
    // Remove existing breadcrumbs if any
    const existing = container.querySelector('.breadcrumbs-nav');
    if (existing) existing.remove();

    const breadcrumbsWrapper = DOM.el('nav', { class: 'breadcrumbs-nav', 'aria-label': 'Breadcrumb' });
    const list = DOM.el('ol', { class: 'breadcrumbs-list' });
    
    // Always start with Home
    list.appendChild(this.createCrumb('Home', '#/', false));

    if (context.page === 'world') {
      const world = await WorldService.getWorld(context.worldId);
      if (world) {
        list.appendChild(this.createDivider());
        list.appendChild(this.createCrumb(world.title, `#/world/${world.id}`, true));
      }
    } else if (context.page === 'world_subpage') {
      const world = await WorldService.getWorld(context.worldId);
      if (world) {
        list.appendChild(this.createDivider());
        list.appendChild(this.createCrumb(world.title, `#/world/${world.id}`, false, (e) => {
          if (context.onBackToWorld) {
            e.preventDefault();
            context.onBackToWorld();
          }
        }));
        list.appendChild(this.createDivider());
        list.appendChild(this.createCrumb(context.subpageName, '#', true));
      }
    } else if (context.page === 'bot') {
      const bot = await BotService.getBot(context.worldId, context.botId);
      if (bot) {
        const world = await WorldService.getWorld(context.worldId);
        if (world) {
          list.appendChild(this.createDivider());
          list.appendChild(this.createCrumb(world.title, `#/world/${world.id}`, false));
        }
        list.appendChild(this.createDivider());
        list.appendChild(this.createCrumb(bot.name, `#/bot/${bot.id}`, true));
      }
    }

    breadcrumbsWrapper.appendChild(list);
    
    // Prepend to the container
    if (container.firstChild) {
      container.insertBefore(breadcrumbsWrapper, container.firstChild);
    } else {
      container.appendChild(breadcrumbsWrapper);
    }
  }

  static createCrumb(label, href, isActive, onClick) {
    const li = DOM.el('li', { class: 'breadcrumb-item' });
    if (isActive) {
      li.appendChild(DOM.el('span', { class: 'breadcrumb-current', 'aria-current': 'page' }, label));
    } else {
      const a = DOM.el('a', { href, class: 'breadcrumb-link' }, label);
      if (onClick) {
        a.addEventListener('click', onClick);
      }
      li.appendChild(a);
    }
    return li;
  }

  static createDivider() {
    return DOM.el('li', { class: 'breadcrumb-divider' }, '›');
  }
}

export default Breadcrumbs;
