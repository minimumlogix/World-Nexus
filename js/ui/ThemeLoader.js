/* js/ui/ThemeLoader.js */

export class ThemeLoader {
  /**
   * Loads a world-specific stylesheet, scope-replaces declarations, and appends it to head.
   * @param {string} worldId - World identifier
   * @param {string} themeUrl - Style sheet location path
   */
  static async loadWorldTheme(worldId, themeUrl) {
    this.unloadWorldTheme();

    try {
      const response = await fetch(themeUrl);
      if (!response.ok) throw new Error(`HTTP status ${response.status}`);
      const rawCss = await response.text();

      // Scoping wrapper to avoid global variables leaks
      const worldClass = `world-theme-${worldId}`;
      
      // 1. Map :root variables to the specific world class container
      let scopedCss = rawCss.replace(/:root/g, `.${worldClass}`);
      
      // 2. Scope generic .world-theme rules to .world-theme-[worldId]
      scopedCss = scopedCss.replace(/\.world-theme/g, `.${worldClass}`);

      // 3. Inject CSS style tag
      const styleElement = document.createElement('style');
      styleElement.id = 'dynamic-world-theme-styles';
      styleElement.textContent = scopedCss;
      document.head.appendChild(styleElement);

      // 4. Attach scoped classes on body
      document.body.classList.add('world-theme', worldClass);
      document.body.dataset.activeWorldTheme = worldId;
      
    } catch (err) {
      console.error(`ThemeLoader.loadWorldTheme error for world "${worldId}":`, err);
    }
  }

  /**
   * Removes active world themes, resetting body configurations back to default.
   */
  static unloadWorldTheme() {
    const styleElement = document.getElementById('dynamic-world-theme-styles');
    if (styleElement) {
      styleElement.remove();
    }

    // Filter out world-theme related classes on body
    const cleanClasses = Array.from(document.body.classList)
      .filter(c => c !== 'world-theme' && !c.startsWith('world-theme-'));
    
    document.body.className = '';
    cleanClasses.forEach(c => document.body.classList.add(c));
    
    delete document.body.dataset.activeWorldTheme;
  }
}
export default ThemeLoader;
