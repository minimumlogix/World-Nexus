/* js/ui/LazyLoader.js */

export class LazyLoader {
  constructor() {
    // Check support for IntersectionObserver
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: '120px 0px', // Preload images slightly before scrolling into view
        threshold: 0.01
      });
    } else {
      this.observer = null;
    }
  }

  /**
   * Registers an image element for intersection monitoring.
   * @param {HTMLImageElement} img - Image node
   */
  observe(img) {
    if (this.observer) {
      this.observer.observe(img);
    } else {
      // Fallback if not supported
      this.loadImage(img);
    }
  }

  /**
   * Resolves the datapath to source link and fades in.
   * @param {HTMLImageElement} img
   */
  loadImage(img) {
    const targetSrc = img.getAttribute('data-src');
    if (!targetSrc) return;

    // Apply shimmer or loading class
    img.classList.add('loading-fade');

    img.src = targetSrc;
    img.removeAttribute('data-src');

    img.onload = () => {
      img.classList.remove('loading-fade');
      img.classList.add('fade-in-loaded');
    };

    img.onerror = () => {
      img.classList.remove('loading-fade');
      // Set to fallback gradient canvas or inline base64 if load fails
      img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23161b24"/><text x="50" y="55" fill="%238b949e" font-family="sans-serif" font-size="10" text-anchor="middle">Loading...</text></svg>';
    };
  }
}

export const lazyLoader = new LazyLoader();
export default lazyLoader;
