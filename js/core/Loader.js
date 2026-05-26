/* js/core/Loader.js */

export class Loader {
  /**
   * Display the global spinner.
   */
  static show() {
    const spinner = document.getElementById('global-loader');
    if (spinner) {
      spinner.classList.remove('hidden');
    }
  }

  /**
   * Hide the global spinner.
   */
  static hide() {
    const spinner = document.getElementById('global-loader');
    if (spinner) {
      // Add a tiny delay to prevent flicker on rapid loads
      setTimeout(() => {
        spinner.classList.add('hidden');
      }, 200);
    }
  }
}
export default Loader;
