/* js/pages/WorldPage.js */
import { DOM } from '../utils/DOM.js';
import { WorldService } from '../services/WorldService.js';
import { BotService } from '../services/BotService.js';
import { LoreService } from '../services/LoreService.js';
import { SearchService } from '../services/SearchService.js';
import { ThemeLoader } from '../ui/ThemeLoader.js';
import { SvgAnimator } from '../ui/SvgAnimator.js';
import { GridManager } from '../ui/GridManager.js';
import { Filter } from '../ui/Filter.js';
import { Breadcrumbs } from '../ui/Breadcrumbs.js';
import { stateManager } from '../core/StateManager.js';
import { globalEventBus } from '../core/EventBus.js';

export class WorldPage {
  /**
   * Controller for rendering World Profile views.
   * @param {HTMLElement} appRoot - App insertion parent node
   * @param {string} worldId - World identifier
   */
  constructor(appRoot, worldId) {
    this.appRoot = appRoot;
    this.worldId = worldId;
    this.world = null;
    this.bots = [];
    this.gridManager = null;
    this.filterController = null;
    this.subscriptions = [];
    this.currentPage = 1;
    this.itemsPerPage = 6;
    this.statusFilter = '';
  }

  /**
   * Loads configurations, scopes theme stylesheets, fetches lore markdowns, and constructs paginated bot profiles grids.
   */
  async load() {
    // 1. Resolve world registry datasets
    this.world = await WorldService.getWorld(this.worldId);
    if (!this.world) {
      this.render404();
      return;
    }

    this.bots = await BotService.getBotsForWorld(this.world);

    // 2. Scopes and injects world stylesheet
    await ThemeLoader.loadWorldTheme(this.worldId, `${this.world.path}/${this.world.theme}`);

    // Set page title tag dynamically
    document.title = `${this.world.title} - World Nexus`;

    // 3. Setup header search variables: header search should be disabled on world profile page
    const headerSearchWrapper = document.getElementById('header-search-wrapper');
    if (headerSearchWrapper) {
      headerSearchWrapper.style.display = 'none';
    }

    // 4. Construct DOM Layout Elements
    const logoWrapper = DOM.el('div', { class: 'world-page-logo' });
    const loreContent = DOM.el('div', { class: 'lore-body-content' });
    const loreNav = DOM.el('ul', { class: 'lore-nav-list' });
    const botGridWrapper = DOM.el('div', { class: 'bot-grid gpu-accelerated' });
    const paginationWrapper = DOM.el('div', { class: 'grid-pagination' });
    const genresFilterWrapper = DOM.el('div', { class: 'tags-list' });

    // Local Search Input
    const botSearch = DOM.el('input', {
      type: 'text',
      class: 'search-input-box',
      placeholder: 'Search bots inside...',
      oninput: (e) => {
        stateManager.setState('searchQuery', e.target.value.trim());
        this.currentPage = 1;
      }
    });
    botSearch.value = stateManager.getState('searchQuery') || '';

    // Status Dropdown
    const statusDropdown = DOM.el('select', {
      class: 'sort-select',
      onchange: (e) => {
        this.statusFilter = e.target.value;
        this.currentPage = 1;
        this.updateBotGrid();
      }
    },
      DOM.el('option', { value: '' }, 'All Statuses'),
      DOM.el('option', { value: 'public' }, 'Public'),
      DOM.el('option', { value: 'private' }, 'Private')
    );

    // Sorting Dropdown
    const sortingDropdown = DOM.el('select', {
      class: 'sort-select',
      onchange: (e) => {
        stateManager.setState('sortBy', e.target.value);
        this.currentPage = 1;
      }
    },
      DOM.el('option', { value: 'featured' }, 'Featured Agents'),
      DOM.el('option', { value: 'newest' }, 'Newest Additions'),
      DOM.el('option', { value: 'popular' }, 'Popular Agents'),
      DOM.el('option', { value: 'alphabetical' }, 'Alphabetical')
    );
    sortingDropdown.value = stateManager.getState('sortBy') || 'featured';

    // Share Button
    const shareSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    shareSvg.setAttribute('viewBox', '0 0 16 16');
    shareSvg.setAttribute('width', '16');
    shareSvg.setAttribute('height', '16');
    shareSvg.setAttribute('fill', 'currentColor');
    const sharePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    sharePath.setAttribute('d', 'M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z');
    shareSvg.appendChild(sharePath);
    
    const iconBtnStyle = { 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      width: '32px', 
      height: '32px', 
      padding: '0' 
    };

    const shareButton = DOM.el('button', {
      class: 'btn btn-secondary',
      title: 'Share World',
      style: iconBtnStyle,
      onclick: () => {
        navigator.clipboard.writeText(window.location.href);
        // Optional visual feedback could go here
      }
    }, shareSvg);

    // Collapsible Button with Dynamic Arrow
    const collapseSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    collapseSvg.setAttribute('viewBox', '0 0 16 16');
    collapseSvg.setAttribute('width', '16');
    collapseSvg.setAttribute('height', '16');
    collapseSvg.setAttribute('fill', 'currentColor');
    collapseSvg.style.transition = 'transform 0.3s ease';
    const collapsePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    collapsePath.setAttribute('d', 'M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z');
    collapseSvg.appendChild(collapsePath);

    const collapseButton = DOM.el('button', {
      class: 'btn btn-secondary lore-collapse-btn',
      title: 'Toggle Chronicles',
      style: iconBtnStyle,
      onclick: () => {
        const lorePanel = document.getElementById('world-lore-container');
        if (lorePanel) {
          lorePanel.classList.toggle('collapsed');
          const isCollapsed = lorePanel.classList.contains('collapsed');
          collapseSvg.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
        }
      }
    }, collapseSvg);
    
    const headerActions = DOM.el('div', { class: 'lore-header-actions', style: { display: 'flex', gap: '8px' } }, 
        shareButton, 
        collapseButton
    );

    // Auto-hide drawer toggle button SVG
    const svgNS = 'http://www.w3.org/2000/svg';
    const drawerToggleSvg = document.createElementNS(svgNS, 'svg');
    drawerToggleSvg.setAttribute('viewBox', '0 0 24 24');
    drawerToggleSvg.setAttribute('width', '24');
    drawerToggleSvg.setAttribute('height', '24');
    drawerToggleSvg.setAttribute('fill', 'none');
    drawerToggleSvg.setAttribute('stroke', 'currentColor');
    drawerToggleSvg.setAttribute('stroke-width', '2');
    const drawerTogglePath = document.createElementNS(svgNS, 'path');
    drawerTogglePath.setAttribute('d', 'M9 18l6-6-6-6');
    drawerToggleSvg.appendChild(drawerTogglePath);

    const drawerBtn = DOM.el('div', {
      class: 'lore-sidebar-toggle-btn',
      onclick: (e) => {
        e.stopPropagation();
        const wrapper = document.getElementById('lore-sidebar-drawer');
        if (wrapper) wrapper.classList.toggle('active');
      }
    }, drawerToggleSvg);

    const sidebarDrawer = DOM.el('div', {
      id: 'lore-sidebar-drawer',
      class: 'lore-sidebar-wrapper',
      onmouseenter: () => {
        const wrapper = document.getElementById('lore-sidebar-drawer');
        if (wrapper) wrapper.classList.add('hover-active');
      },
      onmouseleave: () => {
        const wrapper = document.getElementById('lore-sidebar-drawer');
        if (wrapper) wrapper.classList.remove('hover-active');
      }
    },
      DOM.el('aside', { class: 'lore-sidebar' },
        DOM.el('h4', { class: 'lore-sidebar-title' }, 'Index Sections'),
        loreNav
      ),
      drawerBtn
    );

    const sidebarPositioner = DOM.el('div', {
      id: 'lore-sidebar-positioner',
      class: 'lore-sidebar-positioner'
    }, sidebarDrawer);

    // Assemble Page Container
    const pageContainer = DOM.el('div', { class: 'page-container world-profile-view' },
      // 1. Hero Block
      DOM.el('section', {
        class: 'world-hero gpu-accelerated',
        style: {
          backgroundImage: `url(${this.world.path}/${this.world.coverImage})`
        }
      },
        DOM.el('div', { class: 'hero-background-overlay' }),
        logoWrapper,
        DOM.el('div', { class: 'hero-text-block' },
          DOM.el('h1', { class: 'world-page-title' }, this.world.title),
          DOM.el('p', { class: 'world-page-description' }, this.world.description),
          DOM.el('div', { class: 'world-page-stats' },
            DOM.el('span', {}, DOM.el('strong', {}, this.bots.length), ' Agents'),
            DOM.el('span', {}, '•'),
            DOM.el('span', {}, DOM.el('strong', {}, (this.world.genres || []).join(' / ')))
          )
        )
      ),

      // 2. Collapsible Lore Panel
      DOM.el('section', {
        id: 'world-lore-container',
        class: 'world-lore-panel'
      },
        DOM.el('div', { class: 'lore-header-wrapper' },
          DOM.el('h2', { class: 'lore-header-title' }, 'Historical Logs & Chronicles'),
          headerActions
        ),
        sidebarPositioner,
        DOM.el('div', { class: 'lore-grid' },
          loreContent
        )
      ),

      // 3. Local Search & Filter Panels
      DOM.el('div', { class: 'filter-bar' },
        DOM.el('div', { class: 'filter-group' },
          DOM.el('span', { class: 'filter-label' }, 'Tags'),
          genresFilterWrapper
        ),
        DOM.el('div', { class: 'filter-group' },
          botSearch,
          DOM.el('div', { class: 'sort-select-wrapper' }, statusDropdown),
          DOM.el('div', { class: 'sort-select-wrapper' }, sortingDropdown)
        )
      ),

      // 4. Bot Grid Wrapper
      botGridWrapper,

      // 5. Pagination Buttons
      paginationWrapper
    );

    DOM.clear(this.appRoot);
    
    // Add breadcrumbs
    await Breadcrumbs.render(pageContainer, { page: 'world', worldId: this.worldId });
    
    this.appRoot.appendChild(pageContainer);

    // 5. Connect UI Controllers
    this.gridManager = new GridManager(botGridWrapper, 'bot');
    
    // Collect genres specifically belonging to this world's bots
    const worldBotGenres = Array.from(new Set(this.bots.flatMap(b => b.genres || [])));
    this.filterController = new Filter(genresFilterWrapper, worldBotGenres, true);

    // 6. Fetch Lore markdown logs
    this.loadLoreLogs(`${this.world.path}/${this.world.lore}`, loreContent, loreNav);

    // 7. Load World Logo
    if (this.world.logo && this.world.logo.toLowerCase().endsWith('.svg')) {
      fetch(`${this.world.path}/${this.world.logo}`)
        .then(res => res.text())
        .then(svgCode => {
          logoWrapper.innerHTML = svgCode;
          const svg = logoWrapper.querySelector('svg');
          if (svg) {
            SvgAnimator.initParallax(logoWrapper, 10);
          }
          SvgAnimator.observeVisibility(logoWrapper);
        })
        .catch(err => {
          console.warn(`Could not render world page SVG logo for "${this.worldId}":`, err);
          logoWrapper.appendChild(DOM.el('span', { class: 'logo-text world-page-logo-fallback' }, this.world.title.slice(0, 2).toUpperCase()));
          SvgAnimator.observeVisibility(logoWrapper);
        });
    } else if (this.world.logo) {
      const img = DOM.el('img', { 
        src: `${this.world.path}/${this.world.logo}`, 
        alt: `${this.world.title} logo`,
        style: 'width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0px 0px 8px rgba(0,0,0,0.5));'
      });
      logoWrapper.appendChild(img);
      SvgAnimator.initParallax(logoWrapper, 10);
      SvgAnimator.observeVisibility(logoWrapper);
    } else {
      logoWrapper.appendChild(DOM.el('span', { class: 'logo-text world-page-logo-fallback' }, this.world.title.slice(0, 2).toUpperCase()));
      SvgAnimator.observeVisibility(logoWrapper);
    }

    // 8. Register state subscriptions for redraws
    this.subscriptions.push(
      globalEventBus.on('state:change', () => {
        this.currentPage = 1;
        this.updateBotGrid();
      })
    );

    // Render initial grid
    this.updateBotGrid();

    // 9. Live algorithmic position for the Index Drawer
    let currentY = 0;
    let targetY = 0;
    
    const animateDrawer = () => {
      // Stop loop if component is unmounted
      if (!document.getElementById('lore-sidebar-positioner')) return;
      
      const positioner = document.getElementById('lore-sidebar-positioner');
      const drawer = document.getElementById('lore-sidebar-drawer');
      const panel = document.getElementById('world-lore-container');
      
      if (positioner && drawer && panel) {
        const panelRect = panel.getBoundingClientRect();
        const headerOffset = 100; // Account for the sticky main header
        
        let desiredY = 0;
        if (panelRect.top < headerOffset) {
          desiredY = headerOffset - panelRect.top;
          
          // Clamp the translation so the drawer doesn't push past the bottom padding
          const maxTranslate = panelRect.height - drawer.offsetHeight - 40;
          if (desiredY > maxTranslate) desiredY = maxTranslate;
        }
        targetY = Math.max(0, desiredY);
        
        // Smooth lerp interpolation
        currentY += (targetY - currentY) * 0.08;
        
        if (Math.abs(targetY - currentY) > 0.1) {
          positioner.style.transform = `translateY(${currentY}px)`;
        } else if (currentY !== targetY) {
          currentY = targetY;
          positioner.style.transform = `translateY(${currentY}px)`;
        }
      }
      
      this.drawerAnimFrame = requestAnimationFrame(animateDrawer);
    };
    
    this.drawerAnimFrame = requestAnimationFrame(animateDrawer);
  }

  /**
   * Loads the lore markdown file, parses it, and creates smooth scroll navigation items.
   */
  async loadLoreLogs(url, contentNode, navNode) {
    const htmlContent = await LoreService.loadLore(url);
    LoreService.buildHierarchicalLore(htmlContent, contentNode, navNode);
  }

  /**
   * Sorts, filters, and paginates bot items inside the grid container.
   */
  updateBotGrid() {
    if (!this.gridManager) return;

    const query = stateManager.getState('searchQuery') || '';
    const genres = stateManager.getState('selectedGenres') || [];
    const sortBy = stateManager.getState('sortBy') || 'featured';

    const filtered = SearchService.filterBots(this.bots, {
      query,
      genres,
      status: this.statusFilter || '',
      sortBy
    });

    // Compute paginated items slice
    const offset = (this.currentPage - 1) * this.itemsPerPage;
    const paginated = filtered.slice(offset, offset + this.itemsPerPage);

    this.gridManager.render(paginated);
    this.renderPaginationButtons(filtered.length);
  }

  /**
   * Renders the bottom page buttons to control pagination offsets.
   */
  renderPaginationButtons(totalItems) {
    const pageContainer = this.appRoot.querySelector('.grid-pagination');
    if (!pageContainer) return;

    DOM.clear(pageContainer);

    const totalPages = Math.ceil(totalItems / this.itemsPerPage);
    if (totalPages <= 1) return;

    const navWrapper = DOM.el('div', {
      class: 'grid-pagination-nav'
    });

    for (let p = 1; p <= totalPages; p++) {
      const isActive = p === this.currentPage;
      
      const pageBtn = DOM.el('button', {
        class: `btn ${isActive ? 'btn-primary' : 'btn-secondary'} grid-pagination-btn`,
        onclick: () => {
          this.currentPage = p;
          this.updateBotGrid();
          // Scroll smoothly to bottom bot-grid container
          const target = this.appRoot.querySelector('.bot-grid');
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, p.toString());

      navWrapper.appendChild(pageBtn);
    }

    pageContainer.appendChild(navWrapper);
  }

  /**
   * Helper to display error frames.
   */
  render404() {
    DOM.clear(this.appRoot);
    this.appRoot.appendChild(DOM.el('div', {
      class: 'page-container error-404-view'
    },
      DOM.el('h1', {}, 'Sector Grid Unavailable'),
      DOM.el('p', {}, 'The requested world vector details do not exist inside registry records.'),
      DOM.el('a', { href: 'index.html', class: 'btn btn-primary' }, 'Return to Nexus Core')
    ));
  }

  /**
   * Unbinds state subscriptions and unloads active custom theme stylesheets.
   */
  unload() {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    
    if (this.filterController) {
      this.filterController.destroy();
    }

    if (this.drawerAnimFrame) {
      cancelAnimationFrame(this.drawerAnimFrame);
    }

    ThemeLoader.unloadWorldTheme();
  }
}
export default WorldPage;
