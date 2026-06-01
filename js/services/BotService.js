/* js/services/BotService.js */
import { WorldService } from './WorldService.js';
import { globalCache } from '../core/Cache.js';

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
      worldObj = await WorldService.getWorld(world);
    }
    
    if (!worldObj) return [];

    const cacheKey = `bots_of_world_${worldObj.id}`;
    const cached = globalCache.get(cacheKey);
    if (cached) return cached;

    let botIds = [];

    // 1. Try dynamic directory listing if running locally
    const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    if (isLocal) {
      try {
        const listResponse = await fetch(`${worldObj.path}/`);
        if (listResponse.ok && listResponse.headers.get('content-type')?.includes('text/html')) {
          const html = await listResponse.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const links = Array.from(doc.querySelectorAll('a'));
          
          // Character folders are subdirectories (ending in /), excluding 'images/' or parent navigations
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
              return lower !== 'images' && lower !== 'worlds' && lower !== worldObj.id.toLowerCase();
            });

          // Verify each directory has a corresponding JSON file to confirm it represents a character folder
          const validations = await Promise.all(
            subdirs.map(async (dir) => {
              try {
                const checkUrl = `${worldObj.path}/${dir}/data/${dir}.json`;
                const checkRes = await fetch(checkUrl, { method: 'HEAD' });
                if (checkRes.ok) return dir;
                
                // Try standard GET if HEAD is not supported/fails
                const getRes = await fetch(checkUrl);
                if (getRes.ok) return dir;
              } catch (e) {}
              return null;
            })
          );
          
          botIds = validations.filter(d => d !== null);
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
        const response = await fetch(`${worldObj.path}/${botId}/data/${botId}.json`);
        if (!response.ok) throw new Error(`Could not load bot JSON: ${botId}`);
        const botData = await response.json();

        // Inject parent references and resolve relative images
        botData.worldId = worldObj.id;
        botData.worldTitle = worldObj.title;
        botData.worldAccent = worldObj.accentColor || null;
        botData.worldAccentRgb = worldObj.accentColorRgb || null;
        botData.cardImage = botData.cardImage ? `${worldObj.path}/${botId}/${botData.cardImage}` : null;
        botData.avatar = botData.avatar ? `${worldObj.path}/${botId}/${botData.avatar}` : null;
        botData.lore = botData.lore ? `${botId}/${botData.lore}` : null;
        
        return botData;
      } catch (err) {
        console.error(`Failed to parse bot "${botId}" details inside world "${worldObj.id}":`, err);
        return null;
      }
    });

    const bots = (await Promise.all(botPromises)).filter(b => b !== null);
    
    // Dynamically override botCount in memory
    worldObj.botCount = bots.length;

    // Sync with Joyland stats dynamically based on endpoint ID
    const syncedBots = await this.syncLocalBotsWithJoyland(bots);

    globalCache.set(cacheKey, syncedBots);
    return syncedBots;
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

    const worlds = await WorldService.getWorlds();
    const promises = worlds.map(w => this.getBotsForWorld(w));
    const nested = await Promise.all(promises);
    const flatBots = nested.flat();

    globalCache.set('all_bots_global', flatBots);
    return flatBots;
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

  static async syncLocalBotsWithJoyland(bots) {
    const joylandBots = await this.getJoylandBots();
    if (!joylandBots || joylandBots.length === 0) return bots;

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
          }
        }
      }
    });
    return bots;
  }
}
export default BotService;
