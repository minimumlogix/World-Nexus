/* js/ui/WorldCard.js */
import { DOM } from '../utils/DOM.js';
import { lazyLoader } from './LazyLoader.js';
import { HoverPreview } from './HoverPreview.js';
import { SvgAnimator } from './SvgAnimator.js';
import { router } from '../core/Router.js';
import { stateManager } from '../core/StateManager.js';


export class WorldCard {
  /**
   * Generates a fully interactive World Card DOM node.
   * @param {Object} world - World metadata object
   * @returns {HTMLElement}
   */
  static render(world) {
    const coverPath = `${world.path}/${world.coverImage}`;
    const logoPath = `${world.path}/${world.logo}`;

    const worldAccent = world.accentColor || '#c5a059';
    const worldAccentRgb = world.accentColorRgb || '197, 160, 89';

    const tagElements = (world.genres || []).map(genre => 
      DOM.el('span', {
        class: 'tag tag-sm',
        onclick: (e) => {
          e.stopPropagation(); // Avoid opening the card page
          const searchInput = document.getElementById('global-search-input');
          if (searchInput) searchInput.value = genre;
          stateManager.setState('searchQuery', genre);
        }
      }, genre)
    );

    // Map hover images to absolute world directory paths
    const hoverImagePaths = (world.hoverImages || []).map(img => `${world.path}/${img}`);

    // Create Logo wrapper
    const logoWrapper = DOM.el('div', { class: 'card-logo-container' });

    // Assemble outer card shell
    const cardElement = DOM.el('article', {
      class: 'nexus-card world-card gpu-accelerated',
      style: {
        '--world-accent': worldAccent,
        '--world-accent-rgb': worldAccentRgb
      },
      tabindex: '0',
      'aria-label': `Navigate to ${world.title} World`,
      onclick: () => {
        // Trigger blur on sibling cards and scale active card
        cardElement.classList.add('clicked-card');
        const grid = cardElement.closest('.world-grid');
        if (grid) {
          grid.classList.add('grid-blur-siblings');
        }

        // Delay routing to let animations play out
        setTimeout(() => {
          router.navigate(`/world/${world.id}`);
        }, 500);
      },
      onkeydown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cardElement.click();
        }
      }
    },
      // 1. Cover Layer
      DOM.el('div', { class: 'card-image-layer' },
        DOM.el('img', {
          class: 'card-bg-image',
          'data-src': coverPath,
          alt: `${world.title} scenery cover`
        })
      ),
      // 2. Character Previews Layer
      DOM.el('div', { class: 'card-slideshow-layer' }),
      // 3. Gradient
      DOM.el('div', { class: 'card-gradient-overlay' }),
      // 4. Centralized Reactive World Logo Area
      DOM.el('div', { class: 'world-card-logo-area' },
        logoWrapper
      ),
      // 5. Figma-Style Auto Layout Body Column
      DOM.el('div', { class: 'card-body' },
        DOM.el('div', { class: 'card-title' },
          DOM.el('h3', {}, world.title),
          DOM.el('div', { class: 'card-title-divider' })
        ),
        DOM.el('p', { class: 'card-description' }, world.description),
        DOM.el('div', { class: 'tags-list' }, ...tagElements)
      )
    );

    // Register cover image to lazy load
    const coverImage = cardElement.querySelector('.card-bg-image');
    lazyLoader.observe(coverImage);

    // Initialize character slideshow
    new HoverPreview(cardElement, hoverImagePaths);

    // Defer SVG logo loading until card is near the viewport using IO
    WorldCard._deferLogoLoad(cardElement, logoWrapper, logoPath, world);

    return cardElement;
  }

  /**
   * Observes the card's visibility and defers the SVG/img logo fetch until needed.
   * This avoids many simultaneous SVG fetches on initial paint.
   * @private
   */
  static _deferLogoLoad(cardElement, logoWrapper, logoPath, world) {
    if (!('IntersectionObserver' in window)) {
      // Fallback: load immediately
      WorldCard._fetchLogo(logoWrapper, logoPath, world);
      return;
    }

    // One-shot observer — unobserves itself once the card is near the viewport
    const logoObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        obs.unobserve(entry.target);
        WorldCard._fetchLogo(logoWrapper, logoPath, world);
      });
    }, { rootMargin: '200px 0px', threshold: 0 });

    logoObserver.observe(cardElement);
  }

  /**
   * Fetches SVG logo to place inline so CSS style injections can modify its colors
   * dynamically. Falls back to <img> if not SVG, or to text initials on error.
   * @private
   */
  static _fetchLogo(logoWrapper, logoPath, world) {
    if (logoPath.toLowerCase().endsWith('.svg')) {
      fetch(logoPath)
        .then(res => {
          if (!res.ok) throw new Error('Logo fetch failure');
          return res.text();
        })
        .then(svgMarkup => {
          logoWrapper.innerHTML = svgMarkup;
          const svg = logoWrapper.querySelector('svg');
          if (svg) {
            SvgAnimator.initParallax(logoWrapper, 6);
          }
          SvgAnimator.observeVisibility(logoWrapper);
        })
        .catch(err => {
          console.warn(`Could not fetch SVG logo inline for "${world.id}":`, err);
          // Text fallback
          logoWrapper.appendChild(DOM.el('span', { class: 'logo-text' }, world.title.slice(0, 2).toUpperCase()));
          SvgAnimator.observeVisibility(logoWrapper);
        });
    } else {
      const img = DOM.el('img', { 
        src: logoPath, 
        alt: `${world.title} logo`,
        loading: 'lazy',
        style: 'width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0px 0px 4px rgba(0,0,0,0.5));'
      });
      logoWrapper.appendChild(img);
      SvgAnimator.initParallax(logoWrapper, 6);
      SvgAnimator.observeVisibility(logoWrapper);
    }
  }
}
export default WorldCard;
