/* js/services/SearchService.js */

export class SearchService {
  /**
   * Filters and sorts a list of worlds based on search query, genres, and sort criteria.
   * @param {Array<Object>} worlds - Worlds dataset
   * @param {Object} criteria - Filter criteria
   * @param {string} criteria.query - Search text
   * @param {Array<string>} criteria.genres - Selected genre tags
   * @param {string} criteria.sortBy - Sort order
   * @returns {Array<Object>}
   */
  static filterWorlds(worlds, { query = '', genres = [], sortBy = 'featured' } = {}) {
    let results = [...worlds];

    // 1. Text Search matching title, description, and genres
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(w => 
        w.title.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        (w.genres && w.genres.some(g => g.toLowerCase().includes(q)))
      );
    }

    // 2. Multi-select Genre Tags AND filtering (must match all selected genres)
    if (genres && genres.length > 0) {
      results = results.filter(w => 
        genres.every(g => w.genres && w.genres.map(x => x.toLowerCase()).includes(g.toLowerCase()))
      );
    }

    // 3. Sorting
    results.sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        case 'popular':
          // Sort by botCount descending
          return (b.botCount || 0) - (a.botCount || 0);
        case 'featured':
        default:
          // Keep registry definition order
          return 0;
      }
    });

    return results;
  }

  /**
   * Filters and sorts a list of bots based on search query, genres, status, and sorting order.
   * @param {Array<Object>} bots - Bots dataset
   * @param {Object} criteria - Filter criteria
   * @param {string} criteria.query - Search text
   * @param {Array<string>} criteria.genres - Selected genres
   * @param {string} criteria.status - Filter by public/private status
   * @param {string} criteria.sortBy - Sort order
   * @returns {Array<Object>}
   */
  static filterBots(bots, { query = '', genres = [], status = '', sortBy = 'featured' } = {}) {
    let results = [...bots];

    // 1. Text Search matching name, description, and genres
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(b => 
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        (b.genres && b.genres.some(g => g.toLowerCase().includes(q)))
      );
    }

    // 2. Multi-select Genre Tags AND matching
    if (genres && genres.length > 0) {
      results = results.filter(b => 
        genres.every(g => b.genres && b.genres.map(x => x.toLowerCase()).includes(g.toLowerCase()))
      );
    }

    // 3. Filter by Status
    if (status) {
      results = results.filter(b => b.status === status);
    }

    // 4. Sorting
    results.sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        case 'newest':
          // Sort by date added if present, otherwise by ID
          const aTime = a.dateAdded ? new Date(a.dateAdded).getTime() : 0;
          const bTime = b.dateAdded ? new Date(b.dateAdded).getTime() : 0;
          return bTime - aTime;
        case 'popular':
          // Sort by favorites count, views, or fallback
          const aFav = a.featured ? 100 : 10;
          const bFav = b.featured ? 100 : 10;
          return bFav - aFav;
        case 'featured':
        default:
          const aFeat = a.featured ? 1 : 0;
          const bFeat = b.featured ? 1 : 0;
          return bFeat - aFeat;
      }
    });

    return results;
  }
}
export default SearchService;
