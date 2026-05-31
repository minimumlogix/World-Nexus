/* js/ui/Lightbox.js */
import { DOM } from '../utils/DOM.js';

export class Lightbox {
  static init() {
    if (this.initialized) return;
    this.initialized = true;

    // Create modal elements
    this.overlay = DOM.el('div', { class: 'lightbox-overlay' });
    this.closeBtn = DOM.el('button', { class: 'lightbox-close', 'aria-label': 'Close image' }, '×');
    this.image = DOM.el('img', { class: 'lightbox-image', alt: 'Expanded view' });
    
    this.overlay.appendChild(this.closeBtn);
    this.overlay.appendChild(this.image);
    document.body.appendChild(this.overlay);

    // Bind events
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay || e.target === this.closeBtn) {
        this.close();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay.classList.contains('active')) {
        this.close();
      }
    });

    // Global click listener for images
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (target.tagName === 'IMG' && (
          target.classList.contains('lore-image') || 
          target.classList.contains('bot-bg-image') ||
          target.closest('.bot-gallery')
      )) {
        e.preventDefault();
        this.open(target.src, target.alt);
      }
    });
  }

  static open(src, alt = '') {
    if (!this.initialized) this.init();
    
    this.image.src = src;
    this.image.alt = alt;
    this.overlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  static close() {
    this.overlay.classList.remove('active');
    document.body.style.overflow = '';
    // Optional: clear src after animation finishes to free memory
    setTimeout(() => {
      if (!this.overlay.classList.contains('active')) {
        this.image.src = '';
      }
    }, 300);
  }
}

export default Lightbox;
