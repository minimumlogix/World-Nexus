/* js/core/PreloadRegistry.js */

class PreloadRegistry {
  constructor() {
    this.metadata = null;
    this.markdownFiles = new Map();
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    // 1. Read metadata block
    const metaTag = document.getElementById('preloaded-world-data');
    if (metaTag) {
      try {
        this.metadata = JSON.parse(metaTag.textContent);
      } catch (err) {
        console.error('Failed to parse preloaded-world-data:', err);
      }
    }

    // 2. Read all text/markdown script tags
    const markdownTags = document.querySelectorAll('script[type="text/markdown"]');
    markdownTags.forEach(tag => {
      const path = tag.getAttribute('data-path');
      if (path) {
        const normalizedPath = this.normalizePath(path);
        this.markdownFiles.set(normalizedPath, tag.textContent);
      }
    });
  }

  normalizePath(p) {
    if (!p) return '';
    return p.replace(/\\/g, '/').replace(/^\/+/, '').trim();
  }

  getPreloadedWorld(worldId) {
    this.init();
    if (this.metadata && this.metadata.worldId === worldId) {
      return this.metadata.worldConfig;
    }
    return null;
  }

  getPreloadedBots(worldId) {
    this.init();
    if (this.metadata && this.metadata.worldId === worldId) {
      return this.metadata.bots;
    }
    return null;
  }

  getPreloadedMarkdown(url) {
    this.init();
    const normalizedUrl = this.normalizePath(url);
    if (this.markdownFiles.has(normalizedUrl)) {
      return this.markdownFiles.get(normalizedUrl);
    }
    return null;
  }
}

export const preloadRegistry = new PreloadRegistry();
export default preloadRegistry;
