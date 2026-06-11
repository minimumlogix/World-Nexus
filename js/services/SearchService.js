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
        w.searchIndexContent ? w.searchIndexContent.includes(q) : (
          w.title.toLowerCase().includes(q) ||
          w.description.toLowerCase().includes(q) ||
          (w.genres && w.genres.some(g => g.toLowerCase().includes(q)))
        )
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
        b.searchIndexContent ? b.searchIndexContent.includes(q) : (
          b.name.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q) ||
          (b.genres && b.genres.some(g => g.toLowerCase().includes(q)))
        )
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

  /**
   * Initializes and pre-fetches extra world/bot text data to populate searchIndexContent.
   * Runs as a background task during application bootstrap.
   */
  static async initSearchIndex() {
    if (this._indexingPromise) return this._indexingPromise;

    this._indexingPromise = (async () => {
      try {
        const { WorldService } = await import('./WorldService.js');
        const { BotService } = await import('./BotService.js');

        const worlds = await WorldService.getWorlds();
        const bots = await BotService.getAllBots();

        // Index worlds
        const worldPromises = worlds.map(async (w) => {
          let extraText = '';

          // 1. Fetch main lore.md
          if (w.lore) {
            try {
              const res = await fetch(`${w.path}/${w.lore}`);
              if (res.ok) {
                const text = await res.text();
                extraText += ' ' + text;
              }
            } catch (e) {
              console.warn(`Failed to pre-fetch lore for world ${w.id}:`, e);
            }
          }

          // 2. Fetch library.json
          let libraryData = null;
          try {
            const res = await fetch(`${w.path}/library.json`);
            if (res.ok) {
              libraryData = await res.json();
              for (const term in libraryData) {
                extraText += ' ' + term + ' ' + (libraryData[term].definition || '');
              }
            }
          } catch (e) {
            console.warn(`Failed to pre-fetch library for world ${w.id}:`, e);
          }

          // 3. Fetch subpages
          if (libraryData) {
            const subpagePromises = Object.values(libraryData)
              .filter(item => item.subpage)
              .map(async (item) => {
                try {
                  const res = await fetch(`${w.path}/${item.subpage}`);
                  if (res.ok) {
                    const text = await res.text();
                    extraText += ' ' + text;
                  }
                } catch (e) {
                  console.warn(`Failed to pre-fetch subpage ${item.subpage} for world ${w.id}:`, e);
                }
              });
            await Promise.all(subpagePromises);
          }

          w.searchIndexContent = [
            w.title || '',
            w.description || '',
            (w.genres || []).join(' '),
            extraText
          ].join(' ').toLowerCase();
        });

        // Index bots
        const botPromises = bots.map(async (b) => {
          let extraText = '';

          const world = worlds.find(w => w.id === b.worldId);
          const worldPath = world ? world.path : '';

          if (worldPath) {
            if (b.lore) {
              try {
                const res = await fetch(`${worldPath}/${b.lore}`);
                if (res.ok) {
                  const text = await res.text();
                  extraText += ' ' + text;
                }
              } catch (e) {
                console.warn(`Failed to pre-fetch lore for bot ${b.id}:`, e);
              }
            }

            if (b.scenario) {
              try {
                const res = await fetch(`${worldPath}/${b.scenario}`);
                if (res.ok) {
                  const text = await res.text();
                  extraText += ' ' + text;
                }
              } catch (e) {
                console.warn(`Failed to pre-fetch scenario for bot ${b.id}:`, e);
              }
            }
          }

          b.searchIndexContent = [
            b.name || '',
            b.description || '',
            (b.genres || []).join(' '),
            (b.tags || []).join(' '),
            b.category || '',
            b.metadata?.character || '',
            b.metadata?.timeline || '',
            extraText
          ].join(' ').toLowerCase();
        });

        await Promise.all([...worldPromises, ...botPromises]);

        // Copy indexed content to Joyland bots cache if they exist
        const joylandBots = await BotService.getJoylandBots();
        if (joylandBots && joylandBots.length > 0) {
          joylandBots.forEach(jb => {
            const matchedLocal = bots.find(lb => lb.id === jb.id);
            if (matchedLocal) {
              jb.searchIndexContent = matchedLocal.searchIndexContent;
            }
          });
        }

        // Notify app that search indexing has finished
        const { globalEventBus } = await import('../core/EventBus.js');
        globalEventBus.emit('search:indexed');
      } catch (err) {
        console.error('[SearchService] Error initializing search index:', err);
      }
    })();

    return this._indexingPromise;
  }
}
export default SearchService;
