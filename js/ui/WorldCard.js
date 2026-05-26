/* js/ui/WorldCard.js */
import { DOM } from '../utils/DOM.js';
import { lazyLoader } from './LazyLoader.js';
import { HoverPreview } from './HoverPreview.js';
import { SvgAnimator } from './SvgAnimator.js';
import { router } from '../core/Router.js';

export class WorldCard {
  /**
   * Generates a fully interactive World Card DOM node.
   * @param {Object} world - World metadata object
   * @returns {HTMLElement}
   */
  static render(world) {
    const coverPath = `${world.path}/${world.coverImage}`;
    const logoPath = `${world.path}/${world.logo}`;

    // Resolve color tokens based on world configuration
    const accentColors = {
      abyss: { hex: '#f03e3e', rgb: '240, 62, 62' },
      'neonveil': { hex: '#aa0000', rgb: '170, 0, 0' }
    };
    
    const worldAccent = world.accentColor || accentColors[world.id]?.hex || '#c5a059';
    const worldAccentRgb = world.accentColorRgb || accentColors[world.id]?.rgb || '197, 160, 89';

    // Create tag elements
    const tagElements = (world.genres || []).map(genre => 
      DOM.el('span', {
        class: 'tag tag-sm',
        onclick: (e) => {
          e.stopPropagation(); // Avoid opening the card page
          router.navigate(`/tag/${genre}`);
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
      // 4. Figma-Style Auto Layout Header Row
      DOM.el('div', { class: 'card-header' },
        logoWrapper,
        DOM.el('div', { class: 'card-badge-top' },
          DOM.el('svg', {
            viewBox: '0 0 24 24',
            width: '12',
            height: '12',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: '2'
          },
            DOM.el('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }),
            DOM.el('circle', { cx: '12', cy: '7', r: '4' })
          ),
          DOM.el('span', {}, `${world.botCount || 0} Bots`)
        )
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

    // Fetch SVG logo to place inline so CSS style injections can modify its colors dynamically
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
          // Removed triggerDrawAnimation(svg) to allow CSS animations to run infinitely
        }
        SvgAnimator.observeVisibility(logoWrapper);
      })
      .catch(err => {
        console.warn(`Could not fetch SVG logo inline for "${world.id}":`, err);
        // Text fallback
        logoWrapper.appendChild(DOM.el('span', { class: 'logo-text' }, world.title.slice(0, 2).toUpperCase()));
        SvgAnimator.observeVisibility(logoWrapper);
      });

    return cardElement;
  }
}
export default WorldCard;
