/* js/pages/BotPage.js */
import { DOM } from '../utils/DOM.js';
import { WorldService } from '../services/WorldService.js';
import { BotService } from '../services/BotService.js';
import { LoreService } from '../services/LoreService.js';
import { ThemeLoader } from '../ui/ThemeLoader.js';
import { Breadcrumbs } from '../ui/Breadcrumbs.js';
import { BotProfileView } from '../ui/BotProfileView.js';

export class BotPage {
  /**
   * Controller for displaying Bot details profile.
   * @param {HTMLElement} appRoot - App insertion parent node
   * @param {string} botId - Unique bot identifier
   */
  constructor(appRoot, botId) {
    this.appRoot = appRoot;
    this.botId = botId;
    this.bot = null;
    this.world = null;
    this.botProfileView = null;
  }

  /**
   * Gathers bot data, loads parent world stylesheets, compiles metadata key-values, renders Markdown lore, and displays recommended bots.
   */
  async load() {
    // 1. Resolve bot details
    const allBots = await BotService.getAllBots();
    this.bot = allBots.find(b => b.id === this.botId);

    if (!this.bot) {
      this.render404();
      return;
    }

    // 2. Resolve parent world details
    this.world = await WorldService.getWorld(this.bot.worldId);
    if (!this.world) {
      this.render404();
      return;
    }

    // Find sibling bots from the same world
    const siblings = await BotService.getBotsForWorld(this.world);

    // 3. Inject parent world theme styles
    await ThemeLoader.loadWorldTheme(this.world.id, `${this.world.path}/${this.world.theme}`);

    // Set page title dynamically
    document.title = `${this.bot.name} - ${this.world.title} - World Nexus`;

    // Load Markdown lore and sections first, then construct DOM frames and instantiate reusable profile view
    await LoreService.loadBotLore(this.bot, this.world.path);
    this.botProfileView = new BotProfileView(this.bot, this.world, siblings);
    const profileEl = this.botProfileView.render();

    const pageContainer = DOM.el('div', { class: 'page-container bot-profile-view' },
      profileEl
    );

    DOM.clear(this.appRoot);
    
    // Add breadcrumbs to the pageContainer (prepends by default inside the animated page container)
    await Breadcrumbs.render(pageContainer, { page: 'bot', worldId: this.world.id, botId: this.bot.id });

    // Append container to page root
    this.appRoot.appendChild(pageContainer);

    // Initialize async lore rendering and scroll interactions
    await this.botProfileView.load();
  }

  /**
   * Helper to display error frames.
   */
  render404() {
    DOM.clear(this.appRoot);
    this.appRoot.appendChild(DOM.el('div', {
      class: 'page-container error-404-view'
    },
      DOM.el('h1', {}, 'Entity Vector Offline'),
      DOM.el('p', {}, 'The requested bot agent details do not exist inside sector databases.'),
      DOM.el('a', { href: 'index.html', class: 'btn btn-primary' }, 'Return to Nexus Core')
    ));
  }

  /**
   * Unloads world theme styles on exit and cleans up animation frames.
   */
  unload() {
    if (this.botProfileView) {
      this.botProfileView.unload();
    }
    ThemeLoader.unloadWorldTheme();
  }
}

export default BotPage;
