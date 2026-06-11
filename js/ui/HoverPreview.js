/* js/ui/HoverPreview.js */
import { Animation } from '../utils/Animation.js';

export class HoverPreview {
  /**
   * Slideshow controller for card previews.
   * @param {HTMLElement} cardElement - Parent card element
   * @param {Array<string>} imageUrls - Slide URLs relative to project root
   */
  constructor(cardElement, imageUrls = []) {
    this.card = cardElement;
    this.images = imageUrls;
    this.timer = null;
    this.currentIndex = 0;
    this.slideshowContainer = null;
    this.slideElements = [];
    this.isBuilt = false;       // DOM nodes created
    this.isPreloaded = false;   // Network fetches triggered

    this.init();
  }

  init() {
    if (this.images.length === 0) return;

    this.slideshowContainer = this.card.querySelector('.card-slideshow-layer');
    if (!this.slideshowContainer) return;

    // Attach hover transitions
    this.card.addEventListener('mouseenter', () => this.start());
    this.card.addEventListener('mouseleave', () => this.stop());

    // Schedule DOM node creation during idle time, but don't preload images yet.
    // Images will only be fetched when the user actually hovers.
    Animation.runOnIdle(() => this._buildSlideDOMNodes());
  }

  /**
   * Creates the placeholder <img> DOM nodes (no network fetch yet).
   * Only sets data-src so they're ready when the user hovers.
   * @private
   */
  _buildSlideDOMNodes() {
    if (this.isBuilt || !this.slideshowContainer) return;

    this.images.forEach((src, idx) => {
      const slide = document.createElement('img');
      slide.className = 'slideshow-img';
      slide.alt = '';
      slide.decoding = 'async'; // Non-blocking image decode

      if (idx === 0) {
        // First slide: still defer src — we set it on first hover
        slide.dataset.src = src;
      } else {
        slide.dataset.src = src;
      }

      this.slideshowContainer.appendChild(slide);
      this.slideElements.push(slide);
    });

    this.isBuilt = true;
  }

  /**
   * Triggers network fetches for the first 3 preview images.
   * Called only on first hover to prevent wasteful preloading.
   * @private
   */
  _preloadOnHover() {
    if (this.isPreloaded || !this.isBuilt) return;

    // Load first slide immediately (sync src swap for zero-flicker)
    const firstSlide = this.slideElements[0];
    if (firstSlide && firstSlide.dataset.src) {
      firstSlide.src = firstSlide.dataset.src;
      delete firstSlide.dataset.src;
      firstSlide.classList.add('active');
    }

    // Preload next 2 slides in background with Image() objects (no DOM)
    this.images.slice(1, 3).forEach(src => {
      const preloader = new Image();
      preloader.decoding = 'async';
      preloader.src = src;
    });

    this.isPreloaded = true;
  }

  /**
   * Begins rotating previews on mouseenter.
   */
  start() {
    // Build DOM nodes if idle callback hasn't run yet
    if (!this.isBuilt) {
      this._buildSlideDOMNodes();
    }

    // Trigger first-hover image loads
    this._preloadOnHover();

    // Resolve any remaining lazy slide srcs on hover
    this.slideElements.forEach(img => {
      if (img.dataset.src && !img.src) {
        img.src = img.dataset.src;
        delete img.dataset.src;
      }
    });

    this.stop(); // Clear any existing interval
    this.currentIndex = 0;

    if (this.slideElements.length <= 1) return;

    // Rotate slides every 2 seconds
    this.timer = setInterval(() => {
      this.rotateSlide();
    }, 2000);
  }

  rotateSlide() {
    if (this.slideElements.length === 0) return;

    const previousSlide = this.slideElements[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.slideElements.length;
    const nextSlide = this.slideElements[this.currentIndex];

    // Load next slide on demand if not yet fetched
    if (nextSlide && nextSlide.dataset.src) {
      nextSlide.src = nextSlide.dataset.src;
      delete nextSlide.dataset.src;
    }

    if (previousSlide) previousSlide.classList.remove('active');
    if (nextSlide) nextSlide.classList.add('active');
  }

  /**
   * Pauses rotation on mouseleave.
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // Restore index 0 active class
    this.slideElements.forEach((img, idx) => {
      if (idx === 0) {
        img.classList.add('active');
      } else {
        img.classList.remove('active');
      }
    });
    
    this.currentIndex = 0;
  }
}
export default HoverPreview;
