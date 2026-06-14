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
import { BotProfileView } from '../ui/BotProfileView.js';
import { stateManager } from '../core/StateManager.js';
import { globalEventBus } from '../core/EventBus.js';
import { lazyLoader } from '../ui/LazyLoader.js';
import { Search } from '../ui/Search.js';

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
    this.botProfileView = null;
    this.savedScrollY = 0;
    this._rawLoreMarkdown = null;
    this.drawerAnimFrame = null;
    this.handleScroll = null;
    
    // Library and subpages tracking
    this.libraryData = null;
    this.currentSubpage = null;
    this.loreContentNode = null;
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

    try {
      const libRes = await fetch(`${this.world.path}/library.json`);
      if (libRes.ok) this.libraryData = await libRes.json();
    } catch (e) {
      console.warn(`No library records verified for world: ${this.worldId}`, e);
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
      placeholder: 'Search bots inside...'
    });
    this.botSearchController = new Search(botSearch);

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
      DOM.el('option', { value: 'featured' }, 'Featured characters'),
      DOM.el('option', { value: 'newest' }, 'Newest Additions'),
      DOM.el('option', { value: 'popular' }, 'Popular characters'),
      DOM.el('option', { value: 'alphabetical' }, 'Alphabetical')
    );
    sortingDropdown.value = stateManager.getState('sortBy') || 'featured';

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
      onclick: (e) => {
        navigator.clipboard.writeText(window.location.href);
        const btn = e.currentTarget;
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check2"></i>';
        setTimeout(() => { if (btn) btn.innerHTML = orig; }, 2000);
      }
    }, DOM.el('i', { class: 'bi bi-share' }));

    const copyLoreButton = DOM.el('button', {
      class: 'btn btn-secondary',
      title: 'Copy Lore Text',
      style: iconBtnStyle,
      onclick: async (e) => {
        const btn = e.currentTarget;
        const orig = btn.innerHTML;
        try {
          const text = this._getCleanLoreText();
          if (text) {
            await navigator.clipboard.writeText(text);
            btn.innerHTML = '<i class="bi bi-check2"></i>';
          } else {
            btn.innerHTML = '<i class="bi bi-x"></i>';
          }
        } catch {
          btn.innerHTML = '<i class="bi bi-x"></i>';
        }
        setTimeout(() => { if (btn) btn.innerHTML = orig; }, 2000);
      }
    }, DOM.el('i', { class: 'bi bi-copy' }));

    const collapseIcon = DOM.el('i', {
      class: 'bi bi-chevron-up',
      style: { transition: 'transform 0.3s ease', display: 'inline-block' }
    });

    const collapseButton = DOM.el('button', {
      class: 'btn btn-secondary lore-collapse-btn',
      title: 'Toggle Chronicles',
      style: iconBtnStyle,
      onclick: () => {
        const lorePanel = document.getElementById('world-lore-container');
        if (lorePanel) {
          lorePanel.classList.toggle('collapsed');
          const isCollapsed = lorePanel.classList.contains('collapsed');
          collapseIcon.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
        }
      }
    }, collapseIcon);
    
    const headerActions = DOM.el('div', { class: 'lore-header-actions', style: { display: 'flex', gap: '8px' } }, 
        shareButton,
        copyLoreButton,
        collapseButton
    );

    // Auto-hide drawer toggle button icon
    const drawerToggleIcon = DOM.el('i', {
      class: 'bi bi-chevron-right'
    });

    const drawerBtn = DOM.el('div', {
      class: 'lore-sidebar-toggle-btn',
      onclick: (e) => {
        e.stopPropagation();
        const wrapper = document.getElementById('lore-sidebar-drawer');
        if (wrapper) wrapper.classList.toggle('active');
      }
    }, drawerToggleIcon);

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

    // Tab buttons and container
    const tabLoreBtn = DOM.el('button', {
      class: 'lore-tab-btn active',
      'data-tab': 'lore'
    }, DOM.el('i', { class: 'bi bi-journal-text' }), DOM.el('span', { class: 'tab-text' }, 'LORE'));

    const tabCharactersBtn = DOM.el('button', {
      class: 'lore-tab-btn',
      'data-tab': 'characters'
    }, DOM.el('i', { class: 'bi bi-people' }), DOM.el('span', { class: 'tab-text' }, 'CHARACTERS'));

    const tabGalleryBtn = DOM.el('button', {
      class: 'lore-tab-btn',
      'data-tab': 'gallery'
    }, DOM.el('i', { class: 'bi bi-images' }), DOM.el('span', { class: 'tab-text' }, 'GALLERY'));

    const tabsContainer = DOM.el('div', { class: 'lore-tabs-container' },
      tabLoreBtn,
      tabCharactersBtn,
      tabGalleryBtn
    );

    // Tab contents
    const loreTabContent = DOM.el('div', { class: 'world-lore-tab-content' },
      sidebarPositioner,
      DOM.el('div', { class: 'lore-grid' },
        loreContent
      )
    );

    const charactersTabContent = DOM.el('div', { class: 'world-characters-tab-content' },
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

    const galleryTabContent = DOM.el('div', { class: 'world-gallery-tab-content' });
    this.galleryTabContent = galleryTabContent;

    // Switch active tab function
    const switchTab = (tabName) => {
      tabLoreBtn.classList.remove('active');
      tabCharactersBtn.classList.remove('active');
      tabGalleryBtn.classList.remove('active');

      loreTabContent.style.display = 'none';
      charactersTabContent.style.display = 'none';
      galleryTabContent.style.display = 'none';

      // Always clear scroll indexes on switch
      window.removeEventListener('scroll', this.handleScroll);
      if (this.drawerAnimFrame) {
        cancelAnimationFrame(this.drawerAnimFrame);
        this.drawerAnimFrame = null;
      }

      if (tabName === 'lore') {
        tabLoreBtn.classList.add('active');
        loreTabContent.style.display = 'block';
        
        // Show tab-specific actions
        copyLoreButton.style.display = 'flex';
        collapseButton.style.display = 'flex';
        
        // Re-enable scroll listener for the sidebar index drawer
        window.addEventListener('scroll', this.handleScroll, { passive: true });
        this.handleScroll();
      } else if (tabName === 'characters') {
        tabCharactersBtn.classList.add('active');
        charactersTabContent.style.display = 'block';
        
        // Hide tab-specific actions
        copyLoreButton.style.display = 'none';
        collapseButton.style.display = 'none';
        
        // Un-collapse the panel automatically to reveal the grid
        const panel = document.getElementById('world-lore-container');
        if (panel) {
          panel.classList.remove('collapsed');
          collapseIcon.style.transform = 'rotate(0deg)';
        }
      } else if (tabName === 'gallery') {
        tabGalleryBtn.classList.add('active');
        galleryTabContent.style.display = 'block';
        
        // Hide tab-specific actions
        copyLoreButton.style.display = 'none';
        collapseButton.style.display = 'none';
        
        // Un-collapse the panel automatically to reveal the gallery
        const panel = document.getElementById('world-lore-container');
        if (panel) {
          panel.classList.remove('collapsed');
          collapseIcon.style.transform = 'rotate(0deg)';
        }

        this.loadAndRenderGallery();
      }
    };

    tabLoreBtn.onclick = () => switchTab('lore');
    tabCharactersBtn.onclick = () => switchTab('characters');
    tabGalleryBtn.onclick = () => switchTab('gallery');

    // Assemble Page Container wrapping all world-specific elements in a single container
    const worldPageContent = DOM.el('div', { class: 'world-page-content-wrapper fade-in-up-page' },
      // 1. Hero Block
      DOM.el('section', {
        class: 'world-hero gpu-accelerated bg-lazy-hero',
        'data-bg-src': `${this.world.path}/${this.world.coverImage}`
      },
        DOM.el('div', { class: 'hero-background-overlay' }),
        logoWrapper,
        DOM.el('div', { class: 'hero-text-block' },
          DOM.el('h1', { class: 'world-page-title' }, 
            this.world.title,
            this.world.author ? DOM.el('span', { class: 'world-page-author' }, `by ${this.world.author}`) : null
          ),
          DOM.el('p', { class: 'world-page-description' }, this.world.description),
          DOM.el('div', { class: 'world-page-stats' },
            DOM.el('span', {}, DOM.el('strong', {}, this.bots.filter(b => BotService.hasActualChatLink(b)).length), ' Bots'),
            DOM.el('span', {}, '•'),
            DOM.el('span', {}, DOM.el('strong', {}, this.bots.length), ' characters')
          ),
          (this.world.genres && this.world.genres.length > 0) ? DOM.el('div', { class: 'tags-list', style: { marginTop: '12px' } },
            ...this.world.genres.map(genre => DOM.el('span', { class: 'tag tag-accent bot-tag-pill' }, genre))
          ) : null
        )
      ),

      // 2. Collapsible Lore & Characters Container
      DOM.el('section', {
        id: 'world-lore-container',
        class: 'world-lore-panel'
      },
        DOM.el('div', { class: 'lore-header-wrapper' },
          tabsContainer,
          headerActions
        ),
        loreTabContent,
        charactersTabContent,
        galleryTabContent
      )
    );

    this.worldPageContent = worldPageContent;

    const pageContainer = DOM.el('div', { class: 'page-container world-profile-view' },
      this.worldPageContent
    );
    this.pageContainer = pageContainer;

    DOM.clear(this.appRoot);
    
    // Add breadcrumbs
    await Breadcrumbs.render(pageContainer, { page: 'world', worldId: this.worldId });
    
    this.appRoot.appendChild(pageContainer);

    // Lazy-load the hero background image (priority=true since it's above the fold)
    const heroSection = pageContainer.querySelector('.bg-lazy-hero');
    if (heroSection) lazyLoader.observeBackground(heroSection, true);

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



    this.subscriptions.push(
      globalEventBus.on('bots:synced', () => {
        this.updateBotGrid();
      })
    );

    // Render initial grid
    this.updateBotGrid();

    // 9. Live algorithmic position for the Index Drawer
    let currentY = 0;
    let targetY = 0;
    this.drawerMoving = false;
    
    const lerpDrawer = () => {
      // Stop loop if component is unmounted
      if (!document.getElementById('lore-sidebar-positioner')) {
        this.drawerMoving = false;
        return;
      }
      
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
          this.drawerAnimFrame = requestAnimationFrame(lerpDrawer);
        } else {
          currentY = targetY;
          positioner.style.transform = `translateY(${currentY}px)`;
          this.drawerMoving = false;
        }
      } else {
        this.drawerMoving = false;
      }
    };
    
    this.handleScroll = () => {
      if (!this.drawerMoving) {
        this.drawerMoving = true;
        this.drawerAnimFrame = requestAnimationFrame(lerpDrawer);
      }
    };
    
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    // Trigger initial positioning
    this.handleScroll();
  }

  /**
   * Loads the lore markdown file, parses it, and creates smooth scroll navigation items.
   */
  async loadLoreLogs(url, contentNode, navNode) {
    try {
      this.loreContentNode = contentNode; // Keep track of parent container reference
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this._rawLoreMarkdown = await response.text();
      const htmlContent = LoreService.parseMarkdown(this._rawLoreMarkdown);
      LoreService.buildHierarchicalLore(htmlContent, contentNode, navNode);

      // Inject library terms definition tooltips & subpages link anchors onto plain text nodes
      if (this.libraryData) {
        LoreService.injectLibraryTerms(contentNode, this.libraryData, (path, term) => {
          this.openSubpage(path, term);
        });
      }
    } catch (e) {
      console.warn('[WorldPage] Could not load lore:', e);
    }
  }

  /**
   * Loads a specified subpage markdown file into the lore container view.
   * Keeps structural continuity and logs the state via updated breadcrumbs.
   */
  async openSubpage(subpagePath, termName) {
    if (!this.loreContentNode) return;

    try {
      const response = await fetch(`${this.world.path}/${subpagePath}`);
      if (!response.ok) throw new Error(`HTTP status ${response.status}`);
      const markdown = await response.text();
      const htmlContent = LoreService.parseMarkdown(markdown);
      
      this.currentSubpage = termName;

      // Build subpage container layout with a custom return header action
      this.loreContentNode.innerHTML = `
        <div class="lore-card subpage-card fade-in-up-page">
          <button class="btn btn-secondary subpage-back-btn" id="subpage-close-trigger" style="margin-bottom: 16px;">
            <i class="bi bi-arrow-left"></i> Return to Main Chronicles
          </button>
          <div class="subpage-body-markdown">
            ${htmlContent}
          </div>
        </div>
      `;

      // Bind return button interactions
      this.loreContentNode.querySelector('#subpage-close-trigger').addEventListener('click', () => {
        this.closeSubpage();
      });

      // Initialize spoilers inside the subpage
      LoreService.initSpoilers(this.loreContentNode);

      // Lazy-load any images in the subpage content
      LoreService.observeLoreImages(this.loreContentNode);

      // Recursively allow definitions inside subpage document nodes!
      LoreService.injectLibraryTerms(this.loreContentNode.querySelector('.subpage-body-markdown'), this.libraryData, (path, term) => {
        this.openSubpage(path, term);
      });

      // Hide or collapse the main sidebar menu drawer if active
      const drawer = document.getElementById('lore-sidebar-drawer');
      if (drawer) drawer.classList.remove('active');

      // Re-render deep contextual tracking through Breadcrumbs layout
      await Breadcrumbs.render(this.pageContainer, { 
        page: 'world_subpage', 
        worldId: this.worldId, 
        subpageName: termName,
        onBackToWorld: () => this.closeSubpage()
      });

      document.title = `${termName} - ${this.world.title} - World Nexus`;
      
      // Smooth scroll position to core lore boundary focus area
      document.getElementById('world-lore-container').scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      console.error(`Subpage tracking malfunction at path: "${subpagePath}":`, err);
    }
  }

  /**
   * Restores the initial comprehensive world documentation view pipeline.
   */
  async closeSubpage() {
    this.currentSubpage = null;
    
    // Re-run original logs engine to restore maps, sections, and structural cards
    if (this.loreContentNode) {
      const loreNav = document.querySelector('.lore-nav-list');
      await this.loadLoreLogs(`${this.world.path}/${this.world.lore}`, this.loreContentNode, loreNav);
    }

    // Revert structural metadata states
    document.title = `${this.world.title} - World Nexus`;
    await Breadcrumbs.render(this.pageContainer, { page: 'world', worldId: this.worldId });
  }

  /**
   * Returns clean lore text: strips image markdown and HTML tags from raw markdown.
   * @returns {string}
   */
  _getCleanLoreText() {
    if (!this._rawLoreMarkdown) return '';
    return this._rawLoreMarkdown
      // Remove image markdown: ![alt](url)
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      // Remove inline HTML tags
      .replace(/<[^>]+>/g, '')
      // Collapse excess blank lines left by removals
      .replace(/\n{3,}/g, '\n\n')
      .trim();
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

  // ─────────────────────────────────────────────────────────────────────────
  // Inline Bot Panel hosting
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Opens the bot profile as an inline fixed panel without destroying this page.
   * Returns true if the bot was found in this world and the panel was mounted.
   * Returns false when the bot doesn't belong to this world (App should fall back
   * to full BotPage navigation in that case).
   * @param {string} botId
   * @returns {boolean}
   */
  async openBotPanel(botId) {
    // Verify the bot belongs to this world
    const bot = this.bots.find(b => b.id === botId);
    if (!bot) return false;

    // If an inline profile is already open, unload and clean it up first
    if (this.botProfileView) {
      this.botProfileView.unload();
      const stale = this.pageContainer.querySelector('.bot-profile-inline-container');
      if (stale) stale.remove();
      this.botProfileView = null;
    } else {
      // Save current scroll position and hide the world-specific elements
      this.savedScrollY = window.scrollY;
      this.worldPageContent.style.display = 'none';
    }

    // Scroll to the top of the container
    window.scrollTo(0, 0);

    // Load Markdown lore and sections first, then instantiate reusable profile view
    await LoreService.loadBotLore(bot, this.world.path);
    this.botProfileView = new BotProfileView(bot, this.world, this.bots);
    const profileEl = this.botProfileView.render();
    
    const inlineContainer = DOM.el('div', { class: 'bot-profile-inline-container' }, profileEl);
    this.pageContainer.appendChild(inlineContainer);

    // Dynamically update breadcrumbs at the top of pageContainer
    await Breadcrumbs.render(this.pageContainer, { page: 'bot', worldId: this.worldId, botId: botId });

    // Set page title dynamically
    document.title = `${bot.name} - ${this.world.title} - World Nexus`;

    // Asynchronously load markdown logs and start animations
    await this.botProfileView.load();

    return true;
  }

  /**
   * Closes the open inline bot profile and returns to world elements view.
   */
  async closeBotPanel() {
    if (this.botProfileView) {
      this.botProfileView.unload();
      this.botProfileView = null;
    }

    const inlineContainer = this.pageContainer.querySelector('.bot-profile-inline-container');
    if (inlineContainer) inlineContainer.remove();

    // Show world content back
    this.worldPageContent.style.display = 'block';

    // Restore page title
    document.title = `${this.world.title} - World Nexus`;

    // Dynamically restore breadcrumbs to world context
    await Breadcrumbs.render(this.pageContainer, { page: 'world', worldId: this.worldId });

    // Restore user scroll position smoothly
    if (this.savedScrollY !== undefined) {
      window.scrollTo(0, this.savedScrollY);
    }
  }

  /**
   * Returns true if a bot inline profile is currently open.
   * @returns {boolean}
   */
  hasBotPanel() {
    return !!this.botProfileView;
  }

  /**
   * Crawler that collects, de-duplicates, and renders all images related to the world and characters.
   */
  async loadAndRenderGallery() {
    if (!this.galleryTabContent) return;

    // Show loading spinner
    DOM.clear(this.galleryTabContent);
    const spinner = DOM.el('div', { 
      class: 'gallery-loader', 
      style: 'display: flex; justify-content: center; align-items: center; min-height: 200px; color: var(--text-muted); font-family: var(--font-serif); font-size: var(--fs-md);' 
    }, 'Loading archive imagery...');
    this.galleryTabContent.appendChild(spinner);

    try {
      // Pre-load all bots' raw lore so we can extract sprites/scenes from their markdown
      const promises = this.bots.map(bot => LoreService.loadBotLore(bot, this.world.path));
      await Promise.all(promises);

      const images = [];

      // Helper functions defined locally to prevent pollution
      const isLocalImage = (src) => {
        if (!src) return false;
        if (src.startsWith('data:')) return false;
        if (src.startsWith('http://') || src.startsWith('https://')) {
          return src.includes('minimumlogix.github.io/World-Nexus') || src.includes('localhost') || src.includes('127.0.0.1');
        }
        return true;
      };

      const cleanLocalPath = (src) => {
        let cleaned = src;
        if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
          try {
            const url = new URL(cleaned);
            cleaned = url.pathname.replace(/^\/World-Nexus\//, '');
          } catch (e) {
            // fallback if URL parsing fails
          }
        }
        cleaned = cleaned.replace(/^\//, '');
        cleaned = cleaned.replace(/\\/g, '/');
        return cleaned;
      };

      const extractImagesFromMarkdown = (markdown, defaultCategory) => {
        const list = [];
        if (!markdown) return list;

        // 1. Markdown images: ![alt](url)
        const mdImageRegex = /!\[(.*?)\]\((.*?)\)/g;
        let match;
        while ((match = mdImageRegex.exec(markdown)) !== null) {
          const alt = match[1] || 'Concept Art';
          const src = match[2];
          if (src && isLocalImage(src)) {
            list.push({ src: cleanLocalPath(src), alt, category: defaultCategory });
          }
        }

        // 2. HTML img src
        const htmlSrcRegex = /<img[^>]+src=["'](.*?)["']/gi;
        while ((match = htmlSrcRegex.exec(markdown)) !== null) {
          const src = match[1];
          if (src && isLocalImage(src)) {
            const altMatch = /alt=["'](.*?)["']/i.exec(match[0]);
            const alt = altMatch ? altMatch[1] : 'Concept Art';
            list.push({ src: cleanLocalPath(src), alt, category: defaultCategory });
          }
        }

        // 3. HTML background-image style: url(...)
        const htmlStyleRegex = /background-image:\s*url\(['"]?(.*?)['"]?\)/gi;
        while ((match = htmlStyleRegex.exec(markdown)) !== null) {
          const src = match[1];
          if (src && isLocalImage(src)) {
            list.push({ src: cleanLocalPath(src), alt: 'Background Scene', category: defaultCategory });
          }
        }

        return list;
      };

      // 1. Crawl World Cover
      if (this.world.coverImage) {
        images.push({
          src: `${this.world.path}/${this.world.coverImage}`,
          alt: 'World Cover',
          category: 'World'
        });
      }

      // 2. Crawl World Logo
      if (this.world.logo) {
        images.push({
          src: `${this.world.path}/${this.world.logo}`,
          alt: 'World Logo',
          category: 'World'
        });
      }

      // 3. Crawl World Lore Markdown Images
      if (this._rawLoreMarkdown) {
        images.push(...extractImagesFromMarkdown(this._rawLoreMarkdown, 'World'));
      }

      // 4. Crawl Sibling Character Images
      this.bots.forEach(bot => {
        if (bot.cardImage) {
          images.push({
            src: bot.cardImage,
            alt: `${bot.name} Card Portrait`,
            category: bot.name
          });
        }
        if (bot.avatar && bot.avatar !== bot.cardImage) {
          images.push({
            src: bot.avatar,
            alt: `${bot.name} Avatar`,
            category: bot.name
          });
        }
        if (bot.sprite) {
          images.push({
            src: bot.sprite,
            alt: `${bot.name} Sprite`,
            category: bot.name
          });
        }
        if (bot.rawLoreMarkdown) {
          images.push(...extractImagesFromMarkdown(bot.rawLoreMarkdown, bot.name));
        }
        if (bot.rawScenarioMarkdown) {
          images.push(...extractImagesFromMarkdown(bot.rawScenarioMarkdown, bot.name));
        }
      });

      // De-duplicate by normalized paths
      const seen = new Set();
      const uniqueImages = [];
      for (const img of images) {
        const norm = cleanLocalPath(img.src);
        if (!seen.has(norm)) {
          seen.add(norm);
          
          // Determine friendly descriptions if defaults
          let friendlyAlt = img.alt;
          if (friendlyAlt === 'Concept Art' || friendlyAlt === 'Image' || friendlyAlt === 'Background Scene') {
            const fileName = norm.split('/').pop().split('.')[0];
            friendlyAlt = fileName
              .split(/[-_]/)
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          }

          uniqueImages.push({
            src: norm,
            alt: friendlyAlt,
            category: img.category
          });
        }
      }

      // Clean loading spinner and render
      DOM.clear(this.galleryTabContent);
      if (uniqueImages.length === 0) {
        this.galleryTabContent.appendChild(
          DOM.el('p', { style: 'text-align: center; color: var(--text-muted); font-style: italic; padding: 40px;' }, 'No visual media records verified in this sector.')
        );
      } else {
        this.renderGalleryGrid(uniqueImages);
      }

    } catch (err) {
      console.error('Gallery loading failed:', err);
      DOM.clear(this.galleryTabContent);
      this.galleryTabContent.appendChild(
        DOM.el('p', { class: 'error-msg', style: 'text-align: center; color: var(--text-muted); font-style: italic; padding: 40px;' }, 'Failed to retrieve media logs.')
      );
    }
  }

  /**
   * Renders the category filters and Google Photos grid.
   */
  renderGalleryGrid(images) {
    const categories = ['All', ...new Set(images.map(img => img.category))];
    
    // Filter pills
    const filterPills = DOM.el('div', { class: 'tags-list gallery-filters' });
    let activeCategory = 'All';

    // Grid wrapper
    const grid = DOM.el('div', { class: 'gallery-grid' });

    const renderItems = (cat) => {
      DOM.clear(grid);
      const filtered = cat === 'All' ? images : images.filter(img => img.category === cat);

      filtered.forEach(img => {
        let aspectClass = '';
        const lowerSrc = img.src.toLowerCase();
        if (lowerSrc.includes('avatar') || lowerSrc.includes('pfp')) {
          aspectClass = 'aspect-square';
        } else if (lowerSrc.includes('sprite')) {
          aspectClass = 'aspect-portrait';
        } else if (lowerSrc.includes('cover') || lowerSrc.includes('bgi') || lowerSrc.includes('bg')) {
          aspectClass = 'aspect-landscape';
        }

        // On Github Pages, prepend the repository name to local paths so they resolve correctly
        let imageSrc = img.src;
        const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
        if (!isLocalhost && !imageSrc.startsWith('http://') && !imageSrc.startsWith('https://')) {
          const repoSegment = window.location.pathname.split('/')[1];
          if (repoSegment) {
            imageSrc = '/' + repoSegment + '/' + imageSrc;
          }
        }

        const imgEl = DOM.el('img', {
          'data-src': imageSrc,
          alt: img.alt,
          class: 'gallery-image img-lazy-pending',
          decoding: 'async'
        });
        lazyLoader.observe(imgEl);

        const item = DOM.el('div', { class: `gallery-item ${aspectClass}` },
          DOM.el('div', { class: 'gallery-img-wrapper' },
            imgEl
          ),
          DOM.el('div', { class: 'gallery-overlay' },
            DOM.el('p', { class: 'gallery-img-category' }, img.category.toUpperCase()),
            DOM.el('h3', { class: 'gallery-img-title' }, img.alt)
          )
        );

        grid.appendChild(item);
      });
    };

    categories.forEach(cat => {
      const pill = DOM.el('button', {
        class: `tag gallery-filter-pill ${cat === activeCategory ? 'active' : ''}`,
        onclick: () => {
          activeCategory = cat;
          filterPills.querySelectorAll('.gallery-filter-pill').forEach(btn => btn.classList.remove('active'));
          pill.classList.add('active');
          renderItems(cat);
        }
      }, cat === 'World' ? 'WORLD DESIGN' : cat.toUpperCase());
      filterPills.appendChild(pill);
    });

    this.galleryTabContent.appendChild(filterPills);
    this.galleryTabContent.appendChild(grid);

    // Initial render
    renderItems('All');
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
    if (this.botProfileView) {
      this.botProfileView.unload();
      this.botProfileView = null;
    }

    this.subscriptions.forEach(unsubscribe => unsubscribe());
    
    if (this.filterController) {
      this.filterController.destroy();
    }

    if (this.botSearchController) {
      this.botSearchController.destroy();
    }

    if (this.drawerAnimFrame) {
      cancelAnimationFrame(this.drawerAnimFrame);
    }

    if (this.handleScroll) {
      window.removeEventListener('scroll', this.handleScroll);
    }

    ThemeLoader.unloadWorldTheme();
  }
}
export default WorldPage;
