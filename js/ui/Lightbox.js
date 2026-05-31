/* js/ui/Lightbox.js */
import { DOM } from '../utils/DOM.js';

export class Lightbox {
  static init() {
    if (this.initialized) return;
    this.initialized = true;

    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.initialPinchDistance = null;
    this.initialScale = 1;

    // Create modal elements
    this.overlay = DOM.el('div', { class: 'lightbox-overlay' });
    this.closeBtn = DOM.el('button', { class: 'lightbox-close', 'aria-label': 'Close image' }, '×');
    this.image = DOM.el('img', { class: 'lightbox-image', alt: 'Expanded view' });
    
    // Prevent default drag behaviors on image
    this.image.draggable = false;
    
    this.overlay.appendChild(this.closeBtn);
    this.overlay.appendChild(this.image);
    document.body.appendChild(this.overlay);

    // Bind basic events
    this.overlay.addEventListener('click', (e) => {
      // Only close if clicking outside the image
      if (e.target === this.overlay || e.target === this.closeBtn) {
        this.close();
      }
    });

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

    // Zoom and Pan Handlers
    this.image.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
    this.image.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    window.addEventListener('pointerup', (e) => this.handlePointerUp(e));
    window.addEventListener('pointercancel', (e) => this.handlePointerUp(e));
    
    // Touch specific handlers for pinch zoom
    this.image.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.image.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.image.addEventListener('touchend', (e) => this.handleTouchEnd(e));
  }

  static applyTransform() {
    this.image.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
  }

  static handleWheel(e) {
    e.preventDefault();
    const zoomSpeed = 0.1;
    const delta = e.deltaY > 0 ? -1 : 1;
    let newScale = this.scale + delta * zoomSpeed;
    
    // Clamp scale
    newScale = Math.max(0.5, Math.min(newScale, 5));
    
    // If returning to 1, reset pan
    if (newScale === 1) {
      this.translateX = 0;
      this.translateY = 0;
    }
    
    this.scale = newScale;
    this.applyTransform();
  }

  static handlePointerDown(e) {
    if (e.pointerType === 'touch') return; // Handled by touch events for better multi-touch support
    e.preventDefault();
    this.isDragging = true;
    this.startX = e.clientX - this.translateX;
    this.startY = e.clientY - this.translateY;
    this.image.style.cursor = 'grabbing';
  }

  static handlePointerMove(e) {
    if (!this.isDragging || e.pointerType === 'touch') return;
    this.translateX = e.clientX - this.startX;
    this.translateY = e.clientY - this.startY;
    this.applyTransform();
  }

  static handlePointerUp(e) {
    if (e.pointerType === 'touch') return;
    this.isDragging = false;
    this.image.style.cursor = 'grab';
  }

  // Multi-touch gestures
  static getDistance(touch1, touch2) {
    return Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
  }

  static handleTouchStart(e) {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.startX = e.touches[0].clientX - this.translateX;
      this.startY = e.touches[0].clientY - this.translateY;
    } else if (e.touches.length === 2) {
      this.isDragging = false;
      this.initialPinchDistance = this.getDistance(e.touches[0], e.touches[1]);
      this.initialScale = this.scale;
    }
  }

  static handleTouchMove(e) {
    e.preventDefault(); // prevent scrolling while interacting with image
    
    if (this.isDragging && e.touches.length === 1) {
      this.translateX = e.touches[0].clientX - this.startX;
      this.translateY = e.touches[0].clientY - this.startY;
      this.applyTransform();
    } else if (e.touches.length === 2 && this.initialPinchDistance) {
      const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
      const pinchRatio = currentDistance / this.initialPinchDistance;
      let newScale = this.initialScale * pinchRatio;
      
      this.scale = Math.max(0.5, Math.min(newScale, 5));
      this.applyTransform();
    }
  }

  static handleTouchEnd(e) {
    if (e.touches.length < 2) {
      this.initialPinchDistance = null;
    }
    if (e.touches.length === 0) {
      this.isDragging = false;
    } else if (e.touches.length === 1) {
      // Re-anchor single touch drag
      this.isDragging = true;
      this.startX = e.touches[0].clientX - this.translateX;
      this.startY = e.touches[0].clientY - this.translateY;
    }
  }

  static open(src, alt = '') {
    if (!this.initialized) this.init();
    
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.image.style.transform = 'translate(0px, 0px) scale(1)';
    this.image.style.cursor = 'grab';
    
    this.image.src = src;
    this.image.alt = alt;
    this.overlay.classList.add('active');
    document.body.style.overflow = 'hidden'; 
  }

  static close() {
    this.overlay.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (!this.overlay.classList.contains('active')) {
        this.image.src = '';
      }
    }, 300);
  }
}

export default Lightbox;
