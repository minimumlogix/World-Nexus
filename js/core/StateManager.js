/* js/core/StateManager.js */
import { globalEventBus } from './EventBus.js';

class StateManager {
  constructor() {
    this.state = {
      currentWorld: null,
      searchQuery: '',
      selectedGenres: [],
      sortBy: 'featured', // featured, newest, alphabetical, popular
      theme: 'dark-theme',
      favorites: [],
      currentUser: null, // null means Guest
      activeIdentity: null, // String: username or character ID
      customCharacters: [],
      customWorlds: [],
      comments: [],
      follows: [],
      inboxRequests: [],
      notifications: [],
      worldActivities: [],
      worldCollaborators: {},
      customLore: []
    };

    this.loadFromStorage();
    this.seedMockDataIfNeeded();
  }

  /**
   * Helper to safely retrieve and parse JSON values from localStorage.
   */
  safeGetItem(key, defaultValue) {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return defaultValue;
      return JSON.parse(saved);
    } catch (err) {
      console.warn(`Could not parse localStorage key "${key}" (possible corruption):`, err);
      return defaultValue;
    }
  }

  /**
   * Loads initial state from localStorage if available.
   */
  loadFromStorage() {
    this.state.favorites = this.safeGetItem('world_nexus_favorites', []);
    this.state.currentUser = this.safeGetItem('world_nexus_user', null);
    this.state.customCharacters = this.safeGetItem('world_nexus_custom_characters', []);
    this.state.customWorlds = this.safeGetItem('world_nexus_custom_worlds', []);
    this.state.comments = this.safeGetItem('world_nexus_comments', []);
    this.state.follows = this.safeGetItem('world_nexus_follows', []);
    this.state.inboxRequests = this.safeGetItem('world_nexus_inbox_requests', []);
    this.state.notifications = this.safeGetItem('world_nexus_notifications', []);
    this.state.worldActivities = this.safeGetItem('world_nexus_world_activities', []);
    this.state.worldCollaborators = this.safeGetItem('world_nexus_world_collaborators', {});
    this.state.customLore = this.safeGetItem('world_nexus_custom_lore', []);

    try {
      const savedTheme = localStorage.getItem('world_nexus_theme');
      this.state.theme = savedTheme || 'dark-theme';
    } catch (err) {
      this.state.theme = 'dark-theme';
    }

    try {
      const savedIdentity = localStorage.getItem('world_nexus_active_identity');
      this.state.activeIdentity = savedIdentity || null;
    } catch (err) {
      this.state.activeIdentity = null;
    }
  }

  /**
   * Seeds interesting comments and initial configurations if not present.
   */
  seedMockDataIfNeeded() {
    if (!Array.isArray(this.state.comments) || this.state.comments.length === 0) {
      const initialComments = [
        {
          id: 'c1',
          targetType: 'world',
          targetId: 'arcanis',
          authorId: 'max-smasher',
          authorName: 'Max Smasher',
          authorAvatar: 'Worlds/arcanis/characters/max-smasher/images/max-smasher-avatar.avif',
          authorType: 'character',
          content: 'The Rift is unstable again. If anyone sees those void anomalies creeping near Sector 4, ping @mary-ultarra immediately.',
          timestamp: '2 hours ago',
          likes: 12
        },
        {
          id: 'c2',
          targetType: 'world',
          targetId: 'arcanis',
          authorId: 'mary-ultarra',
          authorName: 'Mary Ultarra',
          authorAvatar: 'Worlds/arcanis/characters/mary-ultarra/images/mary-ultarra-avatar.jpg',
          authorType: 'character',
          content: 'Affirmative, @max-smasher. Already dispatched a recon drone. It looks like @arcanis has some active energy signatures spikes.',
          timestamp: '1 hour ago',
          likes: 8
        },
        {
          id: 'c3',
          targetType: 'world',
          targetId: 'arcanis',
          authorId: 'odin',
          authorName: 'Odin',
          authorAvatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%232e185b"/><text x="50" y="55" fill="%23fef08a" font-size="32" font-family="Outfit" text-anchor="middle">O</text></svg>',
          authorType: 'creator',
          content: 'Welcome builders! Excited to see people exploring my universe. Let me know what you think of Sector 4\'s lore additions.',
          timestamp: '3 days ago',
          likes: 42
        },
        {
          id: 'c4',
          targetType: 'bot',
          targetId: 'max-smasher',
          authorId: 'mary-ultarra',
          authorName: 'Mary Ultarra',
          authorAvatar: 'Worlds/arcanis/characters/mary-ultarra/images/mary-ultarra-avatar.jpg',
          authorType: 'character',
          content: 'You should stop drinking so much void-ale. It compromises our tactical efficiency during missions.',
          timestamp: '5 hours ago',
          likes: 15
        }
      ];
      this.setState('comments', initialComments, true);
    }

    // Seed mock inbox requests (actionable approvals)
    if (!Array.isArray(this.state.inboxRequests) || this.state.inboxRequests.length === 0) {
      const initialRequests = [
        {
          id: 'inb_1',
          type: 'collaboration',
          from: 'Nova',
          worldId: 'arcanis',
          worldTitle: 'Arcanis',
          status: 'pending',
          timestamp: '3 hours ago'
        },
        {
          id: 'inb_2',
          type: 'lore_submission',
          from: 'Nova',
          worldId: 'arcanis',
          worldTitle: 'Arcanis',
          title: 'The Void Market',
          content: '## The Void Market\n\nTucked away in the shadow of the Great Rift lies the Void Market, a black market bazaar where illegal technology, raw rift shards, and forbidden spells are traded away from the eyes of the Syndicate. Guarded by rogue Ferrumites, the market operates on a bartering system of secrets and life force.',
          status: 'pending',
          timestamp: '5 hours ago'
        },
        {
          id: 'inb_3',
          type: 'character_submission',
          from: 'Atlas',
          worldId: 'arcanis',
          worldTitle: 'Arcanis',
          name: 'The Black Saint',
          occupation: 'Rift Cultist Leader',
          description: 'A rogue zealot preaching that the Great Rift is a divine gateway rather than a destruction threat. He commands a hidden parish deep inside Sector 4.',
          status: 'pending',
          timestamp: '1 day ago'
        }
      ];
      this.setState('inboxRequests', initialRequests, true);
    }

    // Seed passive notifications
    if (!Array.isArray(this.state.notifications) || this.state.notifications.length === 0) {
      const initialNotifications = [
        {
          id: 'not_1',
          message: 'Mary Ultara was followed by @Atlas',
          timestamp: '15 mins ago',
          read: false
        },
        {
          id: 'not_2',
          message: 'Arcanis gained 4 followers',
          timestamp: '2 hours ago',
          read: false
        },
        {
          id: 'not_3',
          message: 'New comment on Great Rift by @Nova',
          timestamp: '1 day ago',
          read: true
        }
      ];
      this.setState('notifications', initialNotifications, true);
    }

    // Seed activities feed
    if (!Array.isArray(this.state.worldActivities) || this.state.worldActivities.length === 0) {
      const initialActivities = [
        { id: 'act_1', worldId: 'arcanis', author: 'Odin', action: 'created', details: 'Great Rift article created', timestamp: '2 days ago' },
        { id: 'act_2', worldId: 'arcanis', author: 'Odin', action: 'updated', details: 'Heroic Syndicate revised', timestamp: '1 day ago' },
        { id: 'act_3', worldId: 'arcanis', author: 'Zelena', action: 'uploaded_image', details: 'New gallery image uploaded', timestamp: '5 hours ago' },
        { id: 'act_4', worldId: 'arcanis', author: 'Odin', action: 'approved_character', details: 'Roselyn Thorne approved', timestamp: '1 hour ago' },
        { id: 'act_5', worldId: 'arcanis', author: 'Mary Ultarra', action: 'updated_bot', details: 'Mary Ultarra updated credentials', timestamp: '3 hours ago' }
      ];
      this.setState('worldActivities', initialActivities, true);
    }

    // Seed collaborators list
    if (Object.keys(this.state.worldCollaborators).length === 0) {
      const initialCollaborators = {
        arcanis: {
          owner: 'Odin',
          collaborators: {
            Odin: 'Owner',
            Zelena: 'Admin',
            Rena: 'Editor',
            Nova: 'Contributor',
            Atlas: 'Contributor'
          }
        }
      };
      this.setState('worldCollaborators', initialCollaborators, true);
    }
  }

  /**
   * Sets a value in the state registry and broadcasts changes.
   * @param {string} key - State key
   * @param {any} value - Value to set
   * @param {boolean} [silent=false] - If true, do not emit events
   */
  setState(key, value, silent = false) {
    if (JSON.stringify(this.state[key]) === JSON.stringify(value)) return;
    
    this.state[key] = value;

    // Side-effects persistence
    try {
      if (key === 'theme') {
        localStorage.setItem('world_nexus_theme', value);
      } else if (key === 'favorites') {
        localStorage.setItem('world_nexus_favorites', JSON.stringify(value));
      } else if (key === 'currentUser') {
        localStorage.setItem('world_nexus_user', value ? JSON.stringify(value) : '');
      } else if (key === 'activeIdentity') {
        localStorage.setItem('world_nexus_active_identity', value || '');
      } else if (key === 'customCharacters') {
        localStorage.setItem('world_nexus_custom_characters', JSON.stringify(value));
      } else if (key === 'customWorlds') {
        localStorage.setItem('world_nexus_custom_worlds', JSON.stringify(value));
      } else if (key === 'comments') {
        localStorage.setItem('world_nexus_comments', JSON.stringify(value));
      } else if (key === 'follows') {
        localStorage.setItem('world_nexus_follows', JSON.stringify(value));
      } else if (key === 'inboxRequests') {
        localStorage.setItem('world_nexus_inbox_requests', JSON.stringify(value));
      } else if (key === 'notifications') {
        localStorage.setItem('world_nexus_notifications', JSON.stringify(value));
      } else if (key === 'worldActivities') {
        localStorage.setItem('world_nexus_world_activities', JSON.stringify(value));
      } else if (key === 'customLore') {
        localStorage.setItem('world_nexus_custom_lore', JSON.stringify(value));
      } else if (key === 'worldCollaborators') {
        localStorage.setItem('world_nexus_world_collaborators', JSON.stringify(value));
      }
    } catch (err) {
      console.error(`Could not save state field "${key}" to localStorage:`, err);
      if (err.name === 'QuotaExceededError' || err.code === 22) {
        alert('Browser local storage limit exceeded. Your recent custom profiles or comments cannot be saved permanently.');
      }
    }

    if (!silent) {
      globalEventBus.emit(`state:${key}`, value);
      globalEventBus.emit('state:change', this.state);
    }
  }

  /**
   * Retrieves a value from state registry.
   * @param {string} key - State key
   * @returns {any}
   */
  getState(key) {
    return this.state[key];
  }

  /**
   * Toggles the favorited status of a bot.
   * @param {string} botId - Unique bot identifier
   */
  toggleFavorite(botId) {
    const favorites = [...this.state.favorites];
    const index = favorites.indexOf(botId);
    
    if (index > -1) {
      favorites.splice(index, 1);
    } else {
      favorites.push(botId);
    }
    
    this.setState('favorites', favorites);
  }

  /**
   * Checks if a bot is in favorites.
   * @param {string} botId
   * @returns {boolean}
   */
  isFavorite(botId) {
    return this.state.favorites.includes(botId);
  }

  /**
   * Toggles whether the current user follows a user/character/world.
   * @param {string} targetId
   */
  toggleFollow(targetId) {
    const follows = [...this.state.follows];
    const index = follows.indexOf(targetId);
    if (index > -1) {
      follows.splice(index, 1);
    } else {
      follows.push(targetId);
    }
    this.setState('follows', follows);
  }

  /**
   * Checks if the user is following a target.
   * @param {string} targetId
   * @returns {boolean}
   */
  isFollowing(targetId) {
    return this.state.follows.includes(targetId);
  }

  /**
   * Logs in a user.
   */
  login(username) {
    const user = {
      username: username,
      displayName: username,
      avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%232e185b"/><text x="50" y="55" fill="%23fef08a" font-size="32" font-family="Outfit" text-anchor="middle">${username.charAt(0).toUpperCase()}</text></svg>`,
      role: 'Creator',
      banner: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80',
      tagline: 'World Architect',
      bio: 'Ready to build sprawling sectors of the universe.',
      pronouns: '',
      location: '',
      website: '',
      primaryRole: 'World Architect',
      showWorldCount: true,
      showFollowerCount: true,
      showActivity: true,
      profileTheme: 'Default Nexus',
      customBannerOffset: 50,
      customBannerZoom: 1,
      worldsCount: 0,
      followersCount: 0,
      followingCount: 0,
      viewsCount: '0',
      badges: ['Early Creator', 'World Builder'],
      worlds: [],
      characters: [],
      account: {
        email: `${username.toLowerCase()}@worldnexus.grid`,
        birthDate: '1998-05-12',
        language: 'English',
        country: 'United Sectors'
      },
      privacy: {
        visibility: 'Public',
        whoCanMessage: 'Everyone',
        whoCanMention: 'Everyone',
        showOnlineStatus: true
      },
      notifications: {
        worldFollowed: { push: true, email: true },
        characterMention: { push: true, email: true },
        commentReplies: { push: true, email: false },
        collaborationRequests: { push: true, email: true }
      },
      connectedAccounts: {
        discord: true,
        google: true,
        github: false,
        x: false,
        bluesky: false
      },
      identity: {
        displayedBadges: ['Early Creator', 'World Builder'],
        displayedRole: 'World Architect',
        primaryCharacter: ''
      },
      collaborators: {
        incomingRequests: [
          { id: 'r1', from: 'Nova', worldId: 'arcanis', worldTitle: 'Arcanis', status: 'pending' }
        ],
        currentCollaborators: ['Nova', 'Raven', 'Atlas']
      },
      security: {
        twoFactorEnabled: false,
        activeSessions: [
          { id: 's1', browser: 'Chrome', os: 'Windows', location: 'Sector 4', active: true },
          { id: 's2', browser: 'Firefox', os: 'Android', location: 'Outpost Delta', active: false }
        ]
      }
    };
    this.setState('currentUser', user);
    this.setState('activeIdentity', username);
  }


  /**
   * Logs out the current user.
   */
  logout() {
    this.setState('currentUser', null);
    this.setState('activeIdentity', null);
  }

  /**
   * Reset filtering criteria
   */
  clearFilters() {
    this.setState('searchQuery', '', true);
    this.setState('selectedGenres', [], true);
    this.setState('sortBy', 'featured'); // triggers event
  }
}

export const stateManager = new StateManager();
