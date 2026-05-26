/* js/utils/Device.js */

export class Device {
  /**
   * Evaluates system prefers-reduced-motion directives.
   * @returns {boolean}
   */
  static prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Detects if device features a touch screen.
   * @returns {boolean}
   */
  static isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    );
  }
}
export default Device;
