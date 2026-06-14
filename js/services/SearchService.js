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
  /**
   * Helper to parse a query string into syntax categories.
   * Supports prefixes: tag:, tags:, character:, characters:, bot:, bots:, creator:, creators:, author:, authors:
   * @param {string} query
   * @returns {Object}
   */
  static parseQuery(query) {
    const terms = {
      tags: [],
      characters: [],
      bots: [],
      creators: [],
      general: []
    };

    if (!query) return terms;

    // Matches tag:scifi, tag:"dark fantasy", creator:"Max Smasher", or simple words like max
    const regex = /(?:(tags?|characters?|bots?|creators?|authors?):)?(?:["']([^"']+)["']|([^\s]+))/gi;
    let match;
    while ((match = regex.exec(query)) !== null) {
      const prefix = match[1] ? match[1].toLowerCase() : null;
      const value = match[2] || match[3];
      if (!value) continue;

      const lowerVal = value.toLowerCase();
      if (prefix) {
        if (prefix.startsWith('tag')) {
          terms.tags.push(lowerVal);
        } else if (prefix.startsWith('character')) {
          terms.characters.push(lowerVal);
        } else if (prefix.startsWith('bot')) {
          terms.bots.push(lowerVal);
        } else if (prefix.startsWith('creator') || prefix.startsWith('author')) {
          terms.creators.push(lowerVal);
        } else {
          terms.general.push(lowerVal);
        }
      } else {
        terms.general.push(lowerVal);
      }
    }

    return terms;
  }

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

    // 1. Text Search matching syntax
    if (query) {
      const parsed = SearchService.parseQuery(query);

      // General query matches title, description, genres, author, etc.
      if (parsed.general.length > 0) {
        results = results.filter(w => {
          const text = w.searchIndexContent || (
            (w.title || '') + ' ' + (w.description || '') + ' ' + (w.genres || []).join(' ') + ' ' + (w.author || '')
          ).toLowerCase();
          return parsed.general.every(term => text.includes(term));
        });
      }

      // Tag filter
      if (parsed.tags.length > 0) {
        results = results.filter(w => {
          const worldGenres = (w.genres || []).map(g => g.toLowerCase());
          return parsed.tags.every(term => worldGenres.some(g => g.includes(term)));
        });
      }

      // Character / Bot filter (worlds containing matching character names in their index)
      if (parsed.characters.length > 0 || parsed.bots.length > 0) {
        results = results.filter(w => {
          const text = (w.searchIndexContent || '').toLowerCase();
          return [...parsed.characters, ...parsed.bots].every(term => text.includes(term));
        });
      }

      // Creator filter
      if (parsed.creators.length > 0) {
        results = results.filter(w => {
          const author = (w.author || '').toLowerCase();
          return parsed.creators.every(term => author.includes(term));
        });
      }
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

    // 1. Text Search matching syntax
    if (query) {
      const parsed = SearchService.parseQuery(query);

      // General query matches name, description, genres, world title, etc.
      if (parsed.general.length > 0) {
        results = results.filter(b => {
          const text = b.searchIndexContent || (
            (b.name || '') + ' ' + (b.description || '') + ' ' + (b.genres || []).join(' ') + ' ' + (b.worldTitle || '')
          ).toLowerCase();
          return parsed.general.every(term => text.includes(term));
        });
      }

      // Tag filter
      if (parsed.tags.length > 0) {
        results = results.filter(b => {
          const botGenres = (b.genres || b.tags || []).map(g => g.toLowerCase());
          return parsed.tags.every(term => botGenres.some(g => g.includes(term)));
        });
      }

      // Character filter (names)
      if (parsed.characters.length > 0) {
        results = results.filter(b => {
          const name = (b.name || '').toLowerCase();
          return parsed.characters.every(term => name.includes(term));
        });
      }

      // Bot filter (names, and must be an active bot with chatEndpoint)
      if (parsed.bots.length > 0) {
        results = results.filter(b => {
          const hasChat = b.chatEndpoint && b.chatEndpoint.trim() !== '' && !b.chatEndpoint.includes('example.com');
          const name = (b.name || '').toLowerCase();
          return hasChat && parsed.bots.every(term => name.includes(term));
        });
      }

      // Creator filter
      if (parsed.creators.length > 0) {
        results = results.filter(b => {
          const creator = (b.creator || b.author || b.worldAuthor || '').toLowerCase();
          return parsed.creators.every(term => creator.includes(term));
        });
      }
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
