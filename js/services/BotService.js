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

    globalCache.set(cacheKey, bots);
    return bots;
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
}
export default BotService;
