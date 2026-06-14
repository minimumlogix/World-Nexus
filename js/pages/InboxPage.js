/* js/pages/InboxPage.js */
import { DOM } from '../utils/DOM.js';
import { stateManager } from '../core/StateManager.js';
import { globalEventBus } from '../core/EventBus.js';

export class InboxPage {
  /**
   * Controller for the user's Inbox and Notification panel.
   * @param {HTMLElement} appRoot - App insertion parent node
   */
  constructor(appRoot) {
    this.appRoot = appRoot;
    this.requests = [];
    this.notifications = [];
  }

  /**
   * Loads the current inbox and notifications from the state registry.
   */
  async load() {
    document.title = 'Inbox - World Nexus';
    this.requests = stateManager.getState('inboxRequests') || [];
    this.notifications = stateManager.getState('notifications') || [];

    // Disable header search wrapper on inbox page
    const headerSearchWrapper = document.getElementById('header-search-wrapper');
    if (headerSearchWrapper) {
      headerSearchWrapper.style.display = 'none';
    }

    this.render();
  }

  /**
   * Renders the Inbox Layout.
   */
  render() {
    DOM.clear(this.appRoot);

    const currentUser = stateManager.getState('currentUser');
    if (!currentUser) {
      this.appRoot.appendChild(
        DOM.el('div', { class: 'page-container inbox-auth-needed', style: { textAlign: 'center', padding: '96px 24px' } },
          DOM.el('h2', {}, 'Uplink Disconnected'),
          DOM.el('p', { style: { color: 'var(--text-muted)', margin: '16px 0 24px' } }, 'You must sign in to view your administrative inbox and notifications.'),
          DOM.el('button', { class: 'btn btn-primary', onclick: () => globalEventBus.emit('auth:triggerLogin') }, 'Sign In')
        )
      );
      return;
    }

    const pendingRequests = this.requests.filter(r => r.status === 'pending');

    // Left column: Actionable Requests
    const requestsList = DOM.el('div', { class: 'inbox-section-list' });
    if (pendingRequests.length === 0) {
      requestsList.appendChild(
        DOM.el('div', { class: 'inbox-empty-card' },
          DOM.el('i', { class: 'bi bi-clipboard-check inbox-empty-icon' }),
          DOM.el('p', {}, 'No pending requests requiring action.')
        )
      );
    } else {
      pendingRequests.forEach(req => {
        const card = this.renderRequestCard(req);
        requestsList.appendChild(card);
      });
    }

    // Right column: Passive Notifications
    const notificationsList = DOM.el('div', { class: 'inbox-section-list' });
    if (this.notifications.length === 0) {
      notificationsList.appendChild(
        DOM.el('div', { class: 'inbox-empty-card' },
          DOM.el('i', { class: 'bi bi-bell-slash inbox-empty-icon' }),
          DOM.el('p', {}, 'No notifications.')
        )
      );
    } else {
      this.notifications.forEach(notif => {
        const card = this.renderNotificationCard(notif);
        notificationsList.appendChild(card);
      });
    }

    const container = DOM.el('div', { class: 'page-container inbox-page-view fade-in-up-page' },
      DOM.el('div', { class: 'inbox-header-section' },
        DOM.el('h1', { class: 'inbox-page-title' }, 'INBOX CONTROL PANEL'),
        DOM.el('p', { class: 'inbox-page-subtitle' }, 'Review submission pull requests, co-author invites, and channel alerts')
      ),
      DOM.el('div', { class: 'inbox-columns-wrapper' },
        // Left Column Panel
        DOM.el('div', { class: 'inbox-panel-column' },
          DOM.el('h2', { class: 'inbox-column-title' }, 
            DOM.el('i', { class: 'bi bi-git', style: { marginRight: '8px' } }),
            'Actionable Proposals',
            pendingRequests.length > 0 ? DOM.el('span', { class: 'inbox-title-badge' }, pendingRequests.length) : null
          ),
          requestsList
        ),
        // Right Column Panel
        DOM.el('div', { class: 'inbox-panel-column' },
          DOM.el('h2', { class: 'inbox-column-title' }, 
            DOM.el('i', { class: 'bi bi-bell', style: { marginRight: '8px' } }),
            'Activity Alerts',
            this.notifications.filter(n => !n.read).length > 0 ? DOM.el('span', { class: 'inbox-title-badge alert-badge' }, this.notifications.filter(n => !n.read).length) : null
          ),
          notificationsList
        )
      )
    );

    this.appRoot.appendChild(container);
  }

  /**
   * Renders a single request card in the actionable column.
   */
  renderRequestCard(req) {
    let title = '';
    let subtitle = '';
    let icon = 'bi-patch-question';
    let actions = null;

    if (req.type === 'collaboration') {
      title = `${req.from} wants to collaborate`;
      subtitle = `Project: ${req.worldTitle}`;
      icon = 'bi-people-fill';

      actions = DOM.el('div', { class: 'inbox-card-actions' },
        DOM.el('button', { class: 'btn btn-accent btn-sm', onclick: () => this.acceptCollaboration(req) }, 'Accept'),
        DOM.el('button', { class: 'btn btn-secondary btn-sm', onclick: () => this.declineRequest(req) }, 'Decline')
      );
    } else if (req.type === 'lore_submission') {
      title = `${req.from} submitted lore draft`;
      subtitle = `Article: "${req.title}" in ${req.worldTitle}`;
      icon = 'bi-journal-plus';

      actions = DOM.el('div', { class: 'inbox-card-actions' },
        DOM.el('button', { class: 'btn btn-primary btn-sm', onclick: () => this.reviewLoreDraft(req) }, 'Review')
      );
    } else if (req.type === 'character_submission') {
      title = `${req.from} proposed character`;
      subtitle = `Character: "${req.name}" in ${req.worldTitle}`;
      icon = 'bi-person-plus-fill';

      actions = DOM.el('div', { class: 'inbox-card-actions' },
        DOM.el('button', { class: 'btn btn-primary btn-sm', onclick: () => this.reviewCharacterDraft(req) }, 'Review')
      );
    }

    return DOM.el('div', { class: 'inbox-request-card' },
      DOM.el('div', { class: 'inbox-card-icon-column' },
        DOM.el('i', { class: `bi ${icon}` })
      ),
      DOM.el('div', { class: 'inbox-card-content-column' },
        DOM.el('div', { class: 'inbox-card-title' }, title),
        DOM.el('div', { class: 'inbox-card-subtitle' }, subtitle),
        DOM.el('div', { class: 'inbox-card-time' }, req.timestamp),
        actions
      )
    );
  }

  /**
   * Renders a single notification card in the alerts column.
   */
  renderNotificationCard(notif) {
    return DOM.el('div', { class: `inbox-notification-card ${notif.read ? 'read' : 'unread'}` },
      DOM.el('div', { class: 'inbox-notif-message' }, notif.message),
      DOM.el('div', { class: 'inbox-notif-footer' },
        DOM.el('span', { class: 'inbox-notif-time' }, notif.timestamp),
        DOM.el('button', {
          class: 'inbox-notif-dismiss-btn',
          title: 'Dismiss notification',
          onclick: () => this.dismissNotification(notif.id)
        }, DOM.el('i', { class: 'bi bi-x-circle' }))
      )
    );
  }

  /**
   * Dismisses a passive notification.
   */
  dismissNotification(id) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    stateManager.setState('notifications', this.notifications);
    this.render();
  }

  /**
   * Accepts a collaborator proposal.
   */
  acceptCollaboration(req) {
    const worldCollaborators = stateManager.getState('worldCollaborators') || {};
    const worldConfig = worldCollaborators[req.worldId] || { owner: 'Odin', collaborators: {} };
    
    // Set role to Contributor
    worldConfig.collaborators[req.from] = 'Contributor';
    worldCollaborators[req.worldId] = worldConfig;
    stateManager.setState('worldCollaborators', worldCollaborators);

    // Create activity event
    const activities = stateManager.getState('worldActivities') || [];
    activities.unshift({
      id: 'act_' + Date.now(),
      worldId: req.worldId,
      author: req.from,
      action: 'joined_collab',
      details: `@${req.from} joined @${req.worldId} as a collaborator`,
      timestamp: 'Just now'
    });
    stateManager.setState('worldActivities', activities);

    // Create notification for contributor
    const notifications = stateManager.getState('notifications') || [];
    notifications.unshift({
      id: 'not_' + Date.now(),
      message: `Your collaboration proposal for ${req.worldTitle} was approved!`,
      timestamp: 'Just now',
      read: false
    });
    stateManager.setState('notifications', notifications);

    // Mark request approved/complete and delete
    this.requests = this.requests.filter(r => r.id !== req.id);
    stateManager.setState('inboxRequests', this.requests);

    alert(`Collaboration approved! ${req.from} is now a collaborator on ${req.worldTitle}.`);
    this.render();
  }

  /**
   * Declines any inbox request.
   */
  declineRequest(req) {
    this.requests = this.requests.filter(r => r.id !== req.id);
    stateManager.setState('inboxRequests', this.requests);

    // Send rejection notification
    const notifications = stateManager.getState('notifications') || [];
    notifications.unshift({
      id: 'not_' + Date.now(),
      message: `Your proposal for ${req.worldTitle} was declined by the administrator.`,
      timestamp: 'Just now',
      read: false
    });
    stateManager.setState('notifications', notifications);

    alert(`Request declined and removed.`);
    this.render();
  }

  /**
   * Opens the Lore Draft Review side-by-side comparison modal.
   */
  reviewLoreDraft(req) {
    const modalBackdrop = DOM.el('div', { class: 'review-modal-backdrop' });

    const close = () => modalBackdrop.remove();

    const approve = () => {
      // Approve lore draft: push to customLore array
      const customLore = stateManager.getState('customLore') || [];
      customLore.push({
        id: 'lore_' + Date.now(),
        worldId: req.worldId,
        title: req.title,
        content: req.content
      });
      stateManager.setState('customLore', customLore);

      // Log activity
      const activities = stateManager.getState('worldActivities') || [];
      activities.unshift({
        id: 'act_' + Date.now(),
        worldId: req.worldId,
        author: req.from,
        action: 'approved_lore',
        details: `Lore article "${req.title}" approved by administrator`,
        timestamp: 'Just now'
      });
      stateManager.setState('worldActivities', activities);

      // Notification
      const notifications = stateManager.getState('notifications') || [];
      notifications.unshift({
        id: 'not_' + Date.now(),
        message: `Your lore draft "${req.title}" was approved for ${req.worldTitle}!`,
        timestamp: 'Just now',
        read: false
      });
      stateManager.setState('notifications', notifications);

      this.requests = this.requests.filter(r => r.id !== req.id);
      stateManager.setState('inboxRequests', this.requests);

      close();
      alert(`Lore article "${req.title}" approved and published!`);
      this.render();
    };

    const reject = () => {
      this.declineRequest(req);
      close();
    };

    const modal = DOM.el('div', { class: 'review-comparison-modal' },
      DOM.el('div', { class: 'review-modal-header' },
        DOM.el('h3', {}, 'LORE DRAFT PULL REQUEST'),
        DOM.el('button', { class: 'review-close-btn', onclick: close }, DOM.el('i', { class: 'bi bi-x-lg' }))
      ),
      DOM.el('div', { class: 'review-comparison-grids' },
        // Left column: Info card
        DOM.el('div', { class: 'review-comparison-column' },
          DOM.el('h4', { class: 'comparison-col-header' }, 'Target Repository'),
          DOM.el('div', { class: 'comparison-col-card' },
            DOM.el('div', { style: { fontWeight: '600', color: 'var(--accent-gold)', marginBottom: '8px' } }, req.worldTitle),
            DOM.el('p', { style: { fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' } }, 'This lore entry will be appended as a new chronicle document under the LORE index of this world.')
          )
        ),
        // Right column: Proposed Draft Markdown
        DOM.el('div', { class: 'review-comparison-column' },
          DOM.el('h4', { class: 'comparison-col-header' }, `Proposed addition by @${req.from}`),
          DOM.el('div', { class: 'comparison-col-card scrollable-card' },
            DOM.el('h2', { style: { fontFamily: 'Cinzel', fontSize: 'var(--fs-lg)', marginBottom: '16px', color: 'var(--accent-gold)' } }, req.title),
            DOM.el('pre', { style: { fontFamily: 'Share Tech Mono', whiteSpace: 'pre-wrap', color: 'var(--text-color)' } }, req.content)
          )
        )
      ),
      DOM.el('div', { class: 'review-modal-actions' },
        DOM.el('button', { class: 'btn btn-accent', onclick: approve }, 'Approve & Publish'),
        DOM.el('button', { class: 'btn btn-secondary', onclick: reject }, 'Reject Proposal'),
        DOM.el('button', { class: 'btn btn-secondary', onclick: close }, 'Cancel')
      )
    );

    modalBackdrop.appendChild(modal);
    document.body.appendChild(modalBackdrop);
  }

  /**
   * Opens the Character Draft Review side-by-side comparison modal.
   */
  reviewCharacterDraft(req) {
    const modalBackdrop = DOM.el('div', { class: 'review-modal-backdrop' });

    const close = () => modalBackdrop.remove();

    const approve = () => {
      // Build a bot object
      const id = req.name.toLowerCase().replace(/\s+/g, '-');
      const newChar = {
        id: id,
        name: req.name,
        worldId: req.worldId,
        worldTitle: req.worldTitle,
        description: req.description || 'A mysterious persona inside the world Nexus.',
        genres: [req.occupation || 'Fictional Entity'],
        avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%230e7490"/><text x="50" y="55" fill="%2322d3ee" font-size="32" font-family="Outfit" text-anchor="middle">${req.name.charAt(0).toUpperCase()}</text></svg>`,
        cardImage: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="180" viewBox="0 0 120 180"><rect width="100%" height="100%" fill="%230e7490"/><text x="60" y="95" fill="%2322d3ee" font-size="24" font-family="Outfit" text-anchor="middle">${req.name.charAt(0).toUpperCase()}</text></svg>`,
        metadata: {
          character: req.occupation || 'Resident',
          status: 'Canon'
        },
        status: 'public',
        custom: true,
        createdBy: req.from
      };

      // Add to customCharacters state array
      const customChars = stateManager.getState('customCharacters') || [];
      customChars.push(newChar);
      stateManager.setState('customCharacters', customChars);

      // Log activity
      const activities = stateManager.getState('worldActivities') || [];
      activities.unshift({
        id: 'act_' + Date.now(),
        worldId: req.worldId,
        author: req.from,
        action: 'approved_character',
        details: `Character "${req.name}" approved by administrator`,
        timestamp: 'Just now'
      });
      stateManager.setState('worldActivities', activities);

      // Notification
      const notifications = stateManager.getState('notifications') || [];
      notifications.unshift({
        id: 'not_' + Date.now(),
        message: `Your character proposal "${req.name}" was approved for ${req.worldTitle}!`,
        timestamp: 'Just now',
        read: false
      });
      stateManager.setState('notifications', notifications);

      this.requests = this.requests.filter(r => r.id !== req.id);
      stateManager.setState('inboxRequests', this.requests);

      close();
      alert(`Character "${req.name}" approved and published!`);
      this.render();
    };

    const reject = () => {
      this.declineRequest(req);
      close();
    };

    const modal = DOM.el('div', { class: 'review-comparison-modal' },
      DOM.el('div', { class: 'review-modal-header' },
        DOM.el('h3', {}, 'CHARACTER PROPOSAL REVIEW'),
        DOM.el('button', { class: 'review-close-btn', onclick: close }, DOM.el('i', { class: 'bi bi-x-lg' }))
      ),
      DOM.el('div', { class: 'review-comparison-grids' },
        // Left column: Info card
        DOM.el('div', { class: 'review-comparison-column' },
          DOM.el('h4', { class: 'comparison-col-header' }, 'Target Repository'),
          DOM.el('div', { class: 'comparison-col-card' },
            DOM.el('div', { style: { fontWeight: '600', color: 'var(--accent-gold)', marginBottom: '8px' } }, req.worldTitle),
            DOM.el('p', { style: { fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' } }, 'This character will be added as a canon resident of this world\'s database grid.')
          )
        ),
        // Right column: Proposed Character Info
        DOM.el('div', { class: 'review-comparison-column' },
          DOM.el('h4', { class: 'comparison-col-header' }, `Proposed by @${req.from}`),
          DOM.el('div', { class: 'comparison-col-card scrollable-card' },
            DOM.el('div', { style: { marginBottom: '12px' } },
              DOM.el('span', { class: 'auth-input-label', style: { color: 'var(--accent-gold)', display: 'block' } }, 'Name'),
              DOM.el('span', { style: { fontSize: 'var(--fs-md)', fontWeight: 'bold' } }, req.name)
            ),
            DOM.el('div', { style: { marginBottom: '12px' } },
              DOM.el('span', { class: 'auth-input-label', style: { color: 'var(--accent-gold)', display: 'block' } }, 'Occupation'),
              DOM.el('span', {}, req.occupation || 'N/A')
            ),
            DOM.el('div', { style: { marginBottom: '12px' } },
              DOM.el('span', { class: 'auth-input-label', style: { color: 'var(--accent-gold)', display: 'block' } }, 'Description'),
              DOM.el('p', { style: { fontSize: 'var(--fs-sm)', color: 'var(--text-color)' } }, req.description)
            )
          )
        )
      ),
      DOM.el('div', { class: 'review-modal-actions' },
        DOM.el('button', { class: 'btn btn-accent', onclick: approve }, 'Approve & Publish'),
        DOM.el('button', { class: 'btn btn-secondary', onclick: reject }, 'Reject Proposal'),
        DOM.el('button', { class: 'btn btn-secondary', onclick: close }, 'Cancel')
      )
    );

    modalBackdrop.appendChild(modal);
    document.body.appendChild(modalBackdrop);
  }

  unload() {
    // Cleanup if any
  }
}
export default InboxPage;
