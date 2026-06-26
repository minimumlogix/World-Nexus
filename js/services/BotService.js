/* js/services/BotService.js */
import { WorldService } from './WorldService.js';
import { globalCache } from '../core/Cache.js';
import { preloadRegistry } from '../core/PreloadRegistry.js';

export class BotService {
  /**
   * Fetches all bots configured inside a specific world.
   * Resolves relative image paths to the world's folder path.
   * @param {Object|string} world - World details object or world ID
   * @returns {Promise<Array<Object>>}
   */
  static async getBotsForWorld(world) {
    let worldObj = world;
    if (typeof world === 'string') {
      const preloadedWorld = preloadRegistry.getPreloadedWorld(world);
      if (preloadedWorld) {
        worldObj = preloadedWorld;
      } else {
        worldObj = await WorldService.getWorld(world);
      }
    }
    
    if (!worldObj) return [];

    const preloadedBots = preloadRegistry.getPreloadedBots(worldObj.id);
    if (preloadedBots) {
      console.log(`[BotService] Using preloaded bots for world: ${worldObj.id}`);
      const cacheKey = `bots_of_world_${worldObj.id}`;
      if (!globalCache.has(cacheKey)) {
        this.syncLocalBotsWithJoyland(preloadedBots).then(synced => {
          globalCache.set(cacheKey, synced);
          worldObj.botCount = synced.filter(b => this.hasActualChatLink(b)).length;
          import('../core/EventBus.js').then(({ globalEventBus }) => {
            globalEventBus.emit('bots:synced');
          }).catch(() => {});
        });
        globalCache.set(cacheKey, preloadedBots);
      }
      
      const { stateManager } = await import('../core/StateManager.js');
      const customChars = stateManager.getState('customCharacters') || [];
      const worldCustomChars = customChars.filter(b => b.worldId === worldObj.id);
      const merged = [...preloadedBots, ...worldCustomChars];
      const unique = [];
      const ids = new Set();
      merged.forEach(b => {
        if (!ids.has(b.id)) {
          ids.add(b.id);
          unique.push(b);
        }
      });
      return unique;
    }

    const cacheKey = `bots_of_world_${worldObj.id}`;
    const cached = globalCache.get(cacheKey);
    if (cached) return cached;

    let botIds = [];

    // 1. Try dynamic directory listing if running locally
    const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    if (isLocal) {
      try {
        const listResponse = await fetch(`${worldObj.path}/characters/`);
        if (listResponse.ok && listResponse.headers.get('content-type')?.includes('text/html')) {
          const html = await listResponse.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const links = Array.from(doc.querySelectorAll('a'));
          
          // Character folders are subdirectories (ending in /), excluding parent navigations
          const subdirs = links
            .map(link => {
              try {
                const href = decodeURIComponent(link.getAttribute('href') || '');
                const normalized = href.replace(/\\/g, '/');
                const clean = normalized.replace(/\/$/, '');
                return clean.split('/').pop() || '';
              } catch (e) {
                return '';
              }
            })
            .filter(name => {
              if (!name || name.startsWith('.') || name.includes('.')) return false;
              const lower = name.toLowerCase();
              return lower !== 'images' && lower !== 'worlds' && lower !== 'http-server' && lower !== worldObj.id.toLowerCase();
            });

          // Bypass redundant HEAD/GET validations; invalid folders will return null during JSON fetch below
          botIds = subdirs;
        }
      } catch (dirErr) {
        console.warn(`Dynamic directory listing of world "${worldObj.id}" failed:`, dirErr);
      }
    }

    // 2. Fall back to static featuredBots config if dynamic discovery failed or returned empty
    if (botIds.length === 0) {
      botIds = worldObj.bots || worldObj.featuredBots || [];
    }

    const botPromises = botIds.map(async (botId) => {
      try {
        const response = await fetch(`${worldObj.path}/characters/${botId}/data/${botId}.json`);
        if (!response.ok) throw new Error(`Could not load bot JSON: ${botId}`);
        const botData = await response.json();

        // Inject parent references and resolve relative images
        botData.worldId = worldObj.id;
        botData.worldTitle = worldObj.title;
        botData.worldAuthor = worldObj.author || null;
        botData.worldAccent = worldObj.accentColor || null;
        botData.worldAccentRgb = worldObj.accentColorRgb || null;
        botData.cardImage = botData.cardImage ? `${worldObj.path}/characters/${botId}/${botData.cardImage}` : null;
        botData.avatar = botData.avatar ? `${worldObj.path}/characters/${botId}/${botData.avatar}` : null;
        botData.sprite = botData.sprite ? `${worldObj.path}/characters/${botId}/${botData.sprite}` : null;
        botData.lore = botData.lore ? `characters/${botId}/${botData.lore}` : null;
        botData.scenario = botData.scenario ? `characters/${botId}/${botData.scenario}` : null;
        
        return botData;
      } catch (err) {
        console.error(`Failed to parse bot "${botId}" details inside world "${worldObj.id}":`, err);
        return null;
      }
    });


    const bots = (await Promise.all(botPromises)).filter(b => b !== null);
    
    // Sync with Joyland stats dynamically based on endpoint ID
    const syncedBots = await this.syncLocalBotsWithJoyland(bots);

    // Dynamically override botCount in memory to only include bots with actual chat endpoints
    worldObj.botCount = syncedBots.filter(b => this.hasActualChatLink(b)).length;

    globalCache.set(cacheKey, syncedBots);

    const { stateManager } = await import('../core/StateManager.js');
    const customChars = stateManager.getState('customCharacters') || [];
    const worldCustomChars = customChars.filter(b => b.worldId === worldObj.id);
    const merged = [...syncedBots, ...worldCustomChars];
    const unique = [];
    const ids = new Set();
    merged.forEach(b => {
      if (!ids.has(b.id)) {
        ids.add(b.id);
        unique.push(b);
      }
    });
    return unique;
  }

  /**
   * Loads a specific bot profile from a world.
   * @param {string} worldId
   * @param {string} botId
   * @returns {Promise<Object|null>}
   */
  static async getBot(worldId, botId) {
    const bots = await this.getBotsForWorld(worldId);
    return bots.find(b => b.id === botId) || null;
  }

  /**
   * Aggregates bots across all registered worlds.
   * @returns {Promise<Array<Object>>}
   */
  static async getAllBots() {
    const cached = globalCache.get('all_bots_global');
    if (cached) return cached;

    // Check if we have preloaded bots matching the requested bot in the URL
    const hash = window.location.hash || '';
    const pathname = window.location.pathname || '';
    let activeBotId = null;
    if (hash.startsWith('#/bot/')) {
      activeBotId = decodeURIComponent(hash.substring(6));
    } else {
      const match = pathname.match(/\/bot-([^/]+)\.html$/);
      if (match) {
        activeBotId = decodeURIComponent(match[1]);
      }
    }

    const preloadedWorldId = preloadRegistry.metadata ? preloadRegistry.metadata.worldId : null;
    const preloadedBots = preloadedWorldId ? preloadRegistry.getPreloadedBots(preloadedWorldId) : null;

    if (preloadedBots && activeBotId && preloadedBots.some(b => b.id === activeBotId)) {
      console.log(`[BotService] Using preloaded bots for bot page: ${activeBotId}`);
      
      const { stateManager } = await import('../core/StateManager.js');
      const customChars = stateManager.getState('customCharacters') || [];
      const finalBots = [...preloadedBots];
      customChars.forEach(cc => {
        if (!finalBots.some(b => b.id === cc.id)) {
          finalBots.push(cc);
        }
      });
      return finalBots;
    }

    let flatBots;
    const worlds = await WorldService.getWorlds();
    const promises = worlds.map(w => this.getBotsForWorld(w));
    const nested = await Promise.all(promises);
    flatBots = nested.flat();
    globalCache.set('all_bots_global', flatBots);

    const { stateManager } = await import('../core/StateManager.js');
    const customChars = stateManager.getState('customCharacters') || [];
    const finalBots = [...flatBots];
    customChars.forEach(cc => {
      if (!finalBots.some(b => b.id === cc.id)) {
        finalBots.push(cc);
      }
    });
    return finalBots;
  }

  static generateFingerprint() {
    return (
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2)
    );
  }

  static async fetchPublicBots(userId) {
    const url = `https://api.joyland.ai/profile/public-bots?userId=${userId}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en',
          'Fingerprint': this.generateFingerprint(),
          'Origin': 'https://www.joyland.ai',
          'Referer': 'https://www.joyland.ai/'
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn(`Error fetching bots for ${userId}:`, error);
      return null;
    }
  }

  static async getJoylandBots() {
    const cached = globalCache.get('joyland_bots');
    if (cached) return cached;
    
    // If already fetching, wait for it (prevent duplicate calls)
    if (this._joylandPromise) return this._joylandPromise;

    this._joylandPromise = (async () => {
      const userIds = ['2xYazJ', 'lMjZp', 'rd2be']; // Fetch order determines time (newest first)
      try {
        const results = await Promise.all(userIds.map(id => this.fetchPublicBots(id)));
        const bots = [];
        let currentOrderIndex = 0;
        
        results.forEach(res => {
          const records = res?.result?.records || res?.bots || [];
          records.forEach(bot => {
            const botId = bot.botId || Math.random().toString();
            
            let gender = 'Unknown';
            if (bot.tags && bot.tags.includes('Male')) gender = 'Male';
            else if (bot.tags && bot.tags.includes('Female')) gender = 'Female';
            else if (bot.tags && bot.tags.includes('Non-binary')) gender = 'Non-binary';

            bots.push({
              ...bot,
              id: botId,
              name: bot.characterName || bot.name || 'Unnamed Bot',
              avatar: bot.avatar || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23161b24"/><text x="50" y="55" fill="%238b949e" font-size="20" text-anchor="middle">Bot</text></svg>',
              introduce: bot.introduce || bot.introduceText || 'No introduction provided.',
              chats: bot.botChats || bot.chatCount || '0',
              likes: bot.botLikes || bot.likeCount || '0',
              tags: bot.tags || [],
              category: bot.categoryName || 'Uncategorized',
              gender: gender,
              timeIndex: currentOrderIndex++,
              chatEndpoint: `https://www.joyland.ai/chat/${botId}`
            });
          });
        });
        
        globalCache.set('joyland_bots', bots);
        return bots;
      } catch (err) {
        console.warn('Could not fetch dynamic bots from Joyland in background:', err);
        return [];
      } finally {
        this._joylandPromise = null;
      }
    })();

    return this._joylandPromise;
  }

  /**
   * Checks if a bot has a valid, non-placeholder chat endpoint.
   * @param {Object} bot
   * @returns {boolean}
   */
  static hasActualChatLink(bot) {
    return !!(bot && bot.chatEndpoint && bot.chatEndpoint.trim() !== '' && !bot.chatEndpoint.includes('example.com'));
  }

  static _performSync(bots, joylandBots) {
    bots.forEach(bot => {
      if (bot.chatEndpoint) {
        // match /chat/BKR4W or /chat/BKR4W-amara-solmi
        const match = bot.chatEndpoint.match(/\/chat\/([a-zA-Z0-9]+)/);
        if (match && match[1]) {
          const joyBot = joylandBots.find(jb => jb.botId === match[1]);
          if (joyBot) {
            bot.chats = joyBot.chats;
            bot.likes = joyBot.likes;
            
            // Merge tags safely
            const localTags = bot.genres || bot.tags || [];
            const joyTags = joyBot.tags || [];
            bot.tags = Array.from(new Set([...localTags, ...joyTags]));
            bot.genres = bot.tags; // Keep genres synced if it exists

            // Sync Joyland bot back with local bot details
            joyBot.id = bot.id;
            joyBot.worldId = bot.worldId;
            joyBot.worldTitle = bot.worldTitle;
            joyBot.worldAccent = bot.worldAccent;
            joyBot.worldAccentRgb = bot.worldAccentRgb;
            joyBot.hasLocalData = true;
            joyBot.lore = bot.lore;
          }
        }
      }
    });
    return bots;
  }

  static async syncLocalBotsWithJoyland(bots) {
    const cachedJoyland = globalCache.get('joyland_bots');
    if (cachedJoyland && cachedJoyland.length > 0) {
      return this._performSync(bots, cachedJoyland);
    }

    // Fetch in background and perform sync once loaded to prevent external network request blocking
    this.getJoylandBots().then(joylandBots => {
      if (joylandBots && joylandBots.length > 0) {
        this._performSync(bots, joylandBots);
        // Dispatch global event so active pages can update their rendering dynamically
        import('../core/EventBus.js').then(({ globalEventBus }) => {
          globalEventBus.emit('bots:synced');
        }).catch(() => {});
      }
    }).catch(err => {
      console.warn('Background Joyland sync failed:', err);
    });

    return bots;
  }
}
export default BotService;
