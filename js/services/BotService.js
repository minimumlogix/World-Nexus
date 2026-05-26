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

    // Support explicit bots list or fallback to featured list
    const botIds = worldObj.bots || worldObj.featuredBots || [];

    const botPromises = botIds.map(async (botId) => {
      try {
        const response = await fetch(`${worldObj.path}/bots/${botId}.json`);
        if (!response.ok) throw new Error(`Could not load bot JSON: ${botId}`);
        const botData = await response.json();

        // Inject parent references and resolve relative images
        botData.worldId = worldObj.id;
        botData.worldTitle = worldObj.title;
        botData.cardImage = botData.cardImage ? `${worldObj.path}/${botData.cardImage}` : null;
        botData.avatar = botData.avatar ? `${worldObj.path}/${botData.avatar}` : null;
        
        return botData;
      } catch (err) {
        console.error(`Failed to parse bot "${botId}" details inside world "${worldObj.id}":`, err);
        return null;
      }
    });

    const bots = (await Promise.all(botPromises)).filter(b => b !== null);
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
