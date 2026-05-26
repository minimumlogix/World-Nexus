/* js/utils/Animation.js */

export class Animation {
  /**
   * Schedule non-blocking background routines.
   * Falls back to setTimeout if unsupported.
   * @param {Function} callback - Task to execute
   * @param {number} [timeout=2000] - Max duration to defer
   */
  static runOnIdle(callback, timeout = 2000) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout });
    } else {
      setTimeout(callback, 50);
    }
  }

  /**
   * Calculates coordinate offsets and applies a 3D parallax transformation.
   * @param {HTMLElement} element - Target container
   * @param {number} mouseX - Client X position
   * @param {number} mouseY - Client Y position
   * @param {number} [factor=15] - Sensitivity factor
   */
  static applyParallax(element, mouseX, mouseY, factor = 15) {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    
    // Normalize offsets
    const tiltX = (dy / (window.innerHeight / 2)) * factor;
    const tiltY = -(dx / (window.innerWidth / 2)) * factor;

    element.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(0)`;
  }

  /**
   * Reset transformations safely.
   * @param {HTMLElement} element - Target element
   */
  static resetTransform(element) {
    if (element) {
      element.style.transform = '';
    }
  }
}
export default Animation;
