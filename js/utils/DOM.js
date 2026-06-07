/* js/utils/DOM.js */

export class DOM {
  /**
   * Helper to build dynamic HTML elements programmatically.
   * @param {string} tag - Tag name
   * @param {Object} [attributes={}] - Attribute key-value pairs
   * @param  {...any} children - Nodes or text elements to nest
   * @returns {HTMLElement}
   */
  static el(tag, attributes = {}, ...children) {
    const element = document.createElement(tag);

    for (const [key, value] of Object.entries(attributes)) {
      if (key === 'class' || key === 'className') {
        if (Array.isArray(value)) {
          value.forEach(c => c && element.classList.add(c));
        } else if (value) {
          element.className = value;
        }
      } else if (key.startsWith('on') && typeof value === 'function') {
        const eventName = key.substring(2).toLowerCase();
        element.addEventListener(eventName, value);
      } else if (key === 'style' && typeof value === 'object') {
        for (const [sKey, sVal] of Object.entries(value)) {
          if (sKey.startsWith('--')) {
            element.style.setProperty(sKey, sVal);
          } else {
            element.style[sKey] = sVal;
          }
        }
      } else if (key === 'dataset' && typeof value === 'object') {
        Object.assign(element.dataset, value);
      } else if (value !== null && value !== undefined) {
        element.setAttribute(key, value);
      }
    }

    // Flatten children list
    const flatChildren = children.flat(Infinity);
    for (const child of flatChildren) {
      if (child === null || child === undefined) continue;
      if (child instanceof Node) {
        element.appendChild(child);
      } else {
        element.appendChild(document.createTextNode(child));
      }
    }

    return element;
  }

  /**
   * Safe container purge.
   * @param {HTMLElement} element - Target container to clear
   */
  static clear(element) {
    if (element) {
      while (element.firstChild) {
        element.removeChild(element.firstChild);
      }
    }
  }
}
export default DOM;
