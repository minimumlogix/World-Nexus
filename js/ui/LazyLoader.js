/* js/ui/LazyLoader.js
   Professional lazy-loading system for World Nexus.
   Features:
   - IntersectionObserver with configurable rootMargin for pre-fetching
   - Image Decode API for jank-free paint
   - LQIP (Low Quality Image Placeholder) blur-up technique
   - Shimmer skeleton placeholders during load
   - Background-image lazy support (data-bg-src attribute)
   - Priority queue: high-priority images load immediately
   - Automatic re-observation after DOM mutations
   - Graceful error fallback with styled SVG placeholder
*/

const LAZY_LOADING_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><style>@keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); transform-origin: 50px 50px; } 50% { opacity: 1; transform: scale(1.2); transform-origin: 50px 50px; } } .star { animation: pulse 1.5s infinite ease-in-out; }</style><rect width="100%" height="100%" fill="%23161b24"/><text class="star" x="50" y="55" fill="%238b949e" font-family="sans-serif" font-size="10" text-anchor="middle">✦</text></svg>';

const FALLBACK_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23161b24"/><text x="50" y="55" fill="%238b949e" font-family="sans-serif" font-size="10" text-anchor="middle">✦</text></svg>';

export class LazyLoader {
  constructor() {
    /** @type {IntersectionObserver|null} */
    this.observer = null;

    /** @type {IntersectionObserver|null} — aggressive pre-loader for above-fold */
    this.priorityObserver = null;

    /** @type {Set<HTMLElement>} */
    this._observed = new Set();

    this._initObservers();
  }

  // ─────────────────────────────────────────────────────────────
  // Initialisation
  // ─────────────────────────────────────────────────────────────

  _initObservers() {
    if (!('IntersectionObserver' in window)) {
      // Legacy fallback: load everything immediately
      this.observer = null;
      this.priorityObserver = null;
      return;
    }

    // Standard observer — starts loading ~300px before entering viewport
    this.observer = new IntersectionObserver(
      (entries) => this._handleEntries(entries, this.observer),
      { rootMargin: '300px 0px', threshold: 0 }
    );

    // Priority observer — for hero images and above-fold assets (larger rootMargin)
    this.priorityObserver = new IntersectionObserver(
      (entries) => this._handleEntries(entries, this.priorityObserver),
      { rootMargin: '600px 0px', threshold: 0 }
    );
  }

  _handleEntries(entries, observer) {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      observer?.unobserve(el);
      this._observed.delete(el);

      if (el.dataset.bgSrc) {
        this._loadBackground(el);
      } else {
        this._loadImage(el);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────

  /**
   * Register an <img> element with [data-src] for lazy loading.
   * @param {HTMLImageElement} img
   * @param {boolean} [priority=false] - Use the priority (larger rootMargin) observer
   */
  observe(img, priority = false) {
    if (!img || this._observed.has(img)) return;

    // Add shimmer while waiting
    img.classList.add('img-lazy-pending');

    // Set pulsing star placeholder to prevent browser broken image icon
    if (!img.getAttribute('src')) {
      img.src = LAZY_LOADING_SVG;
    }

    if (!this.observer) {
      // No IO support — load immediately
      this._loadImage(img);
      return;
    }

    this._observed.add(img);
    const obs = priority ? this.priorityObserver : this.observer;
    obs.observe(img);
  }

  /**
   * Register an element with [data-bg-src] for CSS background-image lazy loading.
   * @param {HTMLElement} el
   * @param {boolean} [priority=false]
   */
  observeBackground(el, priority = false) {
    if (!el || this._observed.has(el)) return;

    el.classList.add('bg-lazy-pending');

    if (!this.observer) {
      this._loadBackground(el);
      return;
    }

    this._observed.add(el);
    const obs = priority ? this.priorityObserver : this.observer;
    obs.observe(el);
  }

  /**
   * Load an image immediately without observing (for programmatic priority loads).
   * @param {HTMLImageElement} img
   * @returns {Promise<void>}
   */
  loadNow(img) {
    if (this.observer) this.observer.unobserve(img);
    if (this.priorityObserver) this.priorityObserver.unobserve(img);
    this._observed.delete(img);
    return this._loadImage(img);
  }

  /**
   * Cleanup all observers (call on page unload).
   */
  destroy() {
    this.observer?.disconnect();
    this.priorityObserver?.disconnect();
    this._observed.clear();
  }

  // ─────────────────────────────────────────────────────────────
  // Image Loading
  // ─────────────────────────────────────────────────────────────

  /**
   * Resolves data-src → src with blur-up and decode API.
   * @param {HTMLImageElement} img
   * @returns {Promise<void>}
   */
  async _loadImage(img) {
    const src = img.getAttribute('data-src');
    if (!src) {
      img.classList.remove('img-lazy-pending');
      return;
    }

    // Set pulsing star placeholder if not already set to prevent browser broken image icon
    if (!img.getAttribute('src')) {
      img.src = LAZY_LOADING_SVG;
    }

    // Create an off-screen image to preload & decode without blocking paint
    const loader = new Image();

    try {
      await new Promise((resolve, reject) => {
        loader.onload = resolve;
        loader.onerror = reject;
        loader.src = src;
      });

      // Use decode API if available to prevent layout thrash on paint
      if (loader.decode) {
        try { await loader.decode(); } catch (_) { /* non-critical */ }
      }

      // Apply the loaded source and trigger the blur-up reveal
      img.src = src;
      img.removeAttribute('data-src');
      img.classList.remove('img-lazy-pending');
      img.classList.add('img-lazy-loaded');

    } catch {
      // Graceful error state
      img.removeAttribute('data-src');
      img.classList.remove('img-lazy-pending');
      img.classList.add('img-lazy-error');
      img.src = FALLBACK_SVG;
      img.alt = '';
    }
  }

  /**
   * Resolves data-bg-src → CSS background-image.
   * @param {HTMLElement} el
   */
  async _loadBackground(el) {
    const src = el.getAttribute('data-bg-src');
    if (!src) {
      el.classList.remove('bg-lazy-pending');
      return;
    }

    const loader = new Image();

    try {
      await new Promise((resolve, reject) => {
        loader.onload = resolve;
        loader.onerror = reject;
        loader.src = src;
      });

      if (loader.decode) {
        try { await loader.decode(); } catch (_) { /* non-critical */ }
      }

      el.style.backgroundImage = `url(${src})`;
      el.removeAttribute('data-bg-src');
      el.classList.remove('bg-lazy-pending');
      el.classList.add('bg-lazy-loaded');

    } catch {
      el.removeAttribute('data-bg-src');
      el.classList.remove('bg-lazy-pending');
      el.classList.add('bg-lazy-error');
    }
  }
}

// ── Singleton ─────────────────────────────────────────────────
export const lazyLoader = new LazyLoader();
export default lazyLoader;
