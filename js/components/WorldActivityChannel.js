/* ===========================
   WORLD ACTIVITY CHANNEL COMPONENT
   =========================== */

import { DOM } from '../utils/DOM.js';
import { stateManager } from '../core/StateManager.js';
import { globalEventBus } from '../core/EventBus.js';

/* ===========================
   CONSTANTS
   =========================== */
const EMOJI_PICKER_OPTIONS = ['👍', '❤️', '🔥', '🚀', '🛡️', '⚔️', '🔮', '💡'];

/* ===========================
   UI LOGIC & COMPONENT CLASS
   =========================== */
export class WorldActivityChannel {
  /**
   * Main render entrypoint for the Activity tab server channel.
   * @param {HTMLElement} container - Tab content wrapper
   * @param {string} worldId - Current world identifier
   * @param {Object} world - World metadata object
   * @param {Array} bots - World character/bot list
   */
  static render(container, worldId, world, bots = []) {
    DOM.clear(container);

    const channel = new WorldActivityChannel(worldId, world, bots);
    const element = channel.buildUI();
    container.appendChild(element);

    // Initial scroll to bottom of message feed
    channel.scrollToBottom();
  }

  constructor(worldId, world, bots = []) {
    this.worldId = worldId;
    this.world = world;
    this.bots = bots;
    this.searchQuery = '';
    this.draftAttachment = null; // { type: 'image'|'gif'|'video', url, caption }
    this.unsubscribeState = null;
  }

  /* ===========================
     CORE BUILDING LOGIC
     =========================== */
  buildUI() {
    const wrapper = DOM.el('section', { class: 'world-channel-wrapper' });

    // 1. Channel Header
    const header = this.buildHeader();

    // 2. Message Feed Container
    const feedContainer = DOM.el('main', { class: 'world-channel-feed-container', id: `channel-feed-${this.worldId}` });
    this.feedContainer = feedContainer;
    this.renderFeed();

    // 3. Draft Attachment Chip Container
    const draftContainer = DOM.el('div', { class: 'channel-draft-attachment-container', style: { display: 'none' } });
    this.draftContainer = draftContainer;

    // 4. Chat Input Bar
    const inputBar = this.buildInputBar();

    // Assemble layout
    wrapper.appendChild(header);
    wrapper.appendChild(feedContainer);
    wrapper.appendChild(draftContainer);
    wrapper.appendChild(inputBar);

    // Subscribe to state updates for channelMessages
    const stateHandler = () => {
      this.renderFeed();
    };
    globalEventBus.on('state:channelMessages', stateHandler);

    return wrapper;
  }

  /* ===========================
     CHANNEL HEADER
     =========================== */
  buildHeader() {
    const channelName = `# ${this.world ? this.world.title.toLowerCase().replace(/\s+/g, '-') : 'general'}-channel`;
    
    // Search input
    const searchInput = DOM.el('input', {
      type: 'text',
      class: 'channel-search-input',
      placeholder: 'Search channel messages...',
      oninput: (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderFeed();
      }
    });

    return DOM.el('header', { class: 'world-channel-header' },
      DOM.el('div', { class: 'channel-header-info' },
        DOM.el('div', { class: 'channel-header-title-row' },
          DOM.el('i', { class: 'bi bi-hash channel-hash-icon' }),
          DOM.el('h3', { class: 'channel-title' }, channelName),
          DOM.el('span', { class: 'channel-status-pill' }, '🟢 Server Active')
        ),
        DOM.el('p', { class: 'channel-topic' }, 
          this.world ? `Official server channel for ${this.world.title}. Share dispatches, lore theories, images, GIFs, and videos.` : 'World community channel.'
        )
      ),
      DOM.el('div', { class: 'channel-header-actions' },
        DOM.el('div', { class: 'channel-search-wrapper' },
          DOM.el('i', { class: 'bi bi-search search-icon' }),
          searchInput
        )
      )
    );
  }

  /* ===========================
     MESSAGE FEED RENDERER
     =========================== */
  renderFeed() {
    if (!this.feedContainer) return;
    DOM.clear(this.feedContainer);

    let messages = stateManager.getChannelMessages(this.worldId);

    // Filter by search query if active
    if (this.searchQuery) {
      messages = messages.filter(m => 
        (m.content && m.content.toLowerCase().includes(this.searchQuery)) ||
        (m.authorName && m.authorName.toLowerCase().includes(this.searchQuery))
      );
    }

    // Channel Welcome Hero Banner at top of feed
    const welcomeBanner = DOM.el('div', { class: 'channel-welcome-banner' },
      DOM.el('div', { class: 'channel-welcome-hash-circle' }, '#'),
      DOM.el('h2', { class: 'channel-welcome-title' }, `Welcome to #${this.world ? this.world.title.toLowerCase().replace(/\s+/g, '-') : 'general'}!`),
      DOM.el('p', { class: 'channel-welcome-subtitle' }, `This is the start of the official ${this.world ? this.world.title : ''} server channel. Be the first to start the conversation or post updates!`)
    );
    this.feedContainer.appendChild(welcomeBanner);

    if (messages.length === 0) {
      this.feedContainer.appendChild(
        DOM.el('div', { class: 'channel-empty-state' },
          DOM.el('i', { class: 'bi bi-chat-dots', style: { fontSize: '28px', opacity: 0.3 } }),
          DOM.el('p', {}, this.searchQuery ? 'No channel messages match your search.' : 'No messages posted in this channel yet. Say hello!')
        )
      );
      return;
    }

    // Render message stream
    messages.forEach(msg => {
      if (msg.isSystem) {
        this.feedContainer.appendChild(this.buildSystemMessageCard(msg));
      } else {
        this.feedContainer.appendChild(this.buildMessageCard(msg));
      }
    });
  }

  /* ===========================
     MESSAGE CARD BUILDERS
     =========================== */
  buildMessageCard(msg) {
    const currentUser = stateManager.getState('currentUser');
    const currentUserId = currentUser ? currentUser.username : 'Guest';

    // Role badge pill
    const roleBadge = this.renderRoleBadge(msg.authorRole, msg.authorType);

    // Avatar
    let avatarNode;
    if (msg.authorAvatar && msg.authorAvatar.startsWith('data:image/svg')) {
      avatarNode = DOM.el('div', { class: 'channel-avatar-wrapper' });
      avatarNode.innerHTML = msg.authorAvatar;
    } else if (msg.authorAvatar) {
      avatarNode = DOM.el('img', { 
        class: 'channel-avatar-img', 
        src: msg.authorAvatar, 
        alt: msg.authorName || 'Avatar',
        onerror: (e) => {
          e.target.style.display = 'none';
          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
        }
      });
    } else {
      avatarNode = DOM.el('div', { class: 'channel-avatar-fallback' }, (msg.authorName || 'U').slice(0, 2).toUpperCase());
    }

    // Content text with mention formatting
    const contentNode = DOM.el('div', { class: 'channel-message-content' });
    contentNode.appendChild(this.formatMessageContent(msg.content));

    // Attachments section
    const attachmentsNode = this.buildAttachmentsNode(msg.attachments || []);

    // Reactions section
    const reactionsNode = this.buildReactionsNode(msg, currentUserId);

    return DOM.el('article', { class: 'channel-message-card', 'data-msg-id': msg.id },
      DOM.el('div', { class: 'channel-message-left' }, avatarNode),
      DOM.el('div', { class: 'channel-message-body' },
        DOM.el('header', { class: 'channel-message-header' },
          DOM.el('span', { class: 'channel-author-name' }, msg.authorName || 'Anonymous'),
          roleBadge,
          DOM.el('span', { class: 'channel-timestamp' }, msg.timestamp || 'Just now')
        ),
        contentNode,
        attachmentsNode,
        reactionsNode
      )
    );
  }

  buildSystemMessageCard(msg) {
    return DOM.el('aside', { class: 'channel-system-message-card' },
      DOM.el('i', { class: 'bi bi-broadcast channel-system-icon' }),
      DOM.el('div', { class: 'channel-system-content' },
        this.formatMessageContent(msg.content),
        DOM.el('span', { class: 'channel-timestamp', style: { marginLeft: '8px' } }, msg.timestamp)
      )
    );
  }

  /* ===========================
     ATTACHMENTS & MEDIA RENDERER
     =========================== */
  buildAttachmentsNode(attachments) {
    if (!attachments || attachments.length === 0) return null;

    const wrapper = DOM.el('div', { class: 'channel-attachments-wrapper' });

    attachments.forEach(att => {
      if (att.type === 'image' || att.type === 'gif') {
        const imgCard = DOM.el('div', { 
          class: 'channel-media-card channel-media-image',
          onclick: () => this.openLightboxModal(att.url, att.caption || 'Image Preview', 'image')
        },
          DOM.el('img', { src: att.url, alt: att.caption || 'Attachment', loading: 'lazy' }),
          att.type === 'gif' ? DOM.el('span', { class: 'media-gif-badge' }, 'GIF') : null,
          DOM.el('div', { class: 'media-hover-overlay' },
            DOM.el('i', { class: 'bi bi-arrows-angle-expand' }),
            DOM.el('span', {}, 'Click to enlarge')
          )
        );
        if (att.caption) {
          imgCard.appendChild(DOM.el('div', { class: 'channel-media-caption' }, att.caption));
        }
        wrapper.appendChild(imgCard);
      } else if (att.type === 'video') {
        const videoCard = DOM.el('div', { class: 'channel-media-card channel-media-video' },
          DOM.el('video', { 
            controls: true, 
            preload: 'metadata', 
            class: 'channel-video-player',
            src: att.url 
          }),
          att.caption ? DOM.el('div', { class: 'channel-media-caption' }, att.caption) : null
        );
        wrapper.appendChild(videoCard);
      }
    });

    return wrapper;
  }

  /* ===========================
     REACTIONS RENDERER & LOGIC
     =========================== */
  buildReactionsNode(msg, currentUserId) {
    const reactions = msg.reactions || {};
    const wrapper = DOM.el('div', { class: 'channel-reactions-bar' });

    // Existing emoji pills
    Object.keys(reactions).forEach(emoji => {
      const users = reactions[emoji] || [];
      const hasReacted = users.includes(currentUserId);
      const pill = DOM.el('button', {
        class: `channel-reaction-pill ${hasReacted ? 'active' : ''}`,
        onclick: () => {
          stateManager.toggleChannelMessageReaction(msg.id, emoji, currentUserId);
        }
      },
        DOM.el('span', { class: 'reaction-emoji' }, emoji),
        DOM.el('span', { class: 'reaction-count' }, users.length)
      );
      wrapper.appendChild(pill);
    });

    // Add reaction trigger button
    const addBtn = DOM.el('button', {
      class: 'channel-add-reaction-btn',
      title: 'Add Reaction',
      onclick: (e) => {
        e.stopPropagation();
        this.showEmojiPickerPopover(e.currentTarget, msg.id, currentUserId);
      }
    }, DOM.el('i', { class: 'bi bi-emoji-smile' }));

    wrapper.appendChild(addBtn);
    return wrapper;
  }

  showEmojiPickerPopover(targetBtn, msgId, currentUserId) {
    // Remove existing popovers
    document.querySelectorAll('.channel-emoji-popover').forEach(p => p.remove());

    const popover = DOM.el('div', { class: 'channel-emoji-popover' });
    EMOJI_PICKER_OPTIONS.forEach(emoji => {
      const btn = DOM.el('button', {
        class: 'emoji-picker-btn',
        onclick: () => {
          stateManager.toggleChannelMessageReaction(msgId, emoji, currentUserId);
          popover.remove();
        }
      }, emoji);
      popover.appendChild(btn);
    });

    document.body.appendChild(popover);

    // Position near button
    const rect = targetBtn.getBoundingClientRect();
    popover.style.top = `${rect.top - 46}px`;
    popover.style.left = `${rect.left}px`;

    const closeHandler = (e) => {
      if (!popover.contains(e.target) && e.target !== targetBtn) {
        popover.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 50);
  }

  /* ===========================
     INPUT BAR & ATTACHMENT TOOLS
     =========================== */
  buildInputBar() {
    const currentUser = stateManager.getState('currentUser');
    const customChars = stateManager.getState('customCharacters') || [];
    
    // Identity Options: Current User + World Bots + Custom Characters
    const identitySelect = DOM.el('select', { 
      class: 'channel-identity-select',
      onchange: (e) => {
        stateManager.setState('activeIdentity', e.target.value);
      }
    });

    const activeIdentity = stateManager.getState('activeIdentity') || (currentUser ? currentUser.username : 'Guest');

    // Default user identity
    const mainUsername = currentUser ? currentUser.username : 'Guest';
    identitySelect.appendChild(DOM.el('option', { value: mainUsername, selected: activeIdentity === mainUsername }, `Post as @${mainUsername} (User)`));

    // World bots identities
    if (this.bots && this.bots.length > 0) {
      this.bots.forEach(b => {
        identitySelect.appendChild(DOM.el('option', { value: b.id, selected: activeIdentity === b.id }, `Post as @${b.name} (Bot)`));
      });
    }

    // Custom created characters
    customChars.forEach(c => {
      identitySelect.appendChild(DOM.el('option', { value: c.id, selected: activeIdentity === c.id }, `Post as @${c.name} (Custom)`));
    });

    // Attachment trigger button
    const attachBtn = DOM.el('button', {
      class: 'channel-attach-btn',
      title: 'Attach Media (Image, GIF, Video)',
      onclick: () => this.openMediaAttachModal()
    }, DOM.el('i', { class: 'bi bi-plus-circle-fill' }));

    // Message input textarea
    const textarea = DOM.el('textarea', {
      class: 'channel-input-textarea',
      placeholder: `Message #${this.world ? this.world.title.toLowerCase().replace(/\s+/g, '-') : 'channel'}...`,
      rows: 1,
      onkeydown: (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage(textarea);
        }
      }
    });

    // Send button
    const sendBtn = DOM.el('button', {
      class: 'btn btn-primary channel-send-btn',
      onclick: () => this.handleSendMessage(textarea)
    }, DOM.el('i', { class: 'bi bi-send-fill' }), 'Send');

    return DOM.el('div', { class: 'world-channel-input-bar' },
      DOM.el('div', { class: 'channel-input-toolbar' },
        DOM.el('div', { class: 'channel-identity-wrapper' },
          DOM.el('i', { class: 'bi bi-person-badge', style: { color: 'var(--accent-gold)' } }),
          identitySelect
        ),
        attachBtn
      ),
      DOM.el('div', { class: 'channel-input-row' },
        textarea,
        sendBtn
      )
    );
  }

  /* ===========================
     MESSAGE SENDING & ATTACHMENT LOGIC
     =========================== */
  handleSendMessage(textarea) {
    const text = textarea.value.trim();
    if (!text && !this.draftAttachment) return;

    const currentUser = stateManager.getState('currentUser');
    const activeIdentity = stateManager.getState('activeIdentity') || (currentUser ? currentUser.username : 'Guest');

    // Resolve Identity metadata
    let authorId = activeIdentity;
    let authorName = activeIdentity;
    let authorAvatar = null;
    let authorRole = 'User';
    let authorType = 'user';

    // Check if posting as World Bot
    const botMatch = (this.bots || []).find(b => b.id === activeIdentity || b.name === activeIdentity);
    if (botMatch) {
      authorId = botMatch.id;
      authorName = botMatch.name;
      authorAvatar = `${this.world.path}/${botMatch.avatar || botMatch.cardImage}`;
      authorRole = 'Bot';
      authorType = 'character';
    } else if (currentUser && (activeIdentity === currentUser.username || activeIdentity === 'Odin')) {
      authorId = currentUser.username || 'Odin';
      authorName = currentUser.username || 'Odin';
      authorAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%232e185b"/><text x="50" y="55" fill="%23fef08a" font-size="32" font-family="Outfit" text-anchor="middle">O</text></svg>';
      authorRole = 'Creator';
      authorType = 'creator';
    }

    const attachments = this.draftAttachment ? [this.draftAttachment] : [];

    // Post to StateManager
    stateManager.addChannelMessage(this.worldId, {
      authorId,
      authorName,
      authorAvatar,
      authorRole,
      authorType,
      content: text,
      attachments
    });

    // Reset input states
    textarea.value = '';
    this.draftAttachment = null;
    this.updateDraftContainer();
    this.scrollToBottom();
  }

  /* ===========================
     ATTACHMENT MODAL & PREVIEW CHIP
     =========================== */
  openMediaAttachModal() {
    const backdrop = DOM.el('div', { class: 'modal-backdrop fade-in' });
    let selectedType = 'image';
    let fileDataUrl = '';

    const typeSelect = DOM.el('select', {
      class: 'comment-identity-select',
      onchange: (e) => { selectedType = e.target.value; }
    },
      DOM.el('option', { value: 'image' }, '🖼️ Image'),
      DOM.el('option', { value: 'gif' }, '🎞️ GIF'),
      DOM.el('option', { value: 'video' }, '🎥 Video')
    );

    const urlInput = DOM.el('input', {
      type: 'text',
      class: 'search-input-box',
      placeholder: 'Paste Media URL (e.g. https://domain.com/image.avif or MP4 video URL)...'
    });

    const captionInput = DOM.el('input', {
      type: 'text',
      class: 'search-input-box',
      placeholder: 'Optional Media Caption...'
    });

    const fileInput = DOM.el('input', {
      type: 'file',
      accept: 'image/*,video/*',
      class: 'channel-file-upload-input',
      onchange: (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            fileDataUrl = evt.target.result;
            if (file.type.startsWith('video/')) selectedType = 'video';
            else if (file.type.includes('gif')) selectedType = 'gif';
            else selectedType = 'image';
            typeSelect.value = selectedType;
          };
          reader.readAsDataURL(file);
        }
      }
    });

    const card = DOM.el('div', { class: 'modal-card glass-panel' },
      DOM.el('div', { class: 'modal-header' },
        DOM.el('h3', {}, 'Attach Media to Channel'),
        DOM.el('button', { class: 'modal-close-btn', onclick: () => backdrop.remove() }, '×')
      ),
      DOM.el('div', { class: 'modal-body', style: { display: 'flex', flexDirection: 'column', gap: '14px' } },
        DOM.el('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          DOM.el('label', { style: { fontSize: '12px', color: 'var(--text-muted)' } }, 'Media Type:'),
          typeSelect
        ),
        DOM.el('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          DOM.el('label', { style: { fontSize: '12px', color: 'var(--text-muted)' } }, 'Option A: Direct Media URL:'),
          urlInput
        ),
        DOM.el('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          DOM.el('label', { style: { fontSize: '12px', color: 'var(--text-muted)' } }, 'Option B: Upload File from Device:'),
          fileInput
        ),
        DOM.el('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          DOM.el('label', { style: { fontSize: '12px', color: 'var(--text-muted)' } }, 'Caption:'),
          captionInput
        )
      ),
      DOM.el('div', { class: 'modal-footer' },
        DOM.el('button', { class: 'btn btn-secondary', onclick: () => backdrop.remove() }, 'Cancel'),
        DOM.el('button', {
          class: 'btn btn-primary',
          onclick: () => {
            const finalUrl = fileDataUrl || urlInput.value.trim();
            if (!finalUrl) {
              alert('Please select a file or paste a media URL.');
              return;
            }
            this.draftAttachment = {
              type: selectedType,
              url: finalUrl,
              caption: captionInput.value.trim()
            };
            this.updateDraftContainer();
            backdrop.remove();
          }
        }, 'Attach Media')
      )
    );

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
  }

  updateDraftContainer() {
    if (!this.draftContainer) return;
    DOM.clear(this.draftContainer);

    if (!this.draftAttachment) {
      this.draftContainer.style.display = 'none';
      return;
    }

    this.draftContainer.style.display = 'flex';
    const chip = DOM.el('div', { class: 'channel-draft-chip' },
      DOM.el('i', { class: `bi ${this.draftAttachment.type === 'video' ? 'bi-film' : 'bi-image'}` }),
      DOM.el('span', { class: 'draft-chip-label' }, `${this.draftAttachment.type.toUpperCase()}: ${this.draftAttachment.caption || 'Attachment Ready'}`),
      DOM.el('button', {
        class: 'draft-chip-remove-btn',
        title: 'Remove attachment',
        onclick: () => {
          this.draftAttachment = null;
          this.updateDraftContainer();
        }
      }, '×')
    );

    this.draftContainer.appendChild(chip);
  }

  /* ===========================
     LIGHTBOX MEDIA MODAL
     =========================== */
  openLightboxModal(src, title, type = 'image') {
    const backdrop = DOM.el('div', { 
      class: 'modal-backdrop channel-lightbox-backdrop fade-in',
      onclick: (e) => {
        if (e.target === backdrop) backdrop.remove();
      }
    });

    let mediaElement;
    if (type === 'video') {
      mediaElement = DOM.el('video', { controls: true, autoplay: true, src, style: { maxWidth: '90vw', maxHeight: '80vh', borderRadius: '8px' } });
    } else {
      mediaElement = DOM.el('img', { src, alt: title, style: { maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px' } });
    }

    const card = DOM.el('div', { class: 'channel-lightbox-card' },
      DOM.el('div', { class: 'lightbox-header' },
        DOM.el('span', { class: 'lightbox-title' }, title),
        DOM.el('button', { class: 'lightbox-close-btn', onclick: () => backdrop.remove() }, '×')
      ),
      DOM.el('div', { class: 'lightbox-body' }, mediaElement)
    );

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
  }

  /* ===========================
     UTILITIES & HELPERS
     =========================== */
  scrollToBottom() {
    if (this.feedContainer) {
      setTimeout(() => {
        this.feedContainer.scrollTop = this.feedContainer.scrollHeight;
      }, 50);
    }
  }

  formatMessageContent(content) {
    if (!content) return DOM.el('span', {}, '');

    const wrapper = DOM.el('span', {});
    // Simple regex parser for mentions @username
    const parts = content.split(/(@[a-zA-Z0-9_-]+)/g);

    parts.forEach(part => {
      if (part.startsWith('@')) {
        const username = part.slice(1);
        wrapper.appendChild(
          DOM.el('span', { class: 'mention-tag mention-tag-user' }, `@${username}`)
        );
      } else {
        wrapper.appendChild(document.createTextNode(part));
      }
    });

    return wrapper;
  }

  renderRoleBadge(role, type) {
    let badgeClass = 'role-badge-community';
    let label = role || 'Member';

    if (role === 'Creator' || type === 'creator') {
      badgeClass = 'role-badge-creator';
      label = 'CREATOR';
    } else if (role === 'Collaborator' || role === 'Admin' || role === 'Editor') {
      badgeClass = 'role-badge-collab';
      label = role.toUpperCase();
    } else if (role === 'Bot' || type === 'character') {
      badgeClass = 'role-badge-bot';
      label = 'BOT';
    }

    return DOM.el('span', { class: `channel-role-badge ${badgeClass}` }, label);
  }
}

export default WorldActivityChannel;
