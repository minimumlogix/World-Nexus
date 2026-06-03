/* js/ui/Modal.js */
import { DOM } from '../utils/DOM.js';

export class Modal {
  /**
   * Shows a premium dialog popup.
   * @param {string} title - The title of the modal
   * @param {string} message - The main body message
   */
  static show(title, message) {
    // Clean up any existing modal overlays
    const existing = document.querySelector('.modal-overlay');
    if (existing) {
      existing.remove();
    }

    // Close button
    const closeBtn = DOM.el('button', {
      class: 'modal-close-btn',
      'aria-label': 'Close Dialog',
      onclick: () => Modal.close()
    }, '×');

    // Title element
    const titleEl = DOM.el('h3', { 
      class: 'modal-title',
      style: {
        fontFamily: 'var(--font-serif)',
        color: 'var(--accent-gold)',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '12px',
        marginTop: '0'
      }
    }, title);

    // Message / content element
    const messageEl = DOM.el('div', {
      class: 'modal-body-content',
      style: {
        color: 'var(--text-secondary)',
        lineHeight: '1.6',
        fontSize: '1rem',
        marginTop: '16px'
      }
    }, message);

    // Assemble container
    const container = DOM.el('div', {
      class: 'modal-container',
      style: {
        border: '1px solid var(--border-color-focus)',
        boxShadow: '0 0 20px var(--accent-gold-glow)'
      }
    },
      closeBtn,
      titleEl,
      messageEl
    );

    // Overlay shell
    const overlay = DOM.el('div', {
      class: 'modal-overlay',
      onclick: (e) => {
        if (e.target === overlay) {
          Modal.close();
        }
      }
    }, container);

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // Escape key listener to close
    Modal._escHandler = (e) => {
      if (e.key === 'Escape') {
        Modal.close();
      }
    };
    document.addEventListener('keydown', Modal._escHandler);

    // Animate open
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('open');
      });
    });
  }

  /**
   * Closes the active modal with animation.
   */
  static close() {
    const overlay = document.querySelector('.modal-overlay');
    if (!overlay) return;

    if (Modal._escHandler) {
      document.removeEventListener('keydown', Modal._escHandler);
      Modal._escHandler = null;
    }

    overlay.classList.remove('open');
    document.body.style.overflow = '';

    // Wait for the transition to finish before removing from DOM
    setTimeout(() => {
      if (overlay) {
        overlay.remove();
      }
    }, 300);
  }
}

export default Modal;
