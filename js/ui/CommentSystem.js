/* js/ui/CommentSystem.js */
import { DOM } from '../utils/DOM.js';
import { stateManager } from '../core/StateManager.js';
import { WorldService } from '../services/WorldService.js';
import { BotService } from '../services/BotService.js';
import { sanitizeUrl } from '../utils/Security.js';

export class CommentSystem {
  /**
   * Builds and mounts the complete comments container for a world or character.
   * @param {string} targetType - 'world' or 'bot'
   * @param {string} targetId - Unique identifier
   * @returns {HTMLElement}
   */
  static render(targetType, targetId) {
    const container = DOM.el('div', { class: 'comments-section' });
    this.buildSection(container, targetType, targetId);
    return container;
  }

  static async buildSection(container, targetType, targetId) {
    try {
      DOM.clear(container);

      // Fetch lists for autocompletion and mention rendering
      const worlds = await WorldService.getWorlds();
      const bots = await BotService.getAllBots();
      const creators = [
        { id: 'oxin', name: 'Oxin', type: 'user', avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%232e185b"/><text x="50" y="55" fill="%23fef08a" font-size="32" font-family="Outfit" text-anchor="middle">O</text></svg>` },
        { id: 'nova', name: 'Nova', type: 'user', avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23115e59"/><text x="50" y="55" fill="%2322d3ee" font-size="32" font-family="Outfit" text-anchor="middle">N</text></svg>` }
      ];
      const currentUser = stateManager.getState('currentUser');
      if (currentUser && !creators.some(c => c.id === currentUser.username.toLowerCase())) {
        creators.push({
          id: currentUser.username.toLowerCase(),
          name: currentUser.username,
          type: 'user',
          avatar: currentUser.avatar
        });
      }

      const comments = stateManager.getState('comments') || [];
      const filteredComments = comments.filter(c => c && c.targetType === targetType && c.targetId === targetId);

      // Title header
      const titleRow = DOM.el('div', { class: 'comments-title-row' },
        DOM.el('h3', { class: 'comments-title' }, 
          DOM.el('i', { class: 'bi bi-chat-right-text' }),
          `Chronicle Comments (${filteredComments.length})`
        )
      );
      container.appendChild(titleRow);

      // Form
      if (currentUser) {
        const formEl = this.renderCommentForm(targetType, targetId, creators, bots, worlds, () => {
          this.buildSection(container, targetType, targetId);
        });
        container.appendChild(formEl);
      } else {
        const loginTip = DOM.el('div', { 
          class: 'profile-empty-tab', 
          style: { cursor: 'pointer', padding: '24px', margin: '0 0 16px' },
          onclick: () => {
            const signinBtn = document.getElementById('header-signin-btn');
            if (signinBtn) signinBtn.click();
          }
        }, 'Sign in to join the chronicles and comment as a character.');
        container.appendChild(loginTip);
      }

      // List of comments
      const list = DOM.el('div', { class: 'comments-list' });
      if (filteredComments.length === 0) {
        list.appendChild(DOM.el('p', { style: 'text-align: center; color: var(--text-muted); font-style: italic; padding: 24px;' }, 'No transmission signals recorded yet. Be the first to comment!'));
      } else {
        filteredComments.forEach(comment => {
          try {
            const item = this.renderCommentCard(comment, bots, worlds, () => {
              this.buildSection(container, targetType, targetId);
            });
            list.appendChild(item);
          } catch (cardErr) {
            console.error('[CommentSystem] Failed to render comment card:', cardErr, comment);
            list.appendChild(DOM.el('div', { class: 'comment-card-error', style: { padding: '12px', color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' } }, 'Telemetry signal corrupted.'));
          }
        });
      }
      container.appendChild(list);
    } catch (err) {
      console.error('[CommentSystem] Failed to build comments section:', err);
      container.appendChild(
        DOM.el('div', { class: 'comments-crash-node', style: { padding: '24px', textAlign: 'center', color: 'var(--accent-red)' } },
          DOM.el('i', { class: 'bi bi-exclamation-triangle', style: { fontSize: '2rem', display: 'block', marginBottom: '8px' } }),
          'Telemetry uplink failed. Could not render chronicles comment log.'
        )
      );
    }
  }

  static renderCommentForm(targetType, targetId, creators, bots, worlds, onCommentPosted) {
    const currentUser = stateManager.getState('currentUser');
    const customChars = stateManager.getState('customCharacters') || [];
    const presetChars = currentUser.username.toLowerCase() === 'oxin' 
      ? [
          { id: 'mary-ultarra', name: 'Mary Ultarra', avatar: 'Worlds/arcanis/characters/mary-ultarra/images/mary-ultarra-avatar.jpg' },
          { id: 'max-smasher', name: 'Max Smasher', avatar: 'Worlds/arcanis/characters/max-smasher/images/max-smasher-avatar.avif' }
        ]
      : [];

    const activeIdentity = stateManager.getState('activeIdentity') || currentUser.username;

    // Selector
    const identitySelect = DOM.el('select', { 
      class: 'comment-identity-select',
      onchange: (e) => {
        stateManager.setState('activeIdentity', e.target.value);
      }
    });

    identitySelect.appendChild(DOM.el('option', { value: currentUser.username }, `@${currentUser.username} (Creator)`));
    [...presetChars, ...customChars].forEach(char => {
      identitySelect.appendChild(DOM.el('option', { value: char.id }, `${char.name} (Character)`));
    });

    identitySelect.value = activeIdentity;

    const textarea = DOM.el('textarea', {
      class: 'comment-textarea',
      placeholder: 'Type @ to mention worlds, characters or creators...'
    });

    // Autocomplete box
    const autocompleteBox = DOM.el('div', { class: 'mention-autocomplete-box' },
      DOM.el('div', { class: 'mention-autocomplete-header' }, 'Nexus Mentions')
    );

    let autocompleteActive = false;
    let autocompleteQuery = '';
    let autocompleteStartIndex = -1;
    let selectedIndex = 0;
    let filteredAutocompleteItems = [];

    const updateAutocomplete = () => {
      DOM.clear(autocompleteBox);
      autocompleteBox.appendChild(DOM.el('div', { class: 'mention-autocomplete-header' }, 'Nexus Mentions'));

      const queryLower = autocompleteQuery.toLowerCase();
      
      // Filter matching entities
      const matchWorlds = worlds
        .filter(w => w.title.toLowerCase().includes(queryLower))
        .map(w => ({ id: w.id, name: w.title, type: 'world', avatar: w.logo || `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><rect width='100%' height='100%' fill='%23eab308'/></svg>` }));
      
      const matchBots = bots
        .filter(b => b.name.toLowerCase().includes(queryLower))
        .map(b => ({ id: b.id, name: b.name, type: 'character', avatar: b.avatar }));

      const matchCreators = creators
        .filter(c => c.name.toLowerCase().includes(queryLower))
        .map(c => ({ id: c.id, name: c.name, type: 'user', avatar: c.avatar }));

      filteredAutocompleteItems = [...matchCreators, ...matchBots, ...matchWorlds].slice(0, 5);

      if (filteredAutocompleteItems.length === 0) {
        autocompleteBox.classList.remove('active');
        return;
      }

      autocompleteBox.classList.add('active');

      filteredAutocompleteItems.forEach((item, index) => {
        // Resolve local path for avatars
        let avatarSrc = item.avatar;
        if (avatarSrc && !avatarSrc.startsWith('data:') && !avatarSrc.startsWith('http')) {
          avatarSrc = `./${avatarSrc}`;
        }

        const itemEl = DOM.el('div', {
          class: `mention-autocomplete-item ${index === selectedIndex ? 'active' : ''}`,
          onclick: () => insertMention(item)
        },
          DOM.el('img', { class: 'mention-avatar', src: sanitizeUrl(avatarSrc, item.name) }),
          DOM.el('div', { class: 'mention-name-col' },
            DOM.el('span', { class: 'mention-item-name' }, item.name),
            DOM.el('span', { class: 'mention-item-type' }, item.type)
          )
        );
        autocompleteBox.appendChild(itemEl);
      });
    };

    const insertMention = (item) => {
      const text = textarea.value;
      const before = text.substring(0, autocompleteStartIndex);
      const after = text.substring(textarea.selectionStart);
      
      // Insert custom handle
      const mentionHandle = item.type === 'user' ? `@${item.id}` : `@${item.id}`;
      textarea.value = before + mentionHandle + ' ' + after;
      
      autocompleteActive = false;
      autocompleteBox.classList.remove('active');
      textarea.focus();
    };

    textarea.addEventListener('keydown', (e) => {
      if (autocompleteActive) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectedIndex = (selectedIndex + 1) % filteredAutocompleteItems.length;
          updateAutocomplete();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectedIndex = (selectedIndex - 1 + filteredAutocompleteItems.length) % filteredAutocompleteItems.length;
          updateAutocomplete();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredAutocompleteItems[selectedIndex]) {
            insertMention(filteredAutocompleteItems[selectedIndex]);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          autocompleteActive = false;
          autocompleteBox.classList.remove('active');
        }
      }
    });

    textarea.addEventListener('input', () => {
      const text = textarea.value;
      const cursor = textarea.selectionStart;
      
      // Look back for last @
      const lastAt = text.lastIndexOf('@', cursor - 1);
      
      if (lastAt !== -1 && !text.substring(lastAt, cursor).includes(' ')) {
        autocompleteActive = true;
        autocompleteStartIndex = lastAt;
        autocompleteQuery = text.substring(lastAt + 1, cursor);
        selectedIndex = 0;
        updateAutocomplete();
      } else {
        autocompleteActive = false;
        autocompleteBox.classList.remove('active');
      }
    });

    const submitBtn = DOM.el('button', {
      class: 'btn btn-accent',
      onclick: () => {
        const val = textarea.value.trim();
        if (!val) return;
        if (val.length > 500) {
          alert('Transmission packet size exceeded. Maximum comment length is 500 characters.');
          return;
        }

        // Resolve active identity details
        let authorName = currentUser.username;
        let authorAvatar = currentUser.avatar;
        let authorType = 'creator';

        if (activeIdentity !== currentUser.username) {
          const customChars = stateManager.getState('customCharacters') || [];
          const presets = [
            { id: 'mary-ultarra', name: 'Mary Ultarra', avatar: 'Worlds/arcanis/characters/mary-ultarra/images/mary-ultarra-avatar.jpg' },
            { id: 'max-smasher', name: 'Max Smasher', avatar: 'Worlds/arcanis/characters/max-smasher/images/max-smasher-avatar.avif' }
          ];
          const bot = [...customChars, ...presets].find(c => c.id === activeIdentity);
          if (bot) {
            authorName = bot.name;
            authorAvatar = bot.avatar;
            authorType = 'character';
          }
        }

        const newComment = {
          id: 'c_' + Date.now(),
          targetType,
          targetId,
          authorId: activeIdentity,
          authorName,
          authorAvatar: sanitizeUrl(authorAvatar, authorName),
          authorType,
          content: val,
          timestamp: 'Just now',
          likes: 0
        };

        const comments = stateManager.getState('comments') || [];
        comments.push(newComment);
        stateManager.setState('comments', comments);

        textarea.value = '';
        if (onCommentPosted) onCommentPosted();
      }
    }, 'Post Transmission');

    const wrapper = DOM.el('div', { class: 'comment-textarea-wrapper' },
      textarea,
      autocompleteBox
    );

    return DOM.el('div', { class: 'comment-form' },
      DOM.el('div', { class: 'comment-form-header' },
        DOM.el('div', { class: 'comment-identity-selector-container' },
          DOM.el('span', { class: 'comment-identity-label' }, 'Commenting as:'),
          identitySelect
        )
      ),
      wrapper,
      DOM.el('div', { class: 'comment-form-footer' },
        DOM.el('span', { class: 'comment-input-tip' }, 'Press Tab or click to insert mentions'),
        submitBtn
      )
    );
  }

  static renderCommentCard(comment, bots, worlds, onRefresh) {
    // Likes toggle
    const commentLikes = comment.likes || 0;
    const cacheKey = `comment_liked_${comment.id}`;
    const isLiked = localStorage.getItem(cacheKey) === 'true';

    const likeBtn = DOM.el('button', {
      class: `comment-action-btn ${isLiked ? 'liked' : ''}`,
      onclick: () => {
        const currentLiked = localStorage.getItem(cacheKey) === 'true';
        localStorage.setItem(cacheKey, String(!currentLiked));
        
        // Update state
        const allComments = stateManager.getState('comments') || [];
        const found = allComments.find(c => c.id === comment.id);
        if (found) {
          found.likes = found.likes + (!currentLiked ? 1 : -1);
          stateManager.setState('comments', allComments);
        }
        if (onRefresh) onRefresh();
      }
    },
      DOM.el('i', { class: isLiked ? 'bi bi-heart-fill' : 'bi bi-heart' }),
      `${commentLikes} Likes`
    );

    // Parse comment contents for clickable mentions
    const textContentNode = DOM.el('p', { class: 'comment-text-content' });
    this.parseAndInjectContent(textContentNode, comment.content, bots, worlds);

    // Resolve avatar path
    let avatarSrc = comment.authorAvatar;
    if (avatarSrc && !avatarSrc.startsWith('data:') && !avatarSrc.startsWith('http')) {
      avatarSrc = `./${avatarSrc}`;
    }

    // click navigation destination
    const authorHref = comment.authorType === 'creator' 
      ? `#/profile/${comment.authorId}` 
      : `#/bot/${comment.authorId}`;

    return DOM.el('div', { class: 'comment-card' },
      DOM.el('a', { href: authorHref, class: 'comment-avatar-link' },
        DOM.el('img', { class: 'comment-avatar', src: sanitizeUrl(avatarSrc, comment.authorName), alt: comment.authorName })
      ),
      DOM.el('div', { class: 'comment-body' },
        DOM.el('div', { class: 'comment-header-row' },
          DOM.el('a', { href: authorHref, class: 'comment-author-name' }, comment.authorName),
          DOM.el('span', { 
            class: `comment-author-type-badge ${comment.authorType}` 
          }, comment.authorType),
          DOM.el('span', { class: 'comment-timestamp' }, comment.timestamp)
        ),
        textContentNode,
        DOM.el('div', { class: 'comment-actions-row' },
          likeBtn
        )
      )
    );
  }

  /**
   * Helper that parses text comments for mentions (e.g. @max-smasher) and wraps them
   * in styled anchors with appropriate data-mention-type tags.
   */
  static parseAndInjectContent(container, contentText, bots, worlds) {
    const parts = contentText.split(/(\s+)/);
    
    parts.forEach(part => {
      if (part.startsWith('@')) {
        const handle = part.replace(/^@/, '').replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
        const handleLower = handle.toLowerCase();
        
        // 1. Check if matches world
        const matchedWorld = worlds.find(w => w.id === handleLower);
        if (matchedWorld) {
          container.appendChild(
            DOM.el('a', {
              href: `#/world/${matchedWorld.id}`,
              class: 'mention-tag mention-tag-world',
              'data-mention-type': 'world',
              'data-mention-id': matchedWorld.id
            }, `@${matchedWorld.title}`)
          );
          // Append trailing punctuation if any
          const trailing = part.slice(matchedWorld.id.length + 1);
          if (trailing) container.appendChild(document.createTextNode(trailing));
          return;
        }

        // 2. Check if matches bot/character
        const matchedBot = bots.find(b => b.id === handleLower || b.name.toLowerCase() === handleLower);
        if (matchedBot) {
          container.appendChild(
            DOM.el('a', {
              href: `#/bot/${matchedBot.id}`,
              class: 'mention-tag mention-tag-character',
              'data-mention-type': 'character',
              'data-mention-id': matchedBot.id
            }, `@${matchedBot.name}`)
          );
          const trailing = part.slice(handle.length + 1);
          if (trailing) container.appendChild(document.createTextNode(trailing));
          return;
        }

        // 3. Otherwise treat as a user handle (creator)
        container.appendChild(
          DOM.el('a', {
            href: `#/profile/${handle}`,
            class: 'mention-tag mention-tag-user',
            'data-mention-type': 'user',
            'data-mention-id': handle
          }, `@${handle}`)
        );
        const trailing = part.slice(handle.length + 1);
        if (trailing) container.appendChild(document.createTextNode(trailing));
        return;
      }
      
      // Default plain text
      container.appendChild(document.createTextNode(part));
    });
  }
}
export default CommentSystem;
