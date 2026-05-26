/* js/services/WorldService.js */
import { globalCache } from '../core/Cache.js';

export class WorldService {
  /**
   * Fetches global settings from config.json.
   * @returns {Promise<Object>}
   */
  static async getConfig() {
    const cached = globalCache.get('global_config');
    if (cached) return cached;

    try {
      const response = await fetch('data/config.json');
      if (!response.ok) throw new Error('Failed to load global config');
      const data = await response.json();
      globalCache.set('global_config', data);
      return data;
    } catch (err) {
      console.error('WorldService.getConfig error:', err);
      return { siteName: 'World Nexus', tagline: 'Index of Realities', globalStats: { worldsCount: 0, botsCount: 0 } };
    }
  }

  /**
   * Fetches and aggregates details of all registered worlds from registry.
   * Runs queries concurrently.
   * @returns {Promise<Array<Object>>}
   */
  static async getWorlds() {
    const cached = globalCache.get('all_worlds');
    if (cached) return cached;

    try {
      let worldsRefList = [];

      // 1. Try dynamic directory listing of the 'Worlds/' folder first (works on local development server)
      try {
        const listResponse = await fetch('Worlds/');
        if (listResponse.ok && listResponse.headers.get('content-type')?.includes('text/html')) {
          const html = await listResponse.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const links = Array.from(doc.querySelectorAll('a'));
          
          worldsRefList = links
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
            .filter(name => name && !name.startsWith('.') && !name.includes('.') && name.toLowerCase() !== 'worlds')
            .map(name => ({
              id: name.toLowerCase(),
              path: `Worlds/${name}`
            }));
        }
      } catch (dirErr) {
        console.warn('Dynamic directory listing of Worlds/ unavailable, falling back to worlds.json:', dirErr);
      }

      // 2. Fall back to worlds.json registry if dynamic discovery is unavailable or yielded nothing
      if (worldsRefList.length === 0) {
        const registryResponse = await fetch('data/worlds.json');
        if (!registryResponse.ok) throw new Error('Failed to fetch worlds registry fallback');
        const registry = await registryResponse.json();
        worldsRefList = registry.worlds;
      }

      // Resolve individual world configurations concurrently
      const worldPromises = worldsRefList.map(async (worldRef) => {
        try {
          const detailResponse = await fetch(`${worldRef.path}/world.json`);
          if (!detailResponse.ok) throw new Error(`Could not load world meta at ${worldRef.path}`);
          const detail = await detailResponse.json();
          
          // Inject folder path and path normalization variables
          detail.path = worldRef.path;
          return detail;
        } catch (err) {
          console.error(`Error fetching individual world metadata for "${worldRef.id}":`, err);
          return null;
        }
      });

      const worlds = (await Promise.all(worldPromises)).filter(w => w !== null);
      globalCache.set('all_worlds', worlds);
      return worlds;
    } catch (err) {
      console.error('WorldService.getWorlds error:', err);
      return [];
    }
  }

  /**
   * Resolves a world configuration by ID.
   * @param {string} id - World unique identifier
   * @returns {Promise<Object|null>}
   */
  static async getWorld(id) {
    const worlds = await this.getWorlds();
    return worlds.find(w => w.id === id) || null;
  }
}
export default WorldService;
