/* js/services/ToolService.js */
import { globalCache } from '../core/Cache.js';

export class ToolService {
  /**
   * Fetches and caches all tools from data/tools.json.
   * @returns {Promise<Array<Object>>}
   */
  static async getTools() {
    const cached = globalCache.get('all_tools');
    if (cached) return cached;

    try {
      const response = await fetch('data/tools.json');
      if (!response.ok) throw new Error('Failed to fetch tools registry');
      const data = await response.json();
      const tools = data.tools || [];
      globalCache.set('all_tools', tools);
      return tools;
    } catch (err) {
      console.error('ToolService.getTools error:', err);
      return [];
    }
  }
}
export default ToolService;
