/* js/pages/SettingsPage.js */
import { DOM } from '../utils/DOM.js';
import { stateManager } from '../core/StateManager.js';
import { router } from '../core/Router.js';
import { globalEventBus } from '../core/EventBus.js';
import { Breadcrumbs } from '../ui/Breadcrumbs.js';
import { sanitizeUrl, sanitizeCssUrl } from '../utils/Security.js';

export class SettingsPage {
  /**
   * Controller for Profile & Account Settings.
   * @param {HTMLElement} appRoot - App insertion parent node
   * @param {string} [activeTab='profile'] - Active tab id
   */
  constructor(appRoot, activeTab = 'profile') {
    this.appRoot = appRoot;
    this.activeTab = activeTab || 'profile';
    this.user = null;
    this.subscriptions = [];
  }

  /**
   * Loads configurations, binds sidebar tabs, and renders the active tab form.
   */
  async load() {
    this.user = stateManager.getState('currentUser');
    if (!this.user) {
      // Access control: Guest redirected to landing
      router.navigate('#/');
      return;
    }

    document.title = 'Settings - World Nexus';

    const container = DOM.el('div', { class: 'settings-page-container fade-in-up-page' });
    DOM.clear(this.appRoot);
    this.appRoot.appendChild(container);

    // Breadcrumbs
    await Breadcrumbs.render(container, { page: 'settings', tabName: this.activeTab });

    // Main layout grid
    const layoutGrid = DOM.el('div', { class: 'settings-layout-grid' });
    container.appendChild(layoutGrid);

    // Sidebar navigation
    const sidebar = this.renderSidebar();
    layoutGrid.appendChild(sidebar);

    // Content pane
    const contentPane = DOM.el('main', { class: 'settings-content-pane' });
    layoutGrid.appendChild(contentPane);
    this.contentPane = contentPane;

    // Render active tab contents
    this.renderActiveTab();

    // Listen to route changes to switch tabs without reloading
    this.subscriptions.push(
      globalEventBus.on('route:change', (route) => {
        if (route.page === 'settings' && route.id) {
          this.activeTab = route.id;
          // Redraw sidebar active state
          const oldSidebar = layoutGrid.querySelector('.settings-sidebar');
          if (oldSidebar) {
            const newSidebar = this.renderSidebar();
            layoutGrid.replaceChild(newSidebar, oldSidebar);
          }
          this.renderActiveTab();
        }
      })
    );
  }

  /**
   * Renders the settings sidebar menu.
   */
  renderSidebar() {
    const tabs = [
      { id: 'profile', label: 'Profile', icon: 'bi-person-gear' },
      { id: 'account', label: 'Account', icon: 'bi-shield-lock' },
      { id: 'appearance', label: 'Appearance', icon: 'bi-palette' },
      { id: 'privacy', label: 'Privacy', icon: 'bi-eye-slash' },
      { id: 'notifications', label: 'Notifications', icon: 'bi-bell' },
      { id: 'connected', label: 'Connected Accounts', icon: 'bi-link-45deg' },
      { id: 'identity', label: 'Badges & Identity', icon: 'bi-patch-check' },
      { id: 'collaborators', label: 'Collaborators', icon: 'bi-people' },
      { id: 'security', label: 'Security', icon: 'bi-key' }
    ];

    const nav = DOM.el('aside', { class: 'settings-sidebar' },
      DOM.el('div', { class: 'settings-sidebar-header' }, 'Settings')
    );

    tabs.forEach(tab => {
      const active = this.activeTab === tab.id;
      const btn = DOM.el('button', {
        class: `settings-sidebar-btn ${active ? 'active' : ''}`,
        onclick: () => router.navigate(`#/settings/${tab.id}`)
      },
        DOM.el('i', { class: `bi ${tab.icon}` }),
        tab.label
      );
      nav.appendChild(btn);
    });

    // Divider before destructive actions
    nav.appendChild(DOM.el('div', { class: 'settings-sidebar-divider' }));

    // Delete Account action
    const deleteBtn = DOM.el('button', {
      class: 'settings-sidebar-btn btn-danger-action',
      onclick: () => this.handleDeleteAccount()
    },
      DOM.el('i', { class: 'bi bi-trash3' }),
      'Delete Account'
    );
    nav.appendChild(deleteBtn);

    return nav;
  }

  /**
   * Routes the layout compilation to the active tab method.
   */
  renderActiveTab() {
    if (!this.contentPane) return;
    DOM.clear(this.contentPane);

    const methods = {
      profile: () => this.renderProfileSettings(),
      account: () => this.renderAccountSettings(),
      appearance: () => this.renderAppearanceSettings(),
      privacy: () => this.renderPrivacySettings(),
      notifications: () => this.renderNotificationSettings(),
      connected: () => this.renderConnectedAccounts(),
      identity: () => this.renderIdentitySettings(),
      collaborators: () => this.renderCollaboratorSettings(),
      security: () => this.renderSecuritySettings()
    };

    const draw = methods[this.activeTab] || methods.profile;
    this.contentPane.appendChild(draw());
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TAB: Profile Settings
  // ───────────────────────────────────────────────────────────────────────────
  renderProfileSettings() {
    const pane = DOM.el('div', { class: 'settings-tab-pane' },
      DOM.el('h2', { class: 'settings-tab-title' }, 'Profile Settings'),
      DOM.el('p', { class: 'settings-tab-subtitle' }, 'Control your public-facing creator metadata across the Nexus.')
    );

    // Profile picture picker
    const avatarImg = DOM.el('img', {
      src: sanitizeUrl(this.user.avatar, this.user.username),
      class: 'settings-avatar-preview'
    });
    
    const avatarGroup = DOM.el('div', { class: 'settings-form-row avatar-upload-row' },
      avatarImg,
      DOM.el('div', { class: 'upload-actions-col' },
        DOM.el('button', {
          class: 'btn btn-secondary btn-sm',
          onclick: () => {
            const url = prompt('Enter image URL for profile picture:', this.user.avatar);
            if (url) {
              avatarImg.src = sanitizeUrl(url, this.user.username);
              this.user.avatar = url;
            }
          }
        }, 'Upload Picture'),
        DOM.el('span', { class: 'input-tip-desc' }, 'Square PNG, JPG, or SVG. Maximum size 1MB.')
      )
    );
    pane.appendChild(avatarGroup);

    // Banner Image picker with crop reposition tools
    const bannerPreview = DOM.el('div', {
      class: 'settings-banner-preview-frame',
      style: {
        backgroundImage: `url(${sanitizeCssUrl(this.user.banner)})`,
        backgroundPosition: `50% ${this.user.customBannerOffset || 50}%`
      }
    });

    const bannerGroup = DOM.el('div', { class: 'settings-form-row banner-upload-row' },
      DOM.el('label', { class: 'settings-input-label' }, 'Profile Banner'),
      bannerPreview,
      DOM.el('div', { class: 'upload-actions-col', style: { marginTop: '12px' } },
        DOM.el('div', { style: { display: 'flex', gap: '10px' } },
          DOM.el('button', {
            class: 'btn btn-secondary btn-sm',
            onclick: () => {
              const url = prompt('Enter banner image URL (e.g. from Unsplash):', this.user.banner);
              if (url) {
                bannerPreview.style.backgroundImage = `url(${sanitizeCssUrl(url)})`;
                this.user.banner = url;
              }
            }
          }, 'Upload Banner'),
          DOM.el('button', {
            class: 'btn btn-secondary btn-sm',
            onclick: () => this.openBannerEditorModal(bannerPreview)
          }, 'Crop & Reposition')
        ),
        DOM.el('span', { class: 'input-tip-desc' }, 'Recommended dimensions: 1500x500. Drag sliders to adjust layout.')
      )
    );
    pane.appendChild(bannerGroup);

    // Username field with live availability checks
    const usernameInput = DOM.el('input', {
      type: 'text',
      class: 'search-input-box',
      value: this.user.username
    });
    
    const validateFeedback = DOM.el('span', { class: 'validate-feedback' }, '');

    usernameInput.addEventListener('input', () => {
      const val = usernameInput.value.trim().toLowerCase();
      if (!val) {
        validateFeedback.textContent = '✕ Username cannot be empty';
        validateFeedback.className = 'validate-feedback text-error';
        return;
      }
      if (val.includes(' ')) {
        validateFeedback.textContent = '✕ Username cannot contain spaces';
        validateFeedback.className = 'validate-feedback text-error';
        return;
      }
      if (!/^[a-z0-9_.]+$/.test(val)) {
        validateFeedback.textContent = '✕ Allowed characters: a-z, 0-9, _, .';
        validateFeedback.className = 'validate-feedback text-error';
        return;
      }
      if (val.length < 3 || val.length > 24) {
        validateFeedback.textContent = '✕ Username must be between 3 and 24 characters';
        validateFeedback.className = 'validate-feedback text-error';
        return;
      }

      // Mock registry lookup
      const isMine = val === this.user.username.toLowerCase();
      const taken = ['oxin', 'nova', 'admin', 'moderator'].includes(val);
      if (taken && !isMine) {
        validateFeedback.textContent = '✕ Already Taken';
        validateFeedback.className = 'validate-feedback text-error';
      } else {
        validateFeedback.textContent = '✓ Available';
        validateFeedback.className = 'validate-feedback text-success';
      }
    });

    pane.appendChild(DOM.el('div', { class: 'auth-input-group' },
      DOM.el('label', { class: 'settings-input-label' }, 'Username handle'),
      usernameInput,
      validateFeedback
    ));

    // Display Name
    const displayNameInput = DOM.el('input', {
      type: 'text',
      class: 'search-input-box',
      value: this.user.displayName || this.user.username
    });
    pane.appendChild(DOM.el('div', { class: 'auth-input-group' },
      DOM.el('label', { class: 'settings-input-label' }, 'Display Name'),
      displayNameInput
    ));

    // Pronouns
    const pronounsInput = DOM.el('input', {
      type: 'text',
      class: 'search-input-box',
      value: this.user.pronouns || '',
      placeholder: 'e.g. they/them'
    });
    pane.appendChild(DOM.el('div', { class: 'auth-input-group' },
      DOM.el('label', { class: 'settings-input-label' }, 'Pronouns'),
      pronounsInput
    ));

    // Bio with character counter
    const bioTextarea = DOM.el('textarea', {
      class: 'comment-textarea',
      placeholder: 'Tell the sectors about yourself...',
      value: this.user.bio || ''
    });
    
    const charCounter = DOM.el('span', { class: 'char-counter' }, `${(this.user.bio || '').length} / 500`);
    bioTextarea.addEventListener('input', () => {
      const len = bioTextarea.value.length;
      charCounter.textContent = `${len} / 500`;
      if (len > 500) {
        charCounter.classList.add('text-error');
      } else {
        charCounter.classList.remove('text-error');
      }
    });

    pane.appendChild(DOM.el('div', { class: 'auth-input-group' },
      DOM.el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        DOM.el('label', { class: 'settings-input-label' }, 'Bio'),
        charCounter
      ),
      bioTextarea
    ));

    // Location & Website
    const locationInput = DOM.el('input', { type: 'text', class: 'search-input-box', value: this.user.location || '', placeholder: 'e.g. Sector 4' });
    const websiteInput = DOM.el('input', { type: 'text', class: 'search-input-box', value: this.user.website || '', placeholder: 'e.g. worldnexus.grid' });
    
    pane.appendChild(DOM.el('div', { class: 'auth-input-group' },
      DOM.el('label', { class: 'settings-input-label' }, 'Location'),
      locationInput
    ));
    pane.appendChild(DOM.el('div', { class: 'auth-input-group' },
      DOM.el('label', { class: 'settings-input-label' }, 'Website'),
      websiteInput
    ));

    // Primary Role
    const roles = ['World Architect', 'Lore Scribe', 'Space Cartographer', 'Fictional Archivist', 'Citizen Voyager'];
    const roleSelect = DOM.el('select', { class: 'comment-identity-select', style: { width: '100%' } });
    roles.forEach(r => {
      roleSelect.appendChild(DOM.el('option', { value: r, selected: this.user.primaryRole === r }, r));
    });
    pane.appendChild(DOM.el('div', { class: 'auth-input-group' },
      DOM.el('label', { class: 'settings-input-label' }, 'Primary Role'),
      roleSelect
    ));

    // Statistics displays checkboxes
    const showWorldsCheck = DOM.el('input', { type: 'checkbox', id: 'check-worlds', checked: this.user.showWorldCount !== false });
    const showFollowersCheck = DOM.el('input', { type: 'checkbox', id: 'check-followers', checked: this.user.showFollowerCount !== false });
    const showActivityCheck = DOM.el('input', { type: 'checkbox', id: 'check-activity', checked: this.user.showActivity !== false });

    pane.appendChild(DOM.el('div', { class: 'settings-checkbox-group', style: { marginTop: '16px' } },
      DOM.el('h3', { class: 'settings-section-subtitle' }, 'Profile Metrics Display'),
      DOM.el('label', { class: 'auth-checkbox-label', for: 'check-worlds' }, showWorldsCheck, 'Display World Count publicly'),
      DOM.el('label', { class: 'auth-checkbox-label', for: 'check-followers' }, showFollowersCheck, 'Display Follower Count publicly'),
      DOM.el('label', { class: 'auth-checkbox-label', for: 'check-activity' }, showActivityCheck, 'Display Activity Feed tab')
    ));

    // Read-only statistics counter panel
    const customWorlds = stateManager.getState('customWorlds') || [];
    const customChars = stateManager.getState('customCharacters') || [];
    const statsBox = DOM.el('div', { class: 'settings-stats-preview-panel', style: { marginTop: '16px' } },
      DOM.el('h4', { style: { fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' } }, 'Nexus Stats (Read-Only)'),
      DOM.el('div', { class: 'settings-stats-grid' },
        DOM.el('div', {}, DOM.el('span', { class: 'stat-num' }, this.user.worldsCount + customWorlds.length), ' Worlds'),
        DOM.el('div', {}, DOM.el('span', { class: 'stat-num' }, this.user.charactersCount + customChars.length), ' Characters'),
        DOM.el('div', {}, DOM.el('span', { class: 'stat-num' }, this.user.followersCount || 0), ' Followers')
      )
    );
    pane.appendChild(statsBox);

    // Save changes button
    const saveBtn = DOM.el('button', {
      class: 'btn btn-accent',
      style: { marginTop: '24px' },
      onclick: () => {
        const usernameVal = usernameInput.value.trim().toLowerCase();
        if (!/^[a-z0-9_.]+$/.test(usernameVal) || usernameVal.length < 3 || usernameVal.length > 24) {
          alert('Username handle invalid. Fix errors before saving.');
          return;
        }
        if (bioTextarea.value.length > 500) {
          alert('Bio exceeds 500 character limit.');
          return;
        }

        this.user.username = usernameVal;
        this.user.displayName = displayNameInput.value.trim() || usernameVal;
        this.user.pronouns = pronounsInput.value.trim();
        this.user.bio = bioTextarea.value.trim();
        this.user.location = locationInput.value.trim();
        this.user.website = websiteInput.value.trim();
        this.user.primaryRole = roleSelect.value;
        this.user.showWorldCount = showWorldsCheck.checked;
        this.user.showFollowerCount = showFollowersCheck.checked;
        this.user.showActivity = showActivityCheck.checked;

        stateManager.setState('currentUser', this.user);
        alert('Telemetry updated: Profile changes successfully saved to the Grid.');
      }
    }, 'Save Changes');
    pane.appendChild(saveBtn);

    return pane;
  }

  /**
   * Opens the custom Banner Editor Modal for repositioning/zooming/cropping.
   */
  openBannerEditorModal(bannerPreviewEl) {
    const backdrop = DOM.el('div', { class: 'onboarding-overlay' });

    // Mock Banner viewport
    const bannerImg = DOM.el('img', {
      src: this.user.banner,
      class: 'crop-banner-img',
      style: {
        transform: `scale(${this.user.customBannerZoom || 1})`,
        objectPosition: `50% ${this.user.customBannerOffset || 50}%`
      }
    });

    const cropViewport = DOM.el('div', { class: 'banner-crop-viewport' }, bannerImg);

    // Sliders
    const zoomSlider = DOM.el('input', {
      type: 'range',
      min: '1',
      max: '3',
      step: '0.1',
      value: this.user.customBannerZoom || 1,
      class: 'settings-range-slider'
    });

    const offsetSlider = DOM.el('input', {
      type: 'range',
      min: '0',
      max: '100',
      step: '1',
      value: this.user.customBannerOffset || 50,
      class: 'settings-range-slider'
    });

    zoomSlider.addEventListener('input', (e) => {
      bannerImg.style.transform = `scale(${e.target.value})`;
    });

    offsetSlider.addEventListener('input', (e) => {
      bannerImg.style.objectPosition = `50% ${e.target.value}%`;
    });

    // Crop Aspect Presets
    const cropRow = DOM.el('div', { class: 'crop-presets-row', style: { display: 'flex', gap: '10px', marginTop: '12px' } },
      DOM.el('button', {
        class: 'btn btn-secondary btn-sm active',
        onclick: (e) => {
          cropRow.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          cropViewport.style.aspectRatio = '3 / 1'; // standard 1500x500
        }
      }, 'Standard (3:1)'),
      DOM.el('button', {
        class: 'btn btn-secondary btn-sm',
        onclick: (e) => {
          cropRow.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          cropViewport.style.aspectRatio = '16 / 9'; // cinematic
        }
      }, 'Cinematic (16:9)'),
      DOM.el('button', {
        class: 'btn btn-secondary btn-sm',
        onclick: (e) => {
          cropRow.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          cropViewport.style.aspectRatio = '2 / 1';
        }
      }, 'Compact (2:1)')
    );

    const card = DOM.el('div', { class: 'onboarding-card banner-editor-card' },
      DOM.el('div', { class: 'onboarding-header' },
        DOM.el('h3', { class: 'onboarding-title' }, 'REPOSITION & CROP BANNER'),
        DOM.el('p', { class: 'onboarding-subtitle' }, 'Adjust zoom scale and positioning parameters')
      ),
      DOM.el('div', { class: 'onboarding-body' },
        cropViewport,
        cropRow,
        DOM.el('div', { class: 'auth-input-group' },
          DOM.el('label', { class: 'settings-input-label' }, 'Zoom Scale'),
          zoomSlider
        ),
        DOM.el('div', { class: 'auth-input-group' },
          DOM.el('label', { class: 'settings-input-label' }, 'Vertical Offset (Reposition)'),
          offsetSlider
        )
      ),
      DOM.el('div', { class: 'onboarding-footer' },
        DOM.el('button', { class: 'btn btn-secondary', onclick: () => backdrop.remove() }, 'Cancel'),
        DOM.el('button', {
          class: 'btn btn-accent',
          onclick: () => {
            this.user.customBannerOffset = parseInt(offsetSlider.value);
            this.user.customBannerZoom = parseFloat(zoomSlider.value);
            stateManager.setState('currentUser', this.user);
            
            // Update the live preview back on the main form
            bannerPreviewEl.style.backgroundPosition = `50% ${this.user.customBannerOffset}%`;
            backdrop.remove();
          }
        }, 'Apply & Save')
      )
    );

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TAB: Account Settings
  // ───────────────────────────────────────────────────────────────────────────
  renderAccountSettings() {
    const pane = DOM.el('div', { class: 'settings-tab-pane' },
      DOM.el('h2', { class: 'settings-tab-title' }, 'Account Settings'),
      DOM.el('p', { class: 'settings-tab-subtitle' }, 'Manage private details and credentials associated with your account.')
    );

    const emailInput = DOM.el('input', { type: 'email', class: 'search-input-box', value: this.user.account?.email || '' });
    const birthInput = DOM.el('input', { type: 'date', class: 'search-input-box', value: this.user.account?.birthDate || '' });
    const langInput = DOM.el('input', { type: 'text', class: 'search-input-box', value: this.user.account?.language || 'English' });
    const countryInput = DOM.el('input', { type: 'text', class: 'search-input-box', value: this.user.account?.country || 'United Sectors' });

    pane.appendChild(DOM.el('div', { class: 'auth-input-group' },
      DOM.el('label', { class: 'settings-input-label' }, 'Email Address'),
      emailInput
    ));

    // Change Password block
    const pwdBtn = DOM.el('button', {
      class: 'btn btn-secondary btn-sm',
      style: { alignSelf: 'flex-start', marginBottom: '16px' },
      onclick: () => {
        const oldP = prompt('Enter current password:');
        if (oldP) {
          const newP = prompt('Enter new password (min 6 characters):');
          if (newP && newP.length >= 6) {
            alert('Password successfully updated. Secure token refreshed.');
          } else if (newP) {
            alert('Password too short. Action aborted.');
          }
        }
      }
    }, 'Change Password');

    pane.appendChild(DOM.el('div', { class: 'auth-input-group' },
      DOM.el('label', { class: 'settings-input-label' }, 'Account Security'),
      pwdBtn
    ));

    pane.appendChild(DOM.el('div', { class: 'auth-input-group' },
      DOM.el('label', { class: 'settings-input-label' }, 'Birth Date'),
      birthInput
    ));

    pane.appendChild(DOM.el('div', { class: 'auth-input-group' },
      DOM.el('label', { class: 'settings-input-label' }, 'Language Preference'),
      langInput
    ));

    pane.appendChild(DOM.el('div', { class: 'auth-input-group' },
      DOM.el('label', { class: 'settings-input-label' }, 'Region / Country'),
      countryInput
    ));

    // Export & Deactivate row
    pane.appendChild(DOM.el('div', { class: 'settings-actions-panel', style: { borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px', display: 'flex', gap: '12px' } },
      DOM.el('button', {
        class: 'btn btn-secondary btn-sm',
        onclick: () => {
          alert('Exporting account records... Telemetry archive download starting in background (World-Nexus-User-Data.json).');
        }
      }, 'Export Account Data'),
      DOM.el('button', {
        class: 'btn btn-secondary btn-sm btn-danger-text',
        onclick: () => {
          if (confirm('Are you absolutely sure you want to deactivate your grid connection? Your profile will be temporarily suspended.')) {
            stateManager.logout();
            router.navigate('#/');
          }
        }
      }, 'Deactivate Account')
    ));

    const saveBtn = DOM.el('button', {
      class: 'btn btn-accent',
      style: { marginTop: '24px', alignSelf: 'flex-start' },
      onclick: () => {
        this.user.account = {
          email: emailInput.value,
          birthDate: birthInput.value,
          language: langInput.value,
          country: countryInput.value
        };
        stateManager.setState('currentUser', this.user);
        alert('Account configurations updated.');
      }
    }, 'Save Changes');
    pane.appendChild(saveBtn);

    return pane;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TAB: Appearance Settings (Themes)
  // ───────────────────────────────────────────────────────────────────────────
  renderAppearanceSettings() {
    const pane = DOM.el('div', { class: 'settings-tab-pane' },
      DOM.el('h2', { class: 'settings-tab-title' }, 'Appearance Theme'),
      DOM.el('p', { class: 'settings-tab-subtitle' }, 'Customize borders, glow accents, and styling highlights for your public Profile Page.')
    );

    const themes = ['Default Nexus', 'Void Purple', 'Cyber Neon', 'Solar Gold', 'Arcane Blue'];
    const container = DOM.el('div', { class: 'theme-selection-grid', style: { display: 'flex', flexDirection: 'column', gap: '12px' } });

    themes.forEach(theme => {
      const active = (this.user.profileTheme || 'Default Nexus') === theme;
      
      const card = DOM.el('div', {
        class: `onboarding-option-card ${active ? 'selected' : ''}`,
        onclick: () => {
          container.querySelectorAll('.onboarding-option-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          this.user.profileTheme = theme;
          stateManager.setState('currentUser', this.user);
        }
      },
        DOM.el('div', { class: 'onboarding-option-circle' }),
        DOM.el('span', { style: { fontWeight: '600' } }, theme)
      );
      container.appendChild(card);
    });

    pane.appendChild(container);
    return pane;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TAB: Privacy Settings
  // ───────────────────────────────────────────────────────────────────────────
  renderPrivacySettings() {
    const pane = DOM.el('div', { class: 'settings-tab-pane' },
      DOM.el('h2', { class: 'settings-tab-title' }, 'Privacy Settings'),
      DOM.el('p', { class: 'settings-tab-subtitle' }, 'Fine-grained privacy options to control who accesses your communications.')
    );

    const visibilityInput = DOM.el('select', { class: 'comment-identity-select', style: { width: '100%' } },
      DOM.el('option', { value: 'Public', selected: this.user.privacy?.visibility === 'Public' }, 'Public visibility (Everyone on grid)'),
      DOM.el('option', { value: 'Members Only', selected: this.user.privacy?.visibility === 'Members Only' }, 'Members Only (Registered Voyagers)')
    );

    const messageInput = DOM.el('select', { class: 'comment-identity-select', style: { width: '100%' } },
      DOM.el('option', { value: 'Everyone', selected: this.user.privacy?.whoCanMessage === 'Everyone' }, 'Everyone'),
      DOM.el('option', { value: 'Followers', selected: this.user.privacy?.whoCanMessage === 'Followers' }, 'Followers Only'),
      DOM.el('option', { value: 'Nobody', selected: this.user.privacy?.whoCanMessage === 'Nobody' }, 'Block direct messages')
    );

    const mentionInput = DOM.el('select', { class: 'comment-identity-select', style: { width: '100%' } },
      DOM.el('option', { value: 'Everyone', selected: this.user.privacy?.whoCanMention === 'Everyone' }, 'Everyone'),
      DOM.el('option', { value: 'Followers', selected: this.user.privacy?.whoCanMention === 'Followers' }, 'Followers Only'),
      DOM.el('option', { value: 'Nobody', selected: this.user.privacy?.whoCanMention === 'Nobody' }, 'Nobody')
    );

    const onlineCheck = DOM.el('input', { type: 'checkbox', id: 'check-online-status', checked: this.user.privacy?.showOnlineStatus !== false });

    pane.appendChild(DOM.el('div', { class: 'auth-input-group' },
      DOM.el('label', { class: 'settings-input-label' }, 'Profile Visibility'),
      visibilityInput
    ));

    pane.appendChild(DOM.el('div', { class: 'auth-input-group' },
      DOM.el('label', { class: 'settings-input-label' }, 'Who Can Message Me'),
      messageInput
    ));

    pane.appendChild(DOM.el('div', { class: 'auth-input-group' },
      DOM.el('label', { class: 'settings-input-label' }, 'Who Can Mention Me'),
      mentionInput
    ));

    pane.appendChild(DOM.el('div', { class: 'auth-input-group', style: { marginTop: '16px' } },
      DOM.el('label', { class: 'auth-checkbox-label', for: 'check-online-status' },
        onlineCheck,
        'Show active online status indicators'
      )
    ));

    const saveBtn = DOM.el('button', {
      class: 'btn btn-accent',
      style: { marginTop: '24px' },
      onclick: () => {
        this.user.privacy = {
          visibility: visibilityInput.value,
          whoCanMessage: messageInput.value,
          whoCanMention: mentionInput.value,
          showOnlineStatus: onlineCheck.checked
        };
        stateManager.setState('currentUser', this.user);
        alert('Privacy policies updated on the sector grid.');
      }
    }, 'Save Changes');
    pane.appendChild(saveBtn);

    return pane;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TAB: Notification Settings
  // ───────────────────────────────────────────────────────────────────────────
  renderNotificationSettings() {
    const pane = DOM.el('div', { class: 'settings-tab-pane' },
      DOM.el('h2', { class: 'settings-tab-title' }, 'Notification Settings'),
      DOM.el('p', { class: 'settings-tab-subtitle' }, 'Configure Discord-style telemetry updates and communications.')
    );

    const rows = [
      { key: 'worldFollowed', label: 'World Followed notifications' },
      { key: 'characterMention', label: 'Character Mention signals' },
      { key: 'commentReplies', label: 'Chronicle Comment Replies' },
      { key: 'collaborationRequests', label: 'Collaboration Proposal requests' }
    ];

    const grid = DOM.el('div', { class: 'notifications-matrix-grid', style: { display: 'flex', flexDirection: 'column', gap: '16px' } });

    rows.forEach(r => {
      const config = this.user.notifications?.[r.key] || { push: true, email: false };
      const pushCheck = DOM.el('input', { type: 'checkbox', checked: config.push });
      const emailCheck = DOM.el('input', { type: 'checkbox', checked: config.email });

      const rowEl = DOM.el('div', { class: 'notification-settings-row', style: { borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' } },
        DOM.el('h4', { style: { margin: '0 0 6px', fontSize: 'var(--fs-sm)' } }, r.label),
        DOM.el('div', { style: { display: 'flex', gap: '20px' } },
          DOM.el('label', { class: 'auth-checkbox-label', style: { margin: '0' } }, pushCheck, 'Push Alerts'),
          DOM.el('label', { class: 'auth-checkbox-label', style: { margin: '0' } }, emailCheck, 'Email digests')
        )
      );

      // Track references for saves
      r.pushCheck = pushCheck;
      r.emailCheck = emailCheck;

      grid.appendChild(rowEl);
    });

    pane.appendChild(grid);

    const saveBtn = DOM.el('button', {
      class: 'btn btn-accent',
      style: { marginTop: '24px' },
      onclick: () => {
        this.user.notifications = {};
        rows.forEach(r => {
          this.user.notifications[r.key] = {
            push: r.pushCheck.checked,
            email: r.emailCheck.checked
          };
        });
        stateManager.setState('currentUser', this.user);
        alert('Notification configurations updated.');
      }
    }, 'Save Changes');
    pane.appendChild(saveBtn);

    return pane;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TAB: Connected Accounts
  // ───────────────────────────────────────────────────────────────────────────
  renderConnectedAccounts() {
    const pane = DOM.el('div', { class: 'settings-tab-pane' },
      DOM.el('h2', { class: 'settings-tab-title' }, 'Connected Accounts'),
      DOM.el('p', { class: 'settings-tab-subtitle' }, 'Link credentials from external galaxies to display verification anchors.')
    );

    const services = [
      { key: 'discord', label: 'Discord', icon: 'bi-discord', color: '#5865F2' },
      { key: 'google', label: 'Google', icon: 'bi-google', color: '#DB4437' },
      { key: 'github', label: 'GitHub', icon: 'bi-github', color: '#24292e' },
      { key: 'x', label: 'X (Twitter)', icon: 'bi-twitter-x', color: '#000000' },
      { key: 'bluesky', label: 'Bluesky', icon: 'bi-cloud-sun', color: '#0560FF' }
    ];

    const list = DOM.el('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } });

    services.forEach(srv => {
      const connected = this.user.connectedAccounts?.[srv.key] === true;
      
      const connectBtn = DOM.el('button', {
        class: `btn ${connected ? 'btn-secondary' : 'btn-primary'} btn-sm`,
        onclick: () => {
          this.user.connectedAccounts = this.user.connectedAccounts || {};
          const nextState = !this.user.connectedAccounts[srv.key];
          this.user.connectedAccounts[srv.key] = nextState;
          stateManager.setState('currentUser', this.user);
          
          connectBtn.className = `btn ${nextState ? 'btn-secondary' : 'btn-primary'} btn-sm`;
          connectBtn.textContent = nextState ? 'Disconnect' : 'Connect';
          statusLabel.textContent = nextState ? '✓ Connected' : 'Not Connected';
          statusLabel.style.color = nextState ? 'var(--text-success)' : 'var(--text-muted)';
        }
      }, connected ? 'Disconnect' : 'Connect');

      const statusLabel = DOM.el('span', {
        style: { fontSize: 'var(--fs-xs)', fontWeight: 'bold', color: connected ? 'var(--text-success)' : 'var(--text-muted)' }
      }, connected ? '✓ Connected' : 'Not Connected');

      const card = DOM.el('div', {
        class: 'settings-connect-account-card',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-md)'
        }
      },
        DOM.el('div', { style: { display: 'flex', alignItems: 'center', gap: '14px' } },
          DOM.el('i', { class: `bi ${srv.icon}`, style: { fontSize: '24px', color: srv.color } }),
          DOM.el('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
            DOM.el('span', { style: { fontWeight: '600' } }, srv.label),
            statusLabel
          )
        ),
        connectBtn
      );
      list.appendChild(card);
    });

    pane.appendChild(list);
    return pane;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TAB: Badges & Identity Curation
  // ───────────────────────────────────────────────────────────────────────────
  renderIdentitySettings() {
    const pane = DOM.el('div', { class: 'settings-tab-pane' },
      DOM.el('h2', { class: 'settings-tab-title' }, 'Badges & Identity Curation'),
      DOM.el('p', { class: 'settings-tab-subtitle' }, 'Curate which tags, badges, and personas represent you publicly.')
    );

    // Badge toggles
    const allBadges = ['Founder', 'Early Creator', 'World Builder', 'Lore Master', 'Map Maker', 'Verified Creator'];
    const curDisplayed = this.user.identity?.displayedBadges || this.user.badges || [];
    const badgeChecks = [];

    const badgeGroup = DOM.el('div', { class: 'auth-input-group' },
      DOM.el('h3', { class: 'settings-section-subtitle' }, 'Displayed Badges')
    );

    allBadges.forEach(b => {
      const owned = (this.user.badges || []).includes(b) || ['Founder', 'Early Creator', 'World Builder'].includes(b);
      
      const check = DOM.el('input', {
        type: 'checkbox',
        id: `badge-${b.toLowerCase().replace(' ', '-')}`,
        checked: curDisplayed.includes(b),
        disabled: !owned
      });

      badgeGroup.appendChild(
        DOM.el('label', {
          class: `auth-checkbox-label ${!owned ? 'checkbox-disabled' : ''}`,
          for: `badge-${b.toLowerCase().replace(' ', '-')}`
        },
          check,
          b + (!owned ? ' (Locked)' : '')
        )
      );
      
      if (owned) badgeChecks.push({ name: b, check });
    });
    pane.appendChild(badgeGroup);

    // Displayed Role
    const roleInput = DOM.el('input', { type: 'text', class: 'search-input-box', value: this.user.identity?.displayedRole || this.user.role || 'Creator' });
    pane.appendChild(DOM.el('div', { class: 'auth-input-group', style: { marginTop: '16px' } },
      DOM.el('label', { class: 'settings-input-label' }, 'Displayed Role Title'),
      roleInput
    ));

    // Primary character select dropdown
    const customChars = stateManager.getState('customCharacters') || [];
    const charSelect = DOM.el('select', { class: 'comment-identity-select', style: { width: '100%' } });
    charSelect.appendChild(DOM.el('option', { value: '' }, 'None (Show Creator profile)'));
    
    customChars.forEach(cc => {
      charSelect.appendChild(DOM.el('option', { value: cc.id, selected: this.user.identity?.primaryCharacter === cc.id }, cc.name));
    });

    pane.appendChild(DOM.el('div', { class: 'auth-input-group', style: { marginTop: '16px' } },
      DOM.el('label', { class: 'settings-input-label' }, 'Primary Character Showcase'),
      charSelect,
      DOM.el('span', { class: 'input-tip-desc' }, 'Select a character to highlight in your telemetry header card.')
    ));

    const saveBtn = DOM.el('button', {
      class: 'btn btn-accent',
      style: { marginTop: '24px' },
      onclick: () => {
        const selectedBadges = badgeChecks.filter(bc => bc.check.checked).map(bc => bc.name);
        this.user.identity = {
          displayedBadges: selectedBadges,
          displayedRole: roleInput.value,
          primaryCharacter: charSelect.value
        };
        // Sync display details back to top-level role/badges arrays
        this.user.role = roleInput.value;
        stateManager.setState('currentUser', this.user);
        alert('Public identity settings updated.');
      }
    }, 'Save Changes');
    pane.appendChild(saveBtn);

    return pane;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TAB: Collaborators
  // ───────────────────────────────────────────────────────────────────────────
  renderCollaboratorSettings() {
    const pane = DOM.el('div', { class: 'settings-tab-pane' },
      DOM.el('h2', { class: 'settings-tab-title' }, 'Collaborators & Co-Authors'),
      DOM.el('p', { class: 'settings-tab-subtitle' }, 'Review pending requests and manage collaborators who share editing access to your worlds.')
    );

    // 1. Pending incoming requests
    const reqList = DOM.el('div', { class: 'requests-list-col' });
    const colConfig = this.user.collaborators || { incomingRequests: [], currentCollaborators: [] };
    const pending = colConfig.incomingRequests || [];

    pane.appendChild(DOM.el('h3', { class: 'settings-section-subtitle' }, `Incoming Requests (${pending.length})`));

    if (pending.length === 0) {
      reqList.appendChild(DOM.el('p', { style: 'color: var(--text-muted); font-style: italic; font-size: var(--fs-xs);' }, 'No pending signals received from other creators.'));
    } else {
      pending.forEach(req => {
        const reqEl = DOM.el('div', {
          class: 'settings-request-card',
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-md)',
            marginBottom: '12px'
          }
        },
          DOM.el('div', {},
            DOM.el('strong', {}, `@${req.from}`),
            ` wants to collaborate on world `,
            DOM.el('span', { style: { color: 'var(--accent-gold)', fontWeight: 'bold' } }, req.worldTitle)
          ),
          DOM.el('div', { style: { display: 'flex', gap: '8px' } },
            DOM.el('button', {
              class: 'btn btn-primary btn-sm',
              onclick: () => {
                // Accept: Add to current collaborators, remove request
                colConfig.currentCollaborators = colConfig.currentCollaborators || [];
                if (!colConfig.currentCollaborators.includes(req.from)) {
                  colConfig.currentCollaborators.push(req.from);
                }
                colConfig.incomingRequests = colConfig.incomingRequests.filter(r => r.id !== req.id);
                this.user.collaborators = colConfig;
                stateManager.setState('currentUser', this.user);
                
                alert(`Collab Proposal Accepted! @${req.from} has co-author access to ${req.worldTitle}.`);
                this.renderActiveTab();
              }
            }, 'Accept'),
            DOM.el('button', {
              class: 'btn btn-secondary btn-sm',
              onclick: () => {
                // Reject
                colConfig.incomingRequests = colConfig.incomingRequests.filter(r => r.id !== req.id);
                this.user.collaborators = colConfig;
                stateManager.setState('currentUser', this.user);
                alert(`Collaboration request from @${req.from} declined.`);
                this.renderActiveTab();
              }
            }, 'Decline')
          )
        );
        reqList.appendChild(reqEl);
      });
    }
    pane.appendChild(reqList);

    // 2. Current Collaborators
    const collabsList = DOM.el('div', { class: 'collabs-list-col', style: { marginTop: '24px' } });
    const current = colConfig.currentCollaborators || [];

    pane.appendChild(DOM.el('h3', { class: 'settings-section-subtitle' }, 'Current Collaborators'));

    if (current.length === 0) {
      collabsList.appendChild(DOM.el('p', { style: 'color: var(--text-muted); font-style: italic; font-size: var(--fs-xs);' }, 'You have not added any co-authors to your realms yet.'));
    } else {
      current.forEach(username => {
        const colEl = DOM.el('div', {
          class: 'settings-collab-row',
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 16px',
            background: 'rgba(255,255,255,0.01)',
            borderBottom: '1px solid var(--border-color)'
          }
        },
          DOM.el('span', { style: { fontWeight: '500' } }, `@${username}`),
          DOM.el('button', {
            class: 'btn btn-secondary btn-sm btn-danger-text',
            style: { padding: '2px 8px', fontSize: 'var(--fs-xs)' },
            onclick: () => {
              if (confirm(`Remove @${username} from your collaborators? They will lose access to edit co-authored realms.`)) {
                colConfig.currentCollaborators = colConfig.currentCollaborators.filter(u => u !== username);
                this.user.collaborators = colConfig;
                stateManager.setState('currentUser', this.user);
                alert(`Removed co-author access for @${username}.`);
                this.renderActiveTab();
              }
            }
          }, 'Remove')
        );
        collabsList.appendChild(colEl);
      });
    }
    pane.appendChild(collabsList);

    return pane;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TAB: Security Settings (2FA & Active Sessions)
  // ───────────────────────────────────────────────────────────────────────────
  renderSecuritySettings() {
    const pane = DOM.el('div', { class: 'settings-tab-pane' },
      DOM.el('h2', { class: 'settings-tab-title' }, 'Security & Authentications'),
      DOM.el('p', { class: 'settings-tab-subtitle' }, 'Manage advanced security controls and monitor active browser logs.')
    );

    // Two-factor check
    const secConfig = this.user.security || { twoFactorEnabled: false, activeSessions: [] };
    const tfaCheck = DOM.el('input', { type: 'checkbox', id: 'check-tfa', checked: secConfig.twoFactorEnabled });
    
    tfaCheck.addEventListener('change', () => {
      secConfig.twoFactorEnabled = tfaCheck.checked;
      this.user.security = secConfig;
      stateManager.setState('currentUser', this.user);
      alert(tfaCheck.checked ? 'Two-Factor authentication setup completed successfully.' : 'Two-Factor authentication disabled.');
    });

    pane.appendChild(DOM.el('div', { class: 'auth-input-group' },
      DOM.el('h3', { class: 'settings-section-subtitle' }, 'Two-Factor Authentication (2FA)'),
      DOM.el('label', { class: 'auth-checkbox-label', for: 'check-tfa' },
        tfaCheck,
        'Require a secure mobile verification token code on sign-in attempts'
      )
    ));

    // Active sessions
    const sessionsList = DOM.el('div', { class: 'sessions-list-col', style: { marginTop: '24px' } });
    const sessions = secConfig.activeSessions || [];

    pane.appendChild(DOM.el('h3', { class: 'settings-section-subtitle' }, 'Active Login Sessions'));

    sessions.forEach(sess => {
      const revokeBtn = DOM.el('button', {
        class: 'btn btn-secondary btn-sm btn-danger-text',
        disabled: sess.active,
        style: { fontSize: 'var(--fs-xs)', padding: '2px 8px' },
        onclick: (e) => {
          secConfig.activeSessions = secConfig.activeSessions.filter(s => s.id !== sess.id);
          this.user.security = secConfig;
          stateManager.setState('currentUser', this.user);
          
          // Animate card removal
          const card = e.target.closest('.settings-session-card');
          if (card) {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
              card.remove();
              if (secConfig.activeSessions.length === 1) this.renderActiveTab();
            }, 200);
          }
        }
      }, sess.active ? 'Current Session' : 'Revoke Session');

      const card = DOM.el('div', {
        class: 'settings-session-card',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px',
          background: 'rgba(255,255,255,0.01)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-md)',
          marginBottom: '12px',
          transition: 'all 0.2s ease'
        }
      },
        DOM.el('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } },
          DOM.el('i', { class: sess.browser.toLowerCase().includes('firefox') ? 'bi bi-browser-firefox' : 'bi bi-browser-chrome', style: { fontSize: '20px', color: 'var(--accent-gold)' } }),
          DOM.el('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } },
            DOM.el('span', { style: { fontWeight: '600', fontSize: 'var(--fs-sm)' } }, `${sess.browser} on ${sess.os}`),
            DOM.el('span', { style: { fontSize: '10px', color: 'var(--text-muted)' } }, `Uplink Location: ${sess.location} ${sess.active ? '• Active Now' : ''}`)
          )
        ),
        revokeBtn
      );
      sessionsList.appendChild(card);
    });

    pane.appendChild(sessionsList);
    return pane;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Account Destruction Handler
  // ───────────────────────────────────────────────────────────────────────────
  handleDeleteAccount() {
    const confirmName = prompt('WARNING: Account destruction is irreversible. This will wipe all worlds, comments, followed anchors, and character profiles from local storage records.\n\nPlease type your username to confirm de-registration:');
    if (confirmName && confirmName.toLowerCase() === this.user.username.toLowerCase()) {
      stateManager.logout();
      // Wipe state storage
      localStorage.clear();
      alert('Grid disconnection complete. All user registry indices wiped out.');
      location.reload();
    } else if (confirmName) {
      alert('Verification mismatch. Action aborted.');
    }
  }

  /**
   * Cleans up running listeners.
   */
  unload() {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
  }
}

export default SettingsPage;
