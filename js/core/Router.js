/* js/core/Router.js */
import { globalEventBus } from './EventBus.js';

class Router {
  constructor() {
    this.currentRoute = null;

    // Watch browser history transitions
    window.addEventListener('popstate', () => this.handleRoute());
    window.addEventListener('hashchange', () => this.handleRoute());

    // Intercept click routing
    document.addEventListener('click', e => {
      // Find closest anchor tag
      const link = e.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      // Skip external links, mailto, tel, hash anchors on the same page
      if (href.startsWith('http') && !href.startsWith(location.origin)) return;
      if (href.startsWith('mailto:') || href.startsWith('tel:') || (href.startsWith('#') && !href.startsWith('#/'))) return;

      e.preventDefault();
      this.navigate(href);
    });
  }

  /**
   * Resolves the current route mapping to landing, world, or bot page.
   * Supports hash (#/world/abyss), search (?id=abyss), and pathnames (/world/abyss).
   * @returns {{page: string, id: string|null, tag: string|null}}
   */
  getRoute() {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const pathname = window.location.pathname || '';
    
    let page = 'landing';
    let id = null;
    let tag = null;

    // 1. Resolve via Hash (highly reliable on static hosts)
    if (hash.startsWith('#/world/')) {
      page = 'world';
      id = hash.substring(8);
    } else if (hash.startsWith('#/bot/')) {
      page = 'bot';
      id = hash.substring(6);
    } else if (hash.startsWith('#/tag/')) {
      page = 'landing';
      tag = hash.substring(6);
    } else if (hash === '#/' || hash === '#') {
      page = 'landing';
    }
    // 2. Resolve via Query parameters
    else if (search) {
      const params = new URLSearchParams(search);
      if (params.has('world')) {
        page = 'world';
        id = params.get('world');
      } else if (params.has('bot')) {
        page = 'bot';
        id = params.get('bot');
      } else if (params.has('tag')) {
        page = 'landing';
        tag = params.get('tag');
      } else if (params.has('id')) {
        // Look at hash to see if it's world or bot, though this shouldn't happen with strict hash routing
      }
    }
    // 3. Resolve via Pathnames (if URL rewrites are active)
    if (page === 'landing' && !search && !hash) {
      if (pathname.includes('world.html')) {
        page = 'world';
      } else if (pathname.includes('bot.html')) {
        page = 'bot';
      } else {
        const worldMatch = pathname.match(/\/world\/([^/]+)/);
        if (worldMatch) {
          page = 'world';
          id = worldMatch[1];
        } else {
          const botMatch = pathname.match(/\/bot\/([^/]+)/);
          if (botMatch) {
            page = 'bot';
            id = botMatch[1];
          }
        }
      }
    }

    return { page, id, tag };
  }

  /**
   * Navigates to a specific path using hash triggers.
   * @param {string} href - Target URL or hash
   */
  navigate(href) {
    // 1. If hash-routing is requested
    if (href.startsWith('#')) {
      window.location.hash = href;
      return;
    }

    // 2. Parse relative paths and translate to browser-friendly destinations
    let target = href;
    if (href.startsWith('/world/')) {
      const parts = href.split('/');
      target = `#/world/${parts[2]}`;
    } else if (href.startsWith('/bot/')) {
      const parts = href.split('/');
      target = `#/bot/${parts[2]}`;
    } else if (href.startsWith('/tag/')) {
      const parts = href.split('/');
      target = `#/tag/${parts[2]}`;
    } else if (href === '/' || href === '/index.html' || href === 'index.html') {
      target = '#/';
    }

    // 3. Navigate
    window.location.hash = target;
  }

  handleRoute() {
    const route = this.getRoute();
    
    // Check if the route has actually changed (page, id, tag)
    if (this.currentRoute && 
        this.currentRoute.page === route.page && 
        this.currentRoute.id === route.id && 
        this.currentRoute.tag === route.tag) {
      return;
    }
    
    this.currentRoute = route;
    globalEventBus.emit('route:change', route);
  }
}

export const router = new Router();
