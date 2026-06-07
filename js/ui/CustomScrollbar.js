/* js/ui/CustomScrollbar.js */

export class CustomScrollbar {
  constructor() {
    this.overlay = null;
    this.thumb = null;
    this.isDragging = false;
    this.dragStartOffset = 0;
    this.fadeTimeout = null;
    this.isHovered = false;
    this.scrollTicking = false;
    this.resizeTicking = false;

    // Track padding from screen edges
    this.trackPadding = 20;

    // Bind event handlers
    this.handleScroll = this.handleScroll.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleDragStart = this.handleDragStart.bind(this);
    this.handleDrag = this.handleDrag.bind(this);
    this.handleDragEnd = this.handleDragEnd.bind(this);
    
    this.init();
  }

  init() {
    // 1. Inject scrollbar styles
    this.injectStyles();

    // 2. Create elements
    this.overlay = document.createElement('div');
    this.overlay.className = 'custom-scrollbar-overlay';

    this.thumb = document.createElement('div');
    this.thumb.className = 'custom-scrollbar-thumb';

    this.overlay.appendChild(this.thumb);
    document.body.appendChild(this.overlay);

    // 3. Bind listeners
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    window.addEventListener('resize', this.handleResize, { passive: true });

    // Hover listeners
    this.overlay.addEventListener('mouseenter', () => {
      this.isHovered = true;
      this.showThumb();
    });
    this.overlay.addEventListener('mouseleave', () => {
      this.isHovered = false;
      this.triggerFadeTimeout();
    });

    // Drag listeners (Mouse)
    this.thumb.addEventListener('mousedown', this.handleDragStart);
    // Drag listeners (Touch)
    this.thumb.addEventListener('touchstart', this.handleDragStart, { passive: false });

    // Initial position update
    this.updatePosition();

    // Set up MutationObserver to update positions on content change
    this.observer = new MutationObserver(() => {
      if (!this.scrollTicking) {
        window.requestAnimationFrame(() => {
          this.updatePosition();
          this.scrollTicking = false;
        });
        this.scrollTicking = true;
      }
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  injectStyles() {
    if (document.getElementById('custom-scrollbar-styles')) return;

    const style = document.createElement('style');
    style.id = 'custom-scrollbar-styles';
    style.textContent = `
      .custom-scrollbar-overlay {
        position: fixed;
        top: var(--header-height, 80px);
        right: 0;
        width: 24px;
        height: calc(100vh - var(--header-height, 80px));
        z-index: 10000;
        pointer-events: auto;
        display: flex;
        justify-content: center;
        user-select: none;
        transition: top var(--transition-normal, 300ms cubic-bezier(0.4, 0, 0.2, 1)), 
                    height var(--transition-normal, 300ms cubic-bezier(0.4, 0, 0.2, 1));
      }

      #main-header.shrunk ~ .custom-scrollbar-overlay {
        top: var(--header-height-shrink, 60px);
        height: calc(100vh - var(--header-height-shrink, 60px));
      }

      .custom-scrollbar-overlay::before {
        content: '';
        position: absolute;
        top: 20px;
        bottom: 20px;
        right: 11px;
        width: 2px;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 1px;
        opacity: 0;
        transition: opacity 0.3s cubic-bezier(0.25, 1, 0.5, 1);
        pointer-events: none;
      }

      .custom-scrollbar-overlay:hover::before {
        opacity: 1;
      }

      .custom-scrollbar-thumb {
        position: absolute;
        right: 8px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: var(--primary-accent, var(--accent-gold, #c5a059));
        box-shadow: 0 0 10px var(--primary-accent-glow, rgba(197, 160, 89, 0.4));
        cursor: pointer;
        opacity: 0;
        top: 0;
        transform: translateY(0) translateY(-50%);
        transition: 
          height 0.25s cubic-bezier(0.25, 1, 0.5, 1),
          border-radius 0.25s cubic-bezier(0.25, 1, 0.5, 1),
          opacity 0.3s ease,
          background-color 0.3s ease,
          box-shadow 0.3s ease;
        will-change: transform, height, border-radius, opacity;
      }

      /* Hover expands dot into a pill */
      .custom-scrollbar-overlay:hover .custom-scrollbar-thumb,
      .custom-scrollbar-thumb.dragging {
        height: 36px;
        border-radius: 4px;
        opacity: 1 !important;
        box-shadow: 0 0 14px var(--primary-accent, var(--accent-gold, #c5a059));
      }

      body.custom-scrollbar-dragging {
        user-select: none !important;
        -webkit-user-select: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  updatePosition() {
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    const scrollableHeight = scrollHeight - clientHeight;

    if (scrollableHeight <= 0) {
      this.overlay.style.display = 'none';
      return;
    }

    this.overlay.style.display = 'flex';

    const scrollTop = window.scrollY;
    const ratio = scrollTop / scrollableHeight;
    
    const overlayRect = this.overlay.getBoundingClientRect();
    const trackHeight = overlayRect.height - this.trackPadding * 2;
    const centerY = this.trackPadding + ratio * trackHeight;

    // Use transform to prevent layout recalculation
    this.thumb.style.transform = `translateY(${centerY}px) translateY(-50%)`;
  }

  showThumb() {
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }
    this.thumb.style.opacity = '1';
  }

  triggerFadeTimeout() {
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
    }
    
    // Auto-hide after 1.5 seconds if not hovered and not dragging
    this.fadeTimeout = setTimeout(() => {
      if (!this.isHovered && !this.isDragging) {
        this.thumb.style.opacity = '0';
      }
    }, 1500);
  }

  handleScroll() {
    this.showThumb();
    if (!this.scrollTicking) {
      window.requestAnimationFrame(() => {
        this.updatePosition();
        this.scrollTicking = false;
      });
      this.scrollTicking = true;
    }
    if (!this.isHovered && !this.isDragging) {
      this.triggerFadeTimeout();
    }
  }

  handleResize() {
    if (!this.resizeTicking) {
      window.requestAnimationFrame(() => {
        this.updatePosition();
        this.resizeTicking = false;
      });
      this.resizeTicking = true;
    }
  }

  handleDragStart(e) {
    e.preventDefault();
    this.isDragging = true;
    this.thumb.classList.add('dragging');
    document.body.classList.add('custom-scrollbar-dragging');
    this.showThumb();

    // Handle touch/mouse position
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const thumbRect = this.thumb.getBoundingClientRect();
    const thumbCenter = thumbRect.top + thumbRect.height / 2;
    
    // Remember where the user clicked relative to the center of the thumb
    this.dragStartOffset = clientY - thumbCenter;

    // Attach global listeners for dragging
    if (e.touches) {
      window.addEventListener('touchmove', this.handleDrag, { passive: false });
      window.addEventListener('touchend', this.handleDragEnd);
      window.addEventListener('touchcancel', this.handleDragEnd);
    } else {
      window.addEventListener('mousemove', this.handleDrag);
      window.addEventListener('mouseup', this.handleDragEnd);
    }
  }

  handleDrag(e) {
    if (!this.isDragging) return;
    
    // Prevent default touch scrolling behavior during drag
    if (e.cancelable) e.preventDefault();

    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const clientHeight = window.innerHeight;
    const scrollHeight = document.documentElement.scrollHeight;
    const scrollableHeight = scrollHeight - clientHeight;
    
    const overlayRect = this.overlay.getBoundingClientRect();
    const trackHeight = overlayRect.height - this.trackPadding * 2;

    // Calculate drag target relative position
    const relativeY = clientY - this.dragStartOffset - overlayRect.top - this.trackPadding;
    const ratio = relativeY / trackHeight;
    const clampedRatio = Math.max(0, Math.min(1, ratio));

    // Instantly scroll window
    window.scrollTo(0, clampedRatio * scrollableHeight);
  }

  handleDragEnd(e) {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.thumb.classList.remove('dragging');
    document.body.classList.remove('custom-scrollbar-dragging');

    // Remove global listeners
    window.removeEventListener('mousemove', this.handleDrag);
    window.removeEventListener('mouseup', this.handleDragEnd);
    window.removeEventListener('touchmove', this.handleDrag);
    window.removeEventListener('touchend', this.handleDragEnd);
    window.removeEventListener('touchcancel', this.handleDragEnd);

    if (!this.isHovered) {
      this.triggerFadeTimeout();
    }
  }

  destroy() {
    if (this.overlay) {
      this.overlay.remove();
    }
    if (this.observer) {
      this.observer.disconnect();
    }
    const style = document.getElementById('custom-scrollbar-styles');
    if (style) {
      style.remove();
    }
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleResize);
  }
}
export default CustomScrollbar;
