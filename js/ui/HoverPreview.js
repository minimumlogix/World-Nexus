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
    this.isPreloaded = false;

    this.init();
  }

  init() {
    this.slideshowContainer = this.card.querySelector('.card-slideshow-layer');
    if (!this.slideshowContainer) return;

    // Attach hover transitions
    this.card.addEventListener('mouseenter', () => this.start());
    this.card.addEventListener('mouseleave', () => this.stop());

    // Asynchronously preload assets during browser idle times
    Animation.runOnIdle(() => this.preloadFirstThree());
  }

  /**
   * Preload the first three preview images to ensure smooth hover transition.
   */
  preloadFirstThree() {
    if (this.isPreloaded || this.images.length === 0) return;

    // Trigger parallel network preloads for the first 3 images
    this.images.slice(0, 3).forEach(src => {
      const preloadLink = new Image();
      preloadLink.src = src;
    });

    // Populate slideshow container DOM nodes
    this.images.forEach((src, idx) => {
      const slide = document.createElement('img');
      slide.className = 'slideshow-img';
      slide.dataset.src = src;

      if (idx === 0) {
        // First slide loads immediately
        slide.src = src;
        slide.classList.add('active');
      }

      this.slideshowContainer.appendChild(slide);
      this.slideElements.push(slide);
    });

    this.isPreloaded = true;
  }

  /**
   * Begins rotating previews on mouseenter.
   */
  start() {
    if (!this.isPreloaded) {
      this.preloadFirstThree();
    }

    // Force resolve lazy image attributes
    this.slideElements.forEach(img => {
      if (!img.src && img.dataset.src) {
        img.src = img.dataset.src;
      }
    });

    this.stop(); // Clear active interval triggers
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
