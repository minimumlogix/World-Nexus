/* js/app.js */
import { router } from './core/Router.js';
import { globalEventBus } from './core/EventBus.js';
import { stateManager } from './core/StateManager.js';
import { Loader } from './core/Loader.js';
import { SvgAnimator } from './ui/SvgAnimator.js';

import { LandingPage } from './pages/LandingPage.js';
import { WorldPage } from './pages/WorldPage.js';
import { BotPage } from './pages/BotPage.js';

class App {
  constructor() {
    this.appRoot = document.getElementById('app-root');
    this.currentPageController = null;

    this.init();
  }

  init() {
    // 1. Establish initial theme configuration
    const activeTheme = stateManager.getState('theme') || 'dark-theme';
    document.body.classList.add(activeTheme);

    // Observe global compass logos
    const headerLogo = document.querySelector('.header-compass-logo');
    if (headerLogo) SvgAnimator.observeVisibility(headerLogo);
    const footerLogo = document.querySelector('.footer-compass-logo');
    if (footerLogo) SvgAnimator.observeVisibility(footerLogo);

    // 2. Bind theme toggler buttons
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const currentTheme = stateManager.getState('theme') || 'dark-theme';
        const nextTheme = currentTheme === 'dark-theme' ? 'light-theme' : 'dark-theme';
        
        document.body.classList.remove(currentTheme);
        document.body.classList.add(nextTheme);
        stateManager.setState('theme', nextTheme);
      });
    }

    // 3. Monitor page scrolling to shrink sticky headers
    window.addEventListener('scroll', () => {
      const header = document.getElementById('main-header');
      if (header) {
        if (window.scrollY > 100) {
          header.classList.add('shrunk');
        } else {
          header.classList.remove('shrunk');
        }
      }
    });

    // 4. Bind mobile menu drawer toggling
    const burger = document.getElementById('mobile-menu-toggle');
    const navDrawer = document.getElementById('mobile-nav');
    if (burger && navDrawer) {
      burger.addEventListener('click', () => {
        burger.classList.toggle('open');
        navDrawer.classList.toggle('open');
      });

      // Clicking navigation links inside drawer collapses it
      navDrawer.addEventListener('click', (e) => {
        if (e.target.closest('a')) {
          burger.classList.remove('open');
          navDrawer.classList.remove('open');
        }
      });
    }

    // 5. Watch route transitions to swap active view page controllers
    globalEventBus.on('route:change', (route) => this.handleRouteTransition(route));

    // 6. Trigger first routing resolution
    router.handleRoute();
  }

  /**
   * Destroys current page context and instantiates new page.
   * @param {Object} route - Decoded route attributes
   */
  async handleRouteTransition(route) {
    Loader.show();

    // Fire unloading triggers if existing page controller exists
    if (this.currentPageController && typeof this.currentPageController.unload === 'function') {
      this.currentPageController.unload();
    }

    // Reset viewport scroll positions
    window.scrollTo(0, 0);

    try {
      if (route.page === 'world' && route.id) {
        this.currentPageController = new WorldPage(this.appRoot, route.id);
      } else if (route.page === 'bot' && route.id) {
        this.currentPageController = new BotPage(this.appRoot, route.id);
      } else {
        // If a direct tag URL was clicked (e.g. #/tag/scifi), sync it to filtering state
        if (route.tag) {
          stateManager.setState('selectedGenres', [route.tag], true);
        }
        this.currentPageController = new LandingPage(this.appRoot);
      }

      await this.currentPageController.load();
    } catch (err) {
      console.error('App failed to route to target view:', err);
      this.appRoot.innerHTML = `
        <div class="page-container error-crash-view" style="text-align: center; padding: 96px 24px;">
          <h2>Navigation System Malfunction</h2>
          <p style="color: var(--text-muted); margin: 16px 0 24px;">Details: ${err.message}</p>
          <button class="btn btn-primary" onclick="location.reload()">Reboot Core Grid</button>
        </div>
      `;
    } finally {
      Loader.hide();
    }
  }
}

// Boot application
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    new App();
  });
} else {
  new App();
}
export default App;
