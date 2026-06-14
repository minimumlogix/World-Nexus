/* js/pages/WorldCreationEngine.js */
/**
 * World Creation Engine
 * A 4-step multiphase wizard for creating fully-configured world packages.
 *
 * Steps:
 *   1 — Vital Records     (title, id slug, author, tags, description)
 *   2 — Aesthetics        (cover image, logo, CSS variable color pickers, font)
 *   3 — Index Chronicles  (markdown lore editor + live preview, library terms)
 *   4 — Entity Allocation (initial character seeding)
 *
 * On completion → generates world.json, style.css, lore.md, library.json,
 * saves to stateManager.customWorlds, and offers a ZIP download.
 */

import { stateManager } from '../core/StateManager.js';
import { router } from '../core/Router.js';
import { DOM } from '../utils/DOM.js';
import { LoreService } from '../services/LoreService.js';

// ─────────────────────────────────────────────────────────────────────────────
// CSS variable descriptors for Step 2
// ─────────────────────────────────────────────────────────────────────────────
const THEME_VARS = [
  { key: 'accentColor',   varName: '--primary-accent',    label: 'Primary Accent',  default: '#c5a059' },
  { key: 'heroOverlay',   varName: '--bg-hero-overlay',   label: 'Hero Overlay',    default: '#0a0a1a' },
  { key: 'textGold',      varName: '--text-gold',         label: 'Heading Gold',    default: '#e2b755' },
  { key: 'cardBg',        varName: '--card-bg',           label: 'Card Background', default: '#06090e' },
  { key: 'accentGlow',    varName: '--accent-glow',       label: 'Accent Glow',     default: '#c5a059' },
  { key: 'textPrimary',   varName: '--text-primary',      label: 'Body Text',       default: '#f0f3f6' },
];

const FONT_OPTIONS = [
  { label: 'Cinzel (Serif — Default)', value: "'Cinzel', Georgia, serif" },
  { label: 'Outfit (Sans — Default)', value: "'Outfit', system-ui, sans-serif" },
  { label: 'Cormorant Garamond', value: "'Cormorant Garamond', serif" },
  { label: 'Rajdhani (Sci-Fi)', value: "'Rajdhani', sans-serif" },
  { label: 'Crimson Text', value: "'Crimson Text', serif" },
  { label: 'Josefin Sans', value: "'Josefin Sans', sans-serif" },
];

// ─────────────────────────────────────────────────────────────────────────────
export class WorldCreationEngine {
  constructor() {
    this._step = 1;
    this._totalSteps = 4;
    this._overlay = null;
    this._formPanel = null;
    this._previewCanvas = null;
    this._resolvePromise = null;

    // Transient engine state — accumulates across all 4 steps
    this._state = {
      // Step 1
      title: '',
      worldId: '',
      author: stateManager.getState('currentUser')?.username || '',
      description: '',
      tags: [],

      // Step 2
      coverDataUrl: null,      // base64 or null
      logoDataUrl: null,       // base64 or null
      accentColor: '#c5a059',
      heroOverlay: '#0a0a1a',
      textGold: '#e2b755',
      cardBg: '#06090e',
      accentGlow: '#c5a059',
      textPrimary: '#f0f3f6',
      fontSerif: FONT_OPTIONS[0].value,
      fontSans: FONT_OPTIONS[1].value,

      // Step 3
      rawMarkdown: '',
      libraryTerms: [],  // [{ term, subpage, definition }]

      // Step 4
      seededCharacters: [],  // [{ id, name, occupation, status, description }]
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Opens the engine overlay. Returns a Promise resolved when engine closes.
   * @returns {Promise<boolean>} true if world was constructed, false if cancelled
   */
  open() {
    return new Promise((resolve) => {
      this._resolvePromise = resolve;
      this._buildShell();
      document.body.appendChild(this._overlay);
      this._renderStep();
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Shell construction
  // ───────────────────────────────────────────────────────────────────────────

  _buildShell() {
    this._overlay = DOM.el('div', { class: 'wce-overlay' });

    const shell = DOM.el('div', { class: 'wce-shell' });

    // Close button
    const closeBtn = DOM.el('button', {
      class: 'wce-close-btn',
      title: 'Close Engine',
      onclick: () => this._close(false)
    }, DOM.el('i', { class: 'bi bi-x' }));
    shell.appendChild(closeBtn);

    // Header + stepper
    this._stepperEl = null;
    const header = this._buildHeader();
    shell.appendChild(header);

    // Body: form panel + preview panel
    const body = DOM.el('div', { class: 'wce-body' });

    this._formPanel = DOM.el('div', { class: 'wce-form-panel' });
    this._previewPanel = DOM.el('div', { class: 'wce-preview-panel' });

    const previewLabel = DOM.el('div', { class: 'wce-preview-label' },
      DOM.el('i', { class: 'bi bi-eye' }),
      'Live Preview'
    );
    this._previewCanvas = DOM.el('div', { class: 'wce-preview-canvas' });
    this._previewPanel.appendChild(previewLabel);
    this._previewPanel.appendChild(this._previewCanvas);

    body.appendChild(this._formPanel);
    body.appendChild(this._previewPanel);
    shell.appendChild(body);

    // Footer
    this._footer = this._buildFooter();
    shell.appendChild(this._footer);

    this._shell = shell;
    this._overlay.appendChild(shell);
  }

  _buildHeader() {
    const header = DOM.el('div', { class: 'wce-header' });

    const titleRow = DOM.el('div', { class: 'wce-header-title' },
      DOM.el('i', { class: 'bi bi-globe-americas' }),
      DOM.el('h2', {}, 'WORLD CREATION ENGINE'),
      DOM.el('span', {}, 'Configure · Preview · Construct')
    );
    header.appendChild(titleRow);

    // Build stepper
    const stepLabels = ['Vital Records', 'Aesthetics', 'Chronicles', 'Entities'];
    const stepper = DOM.el('div', { class: 'wce-stepper' });

    stepLabels.forEach((label, i) => {
      const n = i + 1;
      const step = DOM.el('div', {
        class: `wce-step ${n < this._step ? 'done' : n === this._step ? 'active' : ''}`,
        onclick: () => {
          // Allow backward navigation only
          if (n < this._step) {
            this._step = n;
            this._renderStep();
          }
        }
      });

      const bubble = DOM.el('div', { class: 'wce-step-bubble' });
      if (n < this._step) {
        bubble.innerHTML = '<i class="bi bi-check"></i>';
      } else {
        bubble.textContent = String(n);
      }

      step.appendChild(bubble);
      step.appendChild(DOM.el('div', { class: 'wce-step-label' }, label));
      stepper.appendChild(step);
    });

    this._stepperEl = stepper;
    header.appendChild(stepper);
    return header;
  }

  _buildFooter() {
    const footer = DOM.el('div', { class: 'wce-footer' });

    const leftSide = DOM.el('div', { class: 'wce-footer-left' });
    this._prevBtn = DOM.el('button', {
      class: 'wce-btn wce-btn-ghost',
      onclick: () => this._goBack()
    }, DOM.el('i', { class: 'bi bi-arrow-left' }), 'Back');

    this._stepInfo = DOM.el('span', { class: 'wce-step-info' }, `Step 1 of ${this._totalSteps}`);
    leftSide.appendChild(this._prevBtn);
    leftSide.appendChild(this._stepInfo);

    const rightSide = DOM.el('div', { class: 'wce-footer-right' });
    this._nextBtn = DOM.el('button', {
      class: 'wce-btn wce-btn-next',
      onclick: () => this._goNext()
    }, 'Next', DOM.el('i', { class: 'bi bi-arrow-right' }));

    this._constructBtn = DOM.el('button', {
      class: 'wce-btn wce-btn-construct',
      style: { display: 'none' },
      onclick: () => this._constructWorld()
    }, DOM.el('i', { class: 'bi bi-stars' }), 'Construct World Vector');

    rightSide.appendChild(this._nextBtn);
    rightSide.appendChild(this._constructBtn);

    footer.appendChild(leftSide);
    footer.appendChild(rightSide);
    return footer;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Step rendering dispatcher
  // ───────────────────────────────────────────────────────────────────────────

  _renderStep() {
    // Update stepper visuals
    this._updateStepper();

    // Update footer buttons
    this._prevBtn.disabled = this._step === 1;
    this._prevBtn.style.opacity = this._step === 1 ? '0.3' : '1';
    this._stepInfo.textContent = `Step ${this._step} of ${this._totalSteps}`;

    if (this._step === this._totalSteps) {
      this._nextBtn.style.display = 'none';
      this._constructBtn.style.display = 'inline-flex';
    } else {
      this._nextBtn.style.display = 'inline-flex';
      this._constructBtn.style.display = 'none';
    }

    // Render form panel content
    DOM.clear(this._formPanel);
    this._formPanel.classList.add('wce-step-entering');
    requestAnimationFrame(() => this._formPanel.classList.remove('wce-step-entering'));

    switch (this._step) {
      case 1: this._renderStep1(); break;
      case 2: this._renderStep2(); break;
      case 3: this._renderStep3(); break;
      case 4: this._renderStep4(); break;
    }

    // Update right-side preview
    this._updatePreview();
  }

  _updateStepper() {
    if (!this._stepperEl) return;
    const steps = this._stepperEl.querySelectorAll('.wce-step');
    steps.forEach((el, i) => {
      const n = i + 1;
      el.className = `wce-step ${n < this._step ? 'done' : n === this._step ? 'active' : ''}`;
      const bubble = el.querySelector('.wce-step-bubble');
      if (!bubble) return;
      if (n < this._step) {
        bubble.innerHTML = '<i class="bi bi-check"></i>';
      } else {
        bubble.textContent = String(n);
      }
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 1 — Vital Records
  // ───────────────────────────────────────────────────────────────────────────

  _renderStep1() {
    const panel = this._formPanel;

    // Section: Identity
    const identSection = this._makeSection('bi-fingerprint', 'World Identity');

    // Title
    const titleField = this._makeField('World Title', 'E.g., Arcanis, NeonVeil, Ortheon IV');
    const titleInput = DOM.el('input', { type: 'text', class: 'wce-input', id: 'wce-title-input', value: this._state.title, placeholder: 'E.g., Arcanis, NeonVeil, Ortheon IV' });

    // ID slug row
    const slugField = this._makeField('World ID', 'Auto-generated from title. Defines the folder path.');
    const slugRow = DOM.el('div', { class: 'wce-slug-row' });
    const slugPrefix = DOM.el('span', { class: 'wce-slug-prefix' }, 'Worlds/');
    const slugInput = DOM.el('input', {
      type: 'text',
      id: 'wce-id-input',
      value: this._state.worldId,
      placeholder: 'my-world-id',
      oninput: (e) => {
        this._state.worldId = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-');
        e.target.value = this._state.worldId;
        this._updatePreview();
      }
    });
    slugRow.appendChild(slugPrefix);
    slugRow.appendChild(slugInput);

    titleInput.addEventListener('input', (e) => {
      this._state.title = e.target.value;
      const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      slugInput.value = slug;
      this._state.worldId = slug;
      this._updatePreview();
    });

    slugField.appendChild(slugRow);
    titleField.appendChild(titleInput);
    identSection.appendChild(titleField);
    identSection.appendChild(slugField);

    // Author (read-only from current user)
    const authorField = this._makeField('Author / Owner', 'Linked to your logged-in account.');
    const authorInput = DOM.el('input', { type: 'text', class: 'wce-input', value: this._state.author, readonly: true, style: { opacity: '0.6', cursor: 'not-allowed' } });
    authorField.appendChild(authorInput);
    identSection.appendChild(authorField);

    panel.appendChild(identSection);

    // Section: Genre Tags
    const tagSection = this._makeSection('bi-tags', 'Genre Tags');
    const tagHint = DOM.el('div', { class: 'wce-pill-hint' }, 'Press Space or comma to add a genre tag.');

    const pillRow = DOM.el('div', { class: 'wce-pill-row' });
    this._pillContainer = pillRow;

    // Re-render existing pills
    this._state.tags.forEach(tag => this._addPillToRow(tag, pillRow));

    const pillInput = DOM.el('input', { type: 'text', class: 'wce-pill-input', placeholder: this._state.tags.length === 0 ? 'dark-fantasy, sci-fi, action...' : '' });
    pillRow.appendChild(pillInput);

    pillRow.addEventListener('click', () => pillInput.focus());
    pillInput.addEventListener('focus', () => pillRow.classList.add('focused'));
    pillInput.addEventListener('blur', () => {
      pillRow.classList.remove('focused');
      const val = pillInput.value.trim().replace(/,$/, '');
      if (val) { this._commitPill(val, pillInput, pillRow); }
    });
    pillInput.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === ',') {
        e.preventDefault();
        const val = pillInput.value.trim().replace(/,$/, '');
        if (val) this._commitPill(val, pillInput, pillRow);
      } else if (e.key === 'Backspace' && pillInput.value === '') {
        if (this._state.tags.length > 0) {
          const lastTag = this._state.tags.pop();
          const pills = pillRow.querySelectorAll('.wce-pill');
          if (pills.length > 0) pills[pills.length - 1].remove();
          this._updatePreview();
        }
      }
    });

    tagSection.appendChild(pillRow);
    tagSection.appendChild(tagHint);
    panel.appendChild(tagSection);

    // Section: Description
    const descSection = this._makeSection('bi-card-text', 'World Description');
    const descField = this._makeField('Synopsis', '');
    const descTextarea = DOM.el('textarea', {
      class: 'wce-textarea',
      placeholder: 'A shattered world where humanity clings to existence around a supernatural rift...',
      style: { minHeight: '90px' }
    }, this._state.description);
    const charCounter = DOM.el('div', { class: 'wce-char-counter' }, `${this._state.description.length} / 280`);

    descTextarea.addEventListener('input', (e) => {
      this._state.description = e.target.value;
      const len = e.target.value.length;
      charCounter.textContent = `${len} / 280`;
      charCounter.className = `wce-char-counter${len > 280 ? ' over' : len > 240 ? ' warn' : ''}`;
      this._updatePreview();
    });

    descField.appendChild(descTextarea);
    descField.appendChild(charCounter);
    descSection.appendChild(descField);
    panel.appendChild(descSection);
  }

  _commitPill(val, inputEl, rowEl) {
    const tag = val.toLowerCase().replace(/\s+/g, '-');
    if (!tag || this._state.tags.includes(tag)) { inputEl.value = ''; return; }
    this._state.tags.push(tag);
    this._addPillToRow(tag, rowEl, inputEl);
    inputEl.value = '';
    this._updatePreview();
  }

  _addPillToRow(tag, rowEl, inputEl = null) {
    const pill = DOM.el('div', { class: 'wce-pill' });
    const label = document.createTextNode(tag);
    const removeBtn = DOM.el('span', {
      class: 'wce-pill-remove',
      title: 'Remove tag',
      onclick: (e) => {
        e.stopPropagation();
        pill.remove();
        this._state.tags = this._state.tags.filter(t => t !== tag);
        this._updatePreview();
      }
    }, '×');
    pill.appendChild(label);
    pill.appendChild(removeBtn);

    if (inputEl) {
      rowEl.insertBefore(pill, inputEl);
    } else {
      // Find the input and insert before it, or append
      const inp = rowEl.querySelector('.wce-pill-input');
      if (inp) rowEl.insertBefore(pill, inp);
      else rowEl.appendChild(pill);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 2 — Aesthetics & Branding
  // ───────────────────────────────────────────────────────────────────────────

  _renderStep2() {
    const panel = this._formPanel;

    // Section: Media Assets
    const mediaSection = this._makeSection('bi-images', 'Media Assets');
    const dropzoneRow = DOM.el('div', { class: 'wce-dropzone-row' });

    const coverZone = this._makeDropzone(
      'Cover Image',
      'bi-card-image',
      '1920×600 recommended\n.avif / .jpg / .png / .webp',
      this._state.coverDataUrl,
      (dataUrl) => { this._state.coverDataUrl = dataUrl; this._updatePreview(); }
    );

    const logoZone = this._makeDropzone(
      'World Logo',
      'bi-shield',
      'Square format\n.svg / .avif / .png',
      this._state.logoDataUrl,
      (dataUrl) => { this._state.logoDataUrl = dataUrl; this._updatePreview(); },
      true /* isLogo — square aspect */
    );

    dropzoneRow.appendChild(coverZone);
    dropzoneRow.appendChild(logoZone);
    mediaSection.appendChild(dropzoneRow);
    panel.appendChild(mediaSection);

    // Section: CSS Variable Color Pickers
    const colorSection = this._makeSection('bi-palette', 'Theme Colors');
    const colorGrid = DOM.el('div', { class: 'wce-color-grid' });

    THEME_VARS.forEach(varDef => {
      const currentVal = this._state[varDef.key] || varDef.default;
      const row = DOM.el('div', { class: 'wce-color-row' });

      const swatch = DOM.el('input', {
        type: 'color',
        class: 'wce-color-swatch',
        value: this._hexify(currentVal),
        oninput: (e) => {
          this._state[varDef.key] = e.target.value;
          hexDisplay.textContent = e.target.value.toUpperCase();
          this._updatePreview();
        }
      });

      const info = DOM.el('div', { class: 'wce-color-info' },
        DOM.el('span', { class: 'wce-color-name' }, varDef.label),
        DOM.el('span', { class: 'wce-color-var' }, varDef.varName)
      );

      const hexDisplay = DOM.el('span', { class: 'wce-color-value' }, this._hexify(currentVal).toUpperCase());

      row.appendChild(swatch);
      row.appendChild(info);
      row.appendChild(hexDisplay);
      colorGrid.appendChild(row);
    });

    colorSection.appendChild(colorGrid);
    panel.appendChild(colorSection);

    // Section: Typography
    const fontSection = this._makeSection('bi-type', 'Typography');

    const serifField = this._makeField('Serif Font (headings, titles)');
    const serifSelect = DOM.el('select', { class: 'wce-select' });
    FONT_OPTIONS.filter(f => f.label.includes('Serif') || f.label.includes('Garamond') || f.label.includes('Crimson') || f.label.includes('Default')).forEach(opt => {
      const option = DOM.el('option', { value: opt.value }, opt.label);
      if (opt.value === this._state.fontSerif) option.selected = true;
      serifSelect.appendChild(option);
    });
    serifSelect.addEventListener('change', (e) => {
      this._state.fontSerif = e.target.value;
      this._updatePreview();
    });

    const sansField = this._makeField('Sans Font (body, UI elements)');
    const sansSelect = DOM.el('select', { class: 'wce-select' });
    FONT_OPTIONS.filter(f => f.label.includes('Sans') || f.label.includes('Rajdhani') || f.label.includes('Josefin') || f.label.includes('Default')).forEach(opt => {
      const option = DOM.el('option', { value: opt.value }, opt.label);
      if (opt.value === this._state.fontSans) option.selected = true;
      sansSelect.appendChild(option);
    });
    sansSelect.addEventListener('change', (e) => {
      this._state.fontSans = e.target.value;
      this._updatePreview();
    });

    serifField.appendChild(serifSelect);
    sansField.appendChild(sansSelect);
    fontSection.appendChild(serifField);
    fontSection.appendChild(sansField);
    panel.appendChild(fontSection);
  }

  _makeDropzone(label, icon, hint, currentDataUrl, onFile, isLogo = false) {
    const wrapper = DOM.el('div', {});
    const labelEl = DOM.el('label', { class: 'auth-input-label', style: { display: 'block', marginBottom: '8px', fontSize: 'var(--fs-xs)' } }, label);
    const zone = DOM.el('div', { class: `wce-dropzone${isLogo ? ' logo-zone' : ''}` });

    const icon_el = DOM.el('i', { class: `bi ${icon}` });
    const hintLines = hint.split('\n');
    const hintEl = DOM.el('div', { class: 'wce-dropzone-label' },
      DOM.el('strong', {}, 'Drop file or click'),
      document.createElement('br'),
      ...hintLines.map(l => {
        const t = document.createTextNode(l);
        return t;
      })
    );

    let previewImg = null;
    let clearBtn = null;

    const showPreview = (dataUrl) => {
      DOM.clear(zone);
      previewImg = DOM.el('img', { class: 'wce-dropzone-preview', src: dataUrl, alt: label });
      clearBtn = DOM.el('button', {
        class: 'wce-dropzone-clear',
        title: 'Remove image',
        onclick: (e) => {
          e.stopPropagation();
          onFile(null);
          DOM.clear(zone);
          zone.appendChild(icon_el);
          zone.appendChild(hintEl);
        }
      }, DOM.el('i', { class: 'bi bi-x' }));
      zone.appendChild(previewImg);
      zone.appendChild(clearBtn);
    };

    if (currentDataUrl) {
      showPreview(currentDataUrl);
    } else {
      zone.appendChild(icon_el);
      zone.appendChild(hintEl);
    }

    // Click to upload
    zone.addEventListener('click', () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = () => {
        const file = fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target.result;
          onFile(dataUrl);
          showPreview(dataUrl);
        };
        reader.readAsDataURL(file);
      };
      fileInput.click();
    });

    // Drag and drop
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        onFile(dataUrl);
        showPreview(dataUrl);
      };
      reader.readAsDataURL(file);
    });

    wrapper.appendChild(labelEl);
    wrapper.appendChild(zone);
    return wrapper;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 3 — Index Chronicles & Lore
  // ───────────────────────────────────────────────────────────────────────────

  _renderStep3() {
    const panel = this._formPanel;

    // Section: Markdown Editor
    const mdSection = this._makeSection('bi-journal-richtext', 'World Lore (Markdown)');
    const mdHint = DOM.el('div', { class: 'wce-pill-hint', style: { marginBottom: '10px' } },
      'Use ## for sections. Live preview updates on the right. Supports full Markdown.'
    );
    mdSection.appendChild(mdHint);

    const mdSplit = DOM.el('div', { class: 'wce-md-split' });

    // Left: textarea
    const editorPane = DOM.el('div', { class: 'wce-md-pane' });
    const editorLabel = DOM.el('div', { class: 'wce-md-pane-label' }, '✏ Editor');
    const mdTextarea = DOM.el('textarea', { class: 'wce-md-textarea' }, this._state.rawMarkdown || '');
    mdTextarea.placeholder = `# ${this._state.title || 'World Title'}\n\nA brief world synopsis...\n\n## Origins\n\nThe world began when...\n\n## Factions\n\n- The Syndicate: rulers of the inner ring\n- The Ferrumites: iron-wielding outcasts\n`;
    editorPane.appendChild(editorLabel);
    editorPane.appendChild(mdTextarea);

    // Right: preview
    const previewPane = DOM.el('div', { class: 'wce-md-pane' });
    const previewLabel2 = DOM.el('div', { class: 'wce-md-pane-label' }, '👁 Preview');
    const mdPreviewEl = DOM.el('div', { class: 'wce-md-preview' });
    previewPane.appendChild(previewLabel2);
    previewPane.appendChild(mdPreviewEl);

    const renderMdPreview = () => {
      const md = mdTextarea.value;
      this._state.rawMarkdown = md;
      try {
        mdPreviewEl.innerHTML = LoreService.parseMarkdown(md);
      } catch (e) {
        mdPreviewEl.innerHTML = `<em style="color:var(--text-muted)">${md}</em>`;
      }
      // Update right-side TOC
      this._updatePreview();
    };

    mdTextarea.addEventListener('input', renderMdPreview);
    // Initial render
    if (this._state.rawMarkdown) renderMdPreview();

    mdSplit.appendChild(editorPane);
    mdSplit.appendChild(previewPane);
    mdSection.appendChild(mdSplit);
    panel.appendChild(mdSection);

    // Section: Library Terms
    const libSection = this._makeSection('bi-book', 'Dictionary / Library Terms');
    const libHint = DOM.el('div', { class: 'wce-pill-hint', style: { marginBottom: '10px' } },
      'These terms will have interactive tooltips injected into lore text via LoreService.injectLibraryTerms().'
    );
    libSection.appendChild(libHint);

    // Build the terms table
    this._libTableBody = null;
    const table = DOM.el('table', { class: 'wce-library-table' });
    const thead = DOM.el('thead', {},
      DOM.el('tr', {},
        DOM.el('th', {}, 'Term'),
        DOM.el('th', {}, 'Definition (tooltip)'),
        DOM.el('th', {}, 'Subpage ref'),
        DOM.el('th', {}, '')
      )
    );
    const tbody = DOM.el('tbody', {});
    this._libTableBody = tbody;

    // Render existing terms
    this._state.libraryTerms.forEach(term => this._addLibraryRow(tbody, term));

    table.appendChild(thead);
    table.appendChild(tbody);
    libSection.appendChild(table);

    const addTermBtn = DOM.el('button', {
      class: 'wce-add-term-btn',
      onclick: () => {
        const newTerm = { term: '', definition: '', subpage: '' };
        this._state.libraryTerms.push(newTerm);
        this._addLibraryRow(tbody, newTerm);
      }
    }, '+ Add Dictionary Term');

    libSection.appendChild(addTermBtn);
    panel.appendChild(libSection);
  }

  _addLibraryRow(tbody, termObj) {
    const tr = DOM.el('tr', {});

    const termInput = DOM.el('input', { type: 'text', value: termObj.term, placeholder: 'E.g., The Rift' });
    termInput.addEventListener('input', (e) => { termObj.term = e.target.value; });

    const defInput = DOM.el('input', { type: 'text', value: termObj.definition, placeholder: 'Short tooltip definition' });
    defInput.addEventListener('input', (e) => { termObj.definition = e.target.value; });

    const subpageInput = DOM.el('input', { type: 'text', value: termObj.subpage, placeholder: 'subpage-ref.md' });
    subpageInput.addEventListener('input', (e) => { termObj.subpage = e.target.value; });

    const removeBtn = DOM.el('button', {
      class: 'wce-library-remove-btn',
      title: 'Remove term',
      onclick: () => {
        tr.remove();
        this._state.libraryTerms = this._state.libraryTerms.filter(t => t !== termObj);
      }
    }, DOM.el('i', { class: 'bi bi-trash' }));

    tr.appendChild(DOM.el('td', {}, termInput));
    tr.appendChild(DOM.el('td', {}, defInput));
    tr.appendChild(DOM.el('td', {}, subpageInput));
    tr.appendChild(DOM.el('td', { style: { width: '36px', textAlign: 'center' } }, removeBtn));
    tbody.appendChild(tr);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 4 — Entity / Character Allocation
  // ───────────────────────────────────────────────────────────────────────────

  _renderStep4() {
    const panel = this._formPanel;

    const entitySection = this._makeSection('bi-people', 'Seed Characters');
    const hint = DOM.el('div', { class: 'wce-pill-hint', style: { marginBottom: '14px' } },
      'These characters will be registered as initial entities in this world. You can add more later via the character creator.'
    );
    entitySection.appendChild(hint);

    // Mini character form
    const charForm = DOM.el('div', { class: 'wce-char-form' });

    const nameInput = DOM.el('input', { type: 'text', class: 'wce-input', placeholder: 'Character Name', id: 'wce-char-name' });
    const occupInput = DOM.el('input', { type: 'text', class: 'wce-input', placeholder: 'Occupation / Title', id: 'wce-char-occup' });
    const statusSelect = DOM.el('select', { class: 'wce-select', id: 'wce-char-status' },
      DOM.el('option', { value: 'Active' }, 'Active'),
      DOM.el('option', { value: 'Deceased' }, 'Deceased'),
      DOM.el('option', { value: 'Unknown' }, 'Unknown')
    );
    const descInput = DOM.el('textarea', { class: 'wce-textarea', placeholder: 'Brief character description...', style: { minHeight: '68px' }, id: 'wce-char-desc' });

    const nameField = this._makeField('Name');
    nameField.appendChild(nameInput);
    const occupField = this._makeField('Occupation');
    occupField.appendChild(occupInput);
    const statusField = this._makeField('Status');
    statusField.appendChild(statusSelect);
    const descField = this._makeField('Description');
    descField.classList.add('full-col');
    descField.appendChild(descInput);

    charForm.appendChild(nameField);
    charForm.appendChild(occupField);
    charForm.appendChild(statusField);
    charForm.appendChild(descField);
    entitySection.appendChild(charForm);

    const addCharBtn = DOM.el('button', {
      class: 'wce-add-char-btn',
      onclick: () => {
        const name = nameInput.value.trim();
        if (!name) { this._showFieldError(nameInput, 'Name is required'); return; }
        const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const char = {
          id,
          name,
          occupation: occupInput.value.trim() || 'Resident',
          status: statusSelect.value,
          description: descInput.value.trim(),
          worldId: this._state.worldId || 'new-world',
        };
        this._state.seededCharacters.push(char);
        this._renderCharGrid(charGridEl);
        this._updatePreview();
        // Clear form
        nameInput.value = '';
        occupInput.value = '';
        descInput.value = '';
        statusSelect.value = 'Active';
      }
    }, DOM.el('i', { class: 'bi bi-plus-circle' }), 'Add Character to World');

    entitySection.appendChild(addCharBtn);

    const charGridEl = DOM.el('div', { class: 'wce-mini-bot-grid' });
    this._renderCharGrid(charGridEl);
    entitySection.appendChild(charGridEl);

    panel.appendChild(entitySection);
  }

  _renderCharGrid(gridEl) {
    DOM.clear(gridEl);
    this._state.seededCharacters.forEach(char => {
      const card = DOM.el('div', { class: 'wce-char-mini-card' });

      const avatar = DOM.el('div', { class: 'wce-char-mini-avatar' },
        document.createTextNode(char.name.charAt(0).toUpperCase())
      );

      const removeBtn = DOM.el('button', {
        class: 'wce-char-mini-remove',
        title: 'Remove character',
        onclick: (e) => {
          e.stopPropagation();
          this._state.seededCharacters = this._state.seededCharacters.filter(c => c !== char);
          this._renderCharGrid(gridEl);
          this._updatePreview();
        }
      }, DOM.el('i', { class: 'bi bi-x' }));

      card.appendChild(removeBtn);
      card.appendChild(avatar);
      card.appendChild(DOM.el('div', { class: 'wce-char-mini-name' }, char.name));
      card.appendChild(DOM.el('div', { class: 'wce-char-mini-role' }, char.occupation));
      gridEl.appendChild(card);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // LIVE PREVIEW (right panel)
  // ───────────────────────────────────────────────────────────────────────────

  _updatePreview() {
    if (!this._previewCanvas) return;
    DOM.clear(this._previewCanvas);

    const s = this._state;

    // ── World Preview Card ──────────────────────────────────
    const card = DOM.el('div', { class: 'wce-world-preview-card' });

    // Cover
    if (s.coverDataUrl) {
      const img = DOM.el('img', { class: 'wce-preview-cover', src: s.coverDataUrl, alt: 'Cover' });
      card.appendChild(img);
    } else {
      const placeholder = DOM.el('div', { class: 'wce-preview-cover-placeholder' });
      placeholder.style.background = `linear-gradient(135deg, ${this._darken(s.accentColor, 60)}, ${this._darken(s.accentColor, 40)}, ${this._darken(s.accentColor, 70)})`;
      placeholder.appendChild(DOM.el('i', { class: 'bi bi-globe-americas', style: { fontSize: '40px', color: `${s.accentColor}55` } }));
      card.appendChild(placeholder);
    }

    const cardBody = DOM.el('div', { class: 'wce-preview-card-body' });

    const cardHeader = DOM.el('div', { class: 'wce-preview-card-header' });

    // Logo
    if (s.logoDataUrl) {
      const logoWrap = DOM.el('div', { class: 'wce-preview-logo' });
      logoWrap.appendChild(DOM.el('img', { src: s.logoDataUrl, alt: 'Logo' }));
      cardHeader.appendChild(logoWrap);
    } else {
      const logoPlaceholder = DOM.el('div', { class: 'wce-preview-logo-placeholder', style: { color: s.accentColor } },
        document.createTextNode(s.title ? s.title.charAt(0).toUpperCase() : 'W')
      );
      cardHeader.appendChild(logoPlaceholder);
    }

    const info = DOM.el('div', { class: 'wce-preview-info' });

    const titleEl = DOM.el('h3', { class: 'wce-preview-world-title', style: { color: s.textGold || s.accentColor } },
      s.title || 'Unnamed World'
    );

    const authorEl = DOM.el('div', { class: 'wce-preview-author' },
      document.createTextNode(`by ${s.author || 'Unknown'}`)
    );

    info.appendChild(titleEl);
    info.appendChild(authorEl);
    cardHeader.appendChild(info);
    cardBody.appendChild(cardHeader);

    // Tags
    if (s.tags.length > 0) {
      const tagsRow = DOM.el('div', { class: 'wce-preview-tags' });
      s.tags.slice(0, 4).forEach(tag => {
        const pill = DOM.el('div', { class: 'wce-preview-tag', style: { color: s.accentColor, borderColor: `${s.accentColor}44` } }, tag);
        tagsRow.appendChild(pill);
      });
      cardBody.appendChild(tagsRow);
    }

    // Description
    if (s.description) {
      const desc = DOM.el('p', { class: 'wce-preview-desc' }, s.description);
      cardBody.appendChild(desc);
    }

    card.appendChild(cardBody);
    this._previewCanvas.appendChild(card);

    // ── Step-specific extras ────────────────────────────────
    if (this._step === 3 && s.rawMarkdown) {
      // Show TOC preview
      const headings = (s.rawMarkdown.match(/^#{1,3} .+/gm) || []).map(h => {
        const m = h.match(/^(#{1,3}) (.+)/);
        return m ? { level: m[1].length, text: m[2].trim() } : null;
      }).filter(Boolean);

      if (headings.length > 0) {
        const tocWrap = DOM.el('div', { class: 'wce-toc-preview' });
        tocWrap.appendChild(DOM.el('div', { class: 'wce-toc-title' }, 'Sidebar Index Preview'));
        const list = DOM.el('ul', { class: 'wce-toc-list' });
        headings.slice(0, 12).forEach(h => {
          const item = DOM.el('li', { class: `wce-toc-item${h.level === 3 ? ' h3-item' : ''}` }, h.text);
          list.appendChild(item);
        });
        tocWrap.appendChild(list);
        this._previewCanvas.appendChild(tocWrap);
      }
    }

    if (this._step === 4 && s.seededCharacters.length > 0) {
      // Preview seeded character count
      const charsSummary = DOM.el('div', {
        style: {
          padding: '12px 16px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-md)',
          fontSize: 'var(--fs-xs)',
          color: 'var(--text-secondary)',
          width: '100%',
          maxWidth: '380px',
        }
      },
        DOM.el('div', { style: { color: 'var(--accent-gold)', fontWeight: '600', marginBottom: '8px', fontSize: 'var(--fs-xxs)', textTransform: 'uppercase', letterSpacing: '0.06em' } }, `${s.seededCharacters.length} Character${s.seededCharacters.length > 1 ? 's' : ''} Seeded`),
        ...s.seededCharacters.map(c => DOM.el('div', { style: { padding: '4px 0', borderBottom: '1px solid var(--border-color)' } },
          DOM.el('span', { style: { color: 'var(--text-primary)', fontWeight: '500' } }, c.name),
          DOM.el('span', { style: { color: 'var(--text-muted)', marginLeft: '8px' } }, `— ${c.occupation}`)
        ))
      );
      this._previewCanvas.appendChild(charsSummary);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Navigation
  // ───────────────────────────────────────────────────────────────────────────

  _goNext() {
    if (!this._validateStep()) return;
    if (this._step < this._totalSteps) {
      this._step++;
      this._renderStep();
    }
  }

  _goBack() {
    if (this._step > 1) {
      this._step--;
      this._renderStep();
    }
  }

  _validateStep() {
    const s = this._state;
    if (this._step === 1) {
      if (!s.title.trim()) {
        this._showToast('Please enter a World Title before proceeding.', 'error');
        document.getElementById('wce-title-input')?.focus();
        return false;
      }
      if (!s.worldId.trim()) {
        this._showToast('A World ID is required to continue.', 'error');
        document.getElementById('wce-id-input')?.focus();
        return false;
      }
      if (s.description.length > 280) {
        this._showToast('Description must not exceed 280 characters.', 'error');
        return false;
      }
      // Check for duplicate IDs
      const existing = stateManager.getState('customWorlds') || [];
      if (existing.some(w => w.id === s.worldId)) {
        this._showToast(`A world with ID "${s.worldId}" already exists. Please choose a different ID.`, 'error');
        return false;
      }
    }
    return true;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // World Construction & Export
  // ───────────────────────────────────────────────────────────────────────────

  _generateThemeCSS() {
    const s = this._state;
    const accentHex = s.accentColor;
    const [r, g, b] = this._hexToRgb(accentHex);
    const glowHex = s.accentGlow;

    return `:root {
  --primary-accent: ${accentHex};
  --primary-accent-rgb: ${r}, ${g}, ${b};
  --accent: ${accentHex};
  --accent-rgb: ${r}, ${g}, ${b};
  --bg-hero-overlay: ${s.heroOverlay};
  --text-gold: ${s.textGold};
  --card-bg: ${s.cardBg};
  --accent-glow: ${glowHex};
  --text-primary: ${s.textPrimary};
  --font-serif: ${s.fontSerif};
  --font-sans: ${s.fontSans};
}

.world-theme {
  --primary-accent: ${accentHex};
  --primary-accent-rgb: ${r}, ${g}, ${b};
  --accent: ${accentHex};
  --bg-hero-overlay: ${s.heroOverlay};
  --text-gold: ${s.textGold};
  --card-bg: ${s.cardBg};
  --accent-glow: ${glowHex};
  --text-primary: ${s.textPrimary};
  --font-serif: ${s.fontSerif};
  --font-sans: ${s.fontSans};
}
`;
  }

  _compileManifest() {
    const s = this._state;
    const currentUser = stateManager.getState('currentUser');

    const worldJson = {
      id: s.worldId,
      title: s.title,
      author: s.author || currentUser?.username || 'Unknown',
      collaborators: [s.author || currentUser?.username || 'Unknown'],
      description: s.description || 'A new realm of endless possibilities.',
      genres: s.tags.length > 0 ? s.tags : ['multiverse'],
      coverImage: s.coverDataUrl ? 'images/cover.avif' : 'images/cover.avif',
      logo: s.logoDataUrl ? 'logo.avif' : '',
      theme: 'style.css',
      lore: 'lore.md',
      botCount: s.seededCharacters.length,
      hoverPreview: false,
      featuredBots: s.seededCharacters.map(c => c.id),
    };

    const libraryJson = {};
    s.libraryTerms.forEach(t => {
      if (t.term) {
        libraryJson[t.term] = {
          definition: t.definition || '',
          subpage: t.subpage || ''
        };
      }
    });

    const themeCSS = this._generateThemeCSS();
    const loreMd = s.rawMarkdown || `# ${s.title}\n\n${s.description}\n`;

    return {
      worldJson,
      themeCSS,
      loreMd,
      libraryJson,
      coverDataUrl: s.coverDataUrl,
      logoDataUrl: s.logoDataUrl,
    };
  }

  async _constructWorld() {
    if (!this._validateStep()) return;

    const s = this._state;
    const manifest = this._compileManifest();

    // 1. Save to stateManager.customWorlds
    const worldObj = {
      ...manifest.worldJson,
      path: `Worlds/${s.worldId}`,
      accentColor: s.accentColor,
      coverImage: s.coverDataUrl || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
      logo: s.logoDataUrl || '',
      custom: true,
    };

    const customWorlds = stateManager.getState('customWorlds') || [];
    customWorlds.push(worldObj);
    stateManager.setState('customWorlds', customWorlds);

    // 2. Seed characters into customCharacters
    if (s.seededCharacters.length > 0) {
      const customChars = stateManager.getState('customCharacters') || [];
      s.seededCharacters.forEach(char => {
        const charObj = {
          id: char.id,
          name: char.name,
          worldId: s.worldId,
          worldTitle: s.title,
          description: char.description || 'A resident of this world.',
          genres: [char.occupation || 'Resident'],
          avatar: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="${encodeURIComponent(s.accentColor)}33"/><text x="50" y="55" fill="${encodeURIComponent(s.accentColor)}" font-size="32" font-family="Outfit" text-anchor="middle">${char.name.charAt(0).toUpperCase()}</text></svg>`,
          cardImage: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="180" viewBox="0 0 120 180"><rect width="100%" height="100%" fill="${encodeURIComponent(s.accentColor)}22"/><text x="60" y="95" fill="${encodeURIComponent(s.accentColor)}" font-size="24" font-family="Outfit" text-anchor="middle">${char.name.charAt(0).toUpperCase()}</text></svg>`,
          metadata: { character: char.occupation || 'Resident', status: char.status || 'Active' },
          status: 'public',
          custom: true,
        };
        if (!customChars.some(c => c.id === charObj.id)) {
          customChars.push(charObj);
        }
      });
      stateManager.setState('customCharacters', customChars);
    }

    // 3. Log activity
    const activities = stateManager.getState('worldActivities') || [];
    activities.unshift({
      id: 'act_' + Date.now(),
      worldId: s.worldId,
      author: s.author,
      action: 'created',
      details: `${s.title} world constructed via Engine`,
      timestamp: 'Just now'
    });
    stateManager.setState('worldActivities', activities);

    // 4. Offer ZIP download
    this._offerDownload(manifest);

    // 5. Close and navigate
    this._close(true);

    // Brief delay so navigation happens after overlay removal
    setTimeout(() => {
      router.navigate(`/world/${s.worldId}`);
    }, 200);
  }

  _offerDownload(manifest) {
    // Build downloadable files as a single manifest JSON for inspection
    // (or trigger JSZip if available)
    const files = {
      'world.json': JSON.stringify(manifest.worldJson, null, 2),
      'style.css': manifest.themeCSS,
      'lore.md': manifest.loreMd,
      'library.json': JSON.stringify(manifest.libraryJson, null, 2),
    };

    if (typeof JSZip !== 'undefined') {
      // JSZip available — create real ZIP
      const zip = new JSZip();
      const folder = zip.folder(this._state.worldId);
      Object.entries(files).forEach(([name, content]) => {
        folder.file(name, content);
      });
      if (manifest.coverDataUrl) {
        const coverBase64 = manifest.coverDataUrl.split(',')[1];
        folder.folder('images').file('cover.avif', coverBase64, { base64: true });
      }
      if (manifest.logoDataUrl) {
        const logoBase64 = manifest.logoDataUrl.split(',')[1];
        folder.file('logo.avif', logoBase64, { base64: true });
      }
      zip.generateAsync({ type: 'blob' }).then(blob => {
        this._triggerDownload(blob, `${this._state.worldId}.zip`);
      });
    } else {
      // Fallback: download world.json only
      const blob = new Blob([files['world.json']], { type: 'application/json' });
      this._triggerDownload(blob, `${this._state.worldId}-world.json`);
    }
  }

  _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Utility helpers
  // ───────────────────────────────────────────────────────────────────────────

  _makeSection(icon, title) {
    const section = DOM.el('div', { class: 'wce-section' });
    const sectionTitle = DOM.el('div', { class: 'wce-section-title' },
      DOM.el('i', { class: `bi ${icon}` }),
      document.createTextNode(title)
    );
    section.appendChild(sectionTitle);
    return section;
  }

  _makeField(label, sublabel = '') {
    const field = DOM.el('div', { class: 'wce-field' });
    if (label) {
      const lbl = DOM.el('label', {}, label);
      if (sublabel) {
        lbl.appendChild(DOM.el('span', {}, sublabel));
      }
      field.appendChild(lbl);
    }
    return field;
  }

  _showToast(msg, type = 'info') {
    const toast = DOM.el('div', {
      style: {
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: type === 'error' ? '#7f1d1d' : '#1a2a1a',
        border: `1px solid ${type === 'error' ? '#ef4444' : '#22c55e'}`,
        borderRadius: 'var(--border-radius-sm)',
        color: '#fff',
        padding: '10px 20px',
        fontSize: 'var(--fs-sm)',
        zIndex: '9999',
        boxShadow: 'var(--shadow-md)',
        animation: 'wce-shell-in 0.2s ease',
        maxWidth: '400px',
        textAlign: 'center',
      }
    }, msg);
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  _showFieldError(inputEl, msg) {
    inputEl.style.borderColor = '#ef4444';
    inputEl.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.1)';
    inputEl.focus();
    setTimeout(() => {
      inputEl.style.borderColor = '';
      inputEl.style.boxShadow = '';
    }, 2500);
    this._showToast(msg, 'error');
  }

  _hexify(color) {
    if (!color) return '#000000';
    if (color.startsWith('#') && (color.length === 4 || color.length === 7)) return color;
    // Return a safe fallback
    return '#c5a059';
  }

  _darken(hex, amount = 50) {
    try {
      const [r, g, b] = this._hexToRgb(hex);
      return `rgb(${Math.max(0, r - amount)}, ${Math.max(0, g - amount)}, ${Math.max(0, b - amount)})`;
    } catch { return '#000000'; }
  }

  _hexToRgb(hex) {
    const clean = (hex || '#000000').replace('#', '');
    if (clean.length === 3) {
      const r = parseInt(clean[0] + clean[0], 16);
      const g = parseInt(clean[1] + clean[1], 16);
      const b = parseInt(clean[2] + clean[2], 16);
      return [r, g, b];
    }
    if (clean.length === 6) {
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      return [r, g, b];
    }
    return [0, 0, 0];
  }

  _close(wasConstructed = false) {
    if (this._overlay) {
      this._overlay.style.animation = 'wce-overlay-in 0.2s ease reverse';
      setTimeout(() => {
        this._overlay?.remove();
        this._overlay = null;
      }, 180);
    }
    if (this._resolvePromise) {
      this._resolvePromise(wasConstructed);
      this._resolvePromise = null;
    }
  }
}

export default WorldCreationEngine;
