/* js/ui/BotProfileView.js
   Reusable UI component for rendering a bot's full profile view.
   Used by both BotPage.js (standalone view) and WorldPage.js (inline view).
*/
import { DOM } from '../utils/DOM.js';
import { LoreService } from '../services/LoreService.js';
import { BotCard } from './BotCard.js';
import { router } from '../core/Router.js';
import { lazyLoader } from './LazyLoader.js';
import { CommentSystem } from './CommentSystem.js';
import { stateManager } from '../core/StateManager.js';

export class BotProfileView {
  /**
   * @param {Object} bot - The bot data object
   * @param {Object} world - The parent world object
   * @param {Array} siblings - All bots in the same world
   */
  constructor(bot, world, siblings) {
    this.bot = bot;
    this.world = world;
    this.relatedBots = siblings.filter(b => b.id !== bot.id);
    this.containerEl = null;
    this.drawerAnimFrame = null;
    this.loreNav = null;
    this.loreContentNode = null;
    this._rawMarkdown = null;
    this.handleScroll = null;
  }

  /**
   * Builds the DOM elements for the bot profile.
   * @returns {HTMLElement} The root div element containing the bot profile content
   */
  render() {
    // 1. Relations / Social Ties
    const relations = this.bot.relations || {};
    const relationKeys = Object.keys(relations);
    let tiesContainer = null;
    
    if (relationKeys.length > 0) {
      const avatarsList = relationKeys.map(name => {
        const relatedBot = this.relatedBots.find(b => b.name.toLowerCase() === name.toLowerCase());
        if (relatedBot && relatedBot.avatar) {
          // Use data-src for lazy loading — avatars are below the fold
          const avatarImg = DOM.el('img', {
            'data-src': relatedBot.avatar,
            class: 'bot-tie-avatar',
            alt: name,
            decoding: 'async'
          });
          lazyLoader.observe(avatarImg);
          return DOM.el('a', {
            href: `#/bot/${relatedBot.id}`,
            class: 'bot-tie-avatar-link',
            title: `${name} (${relations[name]})`
          }, avatarImg);
        } else {
          return DOM.el('div', { 
            class: 'bot-tie-avatar-fallback', 
            title: `${name} (${relations[name]})` 
          }, name.charAt(0).toUpperCase());
        }
      });
      tiesContainer = DOM.el('div', { class: 'bot-hero-ties' }, ...avatarsList);
    }

    // 2. Genres & Abilities tags
    const genres = this.bot.genres || [];
    const abilities = this.bot.abilities || [];
    const allTagsPills = [
      ...genres.map(genre => DOM.el('span', { class: 'tag tag-accent bot-tag-pill' }, genre)),
      ...abilities.map(ability => DOM.el('span', { class: 'tag tag-accent bot-tag-pill' }, ability))
    ];

    // 3. Action buttons
    const actionsRow = DOM.el('div', { class: 'bot-hero-actions-redesign' },
      DOM.el('a', {
        href: this.bot.chatEndpoint || '#',
        class: `btn ${this.bot.chatEndpoint ? 'btn-accent' : 'btn-disabled'} bot-hero-chat-btn`,
        style: { display: 'inline-flex', alignItems: 'center', gap: '8px' },
        target: this.bot.chatEndpoint ? '_blank' : '_self',
        rel: 'noopener',
        onclick: (e) => {
          if (!this.bot.chatEndpoint) e.preventDefault();
        }
      }, 
        DOM.el('i', { class: 'bi bi-chat-dots-fill' }),
        'Start Chat'
      ),
      DOM.el('button', {
        class: 'btn btn-secondary',
        style: { display: 'inline-flex', alignItems: 'center', gap: '8px' },
        onclick: () => router.navigate(`/world/${this.world.id}`)
      }, 
        DOM.el('i', { class: 'bi bi-globe' }),
        'Open World'
      ),
      DOM.el('button', {
        class: 'btn btn-secondary',
        style: { display: 'inline-flex', alignItems: 'center', gap: '8px' },
        onclick: (e) => {
          navigator.clipboard.writeText(window.location.href);
          const btn = e.currentTarget;
          const orig = btn.innerHTML;
          btn.innerHTML = '<i class="bi bi-check2"></i> Copied!';
          setTimeout(() => { if (btn) btn.innerHTML = orig; }, 2000);
        }
      }, 
        DOM.el('i', { class: 'bi bi-share' }),
        'Share Profile'
      )
    );

    // 4. Collapsible Chronicles Header Actions
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
      title: 'Share Profile',
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
      title: 'Toggle Log',
      style: iconBtnStyle,
      onclick: () => {
        const lorePanel = document.getElementById('bot-lore-panel');
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

    // 5. Index Drawer
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

    this.loreNav = DOM.el('ul');
    this.loreContentNode = DOM.el('div', { class: 'lore-grid' });

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
        this.loreNav
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

    const tabGalleryBtn = DOM.el('button', {
      class: 'lore-tab-btn',
      'data-tab': 'gallery'
    }, DOM.el('i', { class: 'bi bi-images' }), DOM.el('span', { class: 'tab-text' }, 'GALLERY'));

    const tabsContainer = DOM.el('div', { class: 'lore-tabs-container' },
      tabLoreBtn,
      tabGalleryBtn
    );

    // Tab contents
    const loreTabContent = DOM.el('div', { class: 'bot-lore-tab-content' },
      sidebarPositioner,
      this.loreContentNode
    );

    const galleryTabContent = DOM.el('div', { class: 'bot-gallery-tab-content' });
    this.galleryTabContent = galleryTabContent;

    // Switch active tab function
    const switchTab = (tabName) => {
      tabLoreBtn.classList.remove('active');
      tabGalleryBtn.classList.remove('active');

      loreTabContent.style.display = 'none';
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
      } else if (tabName === 'gallery') {
        tabGalleryBtn.classList.add('active');
        galleryTabContent.style.display = 'block';
        
        // Hide tab-specific actions
        copyLoreButton.style.display = 'none';
        collapseButton.style.display = 'none';
        
        // Un-collapse the panel automatically to reveal the gallery
        const panel = document.getElementById('bot-lore-panel');
        if (panel) {
          panel.classList.remove('collapsed');
          collapseIcon.style.transform = 'rotate(0deg)';
        }

        this.loadAndRenderGallery();
      }
    };

    tabLoreBtn.onclick = () => switchTab('lore');
    tabGalleryBtn.onclick = () => switchTab('gallery');

    // 6. Related Bots grid
    const relatedBotsContainer = DOM.el('div', { class: 'related-bots-grid' });
    if (this.relatedBots.length > 0) {
      this.relatedBots.forEach(rb => relatedBotsContainer.appendChild(BotCard.render(rb)));
    } else {
      relatedBotsContainer.appendChild(DOM.el('p', { class: 'related-bots-empty' }, 'No other intelligent entities registered in this world vector.'));
    }

    // Render character badges based on bot details
    const isCanon = !this.bot.custom || this.bot.metadata?.status === 'Canon' || this.bot.status === 'Canon';
    const statusText = isCanon ? 'Canon' : 'Community-Submitted';

    const getCharacterBadges = (bot) => {
      const badges = [];
      const botId = (bot.id || '').toLowerCase();
      
      // Explicit mapping for default bots
      if (botId === 'mary-ultara' || botId === 'mary-ultarra') {
        badges.push({ type: 'main-cast', label: 'Main Cast', icon: 'bi-award-fill' });
        badges.push({ type: 'world-mascot', label: 'World Mascot', icon: 'bi-lightning-charge-fill' });
      } else if (botId === 'max-smasher') {
        badges.push({ type: 'main-cast', label: 'Main Cast', icon: 'bi-award-fill' });
        badges.push({ type: 'community-favorite', label: 'Community Favorite', icon: 'bi-heart-fill' });
      } else if (botId === 'roselyn-thorne') {
        badges.push({ type: 'community-favorite', label: 'Community Favorite', icon: 'bi-heart-fill' });
      }

      // Check if there are badges in the bot data itself
      if (Array.isArray(bot.badges)) {
        bot.badges.forEach(b => {
          const lower = b.toLowerCase();
          if (lower === 'main cast' && !badges.some(x => x.type === 'main-cast')) {
            badges.push({ type: 'main-cast', label: 'Main Cast', icon: 'bi-award-fill' });
          } else if (lower === 'community favorite' && !badges.some(x => x.type === 'community-favorite')) {
            badges.push({ type: 'community-favorite', label: 'Community Favorite', icon: 'bi-heart-fill' });
          } else if (lower === 'world mascot' && !badges.some(x => x.type === 'world-mascot')) {
            badges.push({ type: 'world-mascot', label: 'World Mascot', icon: 'bi-lightning-charge-fill' });
          }
        });
      }
      return badges;
    };

    const activeBadges = getCharacterBadges(this.bot);
    const charBadges = [
      DOM.el('span', {
        class: `nexus-badge badge-canon ${isCanon ? 'status-canon' : 'status-community'}`,
        'data-tooltip': isCanon ? 'Verified Canon Character' : 'Community Submitted Character',
        style: {
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          padding: '1px 6px',
          borderRadius: '4px',
          height: '18px',
          fontWeight: 'bold'
        }
      }, statusText.toUpperCase()),
      ...activeBadges.map(b => DOM.el('span', {
        class: `nexus-badge badge-${b.type}`,
        'data-tooltip': b.label
      }, DOM.el('i', { class: `bi ${b.icon}` })))
    ];

    // Resolve creators and collaborators using worldConfig
    const worldCollaborators = stateManager.getState('worldCollaborators') || {};
    const worldConfig = worldCollaborators[this.world.id] || { owner: this.world.author || 'Odin', collaborators: {} };
    
    // Normalize user name mapping
    const worldOwner = worldConfig.owner || 'Odin';
    const createdBy = this.bot.createdBy || this.bot.from || worldOwner;

    // Maintainers are world owner + all collaborators with role Owner, Admin, Editor
    const maintainers = [worldOwner];
    Object.entries(worldConfig.collaborators || {}).forEach(([username, role]) => {
      if ((role === 'Admin' || role === 'Editor' || role === 'Owner') && !maintainers.includes(username)) {
        maintainers.push(username);
      }
    });

    const creditBlock = DOM.el('div', { class: 'bot-metadata-credits-grid' },
      DOM.el('div', { class: 'metadata-credit-item' },
        DOM.el('span', { class: 'credit-label' }, 'World'),
        DOM.el('span', { class: 'credit-value' },
          DOM.el('a', {
            class: 'credit-link',
            onclick: (e) => {
              e.preventDefault();
              router.navigate(`/world/${this.world.id}`);
            }
          }, this.world.title)
        )
      ),
      DOM.el('div', { class: 'metadata-credit-item' },
        DOM.el('span', { class: 'credit-label' }, 'Created By'),
        DOM.el('span', { class: 'credit-value' },
          DOM.el('a', {
            href: `#/profile/${createdBy}`,
            class: 'mention-tag mention-tag-user'
          }, `@${createdBy}`)
        )
      ),
      DOM.el('div', { class: 'metadata-credit-item' },
        DOM.el('span', { class: 'credit-label' }, 'Maintained By'),
        DOM.el('span', { class: 'credit-value' },
          ...maintainers.map((m, idx) => [
            idx > 0 ? ', ' : '',
            DOM.el('a', {
              href: `#/profile/${m}`,
              class: 'mention-tag mention-tag-user'
            }, `@${m}`)
          ]).flat()
        )
      ),
      DOM.el('div', { class: 'metadata-credit-item' },
        DOM.el('span', { class: 'credit-label' }, 'Status'),
        DOM.el('span', {
          class: `credit-value status-indicator ${isCanon ? 'canon' : 'community'}`
        }, statusText)
      )
    );

    const commentsSection = CommentSystem.render('bot', this.bot.id);

    // Assemble profile body
    this.containerEl = DOM.el('div', { class: 'bot-profile-body fade-in-up-page' },
      // 1. Hero Block
      DOM.el('section', { class: 'bot-hero-redesign' },
        DOM.el('div', { 
          class: 'bot-hero-portrait-card bg-lazy-portrait bg-lazy-pending',
          'data-bg-src': this.bot.cardImage
        },
          DOM.el('div', { class: 'hero-background-overlay' }),
          DOM.el('h1', { class: 'bot-hero-name' }, this.bot.name.toUpperCase())
        ),
        DOM.el('div', { class: 'bot-hero-tagline' }, (this.bot.metadata?.character || '').toUpperCase()),
        creditBlock,
        DOM.el('div', { class: 'badge-showcase', style: { justifyContent: 'center', marginBottom: '16px' } }, ...charBadges),
        DOM.el('div', { class: 'bot-hero-desc-card' },
          DOM.el('p', { class: 'bot-hero-description-text' }, this.bot.description)
        ),
        allTagsPills.length > 0 ? DOM.el('div', { class: 'tags-list', style: { marginBottom: '12px', justifyContent: 'center' } }, ...allTagsPills) : null,
        actionsRow,
        tiesContainer
      ),

      // 2. Collapsible Chronicle Logs
      DOM.el('section', { id: 'bot-lore-panel', class: 'world-lore-panel bot-lore-panel' },
        DOM.el('div', { class: 'bot-lore-panel-header' },
          tabsContainer,
          headerActions
        ),
        loreTabContent,
        galleryTabContent
      ),

      // 3. Related Bots Grid
      DOM.el('section', { class: 'related-bots-section' },
        DOM.el('h2', {}, 'Related Entities in Sector'),
        relatedBotsContainer
      ),

      // 4. Comments Section
      commentsSection
    );

    return this.containerEl;
  }

  /**
   * Fetches the markdown logs asynchronously and animates the sidebar drawer.
   */
  async load() {
    // Lazy-load the main character portrait background image (priority=true as above fold)
    const portraitCard = this.containerEl ? this.containerEl.querySelector('.bg-lazy-portrait') : null;
    if (portraitCard) {
      lazyLoader.observeBackground(portraitCard, true);
    }

    try {
      let fullMarkdown = this.bot.rawLoreMarkdown || '';
      if (this.bot.rawScenarioMarkdown) {
        fullMarkdown += '\n\n' + this.bot.rawScenarioMarkdown;
      }
      this._rawMarkdown = fullMarkdown;
      const htmlMarkdown = LoreService.parseMarkdown(this._rawMarkdown);
      
      // Clear placeholder and build the structured content
      DOM.clear(this.loreContentNode);
      const contentNode = DOM.el('div', { class: 'lore-body-content' });
      this.loreContentNode.appendChild(contentNode);
      
      LoreService.buildHierarchicalLore(htmlMarkdown, contentNode, this.loreNav, this.bot);
    } catch (e) {
      console.warn('[BotProfileView] Could not load lore:', e);
      DOM.clear(this.loreContentNode);
      this.loreContentNode.appendChild(
        DOM.el('p', { class: 'error-msg', style: { color: 'var(--text-muted)', fontStyle: 'italic', padding: '24px' } }, 'Failed to retrieve database logs.')
      );
    }

    // Animate Index Drawer positioner
    this._startDrawerAnimation();
  }

  /**
   * Returns clean lore text: strips image markdown and HTML tags from raw markdown.
   * @returns {string}
   */
  _getCleanLoreText() {
    if (!this._rawMarkdown) return '';
    return this._rawMarkdown
      // Remove image markdown: ![alt](url)
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      // Remove inline HTML tags
      .replace(/<[^>]+>/g, '')
      // Collapse excess blank lines left by removals
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Cleans up running animations.
   */
  unload() {
    if (this.drawerAnimFrame) {
      cancelAnimationFrame(this.drawerAnimFrame);
    }
    if (this.handleScroll) {
      window.removeEventListener('scroll', this.handleScroll);
    }
  }

  /**
   * Crawler that collects, de-duplicates, and renders all images related to this character.
   */
  async loadAndRenderGallery() {
    if (!this.galleryTabContent) return;

    // Show loading spinner
    DOM.clear(this.galleryTabContent);
    const spinner = DOM.el('div', { 
      class: 'gallery-loader', 
      style: 'display: flex; justify-content: center; align-items: center; min-height: 200px; color: var(--text-muted); font-family: var(--font-serif); font-size: var(--fs-md);' 
    }, 'Loading character database assets...');
    this.galleryTabContent.appendChild(spinner);

    try {
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

      // 1. Portrait Card Image
      if (this.bot.cardImage) {
        images.push({
          src: this.bot.cardImage,
          alt: 'Portrait Card',
          category: 'Portraits'
        });
      }

      // 2. Profile Avatar Image
      if (this.bot.avatar && this.bot.avatar !== this.bot.cardImage) {
        images.push({
          src: this.bot.avatar,
          alt: 'Avatar',
          category: 'Portraits'
        });
      }

      // 2.5. Sprite Image
      if (this.bot.sprite) {
        images.push({
          src: this.bot.sprite,
          alt: 'Sprite',
          category: 'Sprites'
        });
      }

      // 3. Markdown Images from character lore & scenario
      if (this.bot.rawLoreMarkdown) {
        images.push(...extractImagesFromMarkdown(this.bot.rawLoreMarkdown, 'Story'));
      }
      if (this.bot.rawScenarioMarkdown) {
        images.push(...extractImagesFromMarkdown(this.bot.rawScenarioMarkdown, 'Story'));
      }

      // De-duplicate by normalized paths
      const seen = new Set();
      const uniqueImages = [];
      for (const img of images) {
        const norm = cleanLocalPath(img.src);
        if (!seen.has(norm)) {
          seen.add(norm);

          // Categorize images logically based on name/path
          let cat = img.category;
          const lowerName = norm.toLowerCase();
          if (lowerName.includes('avatar') || lowerName.includes('pfp')) {
            cat = 'Portraits';
          } else if (lowerName.includes('sprite')) {
            cat = 'Sprites';
          } else if (lowerName.includes('bgi') || lowerName.includes('bg') || lowerName.includes('backdrop') || lowerName.includes('background')) {
            cat = 'Backgrounds';
          }

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
            category: cat
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
      console.error('Character gallery loading failed:', err);
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
      }, cat.toUpperCase());
      filterPills.appendChild(pill);
    });

    this.galleryTabContent.appendChild(filterPills);
    this.galleryTabContent.appendChild(grid);

    // Initial render
    renderItems('All');
  }

  /**
   * Smooth drawer lerping animation on scroll.
   * @private
   */
  _startDrawerAnimation() {
    let currentY = 0;
    let targetY = 0;
    this.drawerMoving = false;
    
    const lerpDrawer = () => {
      if (!document.getElementById('lore-sidebar-positioner')) {
        this.drawerMoving = false;
        return;
      }
      
      const positioner = document.getElementById('lore-sidebar-positioner');
      const drawer = document.getElementById('lore-sidebar-drawer');
      const panel = document.getElementById('bot-lore-panel');
      
      if (positioner && drawer && panel) {
        const panelRect = panel.getBoundingClientRect();
        const headerOffset = 100; // Sticky header gap
        
        let desiredY = 0;
        if (panelRect.top < headerOffset) {
          desiredY = headerOffset - panelRect.top;
          const maxTranslate = panelRect.height - drawer.offsetHeight - 40;
          if (desiredY > maxTranslate) desiredY = maxTranslate;
        }
        targetY = Math.max(0, desiredY);
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
}

export default BotProfileView;
