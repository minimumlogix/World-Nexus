/* js/pages/ProfilePage.js */
import { DOM } from '../utils/DOM.js';
import { WorldService } from '../services/WorldService.js';
import { BotService } from '../services/BotService.js';
import { stateManager } from '../core/StateManager.js';
import { router } from '../core/Router.js';
import { globalEventBus } from '../core/EventBus.js';
import { Breadcrumbs } from '../ui/Breadcrumbs.js';
import { WorldCard } from '../ui/WorldCard.js';
import { BotCard } from '../ui/BotCard.js';
import { lazyLoader } from '../ui/LazyLoader.js';
import { sanitizeUrl, sanitizeCssUrl } from '../utils/Security.js';

export class ProfilePage {
  /**
   * Controller for Creator Profile views.
   * @param {HTMLElement} appRoot - App insertion parent node
   * @param {string} username - Target creator username
   */
  constructor(appRoot, username) {
    this.appRoot = appRoot;
    this.username = username;
    this.user = null;
    this.worlds = [];
    this.bots = [];
    this.activeTab = 'worlds';
    this.subscriptions = [];
  }

  /**
   * Loads profile details, filters owned worlds/characters, and renders the layout.
   */
  async load() {
    try {
      // 1. Fetch registry lists
      this.worlds = await WorldService.getWorlds() || [];
      this.bots = await BotService.getAllBots() || [];

      // 2. Resolve creator user object
      this.user = this.resolveUser();
      if (!this.user) {
        throw new Error('User record not found in the grid registry');
      }

      // Update document title
      document.title = `@${this.user.username} - Creator Profile - World Nexus`;

      // 3. Build DOM layout with custom theme class
      const themeClass = this.user.profileTheme ? `theme-${this.user.profileTheme.toLowerCase().replace(/\s+/g, '-')}` : 'theme-default-nexus';
      const container = DOM.el('div', { class: `profile-container fade-in-up-page ${themeClass}` });
      DOM.clear(this.appRoot);
      this.appRoot.appendChild(container);

      // Render breadcrumbs
      await Breadcrumbs.render(container, { page: 'profile', username: this.user.username });

      // Render header and tabs
      const headerEl = this.renderHeader();
      const tabsEl = this.renderTabs();
      const contentNode = DOM.el('div', { class: 'profile-tab-content-node' });

      container.appendChild(headerEl);
      container.appendChild(tabsEl);
      container.appendChild(contentNode);

      this.contentNode = contentNode;

      // Render initial active tab contents
      this.renderTabContent();

      // Subscribe to state change redrawing if needed
      this.subscriptions.push(
        globalEventBus.on('state:change', () => {
          try {
            // Re-resolve in case custom characters or worlds updated
            this.user = this.resolveUser();
            this.renderTabContent();
          } catch (err) {
            console.error('[ProfilePage] Error handling state change redrawing:', err);
          }
        })
      );
    } catch (err) {
      console.error('[ProfilePage] Failed to load creator profile page:', err);
      DOM.clear(this.appRoot);
      this.appRoot.appendChild(
        DOM.el('div', { class: 'page-container error-crash-view', style: { textAlign: 'center', padding: '96px 24px' } },
          DOM.el('h2', {}, 'Creator telemetry offline'),
          DOM.el('p', { style: { color: 'var(--text-muted)', margin: '16px 0 24px' } }, `Uplink error: ${err.message}`),
          DOM.el('button', { class: 'btn btn-primary', onclick: () => router.navigate('#/') }, 'Return to Hub Grid')
        )
      );
    }
  }

  /**
   * Resolves creator metadata from profile state or mocks.
   */
  resolveUser() {
    try {
      const curUser = stateManager.getState('currentUser');
      const nameLower = this.username.toLowerCase();

      // Case 1: Self
      if (curUser && curUser.username.toLowerCase() === nameLower) {
        // Refresh count attributes from local storage arrays
        const customWorlds = stateManager.getState('customWorlds') || [];
        const customChars = stateManager.getState('customCharacters') || [];
        
        return {
          ...curUser,
          worldsCount: customWorlds.length,
          charactersCount: customChars.length,
          custom: true
        };
      }

      // Case 2: Seed Mock Creator 'Odin'
      if (nameLower === 'odin') {
        return {
          username: 'Odin',
          avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%232e185b"/><text x="50" y="55" fill="%23fef08a" font-size="32" font-family="Outfit" text-anchor="middle">O</text></svg>`,
          role: 'Creator',
          banner: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80',
          tagline: 'World Architect',
          bio: 'Building sprawling sectors of metal magic and void science. Main architect of Arcanis and Azmerheim.',
          worldsCount: 2,
          followersCount: 152,
          followingCount: 430,
          viewsCount: '14.3k',
          badges: ['Founder', 'Verified Creator', 'Lore Master', 'Character Designer', 'Top Collaborator'],
          worlds: ['arcanis', 'azmerheim'],
          characters: ['mary-ultarra', 'max-smasher']
        };
      }

      // Case 3: Seed Mock Creator 'Nova'
      if (nameLower === 'nova') {
        return {
          username: 'Nova',
          avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23115e59"/><text x="50" y="55" fill="%2322d3ee" font-size="32" font-family="Outfit" text-anchor="middle">N</text></svg>`,
          role: 'Verified Creator',
          banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80',
          tagline: 'Lore Scribe & Space Cartographer',
          bio: 'Co-creator of Mary Ultarra and secondary compiler of the Chronicles of Arcanis.',
          worldsCount: 1,
          followersCount: 98,
          followingCount: 120,
          viewsCount: '4.5k',
          badges: ['Early Creator', 'Lore Master', 'Verified Creator', 'Top Collaborator'],
          worlds: ['arcanis'],
          characters: ['mary-ultarra']
        };
      }

      // Case 4: General Placeholder profile
      const properName = this.username.charAt(0).toUpperCase() + this.username.slice(1);
      return {
        username: properName,
        avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%231e293b"/><text x="50" y="55" fill="%2394a3b8" font-size="32" font-family="Outfit" text-anchor="middle">${properName.charAt(0)}</text></svg>`,
        role: 'Guest',
        banner: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80',
        tagline: 'Nexus Voyager',
        bio: `Citizen registry vector of sector ${properName.toUpperCase()}.`,
        worldsCount: 0,
        followersCount: 0,
        followingCount: 0,
        viewsCount: '12',
        badges: ['Early Creator'],
        worlds: [],
        characters: []
      };
    } catch (e) {
      console.warn('[ProfilePage] error resolving user record:', e);
      return {
        username: this.username,
        avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23991b1b"/><text x="50" y="55" fill="%23fef2f2" font-size="32" font-family="Outfit" text-anchor="middle">?</text></svg>`,
        role: 'Telemetry Error',
        banner: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80',
        tagline: 'Record Corrupted',
        bio: 'The profile details could not be parsed properly.',
        worldsCount: 0,
        followersCount: 0,
        followingCount: 0,
        viewsCount: '0',
        badges: [],
        worlds: [],
        characters: []
      };
    }
  }

  /**
   * Renders the header segment of the profile.
   */
  renderHeader() {
    // Resolve banner style
    const rawBanner = this.user.banner || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80';
    const bannerUrl = rawBanner.startsWith('http') || rawBanner.startsWith('data:') ? rawBanner : `./${rawBanner}`;
    const safeBannerUrl = sanitizeCssUrl(bannerUrl);
    const bannerOffset = this.user.customBannerOffset || 50;
    const bannerZoom = this.user.customBannerZoom || 1;

    // Header container
    const details = DOM.el('div', { class: 'profile-header-details' });

    // Avatar
    const safeAvatar = sanitizeUrl(this.user.avatar, this.user.username);
    const avatar = DOM.el('div', { class: 'profile-avatar-wrapper' },
      DOM.el('img', { src: safeAvatar, class: 'profile-avatar-img', alt: this.user.username })
    );

    // Badges list
    const badgesToShow = this.user.identity?.displayedBadges || this.user.badges || [];
    const badgeElements = badgesToShow.map(bName => {
      const iconClass = this.getBadgeIcon(bName);
      return DOM.el('span', {
        class: `nexus-badge badge-${bName.toLowerCase().replace(' ', '-')}`,
        'data-tooltip': bName
      }, DOM.el('i', { class: iconClass }));
    });
    
    // Custom label verified badge if verified creator
    if (this.user.role === 'Verified Creator') {
      badgeElements.push(
        DOM.el('span', { class: 'nexus-badge badge-verified-creator', 'data-tooltip': 'Canon Verified' }, 
          DOM.el('i', { class: 'bi bi-patch-check-fill' })
        )
      );
    }

    // Name + Tags
    const displayName = this.user.displayName || this.user.username;
    const pronounsSpan = this.user.pronouns ? DOM.el('span', { class: 'profile-pronouns-tag', style: { color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', fontStyle: 'italic', marginLeft: '6px' } }, `(${this.user.pronouns})`) : null;
    const roleTitle = this.user.identity?.displayedRole || this.user.role || 'Creator';

    const nameRow = DOM.el('div', { class: 'profile-name-row' },
      DOM.el('h2', { class: 'profile-display-name' }, `@${displayName}`),
      pronounsSpan,
      DOM.el('span', { class: 'profile-role-tag' }, roleTitle),
      DOM.el('div', { class: 'badge-showcase' }, ...badgeElements)
    );

    const bioNode = DOM.el('p', { class: 'profile-bio' });
    this.parseAndInjectBio(bioNode, this.user.bio || 'Ready to build sprawling sectors of the universe.');

    const metadataRow = DOM.el('div', { class: 'profile-metadata-row', style: { display: 'flex', gap: '16px', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', flexWrap: 'wrap', width: '100%' } });
    if (this.user.location) {
      metadataRow.appendChild(DOM.el('span', {}, DOM.el('i', { class: 'bi bi-geo-alt', style: { marginRight: '4px' } }), this.user.location));
    }
    if (this.user.website) {
      const websiteUrl = this.user.website.startsWith('http') ? this.user.website : `https://${this.user.website}`;
      metadataRow.appendChild(DOM.el('span', {}, DOM.el('i', { class: 'bi bi-link-45deg', style: { marginRight: '4px' } }), DOM.el('a', { href: websiteUrl, target: '_blank', class: 'profile-meta-link', style: { color: 'var(--accent-gold)', textDecoration: 'none' } }, this.user.website)));
    }

    // Primary character showcase
    if (this.user.identity?.primaryCharacter) {
      const charId = this.user.identity.primaryCharacter;
      const customChars = stateManager.getState('customCharacters') || [];
      const presets = [
        { id: 'mary-ultarra', name: 'Mary Ultarra' },
        { id: 'max-smasher', name: 'Max Smasher' }
      ];
      const matchedChar = [...customChars, ...presets].find(c => c.id === charId);
      if (matchedChar) {
        metadataRow.appendChild(DOM.el('span', {}, 
          DOM.el('i', { class: 'bi bi-person-badge', style: { marginRight: '4px', color: 'var(--accent-gold)' } }), 
          'Primary Persona: ',
          DOM.el('a', { href: `#/bot/${charId}`, class: 'profile-meta-link', style: { color: 'var(--accent-gold)', fontWeight: 'bold', textDecoration: 'none' } }, matchedChar.name)
        ));
      }
    }

    const bioCol = DOM.el('div', { class: 'profile-meta-info', style: { width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' } },
      nameRow,
      DOM.el('span', { class: 'profile-tagline' }, this.user.tagline),
      bioNode,
      metadataRow
    );

    // Stats visibility checks
    const isSelf = this.isCurrentUser();
    const showWorlds = isSelf || this.user.showWorldCount !== false;
    const showFollowers = isSelf || this.user.showFollowerCount !== false;

    const statsRow = DOM.el('div', { class: 'profile-stats-row' });
    if (showWorlds) {
      statsRow.appendChild(this.renderStatCard('Worlds', this.user.worldsCount + (isSelf ? (stateManager.getState('customWorlds') || []).length : 0)));
    }
    if (showFollowers) {
      const followers = isSelf ? (this.user.followersCount || 0) : (this.user.followersCount + (stateManager.isFollowing(this.user.username) ? 1 : 0));
      statsRow.appendChild(this.renderStatCard('Followers', followers));
    }
    statsRow.appendChild(this.renderStatCard('Following', this.user.followingCount));
    statsRow.appendChild(this.renderStatCard('Views', this.user.viewsCount));

    // Action Buttons
    const actionsBar = DOM.el('div', { class: 'profile-actions-bar' });
    if (!isSelf) {
      const isFollowing = stateManager.isFollowing(this.user.username);
      const followBtn = DOM.el('button', {
        class: `btn ${isFollowing ? 'btn-secondary' : 'btn-accent'}`,
        onclick: () => {
          stateManager.toggleFollow(this.user.username);
          const activeState = stateManager.isFollowing(this.user.username);
          followBtn.textContent = activeState ? 'Following' : 'Follow';
          followBtn.className = `btn ${activeState ? 'btn-secondary' : 'btn-accent'}`;
          // Reload page stats dynamically
          this.load();
        }
      }, isFollowing ? 'Following' : 'Follow');

      const msgBtn = DOM.el('button', {
        class: 'btn btn-secondary',
        onclick: (e) => {
          const btn = e.currentTarget;
          const orig = btn.innerHTML;
          btn.innerHTML = '<i class="bi bi-broadcast"></i> Uplink Established';
          setTimeout(() => { if (btn) btn.innerHTML = orig; }, 2000);
        }
      }, 'Message');

      const collabBtn = DOM.el('button', {
        class: 'btn btn-secondary',
        onclick: () => this.openCollabModal()
      }, 'Collaborate');

      actionsBar.appendChild(followBtn);
      actionsBar.appendChild(msgBtn);
      actionsBar.appendChild(collabBtn);
    } else {
      const editBtn = DOM.el('button', {
        class: 'btn btn-secondary',
        onclick: () => {
          router.navigate('/settings');
        }
      }, 'Edit Profile');
      actionsBar.appendChild(editBtn);
    }

    details.appendChild(avatar);
    details.appendChild(bioCol);
    details.appendChild(statsRow);
    details.appendChild(actionsBar);

    // Repositioned and zoomed banner frame wrapper
    const bannerFrame = DOM.el('div', { 
      class: 'profile-banner', 
      style: { 
        backgroundImage: `url(${safeBannerUrl})`, 
        backgroundPosition: `50% ${bannerOffset}%`,
        backgroundSize: bannerZoom > 1 ? `calc(100% * ${bannerZoom}) auto` : 'cover',
        overflow: 'hidden'
      } 
    });

    return DOM.el('header', { class: 'profile-hero' },
      bannerFrame,
      details
    );
  }

  renderStatCard(label, val) {
    return DOM.el('div', { class: 'profile-stat-item' },
      DOM.el('span', { class: 'profile-stat-val' }, val),
      DOM.el('span', { class: 'profile-stat-label' }, label)
    );
  }

  /**
   * Parses biography text for mentions, tags, and links, injecting them as interactive elements.
   * @param {HTMLElement} container - Bio container element
   * @param {string} bioText - Text content of biography
   */
  parseAndInjectBio(container, bioText) {
    if (!container) return;
    DOM.clear(container);
    if (!bioText) return;

    // Regex matching absolute URLs, @mentions, or #tags
    // Mentions are preceded by space or start of string and followed by word boundary
    // Tags are preceded by space or start of string and followed by word boundary
    const regex = /(https?:\/\/[^\s\(\)\<\>]+)|(?<=\s|^)@([a-zA-Z0-9_\.]{3,24})\b|(?<=\s|^)#([a-zA-Z0-9_]+)\b/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(bioText)) !== null) {
      // Append text preceding the match
      const plainText = bioText.substring(lastIndex, match.index);
      if (plainText) {
        container.appendChild(document.createTextNode(plainText));
      }

      const [fullMatch, url, mention, tag] = match;

      if (url) {
        const safeUrl = sanitizeUrl(url);
        container.appendChild(DOM.el('a', {
          href: safeUrl,
          target: '_blank',
          class: 'bio-link'
        }, url));
      } else if (mention) {
        container.appendChild(DOM.el('a', {
          href: `#/profile/${mention.toLowerCase()}`,
          class: 'bio-mention'
        }, `@${mention}`));
      } else if (tag) {
        container.appendChild(DOM.el('a', {
          href: `#/tag/${tag.toLowerCase()}`,
          class: 'bio-tag'
        }, `#${tag}`));
      }

      lastIndex = regex.lastIndex;
    }

    // Append remaining text
    const remainingText = bioText.substring(lastIndex);
    if (remainingText) {
      container.appendChild(document.createTextNode(remainingText));
    }
  }

  /**
   * Renders the tab headers.
   */
  renderTabs() {
    const isSelf = this.isCurrentUser();
    const showActivity = isSelf || this.user.showActivity !== false;
    const showWorlds = isSelf || this.user.showWorldCount !== false;
    
    const tabs = [];
    if (showWorlds) tabs.push('Worlds');
    tabs.push('Characters');
    tabs.push('Contributions');
    if (showActivity) tabs.push('Activity');
    tabs.push('Gallery', 'Bookmarks');

    const nav = DOM.el('div', { class: 'lore-tabs-container profile-tabs-wrapper' });

    tabs.forEach(tabName => {
      const lower = tabName.toLowerCase();
      const tabBtn = DOM.el('button', {
        class: `lore-tab-btn ${this.activeTab === lower ? 'active' : ''}`,
        onclick: () => {
          nav.querySelectorAll('.lore-tab-btn').forEach(btn => btn.classList.remove('active'));
          tabBtn.classList.add('active');
          this.activeTab = lower;
          this.renderTabContent();
        }
      }, tabName);
      nav.appendChild(tabBtn);
    });

    return nav;
  }

  /**
   * Renders contents of the active tab.
   */
  renderTabContent() {
    if (!this.contentNode) return;
    DOM.clear(this.contentNode);

    try {
      const isSelf = this.isCurrentUser();

      // ────────────────────────────────────────────────────────────────────────
      // Tab: Worlds
      // ────────────────────────────────────────────────────────────────────────
      if (this.activeTab === 'worlds') {
        const userWorlds = this.user.worlds || [];
        const matchingWorlds = (this.worlds || []).filter(w => w && userWorlds.includes(w.id));
        
        // Combine with local custom created worlds
        if (isSelf) {
          const customWorlds = stateManager.getState('customWorlds') || [];
          customWorlds.forEach(cw => {
            if (cw && !matchingWorlds.some(w => w.id === cw.id)) {
              matchingWorlds.push(cw);
            }
          });
        }

        // Separate Owned Worlds vs Co-Authored Worlds
        const owned = matchingWorlds.filter(w => w.author && w.author.toLowerCase() === this.user.username.toLowerCase());
        
        const worldCollaborators = stateManager.getState('worldCollaborators') || {};
        const coAuthored = [];
        Object.keys(worldCollaborators).forEach(wId => {
          const config = worldCollaborators[wId];
          const collabRoles = config.collaborators || {};
          const userRole = collabRoles[this.user.username];
          if (userRole && userRole !== 'Owner') {
            const wObj = this.worlds.find(w => w.id === wId) || (stateManager.getState('customWorlds') || []).find(w => w.id === wId);
            if (wObj) coAuthored.push(wObj);
          }
        });

        const gridOwned = DOM.el('div', { class: 'profile-worlds-tab-content', style: { marginBottom: '32px' } });
        const gridCo = DOM.el('div', { class: 'profile-worlds-tab-content' });

        owned.forEach(w => gridOwned.appendChild(WorldCard.render(w)));
        coAuthored.forEach(w => gridCo.appendChild(WorldCard.render(w)));

        const wrapper = DOM.el('div', {});
        wrapper.appendChild(DOM.el('h3', { style: { fontFamily: 'Cinzel', fontSize: 'var(--fs-sm)', marginBottom: '16px', color: 'var(--text-gold)', letterSpacing: '0.05em' } }, 'OWNED REALITIES'));
        if (owned.length === 0) {
          wrapper.appendChild(DOM.el('div', { class: 'profile-empty-tab', style: { marginBottom: '32px' } }, 'No owned worlds registered.'));
        } else {
          wrapper.appendChild(gridOwned);
        }

        wrapper.appendChild(DOM.el('h3', { style: { fontFamily: 'Cinzel', fontSize: 'var(--fs-sm)', marginBottom: '16px', color: 'var(--text-gold)', marginTop: '24px', letterSpacing: '0.05em' } }, 'COLLABORATING REALITIES'));
        if (coAuthored.length === 0) {
          wrapper.appendChild(DOM.el('div', { class: 'profile-empty-tab' }, 'No co-authored worlds.'));
        } else {
          wrapper.appendChild(gridCo);
        }

        this.contentNode.appendChild(wrapper);
      } 
      // ────────────────────────────────────────────────────────────────────────
      // Tab: Characters
      // ────────────────────────────────────────────────────────────────────────
      else if (this.activeTab === 'characters') {
        const userChars = this.user.characters || [];
        const matchingBots = (this.bots || []).filter(b => b && userChars.includes(b.id));

        // Combine with custom created characters
        if (isSelf) {
          const customChars = stateManager.getState('customCharacters') || [];
          customChars.forEach(cc => {
            if (cc && !matchingBots.some(b => b.id === cc.id)) {
              matchingBots.push(cc);
            }
          });
        }

        if (matchingBots.length === 0) {
          this.contentNode.appendChild(DOM.el('div', { class: 'profile-empty-tab' }, 'No character entity profiles registered in this coordinate system.'));
        } else {
          const grid = DOM.el('div', { class: 'profile-characters-tab-content' });
          matchingBots.forEach(b => {
            try {
              grid.appendChild(BotCard.render(b));
            } catch (err) {
              console.error('[ProfilePage] Failed to render BotCard:', err, b);
            }
          });
          this.contentNode.appendChild(grid);
        }
      }
      // ────────────────────────────────────────────────────────────────────────
      // Tab: Contributions
      // ────────────────────────────────────────────────────────────────────────
      else if (this.activeTab === 'contributions') {
        const activities = stateManager.getState('worldActivities') || [];
        const userActivities = activities.filter(a => a && a.author.toLowerCase() === this.user.username.toLowerCase());
        
        if (userActivities.length === 0) {
          this.contentNode.appendChild(DOM.el('div', { class: 'profile-empty-tab' }, 'No contribution records logged in the multiverse grid.'));
        } else {
          const list = DOM.el('div', { class: 'activity-feed-list' });
          userActivities.forEach(act => {
            list.appendChild(
              DOM.el('div', { class: 'activity-item' },
                DOM.el('div', { class: 'activity-icon' }, DOM.el('i', { class: 'bi bi-gift-fill' })),
                DOM.el('div', { class: 'activity-body' },
                  DOM.el('span', { class: 'activity-text' }, `${act.details} in world "${act.worldId}"`),
                  DOM.el('span', { class: 'activity-time' }, act.timestamp)
                )
              )
            );
          });
          this.contentNode.appendChild(list);
        }
      }
      // ────────────────────────────────────────────────────────────────────────
      // Tab: Activity Feed
      // ────────────────────────────────────────────────────────────────────────
      else if (this.activeTab === 'activity') {
        // Find comments made by this user or their characters
        const allComments = stateManager.getState('comments') || [];
        const authorList = [this.user.username.toLowerCase(), ...(this.user.characters || []).map(id => id.toLowerCase())];
        
        // If self, also look up custom characters
        if (isSelf) {
          const customChars = stateManager.getState('customCharacters') || [];
          customChars.forEach(cc => {
            if (cc && cc.id) authorList.push(cc.id.toLowerCase());
          });
        }

        const userComments = allComments.filter(c => c && c.authorId && authorList.includes(c.authorId.toLowerCase()));

        if (userComments.length === 0) {
          const list = DOM.el('div', { class: 'activity-feed-list' });
          list.appendChild(
            DOM.el('div', { class: 'activity-item' },
              DOM.el('div', { class: 'activity-icon' }, DOM.el('i', { class: 'bi bi-node-plus' })),
              DOM.el('div', { class: 'activity-body' },
                DOM.el('span', { class: 'activity-text' }, `@${this.user.username} initialized telemetry core and joined the World Nexus Grid.`),
                DOM.el('span', { class: 'activity-time' }, 'System Timestamp Active')
              )
            )
          );
          this.contentNode.appendChild(list);
        } else {
          const list = DOM.el('div', { class: 'activity-feed-list' });
          userComments.forEach(comment => {
            try {
              const authorName = comment.authorName || 'Fictional Entity';
              const targetId = comment.targetId || 'unknown';
              const content = comment.content || '';
              const text = comment.authorId.toLowerCase() === this.user.username.toLowerCase() 
                ? `Commented on ${comment.targetType || 'world'} "${targetId}": "${content.slice(0, 70)}..."`
                : `Participated as Character "${authorName}" in world "${targetId}": "${content.slice(0, 70)}..."`;

              list.appendChild(
                DOM.el('div', { class: 'activity-item' },
                  DOM.el('div', { class: 'activity-icon' }, DOM.el('i', { class: 'bi bi-chat-left-dots' })),
                  DOM.el('div', { class: 'activity-body' },
                    DOM.el('span', { class: 'activity-text' }, text),
                    DOM.el('span', { class: 'activity-time' }, comment.timestamp || 'Just now')
                  )
                )
              );
            } catch (cmtErr) {
              console.warn('[ProfilePage] error parsing comment activity item:', cmtErr);
            }
          });
          this.contentNode.appendChild(list);
        }
      }
      // ────────────────────────────────────────────────────────────────────────
      // Tab: Gallery
      // ────────────────────────────────────────────────────────────────────────
      else if (this.activeTab === 'gallery') {
        // Crawl and display visual assets corresponding to the user's characters/worlds
        const userWorlds = this.user.worlds || [];
        const userChars = [...(this.user.characters || [])];
        
        if (isSelf) {
          const customChars = stateManager.getState('customCharacters') || [];
          customChars.forEach(cc => {
            if (cc && cc.id) userChars.push(cc.id);
          });
        }

        const matchingBots = (this.bots || []).filter(b => b && (userChars.includes(b.id) || userWorlds.includes(b.worldId)));
        const images = [];

        matchingBots.forEach(bot => {
          if (bot.cardImage) {
            images.push({ src: sanitizeUrl(bot.cardImage, bot.name), alt: `${bot.name} Portrait` });
          }
          if (bot.sprite) {
            images.push({ src: sanitizeUrl(bot.sprite, bot.name), alt: `${bot.name} Sprite` });
          }
        });

        if (images.length === 0) {
          this.contentNode.appendChild(DOM.el('div', { class: 'profile-empty-tab' }, 'No concept design assets found in user records.'));
        } else {
          const grid = DOM.el('div', { class: 'gallery-grid' });
          images.forEach(img => {
            const imgEl = DOM.el('img', {
              'data-src': img.src,
              alt: img.alt,
              class: 'gallery-image img-lazy-pending',
              decoding: 'async'
            });
            lazyLoader.observe(imgEl);

            grid.appendChild(
              DOM.el('div', { class: 'gallery-item aspect-square' },
                DOM.el('div', { class: 'gallery-img-wrapper' }, imgEl),
                DOM.el('div', { class: 'gallery-overlay' },
                  DOM.el('h3', { class: 'gallery-img-title' }, img.alt)
                )
              )
            );
          });
          this.contentNode.appendChild(grid);
        }
      }
      // ────────────────────────────────────────────────────────────────────────
      // Tab: Bookmarks
      // ────────────────────────────────────────────────────────────────────────
      else {
        const favorites = stateManager.getState('favorites') || [];
        const matchingFavorites = (this.bots || []).filter(b => b && favorites.includes(b.id));

        if (this.activeTab === 'bookmarks' && matchingFavorites.length > 0) {
          const grid = DOM.el('div', { class: 'profile-characters-tab-content' });
          matchingFavorites.forEach(b => {
            try {
              grid.appendChild(BotCard.render(b));
            } catch (err) {
              console.error('[ProfilePage] Failed to render BotCard bookmark:', err, b);
            }
          });
          this.contentNode.appendChild(grid);
        } else {
          this.contentNode.appendChild(DOM.el('div', { class: 'profile-empty-tab' }, `No bookmarks or group collections recorded in this timeline.`));
        }
      }
    } catch (tabErr) {
      console.error('[ProfilePage] Rendering tab content failed:', tabErr);
      this.contentNode.appendChild(
        DOM.el('div', { class: 'profile-empty-tab', style: { color: 'var(--accent-red)' } }, 'Failed to render current tab content due to a telemetry calculation error.')
      );
    }
  }

  /**
   * Helper to get Bootstrap-icon classes matching a badge type name.
   */
  getBadgeIcon(badgeName) {
    const map = {
      'Founder': 'bi-rocket-takeoff-fill',
      'Early Creator': 'bi-patch-check-fill',
      'World Builder': 'bi-hammer',
      'Lore Master': 'bi-journal-code',
      'Map Maker': 'bi-map-fill',
      'Verified Creator': 'bi-patch-check-fill',
      'Character Designer': 'bi-palette-fill',
      'Top Collaborator': 'bi-award-fill'
    };
    return map[badgeName] || 'bi-bookmark-star-fill';
  }

  /**
   * Checks if the active profile represents the currently logged in user.
   */
  isCurrentUser() {
    const curUser = stateManager.getState('currentUser');
    return !!(curUser && curUser.username.toLowerCase() === this.username.toLowerCase());
  }

  /**
   * Opens the Collaboration Proposal Modal.
   */
  openCollabModal() {
    const backdrop = DOM.el('div', { class: 'onboarding-overlay' });
    
    const worldOptions = this.worlds
      .filter(w => w.author && w.author.toLowerCase() === this.username.toLowerCase())
      .map(w => DOM.el('option', { value: w.id }, w.title));

    if (worldOptions.length === 0) {
      worldOptions.push(DOM.el('option', { value: 'general' }, 'General Universe Collaboration'));
    }

    const selectEl = DOM.el('select', { class: 'comment-identity-select' }, ...worldOptions);
    const textarea = DOM.el('textarea', { 
      class: 'comment-textarea', 
      placeholder: `Propose your collaborative ideas to @${this.user.username}...` 
    });

    const card = DOM.el('div', { class: 'onboarding-card' },
      DOM.el('div', { class: 'onboarding-header' },
        DOM.el('h3', { class: 'onboarding-title' }, `COLLABORATION REQUEST`),
        DOM.el('p', { class: 'onboarding-subtitle' }, `Establish a co-author link with @${this.user.username}`)
      ),
      DOM.el('div', { class: 'onboarding-body' },
        DOM.el('div', { class: 'auth-input-group' },
          DOM.el('label', { class: 'auth-input-label' }, 'Target Project'),
          selectEl
        ),
        DOM.el('div', { class: 'auth-input-group' },
          DOM.el('label', { class: 'auth-input-label' }, 'Proposal details'),
          textarea
        )
      ),
      DOM.el('div', { class: 'onboarding-footer' },
        DOM.el('button', { 
          class: 'btn btn-secondary', 
          onclick: () => backdrop.remove() 
        }, 'Cancel'),
        DOM.el('button', { 
          class: 'btn btn-accent',
          onclick: (e) => {
            const curUser = stateManager.getState('currentUser');
            if (!curUser) {
              alert('You must sign in to send collaboration proposals.');
              backdrop.remove();
              return;
            }
            const inboxRequests = stateManager.getState('inboxRequests') || [];
            inboxRequests.push({
              id: 'inb_' + Date.now(),
              type: 'collaboration',
              from: curUser.username,
              worldId: selectEl.value,
              worldTitle: selectEl.options[selectEl.selectedIndex].text,
              status: 'pending',
              timestamp: 'Just now'
            });
            stateManager.setState('inboxRequests', inboxRequests);

            const btn = e.currentTarget;
            btn.textContent = 'Transmitting...';
            btn.disabled = true;
            setTimeout(() => {
              backdrop.remove();
              alert('Uplink complete! Your collaboration proposal has been sent to the creator\'s control inbox.');
            }, 600);
          }
        }, 'Send Proposal')
      )
    );

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
  }

  /**
   * Cleans up running subscriptions.
   */
  unload() {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
  }
}

export default ProfilePage;
