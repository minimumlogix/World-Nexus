/* js/app.js */
import { router } from './core/Router.js';
import { globalEventBus } from './core/EventBus.js';
import { stateManager } from './core/StateManager.js';
import { Loader } from './core/Loader.js';
import { SvgAnimator } from './ui/SvgAnimator.js';
import { backgroundEffect } from './ui/BackgroundEffect.js';
import { Lightbox } from './ui/Lightbox.js';
import { CustomScrollbar } from './ui/CustomScrollbar.js';

import { LandingPage } from './pages/LandingPage.js';
import { WorldPage } from './pages/WorldPage.js';
import { BotPage } from './pages/BotPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { FeedPage } from './pages/FeedPage.js';
import { InboxPage } from './pages/InboxPage.js';
import { SearchService } from './services/SearchService.js';
import { DOM } from './utils/DOM.js';
import { sanitizeUrl, sanitizeCssUrl } from './utils/Security.js';

class App {
  constructor() {
    this.appRoot = document.getElementById('app-root');
    this.currentPageController = null;

    this.init();
  }

  init() {
    // Start global search index pre-fetching in background
    SearchService.initSearchIndex().catch(err => {
      console.warn('Failed to initialize search index:', err);
    });

    // 1. Establish initial theme configuration
    document.body.classList.add('dark-theme');

    // Initialize interactive background particles and UI singletons
    backgroundEffect.init();
    Lightbox.init();
    
    // Initialize custom overlay scrollbar
    new CustomScrollbar();

    // Observe global compass logos
    const headerLogo = document.querySelector('.header-compass-logo');
    if (headerLogo) SvgAnimator.observeVisibility(headerLogo);
    const footerLogo = document.querySelector('.footer-compass-logo');
    if (footerLogo) SvgAnimator.observeVisibility(footerLogo);

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
    }, { passive: true });

    // 4. Bind mobile menu drawer toggling
    const burger = document.getElementById('mobile-menu-toggle');
    const navDrawer = document.getElementById('mobile-nav');
    if (burger && navDrawer) {
      burger.setAttribute('aria-expanded', 'false');

      burger.addEventListener('click', () => {
        burger.classList.toggle('open');
        navDrawer.classList.toggle('open');
        burger.setAttribute('aria-expanded', String(burger.classList.contains('open')));
      });

      // Clicking navigation links inside drawer collapses it
      navDrawer.addEventListener('click', (e) => {
        if (e.target.closest('a')) {
          burger.classList.remove('open');
          navDrawer.classList.remove('open');
          burger.setAttribute('aria-expanded', 'false');
        }
      });
    }

    const mobileWorldsLink = document.getElementById('mobile-nav-worlds');
    if (mobileWorldsLink) {
      mobileWorldsLink.addEventListener('click', (e) => {
        e.preventDefault();
        router.navigate('#/');
        globalEventBus.emit('landing:selectTab', 'worlds');
        document.getElementById('app-root')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    const mobileAboutLink = document.getElementById('mobile-nav-about');
    if (mobileAboutLink) {
      mobileAboutLink.addEventListener('click', (e) => {
        e.preventDefault();
        router.navigate('#/');
        document.querySelector('.main-footer')?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    }

    // Bind Desktop "Create" button
    const desktopCreateBtn = document.getElementById('desktop-create-btn');
    if (desktopCreateBtn) {
      desktopCreateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openCreationHubModal();
      });
    }

    // Bind Mobile "Create" button
    const mobileCreateBtn = document.getElementById('mobile-nav-create');
    if (mobileCreateBtn) {
      mobileCreateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const burgerBtn = document.getElementById('mobile-menu-toggle');
        const drawer = document.getElementById('mobile-nav');
        if (burgerBtn && drawer) {
          burgerBtn.classList.remove('open');
          drawer.classList.remove('open');
          burgerBtn.setAttribute('aria-expanded', 'false');
        }
        this.openCreationHubModal();
      });
    }

    // Watch inbox requests to update badge counts
    globalEventBus.on('state:inboxRequests', () => this.updateInboxBadges());
    globalEventBus.on('state:notifications', () => this.updateInboxBadges());

    // Initial badge update
    this.updateInboxBadges();

    // 5. Watch route transitions to swap active view page controllers
    globalEventBus.on('route:change', (route) => this.handleRouteTransition(route));

    // Watch session/identity changes to redraw header
    globalEventBus.on('state:currentUser', () => this.renderHeaderUserArea());
    globalEventBus.on('state:activeIdentity', () => this.renderHeaderUserArea());
    globalEventBus.on('state:customCharacters', () => this.renderHeaderUserArea());

    // Render initial header
    this.renderHeaderUserArea();

    // Close switcher dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const switcher = document.querySelector('.identity-switcher-wrapper');
      if (switcher && !switcher.contains(e.target)) {
        switcher.classList.remove('open');
        const dropdown = switcher.querySelector('.identity-dropdown');
        if (dropdown) dropdown.classList.remove('open');
      }
    });

    // Initialize Hover Profile Cards listeners
    this.initHoverCardListener();

    // 6. Trigger first routing resolution
    router.handleRoute();
  }

  /**
   * Destroys current page context and instantiates new page.
   * Intercepts world→bot transitions to open bot profile as an inline panel
   * inside the live WorldPage rather than navigating to a new full page.
   * @param {Object} route - Decoded route attributes
   */
  async handleRouteTransition(route) {
    // ──────────────────────────────────────────────────────────────────────
    // Case 1: World page is alive → bot card clicked
    // Try to open bot inline without destroying WorldPage
    // ──────────────────────────────────────────────────────────────────────
    if (route.page === 'bot' && route.id && this.currentPageController instanceof WorldPage) {
      const handled = await this.currentPageController.openBotPanel(route.id);
      if (handled) {
        // Panel opened inline — no loader, no scroll reset, no page destroy
        Loader.hide();
        return;
      }
    }

    // ──────────────────────────────────────────────────────────────────────
    // Case 2: Going back to world while bot panel is open
    // Close the panel and reveal the world page underneath (no re-render)
    // ──────────────────────────────────────────────────────────────────────
    if (route.page === 'world' && this.currentPageController instanceof WorldPage &&
        this.currentPageController.hasBotPanel()) {
      this.currentPageController.closeBotPanel();
      if (route.id === this.currentPageController.worldId) {
        Loader.hide();
        return;
      }
    }

    // ──────────────────────────────────────────────────────────────────────
    // Standard full-page route transition
    // ──────────────────────────────────────────────────────────────────────
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
      } else if (route.page === 'profile' && route.id) {
        this.currentPageController = new ProfilePage(this.appRoot, route.id);
      } else if (route.page === 'settings') {
        this.currentPageController = new SettingsPage(this.appRoot, route.id);
      } else if (route.page === 'feed') {
        this.currentPageController = new FeedPage(this.appRoot);
      } else if (route.page === 'inbox') {
        this.currentPageController = new InboxPage(this.appRoot);
      } else {
        // If a direct tag URL was clicked (e.g. #/tag/scifi), sync it to filtering state
        if (route.tag) {
          stateManager.setState('selectedGenres', [route.tag], true);
        }
        this.currentPageController = new LandingPage(this.appRoot);
      }

      await this.currentPageController.load();

      // If id is provided as tab name for landing, select it!
      if (route.page === 'landing' && route.id) {
        globalEventBus.emit('landing:selectTab', route.id);
      }
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

  /**
   * Renders the Sign In button or Identity Switcher dropdown in the main header.
   */
  renderHeaderUserArea() {
    const wrapper = document.querySelector('.header-actions');
    if (!wrapper) return;

    // Clean old widget if present
    const oldWidget = wrapper.querySelector('.header-user-widget');
    if (oldWidget) oldWidget.remove();

    const currentUser = stateManager.getState('currentUser');
    const widgetContainer = DOM.el('div', { class: 'header-user-widget', style: { display: 'inline-flex', alignItems: 'center' } });

    if (!currentUser) {
      const signInBtn = DOM.el('button', {
        class: 'btn btn-secondary',
        id: 'header-signin-btn',
        style: { marginRight: '12px', fontSize: 'var(--fs-sm)' },
        onclick: () => this.openLoginModal()
      }, 'Sign In');
      widgetContainer.appendChild(signInBtn);
    } else {
      const activeId = stateManager.getState('activeIdentity');
      let displayName = currentUser.username;
      let avatarSrc = currentUser.avatar;

      if (activeId && activeId !== currentUser.username) {
        // Active identity is a character
        const customChars = stateManager.getState('customCharacters') || [];
        const presets = [
          { id: 'mary-ultarra', name: 'Mary Ultarra', avatar: 'Worlds/arcanis/characters/mary-ultarra/images/mary-ultarra-avatar.jpg' },
          { id: 'max-smasher', name: 'Max Smasher', avatar: 'Worlds/arcanis/characters/max-smasher/images/max-smasher-avatar.avif' }
        ];
        const botObj = [...customChars, ...presets].find(c => c.id === activeId);
        if (botObj) {
          displayName = botObj.name;
          avatarSrc = botObj.avatar;
        }
      }

      // Identity Switcher element
      const switcherWrapper = DOM.el('div', { class: 'identity-switcher-wrapper' });
      
      const switcherBtn = DOM.el('button', {
        class: 'identity-switcher-btn',
        onclick: (e) => {
          e.stopPropagation();
          switcherWrapper.classList.toggle('open');
          dropdown.classList.toggle('open');
        }
      },
        DOM.el('img', { class: 'identity-switcher-avatar', src: sanitizeUrl(avatarSrc, displayName), alt: displayName }),
        DOM.el('span', { class: 'identity-switcher-name' }, displayName),
        DOM.el('i', { class: 'bi bi-chevron-down identity-switcher-chevron' })
      );

      const dropdown = DOM.el('div', { class: 'identity-dropdown' },
        DOM.el('div', { class: 'identity-dropdown-header' }, 'Post As')
      );

      // 1. Creator Option
      const creatorOption = DOM.el('div', {
        class: `identity-option ${activeId === currentUser.username ? 'active' : ''}`,
        onclick: () => {
          stateManager.setState('activeIdentity', currentUser.username);
          dropdown.classList.remove('open');
          switcherWrapper.classList.remove('open');
        }
      },
        DOM.el('img', { class: 'identity-option-avatar', src: sanitizeUrl(currentUser.avatar, currentUser.username) }),
        DOM.el('span', { class: 'identity-option-name' }, currentUser.username),
        DOM.el('i', { class: 'bi bi-check identity-option-check' })
      );
      dropdown.appendChild(creatorOption);

      // 2. Character options
      const customChars = stateManager.getState('customCharacters') || [];
      const presetChars = currentUser.username.toLowerCase() === 'oxin' 
        ? [
            { id: 'mary-ultarra', name: 'Mary Ultarra', avatar: 'Worlds/arcanis/characters/mary-ultarra/images/mary-ultarra-avatar.jpg' },
            { id: 'max-smasher', name: 'Max Smasher', avatar: 'Worlds/arcanis/characters/max-smasher/images/max-smasher-avatar.avif' }
          ]
        : [];

      const charactersList = [...presetChars, ...customChars];
      charactersList.forEach(char => {
        const option = DOM.el('div', {
          class: `identity-option ${activeId === char.id ? 'active' : ''}`,
          onclick: () => {
            stateManager.setState('activeIdentity', char.id);
            dropdown.classList.remove('open');
            switcherWrapper.classList.remove('open');
          }
        },
          DOM.el('img', { class: 'identity-option-avatar', src: sanitizeUrl(char.avatar, char.name) }),
          DOM.el('span', { class: 'identity-option-name' }, char.name),
          DOM.el('i', { class: 'bi bi-check identity-option-check' })
        );
        dropdown.appendChild(option);
      });

      // 3. Actions Divider
      dropdown.appendChild(DOM.el('div', { class: 'identity-dropdown-divider' }));
      
      const createCharAction = DOM.el('div', {
        class: 'identity-action-item',
        onclick: () => {
          dropdown.classList.remove('open');
          switcherWrapper.classList.remove('open');
          this.openCreateCharacterModal();
        }
      },
        DOM.el('i', { class: 'bi bi-plus-circle' }),
        'Create Character'
      );
      
      const viewProfile = DOM.el('div', {
        class: 'identity-action-item',
        onclick: () => {
          dropdown.classList.remove('open');
          switcherWrapper.classList.remove('open');
          router.navigate(`/profile/${currentUser.username}`);
        }
      },
        DOM.el('i', { class: 'bi bi-person' }),
        'View Profile'
      );

      const viewSettings = DOM.el('div', {
        class: 'identity-action-item',
        onclick: () => {
          dropdown.classList.remove('open');
          switcherWrapper.classList.remove('open');
          router.navigate('/settings');
        }
      },
        DOM.el('i', { class: 'bi bi-gear' }),
        'Settings'
      );

      const signOut = DOM.el('div', {
        class: 'identity-action-item',
        onclick: () => {
          stateManager.logout();
          router.navigate('#/');
        }
      },
        DOM.el('i', { class: 'bi bi-box-arrow-right' }),
        'Sign Out'
      );

      dropdown.appendChild(createCharAction);
      dropdown.appendChild(viewProfile);
      dropdown.appendChild(viewSettings);
      dropdown.appendChild(signOut);

      switcherWrapper.appendChild(switcherBtn);
      switcherWrapper.appendChild(dropdown);
      widgetContainer.appendChild(switcherWrapper);
    }

    // Prepend widget container before menu toggle burger button
    const burger = wrapper.querySelector('#mobile-menu-toggle');
    if (burger) {
      wrapper.insertBefore(widgetContainer, burger);
    } else {
      wrapper.appendChild(widgetContainer);
    }
  }

  /**
   * Opens the Create Account Modal.
   */
  openLoginModal() {
    const backdrop = DOM.el('div', { 
      class: 'onboarding-overlay', 
      onclick: (e) => { if (e.target === backdrop) backdrop.remove(); } 
    });

    const usernameInput = DOM.el('input', { type: 'text', class: 'search-input-box', placeholder: 'Enter username (e.g. Oxin)' });
    const emailInput = DOM.el('input', { type: 'email', class: 'search-input-box', placeholder: 'Enter email address' });
    const passInput = DOM.el('input', { type: 'password', class: 'search-input-box', placeholder: 'Enter password' });
    const passConfirmInput = DOM.el('input', { type: 'password', class: 'search-input-box', placeholder: 'Confirm password' });
    const ageCheckbox = DOM.el('input', { type: 'checkbox', id: 'age-check-box' });

    const modalBody = DOM.el('div', { class: 'onboarding-body' },
      DOM.el('div', { class: 'auth-input-group' },
        DOM.el('label', { class: 'auth-input-label' }, 'Username'),
        usernameInput
      ),
      DOM.el('div', { class: 'auth-input-group' },
        DOM.el('label', { class: 'auth-input-label' }, 'Email'),
        emailInput
      ),
      DOM.el('div', { class: 'auth-input-group' },
        DOM.el('label', { class: 'auth-input-label' }, 'Password'),
        passInput
      ),
      DOM.el('div', { class: 'auth-input-group' },
        DOM.el('label', { class: 'auth-input-label' }, 'Confirm Password'),
        passConfirmInput
      ),
      DOM.el('label', { class: 'auth-checkbox-label', for: 'age-check-box' },
        ageCheckbox,
        'I am at least 13 years old'
      )
    );

    const submitBtn = DOM.el('button', {
      class: 'btn btn-accent',
      style: { width: '100%' },
      onclick: () => {
        const username = usernameInput.value.trim();
        if (!username) {
          alert('Please enter a username');
          return;
        }
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
          alert('Username must be between 3 and 20 characters and contain only letters, numbers, and underscores.');
          return;
        }
        const email = emailInput.value.trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          alert('Please enter a valid email address.');
          return;
        }
        const pass = passInput.value;
        const passConfirm = passConfirmInput.value;
        if (pass.length < 6) {
          alert('Password must be at least 6 characters.');
          return;
        }
        if (pass !== passConfirm) {
          alert('Passwords do not match.');
          return;
        }
        if (!ageCheckbox.checked) {
          alert('You must be at least 13 years old to register');
          return;
        }
        backdrop.remove();
        this.startOnboarding(username);
      }
    }, 'Create Account');

    const socialRow = DOM.el('div', { class: 'auth-social-row' },
      DOM.el('button', {
        class: 'btn btn-social btn-google',
        onclick: () => {
          backdrop.remove();
          this.startOnboarding('Oxin');
        }
      }, DOM.el('i', { class: 'bi bi-google', style: { marginRight: '8px' } }), 'Continue with Google'),
      DOM.el('button', {
        class: 'btn btn-social btn-discord',
        onclick: () => {
          backdrop.remove();
          this.startOnboarding('Oxin');
        }
      }, DOM.el('i', { class: 'bi bi-discord', style: { marginRight: '8px' } }), 'Continue with Discord')
    );

    const card = DOM.el('div', { class: 'onboarding-card' },
      DOM.el('div', { class: 'onboarding-header' },
        DOM.el('h3', { class: 'onboarding-title' }, 'CREATE ACCOUNT'),
        DOM.el('p', { class: 'onboarding-subtitle' }, 'Join the World Nexus Grid')
      ),
      modalBody,
      submitBtn,
      DOM.el('div', { class: 'gold-divider', style: { margin: '8px 0' } }, DOM.el('div', { class: 'gold-divider-diamond' })),
      socialRow
    );

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
  }

  /**
   * Triggers the 4-step onboarding wizard modal.
   */
  startOnboarding(username) {
    let currentStep = 1;
    const backdrop = DOM.el('div', { class: 'onboarding-overlay' });
    
    let finalUsername = username;
    let selectedAvatar = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%232e185b"/><text x="50" y="55" fill="%23fef08a" font-size="32" font-family="Outfit" text-anchor="middle">${username.charAt(0).toUpperCase()}</text></svg>`;
    let reason = 'Both';
    
    const renderStep = () => {
      DOM.clear(backdrop);
      
      const dots = DOM.el('div', { class: 'onboarding-progress' },
        DOM.el('div', { class: `onboarding-progress-dot ${currentStep === 1 ? 'active' : ''}` }),
        DOM.el('div', { class: `onboarding-progress-dot ${currentStep === 2 ? 'active' : ''}` }),
        DOM.el('div', { class: `onboarding-progress-dot ${currentStep === 3 ? 'active' : ''}` }),
        DOM.el('div', { class: `onboarding-progress-dot ${currentStep === 4 ? 'active' : ''}` })
      );

      const stepContent = DOM.el('div', { class: 'onboarding-body' });
      let title = '';
      let subtitle = '';
      let nextBtnText = 'Next';
      let skipBtn = null;
      let nextAction = () => {};

      if (currentStep === 1) {
        title = 'Choose Username';
        subtitle = 'Step 1 of 4';
        const input = DOM.el('input', { type: 'text', class: 'search-input-box', value: `@${finalUsername}` });
        stepContent.appendChild(DOM.el('div', { class: 'auth-input-group' },
          DOM.el('label', { class: 'auth-input-label' }, 'Username Handle'),
          input
        ));
        
        nextAction = () => {
          const val = input.value.replace(/^@/, '').trim();
          if (!/^[a-zA-Z0-9_]{3,20}$/.test(val)) {
            alert('Username must be between 3 and 20 characters and contain only letters, numbers, and underscores.');
            return;
          }
          finalUsername = val;
          currentStep = 2;
          renderStep();
        };
      } 
      else if (currentStep === 2) {
        title = 'Profile Avatar';
        subtitle = 'Step 2 of 4';
        
        const avatarPreview = DOM.el('img', { 
          src: selectedAvatar, 
          style: { width: '80px', height: '80px', borderRadius: '8px', border: '2px solid var(--accent-gold)', alignSelf: 'center', objectFit: 'cover' } 
        });

        const avatarOptions = DOM.el('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center' } });
        const colors = ['#2e185b', '#115e59', '#1e293b', '#7c2d12'];
        colors.forEach(c => {
          const item = DOM.el('div', {
            style: { width: '32px', height: '32px', background: c, borderRadius: '4px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' },
            onclick: () => {
              selectedAvatar = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="${encodeURIComponent(c)}"/><text x="50" y="55" fill="%23fef08a" font-size="32" font-family="Outfit" text-anchor="middle">${finalUsername.charAt(0).toUpperCase()}</text></svg>`;
              avatarPreview.src = selectedAvatar;
            }
          });
          avatarOptions.appendChild(item);
        });

        stepContent.appendChild(avatarPreview);
        stepContent.appendChild(DOM.el('label', { class: 'auth-input-label', style: { textAlign: 'center' } }, 'Select Profile Theme Color'));
        stepContent.appendChild(avatarOptions);

        skipBtn = DOM.el('button', {
          class: 'btn btn-secondary',
          onclick: () => {
            currentStep = 3;
            renderStep();
          }
        }, 'Skip');
        
        nextAction = () => {
          currentStep = 3;
          renderStep();
        };
      } 
      else if (currentStep === 3) {
        title = 'What are you here for?';
        subtitle = 'Step 3 of 4';

        const createOption = (val, titleStr, descStr) => {
          const cardOpt = DOM.el('div', {
            class: `onboarding-option-card ${reason === val ? 'selected' : ''}`,
            onclick: () => {
              reason = val;
              stepContent.querySelectorAll('.onboarding-option-card').forEach(c => c.classList.remove('selected'));
              cardOpt.classList.add('selected');
            }
          },
            DOM.el('div', { class: 'onboarding-option-circle' }),
            DOM.el('div', { class: 'onboarding-option-details' },
              DOM.el('span', { class: 'onboarding-option-title' }, titleStr),
              DOM.el('span', { class: 'onboarding-option-desc' }, descStr)
            )
          );
          return cardOpt;
        };

        stepContent.appendChild(createOption('Creating Worlds', 'Creating Worlds', 'I want to build universes, design lore and map coordinates.'));
        stepContent.appendChild(createOption('Reading Worlds', 'Reading Worlds', 'I want to read user chronicles and talk to fictional entities.'));
        stepContent.appendChild(createOption('Both', 'Both', 'Creating and exploring realms concurrently.'));

        nextAction = () => {
          currentStep = 4;
          renderStep();
        };
      } 
      else if (currentStep === 4) {
        title = 'Create First World';
        subtitle = 'Step 4 of 4';

        const nameInput = DOM.el('input', { type: 'text', class: 'search-input-box', placeholder: 'E.g., Nexovari' });
        const genreInput = DOM.el('input', { type: 'text', class: 'search-input-box', placeholder: 'E.g., Dark Sci-Fi' });
        const descInput = DOM.el('textarea', { class: 'comment-textarea', placeholder: 'E.g., An anomaly station at the edge of the galaxy...' });

        stepContent.appendChild(DOM.el('div', { class: 'auth-input-group' },
          DOM.el('label', { class: 'auth-input-label' }, 'World Name'),
          nameInput
        ));
        stepContent.appendChild(DOM.el('div', { class: 'auth-input-group' },
          DOM.el('label', { class: 'auth-input-label' }, 'Genre'),
          genreInput
        ));
        stepContent.appendChild(DOM.el('div', { class: 'auth-input-group' },
          DOM.el('label', { class: 'auth-input-label' }, 'Brief Description'),
          descInput
        ));

        skipBtn = DOM.el('button', {
          class: 'btn btn-secondary',
          onclick: () => {
            this.completeOnboarding(finalUsername, selectedAvatar, reason, null);
            backdrop.remove();
          }
        }, 'Skip');

        nextBtnText = 'Complete';
        nextAction = () => {
          const wName = nameInput.value.trim();
          if (wName) {
            if (wName.length < 2 || wName.length > 30) {
              alert('World name must be between 2 and 30 characters.');
              return;
            }
            const genre = genreInput.value.trim();
            if (genre && (genre.length < 2 || genre.length > 20)) {
              alert('Genre must be between 2 and 20 characters.');
              return;
            }
            const desc = descInput.value.trim();
            if (desc && desc.length > 200) {
              alert('Description must not exceed 200 characters.');
              return;
            }

            const worldObj = {
              id: wName.toLowerCase().replace(/\s+/g, '-'),
              title: wName,
              description: desc || 'A new realm of endless possibilities.',
              genres: [genre || 'Multiverse'],
              author: finalUsername,
              coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
              logo: '',
              bots: [],
              path: 'Worlds/arcanis',
              theme: 'style.css',
              accentColor: '#eab308'
            };
            this.completeOnboarding(finalUsername, selectedAvatar, reason, worldObj);
          } else {
            this.completeOnboarding(finalUsername, selectedAvatar, reason, null);
          }
          backdrop.remove();
        };
      }

      const card = DOM.el('div', { class: 'onboarding-card' },
        DOM.el('div', { class: 'onboarding-header' },
          DOM.el('h3', { class: 'onboarding-title' }, title.toUpperCase()),
          DOM.el('p', { class: 'onboarding-subtitle' }, subtitle),
          dots
        ),
        stepContent,
        DOM.el('div', { class: 'onboarding-footer' },
          skipBtn || DOM.el('div'),
          DOM.el('button', {
            class: 'btn btn-accent',
            onclick: nextAction
          }, nextBtnText)
        )
      );

      backdrop.appendChild(card);
    };

    renderStep();
    document.body.appendChild(backdrop);
  }

  completeOnboarding(username, avatar, reason, firstWorld) {
    const user = {
      username: username,
      avatar: avatar,
      role: 'Creator',
      banner: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80',
      tagline: reason === 'Creating Worlds' ? 'World Builder' : (reason === 'Reading Worlds' ? 'Explorer' : 'Lore Architect'),
      bio: `Citizen registry vector of sector ${username.toUpperCase()}. Joined to explore the Nexus.`,
      worldsCount: firstWorld ? 1 : 0,
      followersCount: 0,
      followingCount: 0,
      viewsCount: '1',
      badges: ['Early Creator', 'World Builder'],
      worlds: firstWorld ? [firstWorld.id] : [],
      characters: []
    };

    stateManager.setState('currentUser', user);
    stateManager.setState('activeIdentity', username);

    if (firstWorld) {
      const customWorlds = stateManager.getState('customWorlds') || [];
      customWorlds.push(firstWorld);
      stateManager.setState('customWorlds', customWorlds);
    }

    router.navigate(`/profile/${username}`);
  }

  /**
   * Opens the Create Character modal.
   */
  openCreateCharacterModal() {
    const backdrop = DOM.el('div', { 
      class: 'onboarding-overlay', 
      onclick: (e) => { if (e.target === backdrop) backdrop.remove(); } 
    });

    const nameInput = DOM.el('input', { type: 'text', class: 'search-input-box', placeholder: 'E.g., Mary Ultarra' });
    const occupationInput = DOM.el('input', { type: 'text', class: 'search-input-box', placeholder: 'E.g., Void Operative' });
    
    import('./services/WorldService.js').then(({ WorldService }) => {
      WorldService.getWorlds().then(worlds => {
        const select = DOM.el('select', { class: 'comment-identity-select', style: { width: '100%', padding: '10px' } });
        worlds.forEach(w => {
          select.appendChild(DOM.el('option', { value: w.id }, w.title));
        });
        
        const customWorlds = stateManager.getState('customWorlds') || [];
        customWorlds.forEach(cw => {
          select.appendChild(DOM.el('option', { value: cw.id }, cw.title));
        });

        const statusSelect = DOM.el('select', { class: 'comment-identity-select', style: { width: '100%', padding: '10px' } },
          DOM.el('option', { value: 'Active' }, 'Active'),
          DOM.el('option', { value: 'Deceased' }, 'Deceased'),
          DOM.el('option', { value: 'Unknown' }, 'Unknown')
        );

        const bioInput = DOM.el('textarea', { class: 'comment-textarea', placeholder: 'E.g., Mary is a seasoned operative...' });

        const modalBody = DOM.el('div', { class: 'onboarding-body' },
          DOM.el('div', { class: 'auth-input-group' },
            DOM.el('label', { class: 'auth-input-label' }, 'Character Name'),
            nameInput
          ),
          DOM.el('div', { class: 'auth-input-group' },
            DOM.el('label', { class: 'auth-input-label' }, 'Affiliated World'),
            select
          ),
          DOM.el('div', { class: 'auth-input-group' },
            DOM.el('label', { class: 'auth-input-label' }, 'Occupation / Title'),
            occupationInput
          ),
          DOM.el('div', { class: 'auth-input-group' },
            DOM.el('label', { class: 'auth-input-label' }, 'Status'),
            statusSelect
          ),
          DOM.el('div', { class: 'auth-input-group' },
            DOM.el('label', { class: 'auth-input-label' }, 'Description'),
            bioInput
          )
        );

        const createBtn = DOM.el('button', {
          class: 'btn btn-accent',
          style: { width: '100%' },
          onclick: () => {
            const name = nameInput.value.trim();
            if (!name) {
              alert('Please enter character name');
              return;
            }
            if (name.length < 2 || name.length > 30) {
              alert('Character name must be between 2 and 30 characters.');
              return;
            }
            const occupation = occupationInput.value.trim();
            if (occupation && (occupation.length < 2 || occupation.length > 30)) {
              alert('Occupation must be between 2 and 30 characters.');
              return;
            }
            const bio = bioInput.value.trim();
            if (bio && bio.length > 200) {
              alert('Description must not exceed 200 characters.');
              return;
            }
            const id = name.toLowerCase().replace(/\s+/g, '-');
            const newChar = {
              id: id,
              name: name,
              worldId: select.value,
              worldTitle: select.options[select.selectedIndex].text,
              description: bio || 'A mysterious persona inside the world Nexus.',
              genres: [occupation || 'Fictional Entity'],
              avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%230e7490"/><text x="50" y="55" fill="%2322d3ee" font-size="32" font-family="Outfit" text-anchor="middle">${name.charAt(0).toUpperCase()}</text></svg>`,
              cardImage: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="180" viewBox="0 0 120 180"><rect width="100%" height="100%" fill="%230e7490"/><text x="60" y="95" fill="%2322d3ee" font-size="24" font-family="Outfit" text-anchor="middle">${name.charAt(0).toUpperCase()}</text></svg>`,
              metadata: {
                character: occupation || 'Resident',
                status: statusSelect.value
              },
              status: 'public',
              custom: true
            };

            // Check if user has permission to publish immediately
            const normalizeUsername = (u) => u ? u.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() : '';
            const normalizedCurrentUser = normalizeUsername(currentUser.username);
            
            const worldCollaborators = stateManager.getState('worldCollaborators') || {};
            const collabConfig = worldCollaborators[select.value];
            let userRole = 'Guest';
            
            if (collabConfig) {
              const collaborators = collabConfig.collaborators || {};
              const matchKey = Object.keys(collaborators).find(k => normalizeUsername(k) === normalizedCurrentUser);
              if (matchKey) {
                userRole = collaborators[matchKey];
              }
            } else {
              const customWorlds = stateManager.getState('customWorlds') || [];
              const cw = customWorlds.find(w => w.id === select.value);
              if (cw && normalizeUsername(cw.author) === normalizedCurrentUser) {
                userRole = 'Owner';
              } else if (select.value === 'arcanis' && normalizedCurrentUser === 'odin') {
                userRole = 'Owner';
              }
            }

            const canPublishDirectly = userRole === 'Owner' || userRole === 'Admin' || userRole === 'Editor';

            if (canPublishDirectly) {
              const customChars = stateManager.getState('customCharacters') || [];
              customChars.push(newChar);
              stateManager.setState('customCharacters', customChars);

              // Append to creator's characters array
              currentUser.characters = currentUser.characters || [];
              if (!currentUser.characters.includes(id)) {
                currentUser.characters.push(id);
                stateManager.setState('currentUser', currentUser);
              }

              // Log activity
              const activities = stateManager.getState('worldActivities') || [];
              activities.unshift({
                id: 'act_' + Date.now(),
                worldId: select.value,
                author: currentUser.username,
                action: 'created_character',
                details: `${newChar.name} created`,
                timestamp: 'Just now'
              });
              stateManager.setState('worldActivities', activities);

              stateManager.setState('activeIdentity', id);
              backdrop.remove();
              router.navigate(`/bot/${id}`);
              alert(`Character "${newChar.name}" created and published in ${newChar.worldTitle}.`);
            } else {
              // Submit draft
              const inboxRequests = stateManager.getState('inboxRequests') || [];
              inboxRequests.push({
                id: 'inb_' + Date.now(),
                type: 'character_submission',
                from: currentUser.username,
                worldId: select.value,
                worldTitle: select.options[select.selectedIndex].text,
                name: newChar.name,
                occupation: occupation || 'Resident',
                description: bio || 'A mysterious persona inside the world Nexus.',
                status: 'pending',
                timestamp: 'Just now'
              });
              stateManager.setState('inboxRequests', inboxRequests);

              backdrop.remove();
              alert(`Submission queued! Your character proposal for "${newChar.name}" has been sent to the owner of ${newChar.worldTitle} for review.`);
            }
          }
        }, 'Create Character');

        const card = DOM.el('div', { class: 'onboarding-card' },
          DOM.el('div', { class: 'onboarding-header' },
            DOM.el('h3', { class: 'onboarding-title' }, 'CREATE CHARACTER'),
            DOM.el('p', { class: 'onboarding-subtitle' }, 'Bring a fictional entity to life')
          ),
          modalBody,
          createBtn
        );

        backdrop.appendChild(card);
        document.body.appendChild(backdrop);
      });
    });
  }

  /**
   * Initializes Discord-like hover preview profile cards on mentions.
   */
  initHoverCardListener() {
    let activeCard = null;
    let hoverTimeout = null;

    document.body.addEventListener('mouseover', async (e) => {
      const trigger = e.target.closest('[data-mention-type]');
      if (!trigger) return;

      const type = trigger.getAttribute('data-mention-type');
      const id = trigger.getAttribute('data-mention-id');

      if (hoverTimeout) clearTimeout(hoverTimeout);

      hoverTimeout = setTimeout(async () => {
        if (activeCard) activeCard.remove();

        let name = '';
        let bio = '';
        let avatar = '';
        let banner = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80';
        let stat1Val = '0', stat1Lbl = '';
        let stat2Val = '0', stat2Lbl = '';
        let followId = '';

        if (type === 'user') {
          const curUser = stateManager.getState('currentUser');
          const isSelf = curUser && curUser.username.toLowerCase() === id.toLowerCase();
          
          let userObj = null;
          if (isSelf) {
            userObj = curUser;
          } else if (id.toLowerCase() === 'oxin') {
            userObj = { username: 'Oxin', tagline: 'World Architect', avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%232e185b"/><text x="50" y="55" fill="%23fef08a" font-size="32" font-family="Outfit" text-anchor="middle">O</text></svg>`, worldsCount: 2, followersCount: 152 };
          } else if (id.toLowerCase() === 'nova') {
            userObj = { username: 'Nova', tagline: 'Lore Scribe', avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23115e59"/><text x="50" y="55" fill="%2322d3ee" font-size="32" font-family="Outfit" text-anchor="middle">N</text></svg>`, worldsCount: 1, followersCount: 98 };
          } else {
            userObj = { username: id, tagline: 'Nexus Voyager', avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%231e293b"/><text x="50" y="55" fill="%2394a3b8" font-size="32" font-family="Outfit" text-anchor="middle">${id.charAt(0).toUpperCase()}</text></svg>`, worldsCount: 0, followersCount: 0 };
          }

          name = `@${userObj.username}`;
          bio = userObj.tagline || 'World Nexus Creator';
          avatar = userObj.avatar;
          stat1Val = userObj.worldsCount || 0;
          stat1Lbl = 'Worlds';
          stat2Val = isSelf ? (userObj.followersCount || 0) : (userObj.followersCount + (stateManager.isFollowing(userObj.username) ? 1 : 0));
          stat2Lbl = 'Followers';
          followId = userObj.username;
        } 
        else if (type === 'character' || type === 'bot') {
          const customChars = stateManager.getState('customCharacters') || [];
          let botObj = customChars.find(c => c.id === id);
          if (!botObj) {
            const allBots = await import('./services/BotService.js').then(m => m.BotService.getAllBots());
            botObj = allBots.find(b => b.id === id);
          }
          if (botObj) {
            name = botObj.name;
            bio = botObj.description;
            avatar = botObj.avatar;
            stat1Val = botObj.worldTitle || 'Arcanis';
            stat1Lbl = 'World';
            stat2Val = botObj.chats || '0';
            stat2Lbl = 'Chats';
            followId = botObj.id;
          }
        } 
        else if (type === 'world') {
          const customWorlds = stateManager.getState('customWorlds') || [];
          let worldObj = customWorlds.find(w => w.id === id);
          if (!worldObj) {
            const allWorlds = await import('./services/WorldService.js').then(m => m.WorldService.getWorlds());
            worldObj = allWorlds.find(w => w.id === id);
          }
          if (worldObj) {
            name = worldObj.title;
            bio = worldObj.description;
            avatar = worldObj.logo || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23eab308"/><text x="50" y="55" fill="%23111827" font-size="32" font-family="Outfit" text-anchor="middle">W</text></svg>`;
            if (worldObj.path && worldObj.logo && !worldObj.logo.startsWith('data') && !worldObj.logo.startsWith('http')) {
              avatar = `${worldObj.path}/${worldObj.logo}`;
            }
            stat1Val = worldObj.genres ? worldObj.genres[0] : 'Genre';
            stat1Lbl = 'Genre';
            stat2Val = worldObj.author || 'Oxin';
            stat2Lbl = 'Author';
            followId = worldObj.id;
          }
        }

        if (!name) return;

        const isSelfFollow = stateManager.getState('currentUser')?.username.toLowerCase() === followId.toLowerCase();
        let followBtn = null;
        if (!isSelfFollow) {
          followBtn = DOM.el('button', {
            class: `btn ${stateManager.isFollowing(followId) ? 'btn-secondary' : 'btn-accent'} hover-card-btn-small`,
            onclick: (evt) => {
              evt.stopPropagation();
              stateManager.toggleFollow(followId);
              const active = stateManager.isFollowing(followId);
              followBtn.textContent = active ? 'Following' : 'Follow';
              followBtn.className = `btn ${active ? 'btn-secondary' : 'btn-accent'} hover-card-btn-small`;
            }
          }, stateManager.isFollowing(followId) ? 'Following' : 'Follow');
        }

        const safeBanner = sanitizeCssUrl(banner);
        const safeAvatar = sanitizeUrl(avatar, name);

        const card = DOM.el('div', { class: 'profile-hover-card' },
          DOM.el('div', { class: 'hover-card-banner', style: { backgroundImage: `url(${safeBanner})` } }),
          DOM.el('div', { class: 'hover-card-body' },
            DOM.el('img', { class: 'hover-card-avatar', src: safeAvatar }),
            DOM.el('div', { class: 'hover-card-follow-row' }, followBtn || DOM.el('div')),
            DOM.el('div', { class: 'hover-card-name' }, name),
            DOM.el('div', { class: 'hover-card-type' }, type),
            DOM.el('p', { class: 'hover-card-bio' }, bio.slice(0, 100) + (bio.length > 100 ? '...' : '')),
            DOM.el('div', { class: 'hover-card-stats' },
              DOM.el('div', { class: 'hover-card-stat' },
                DOM.el('span', { class: 'hover-card-stat-val' }, stat1Val),
                DOM.el('span', { class: 'hover-card-stat-lbl' }, stat1Lbl)
              ),
              DOM.el('div', { class: 'hover-card-stat' },
                DOM.el('span', { class: 'hover-card-stat-val' }, stat2Val),
                DOM.el('span', { class: 'hover-card-stat-lbl' }, stat2Lbl)
              )
            )
          )
        );

        document.body.appendChild(card);
        activeCard = card;

        const rect = trigger.getBoundingClientRect();
        const cardHeight = card.offsetHeight || 180;
        const cardWidth = card.offsetWidth || 280;
        
        let top = rect.bottom + window.scrollY + 8;
        if (rect.bottom + cardHeight + 16 > window.innerHeight) {
          top = rect.top + window.scrollY - cardHeight - 8;
        }

        let left = rect.left + window.scrollX;
        if (left + cardWidth > window.innerWidth) {
          left = window.innerWidth - cardWidth - 16;
        }

        card.style.top = `${top}px`;
        card.style.left = `${left}px`;
      }, 300);
    });

    document.body.addEventListener('mouseout', (e) => {
      const trigger = e.target.closest('[data-mention-type]');
      const card = e.relatedTarget ? e.relatedTarget.closest('.profile-hover-card') : null;
      
      if (!trigger && !card) {
        if (hoverTimeout) clearTimeout(hoverTimeout);
        if (activeCard) {
          activeCard.remove();
          activeCard = null;
        }
      }
    });

    document.body.addEventListener('click', (e) => {
      if (activeCard && !activeCard.contains(e.target)) {
        activeCard.remove();
        activeCard = null;
      }
    });
  }

  /**
   * Updates the navigation menu badges with total pending requests count.
   */
  updateInboxBadges() {
    const requests = stateManager.getState('inboxRequests') || [];
    const notifications = stateManager.getState('notifications') || [];
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const unreadNotifications = notifications.filter(n => !n.read).length;
    const totalCount = pendingCount + unreadNotifications;

    const desktopBadge = document.getElementById('inbox-badge');
    const mobileBadge = document.getElementById('mobile-inbox-badge');

    [desktopBadge, mobileBadge].forEach(badge => {
      if (badge) {
        if (totalCount > 0) {
          badge.textContent = totalCount;
          badge.style.display = 'inline-flex';
        } else {
          badge.style.display = 'none';
        }
      }
    });
  }

  /**
   * Launches the main creation options overlay dialog.
   */
  openCreationHubModal() {
    const currentUser = stateManager.getState('currentUser');
    if (!currentUser) {
      alert('You must sign in to submit contributions or create realities.');
      this.openLoginModal();
      return;
    }

    const backdrop = DOM.el('div', { 
      class: 'onboarding-overlay',
      onclick: (e) => { if (e.target === backdrop) backdrop.remove(); }
    });

    const createOption = (title, desc, icon, callback) => {
      const card = DOM.el('div', {
        class: 'onboarding-option-card',
        onclick: () => {
          backdrop.remove();
          callback();
        }
      },
        DOM.el('i', { class: `bi ${icon}`, style: { fontSize: '24px', color: 'var(--accent-gold)' } }),
        DOM.el('div', { class: 'onboarding-option-details' },
          DOM.el('span', { class: 'onboarding-option-title' }, title),
          DOM.el('span', { class: 'onboarding-option-desc' }, desc)
        )
      );
      return card;
    };

    const card = DOM.el('div', { class: 'onboarding-card' },
      DOM.el('div', { class: 'onboarding-header' },
        DOM.el('h3', { class: 'onboarding-title' }, 'CREATION HUB'),
        DOM.el('p', { class: 'onboarding-subtitle' }, 'Choose an action to contribute to the Multiverse')
      ),
      DOM.el('div', { class: 'onboarding-body' },
        createOption('Create a World', 'Establish a new reality with custom cover artwork, lore docs, and themes.', 'bi-globe-americas', () => {
          this.startOnboarding(currentUser.username);
        }),
        createOption('Create a Character', 'Design a customized AI chatbot profile linked to an existing world.', 'bi-person-plus', () => {
          this.openCreateCharacterModal();
        }),
        createOption('Submit Lore Draft', 'Write lore chronicles, locations, or factions details to submit for review.', 'bi-journal-plus', () => {
          this.openSubmitLoreModal();
        })
      ),
      DOM.el('div', { class: 'onboarding-footer', style: { justifyContent: 'center' } },
        DOM.el('button', { class: 'btn btn-secondary', onclick: () => backdrop.remove() }, 'Close')
      )
    );

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
  }

  /**
   * Opens the Submit Lore overlay draft form.
   */
  openSubmitLoreModal() {
    const backdrop = DOM.el('div', { 
      class: 'onboarding-overlay', 
      onclick: (e) => { if (e.target === backdrop) backdrop.remove(); } 
    });

    const titleInput = DOM.el('input', { type: 'text', class: 'search-input-box', placeholder: 'E.g., The Shadow Sectors' });
    const contentTextarea = DOM.el('textarea', { class: 'comment-textarea', placeholder: 'Write your lore section in markdown...' });

    import('./services/WorldService.js').then(({ WorldService }) => {
      WorldService.getWorlds().then(worlds => {
        const select = DOM.el('select', { class: 'comment-identity-select', style: { width: '100%', padding: '10px' } });
        worlds.forEach(w => {
          select.appendChild(DOM.el('option', { value: w.id }, w.title));
        });
        
        const customWorlds = stateManager.getState('customWorlds') || [];
        customWorlds.forEach(cw => {
          select.appendChild(DOM.el('option', { value: cw.id }, cw.title));
        });

        const modalBody = DOM.el('div', { class: 'onboarding-body' },
          DOM.el('div', { class: 'auth-input-group' },
            DOM.el('label', { class: 'auth-input-label' }, 'Target World'),
            select
          ),
          DOM.el('div', { class: 'auth-input-group' },
            DOM.el('label', { class: 'auth-input-label' }, 'Lore Article Title'),
            titleInput
          ),
          DOM.el('div', { class: 'auth-input-group' },
            DOM.el('label', { class: 'auth-input-label' }, 'Lore Content (Markdown)'),
            contentTextarea
          )
        );

        const submitBtn = DOM.el('button', {
          class: 'btn btn-accent',
          style: { width: '100%' },
          onclick: () => {
            const title = titleInput.value.trim();
            if (!title) {
              alert('Please enter lore title');
              return;
            }
            const content = contentTextarea.value.trim();
            if (!content) {
              alert('Please enter lore content');
              return;
            }

            const currentUser = stateManager.getState('currentUser');
            const targetWorldId = select.value;
            const targetWorldTitle = select.options[select.selectedIndex].text;

            // Submit draft request to inbox
            const inboxRequests = stateManager.getState('inboxRequests') || [];
            inboxRequests.push({
              id: 'inb_' + Date.now(),
              type: 'lore_submission',
              from: currentUser.username,
              worldId: targetWorldId,
              worldTitle: targetWorldTitle,
              title: title,
              content: content,
              status: 'pending',
              timestamp: 'Just now'
            });
            stateManager.setState('inboxRequests', inboxRequests);

            alert(`Uplink successful! Lore draft "${title}" submitted to the owner of ${targetWorldTitle} for approval.`);
            backdrop.remove();
          }
        }, 'Submit for Review');

        const card = DOM.el('div', { class: 'onboarding-card' },
          DOM.el('div', { class: 'onboarding-header' },
            DOM.el('h3', { class: 'onboarding-title' }, 'SUBMIT LORE DRAFT'),
            DOM.el('p', { class: 'onboarding-subtitle' }, 'Propose a new chronicle entry')
          ),
          modalBody,
          submitBtn
        );

        backdrop.appendChild(card);
        document.body.appendChild(backdrop);
      });
    });
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
