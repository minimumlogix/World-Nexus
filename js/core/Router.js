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
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // Find closest anchor tag
      const link = e.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;
      if (link.target && link.target !== '_self') return;
      if (link.hasAttribute('download')) return;

      // Auto-resolve internal markdown links asynchronously
      if (link.classList.contains('auto-resolve-link')) {
        e.preventDefault();
        import('../services/WorldService.js').then(({ WorldService }) => {
          WorldService.getWorlds().then(worlds => {
            if (worlds.some(w => w.id === href)) {
              this.navigate(`world:${href}`);
            } else {
              this.navigate(`bot:${href}`);
            }
          });
        });
        return;
      }

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
      id = this.decodeRoutePart(hash.substring(8));
    } else if (hash.startsWith('#/bot/')) {
      page = 'bot';
      id = this.decodeRoutePart(hash.substring(6));
    } else if (hash.startsWith('#/profile/')) {
      page = 'profile';
      id = this.decodeRoutePart(hash.substring(10));
    } else if (hash.startsWith('#/settings/')) {
      page = 'settings';
      id = this.decodeRoutePart(hash.substring(11));
    } else if (hash === '#/settings') {
      page = 'settings';
      id = 'profile'; // default tab
    } else if (hash === '#/feed') {
      page = 'feed';
    } else if (hash === '#/inbox') {
      page = 'inbox';
    } else if (hash === '#/worlds') {
      page = 'landing';
      id = 'worlds';
    } else if (hash === '#/characters') {
      page = 'landing';
      id = 'bots';
    } else if (hash.startsWith('#/tag/')) {
      page = 'landing';
      tag = this.decodeRoutePart(hash.substring(6));
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
      } else if (params.has('profile')) {
        page = 'profile';
        id = params.get('profile');
      } else if (params.has('settings')) {
        page = 'settings';
        id = params.get('settings') || 'profile';
      } else if (params.has('feed')) {
        page = 'feed';
      } else if (params.has('inbox')) {
        page = 'inbox';
      } else if (params.has('tag')) {
        page = 'landing';
        tag = params.get('tag');
      }
    }
    // 3. Resolve via Pathnames (if URL rewrites are active)
    if (page === 'landing' && !search && !hash) {
      if (pathname.includes('world.html')) {
        page = 'world';
      } else if (pathname.includes('bot.html')) {
        page = 'bot';
      } else if (pathname.includes('profile.html')) {
        page = 'profile';
      } else if (pathname.includes('settings.html')) {
        page = 'settings';
        id = 'profile';
      } else {
        const htmlMatch = pathname.match(/\/([^/]+)\.html$/);
        if (htmlMatch && !['index', 'world', 'bot', 'profile', 'settings'].includes(htmlMatch[1])) {
          const matchedName = htmlMatch[1];
          if (matchedName.startsWith('bot-')) {
            page = 'bot';
            id = this.decodeRoutePart(matchedName.substring(4));
          } else {
            page = 'world';
            id = this.decodeRoutePart(matchedName);
          }
        } else {
          const worldMatch = pathname.match(/\/world\/([^/]+)/);
          if (worldMatch) {
            page = 'world';
            id = this.decodeRoutePart(worldMatch[1]);
          } else {
            const botMatch = pathname.match(/\/bot\/([^/]+)/);
            if (botMatch) {
              page = 'bot';
              id = this.decodeRoutePart(botMatch[1]);
            } else {
              const profileMatch = pathname.match(/\/profile\/([^/]+)/);
              if (profileMatch) {
                page = 'profile';
                id = this.decodeRoutePart(profileMatch[1]);
              } else {
                const settingsMatch = pathname.match(/\/settings\/([^/]+)/);
                if (settingsMatch) {
                  page = 'settings';
                  id = this.decodeRoutePart(settingsMatch[1]);
                }
              }
            }
          }
        }
      }
    }

    return { page, id, tag };
  }

  /**
   * Navigates to a specific path using hash triggers.
   * @param {string} href - Target URL or hash
   * @returns {void}
   */
  navigate(href) {
    if (!href) return;

    try {
      if (href.startsWith(location.origin)) {
        const url = new URL(href);
        href = `${url.pathname}${url.search}${url.hash}`;
      }
    } catch (err) {
      console.warn('Router received an invalid href:', href, err);
    }

    // 1. If hash-routing is requested
    if (href.startsWith('#')) {
      window.location.hash = href;
      return;
    }

    // 2. Parse relative paths and translate to browser-friendly destinations
    let target = href;
    const htmlMatch = href.match(/(?:^|\/)([^/]+)\.html$/);
    if (htmlMatch && !['index', 'world', 'bot', 'profile', 'settings'].includes(htmlMatch[1])) {
      const matchedName = htmlMatch[1];
      if (matchedName.startsWith('bot-')) {
        target = `#/bot/${encodeURIComponent(matchedName.substring(4))}`;
      } else {
        target = `#/world/${encodeURIComponent(matchedName)}`;
      }
    } else if (href.startsWith('/world/')) {
      const parts = href.split('/');
      target = `#/world/${encodeURIComponent(parts[2] || '')}`;
    } else if (href.startsWith('/bot/')) {
      const parts = href.split('/');
      target = `#/bot/${encodeURIComponent(parts[2] || '')}`;
    } else if (href.startsWith('/profile/')) {
      const parts = href.split('/');
      target = `#/profile/${encodeURIComponent(parts[2] || '')}`;
    } else if (href.startsWith('/settings/')) {
      const parts = href.split('/');
      target = `#/settings/${encodeURIComponent(parts[2] || '')}`;
    } else if (href === '/settings' || href === 'settings') {
      target = '#/settings';
    } else if (href === '/feed' || href === 'feed') {
      target = '#/feed';
    } else if (href === '/inbox' || href === 'inbox') {
      target = '#/inbox';
    } else if (href === '/worlds' || href === 'worlds') {
      target = '#/worlds';
    } else if (href === '/characters' || href === 'characters') {
      target = '#/characters';
    } else if (href.startsWith('/tag/')) {
      const parts = href.split('/');
      target = `#/tag/${encodeURIComponent(parts[2] || '')}`;
    } else if (href === '/' || href === '/index.html' || href === 'index.html') {
      target = '#/';
    } else if (href.startsWith('world:')) {
      target = `#/world/${encodeURIComponent(href.substring(6))}`;
    } else if (href.startsWith('bot:')) {
      target = `#/bot/${encodeURIComponent(href.substring(4))}`;
    } else if (href.startsWith('profile:')) {
      target = `#/profile/${encodeURIComponent(href.substring(8))}`;
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

  decodeRoutePart(value) {
    try {
      return decodeURIComponent(value || '');
    } catch (err) {
      console.warn('Could not decode route segment:', value, err);
      return value || '';
    }
  }
}

export const router = new Router();
