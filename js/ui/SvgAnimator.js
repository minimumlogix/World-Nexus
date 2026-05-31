/* js/ui/SvgAnimator.js */
import { Device } from '../utils/Device.js';

export class SvgAnimator {
  /**
   * Binds mouse-parallax interactions to an SVG wrapper.
   * Respects system prefers-reduced-motion triggers.
   * @param {HTMLElement} wrapper - Container hosting the SVG
   * @param {number} [intensity=10] - Travel distance factor
   */
  static initParallax(wrapper, intensity = 10) {
    if (!wrapper || Device.prefersReducedMotion() || Device.isTouchDevice()) return;

    const svg = wrapper.querySelector('svg');
    if (!svg) return;

    // Set perspective on wrapper
    wrapper.style.perspective = '800px';
    svg.style.transition = 'transform 150ms ease-out';
    // Remove preserve-3d to fix stroke-dashoffset animations in Webkit/Blink
    // svg.style.transformStyle = 'preserve-3d';

    wrapper.addEventListener('mousemove', (e) => {
      const rect = wrapper.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      // Map translations
      const transX = (x / rect.width) * intensity;
      const transY = (y / rect.height) * intensity;
      
      // Only translate, no tilt/rotation
      svg.style.transform = `translate3d(${transX}px, ${transY}px, 20px)`;
    });

    wrapper.addEventListener('mouseleave', () => {
      svg.style.transition = 'transform var(--transition-slow)';
      svg.style.transform = 'translate3d(0, 0, 0)';
    });
  }

  static logoObserver = typeof window !== 'undefined' && 'IntersectionObserver' in window 
    ? new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            // If the element has a nested SVG, also propagate in-view class to svg itself
            const svg = entry.target.querySelector('svg') || (entry.target.tagName.toLowerCase() === 'svg' ? entry.target : null);
            if (svg) svg.classList.add('in-view');
          } else {
            entry.target.classList.remove('in-view');
            const svg = entry.target.querySelector('svg') || (entry.target.tagName.toLowerCase() === 'svg' ? entry.target : null);
            if (svg) svg.classList.remove('in-view');
          }
        });
      }, { threshold: 0.05 }) 
    : null;

  /**
   * Registers a logo element to animate when present in viewport.
   * @param {HTMLElement} element - Logo container or SVG node
   */
  static observeVisibility(element) {
    if (this.logoObserver && element) {
      this.logoObserver.observe(element);
    } else if (element) {
      element.classList.add('in-view');
      const svg = element.querySelector('svg') || (element.tagName.toLowerCase() === 'svg' ? element : null);
      if (svg) svg.classList.add('in-view');
    }
  }

  /**
   * Unregisters a logo element from viewport observation.
   * @param {HTMLElement} element
   */
  static unobserveVisibility(element) {
    if (this.logoObserver && element) {
      this.logoObserver.unobserve(element);
    }
  }

  /**
   * Programmatically triggers stroke drawing animation for SVG children.
   * @param {SVGElement} svg - Target SVG
   */
  static triggerDrawAnimation(svg) {
    if (!svg) return;

    const paths = svg.querySelectorAll('.draw-path, path, polygon, circle, line');
    paths.forEach((path, idx) => {
      let length = 0;
      try {
        length = path.getTotalLength ? path.getTotalLength() : 300;
      } catch (e) {
        length = 300;
      }

      path.style.strokeDasharray = length;
      path.style.strokeDashoffset = length;
      
      // Trigger browser paint cycle reflow
      void path.getBoundingClientRect();

      path.style.transition = `stroke-dashoffset 2s cubic-bezier(0.4, 0, 0.2, 1) ${idx * 80}ms`;
      path.style.strokeDashoffset = '0';
    });
  }
}
export default SvgAnimator;

