/* ===========================
   SCRIPT ENGINE - WORLD NEXUS
   =========================== */

import { DOM } from '../utils/DOM.js';

/* ===========================
   CONSTANTS & CONFIGURATION
   =========================== */
const DEFAULT_TYPEWRITER_SPEED = 28; // ms per char
const FAST_TYPEWRITER_SPEED = 10;
const AUTO_PLAY_DELAY = 2400; // ms to pause after line completes before advancing

/* ===========================
   SCRIPT PARSER
   =========================== */
export class ScriptParser {
  /**
   * Parses raw script string or markdown lines into executable scene steps.
   * Format syntax supported:
   *   [Speaker Name] Text message payload...
   *   @bg: image_path_or_url
   *   @sprite: image_path_or_url
   *   @music: audio_path_or_url
   *   @sound: sfx_path_or_url
   *   ? Choice Label -> @goto: scene_id
   *   # Scene Header
   * @param {string} rawScript
   * @param {Object} [defaults={}]
   * @returns {Array<Object>}
   */
  static parse(rawScript, defaults = {}) {
    if (!rawScript || typeof rawScript !== 'string') return [];

    const lines = rawScript.split('\n');
    const steps = [];
    let currentSpeaker = defaults.speaker || 'Narrator';
    let currentBg = defaults.bg || '';
    let currentSprite = defaults.sprite || '';
    let currentMusic = defaults.music || '';
    let choices = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('//') || line.startsWith('<!--')) continue;

      // Command Directive: @bg: url
      if (line.startsWith('@bg:')) {
        currentBg = line.substring(4).trim();
        continue;
      }
      // Command Directive: @sprite: url
      if (line.startsWith('@sprite:')) {
        currentSprite = line.substring(8).trim();
        continue;
      }
      // Command Directive: @music: url
      if (line.startsWith('@music:')) {
        currentMusic = line.substring(7).trim();
        continue;
      }

      // Choice Item: ? Option Label -> target
      if (line.startsWith('?')) {
        const choiceMatch = line.match(/\?\s*(.+?)\s*->\s*(.+)/);
        if (choiceMatch) {
          choices.push({
            label: choiceMatch[1].trim(),
            target: choiceMatch[2].trim()
          });
        }
        continue;
      }

      // If choices collected, attach choices to previous step or create choice step
      if (choices.length > 0 && !line.startsWith('?')) {
        steps.push({
          type: 'choice',
          choices: [...choices],
          speaker: currentSpeaker,
          bg: currentBg,
          sprite: currentSprite
        });
        choices = [];
      }

      // Speaker Tag: [Speaker Name] Text...
      const speakerMatch = line.match(/^\[([^\]]+)\]\s*(.*)/);
      if (speakerMatch) {
        currentSpeaker = speakerMatch[1].trim();
        const textContent = speakerMatch[2].trim();
        if (textContent) {
          steps.push({
            type: 'dialogue',
            speaker: currentSpeaker,
            text: textContent,
            bg: currentBg,
            sprite: currentSprite,
            music: currentMusic
          });
        }
        continue;
      }

      // Header or Scene Divider
      if (line.startsWith('#')) {
        steps.push({
          type: 'scene_header',
          title: line.replace(/^#+\s*/, ''),
          bg: currentBg
        });
        continue;
      }

      // Markdown Quote or Regular Text Line
      const cleanText = line.replace(/^>\s*/, '').replace(/[\*_]{1,2}/g, '');
      if (cleanText.length > 0) {
        steps.push({
          type: 'dialogue',
          speaker: currentSpeaker,
          text: cleanText,
          bg: currentBg,
          sprite: currentSprite,
          music: currentMusic
        });
      }
    }

    // Trailing choices if any
    if (choices.length > 0) {
      steps.push({
        type: 'choice',
        choices: [...choices],
        speaker: currentSpeaker,
        bg: currentBg,
        sprite: currentSprite
      });
    }

    return steps;
  }
}

/* ===========================
   SCRIPT ENGINE EXECUTION CLASS
   =========================== */
export class ScriptEngine {
  /**
   * Main launcher for the Script Engine overlay modal.
   * @param {Object} bot - Character object
   * @param {Object} world - Parent world object
   */
  static launch(bot, world) {
    const rawScript = bot.rawScenarioMarkdown || bot.scenario || `[${bot.name}] Greetings, traveler. Welcome to ${world ? world.title : 'the Nexus'}.\nWhat brings you to my domain today?`;
    
    // Default image fallbacks
    const defaults = {
      speaker: bot.name,
      bg: world ? `${world.path}/${world.coverImage}` : '',
      sprite: bot.sprite ? `${world.path}/${bot.sprite}` : (bot.cardImage ? (bot.cardImage.startsWith('http') || bot.cardImage.startsWith('data:') ? bot.cardImage : `${world.path}/${bot.cardImage}`) : ''),
      music: ''
    };

    const steps = ScriptParser.parse(rawScript, defaults);
    
    // If parsed steps empty, provide rich default scene
    if (steps.length === 0) {
      steps.push({
        type: 'dialogue',
        speaker: bot.name,
        text: bot.description || `Welcome to ${world.title}. I am ${bot.name}. Let us begin our encounter.`,
        bg: defaults.bg,
        sprite: defaults.sprite
      });
    }

    const engine = new ScriptEngine(bot, world, steps, defaults);
    engine.renderOverlay();
  }

  constructor(bot, world, steps = [], defaults = {}) {
    this.bot = bot;
    this.world = world;
    this.steps = steps;
    this.defaults = defaults;
    this.currentIndex = 0;
    
    // Runtime Engine State
    this.isPlaying = false;
    this.isAutoPlay = false;
    this.isFastForward = false;
    this.isMuted = false;
    this.isTyping = false;

    this.typewriterTimer = null;
    this.autoPlayTimer = null;
    this.audioElement = null;
    this.backlog = []; // Array of spoken lines: { speaker, text }
  }

  /* ===========================
     UI BUILDING & RENDERING
     =========================== */
  renderOverlay() {
    // Remove existing script overlays
    document.querySelectorAll('.script-engine-overlay').forEach(el => el.remove());

    const overlay = DOM.el('div', { class: 'script-engine-overlay fade-in' });
    this.overlay = overlay;

    // Background Container
    const bgContainer = DOM.el('div', { class: 'script-bg-container' });
    this.bgContainer = bgContainer;
    if (this.defaults.bg) {
      bgContainer.style.backgroundImage = `url('${this.defaults.bg}')`;
    }

    // Top Controls Toolbar
    const topToolbar = this.buildTopToolbar();

    // Sprite Character Frame
    const spriteFrame = DOM.el('div', { class: 'script-sprite-frame' });
    const spriteImg = DOM.el('img', { 
      class: 'script-sprite-img', 
      src: this.defaults.sprite || '', 
      alt: this.bot.name,
      onerror: (e) => { e.target.style.display = 'none'; }
    });
    spriteFrame.appendChild(spriteImg);
    this.spriteImg = spriteImg;
    this.spriteFrame = spriteFrame;

    // Dialogue Box Wrapper
    const dialogueBox = this.buildDialogueBox();

    // Assemble Overlay
    overlay.appendChild(bgContainer);
    overlay.appendChild(topToolbar);
    overlay.appendChild(spriteFrame);
    overlay.appendChild(dialogueBox);

    document.body.appendChild(overlay);

    // Keyboard controls
    this.keyHandler = (e) => {
      if (e.key === 'Escape') {
        this.destroy();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.handleNext();
      }
    };
    document.addEventListener('keydown', this.keyHandler);

    // Initial scene step load
    this.loadStep(0);
  }

  buildTopToolbar() {
    const title = `${this.bot.name} — Interactive Scenario`;

    const backlogBtn = DOM.el('button', {
      class: 'script-tool-btn',
      title: 'View History / Backlog',
      onclick: () => this.showBacklogModal()
    }, DOM.el('i', { class: 'bi bi-journal-text' }), 'Backlog');

    const autoBtn = DOM.el('button', {
      class: 'script-tool-btn',
      title: 'Toggle Auto-Play',
      onclick: (e) => {
        this.isAutoPlay = !this.isAutoPlay;
        e.currentTarget.classList.toggle('active', this.isAutoPlay);
        if (this.isAutoPlay && !this.isTyping) {
          this.scheduleAutoPlayNext();
        }
      }
    }, DOM.el('i', { class: 'bi bi-play-circle-fill' }), 'Auto');

    const speedBtn = DOM.el('button', {
      class: 'script-tool-btn',
      title: 'Toggle Speed',
      onclick: (e) => {
        this.isFastForward = !this.isFastForward;
        e.currentTarget.classList.toggle('active', this.isFastForward);
      }
    }, DOM.el('i', { class: 'bi bi-fast-forward-fill' }), 'Speed');

    const closeBtn = DOM.el('button', {
      class: 'script-tool-btn script-close-btn',
      title: 'Close Script Engine (Esc)',
      onclick: () => this.destroy()
    }, DOM.el('i', { class: 'bi bi-x-lg' }));

    return DOM.el('div', { class: 'script-top-toolbar' },
      DOM.el('div', { class: 'script-title-block' },
        DOM.el('i', { class: 'bi bi-controller', style: { color: 'var(--accent-gold, #c5a059)' } }),
        DOM.el('span', { class: 'script-header-title' }, title)
      ),
      DOM.el('div', { class: 'script-tools-group' },
        backlogBtn,
        autoBtn,
        speedBtn,
        closeBtn
      )
    );
  }

  buildDialogueBox() {
    const speakerBadge = DOM.el('div', { class: 'script-speaker-badge' }, this.bot.name);
    this.speakerBadge = speakerBadge;

    const textContent = DOM.el('div', { class: 'script-dialogue-text' });
    this.textContent = textContent;

    const choiceContainer = DOM.el('div', { class: 'script-choice-container', style: { display: 'none' } });
    this.choiceContainer = choiceContainer;

    const continuePrompt = DOM.el('div', { class: 'script-continue-prompt' },
      DOM.el('span', {}, 'Click to continue'),
      DOM.el('i', { class: 'bi bi-caret-down-fill' })
    );
    this.continuePrompt = continuePrompt;

    const box = DOM.el('div', { 
      class: 'script-dialogue-box glass-panel',
      onclick: (e) => {
        if (!this.choiceContainer.contains(e.target)) {
          this.handleNext();
        }
      }
    },
      speakerBadge,
      textContent,
      choiceContainer,
      continuePrompt
    );

    return box;
  }

  /* ===========================
     EXECUTION ENGINE LOGIC
     =========================== */
  loadStep(index) {
    if (index < 0 || index >= this.steps.length) {
      this.finishScript();
      return;
    }

    this.currentIndex = index;
    const step = this.steps[index];

    // Clear auto-play timer
    if (this.autoPlayTimer) {
      clearTimeout(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }

    // Update Speaker
    if (this.speakerBadge) {
      this.speakerBadge.textContent = step.speaker || this.bot.name;
    }

    // Update Background if specified
    if (step.bg && this.bgContainer) {
      this.bgContainer.style.backgroundImage = `url('${step.bg}')`;
    }

    // Update Sprite if specified
    if (step.sprite && this.spriteImg) {
      this.spriteImg.src = step.sprite;
      this.spriteImg.style.display = 'block';
    }

    // Update Music if specified
    if (step.music && !this.isMuted) {
      this.playMusic(step.music);
    }

    // Handle Step Type
    if (step.type === 'choice') {
      this.renderChoices(step.choices);
    } else {
      this.choiceContainer.style.display = 'none';
      this.continuePrompt.style.display = 'flex';
      this.startTypewriter(step.text || '');

      // Log into Backlog
      this.backlog.push({
        speaker: step.speaker || this.bot.name,
        text: step.text || ''
      });
    }
  }

  startTypewriter(fullText) {
    if (this.typewriterTimer) clearInterval(this.typewriterTimer);

    this.isTyping = true;
    this.textContent.textContent = '';
    this.spriteFrame.classList.add('speaking');
    this.continuePrompt.classList.remove('ready');

    let charIndex = 0;
    const speed = this.isFastForward ? FAST_TYPEWRITER_SPEED : DEFAULT_TYPEWRITER_SPEED;

    this.typewriterTimer = setInterval(() => {
      if (charIndex < fullText.length) {
        this.textContent.textContent += fullText.charAt(charIndex);
        charIndex++;
      } else {
        this.completeTypewriter(fullText);
      }
    }, speed);
  }

  completeTypewriter(fullText) {
    if (this.typewriterTimer) {
      clearInterval(this.typewriterTimer);
      this.typewriterTimer = null;
    }
    this.textContent.textContent = fullText;
    this.isTyping = false;
    this.spriteFrame.classList.remove('speaking');
    this.continuePrompt.classList.add('ready');

    if (this.isAutoPlay) {
      this.scheduleAutoPlayNext();
    }
  }

  handleNext() {
    if (this.isTyping) {
      const step = this.steps[this.currentIndex];
      if (step && step.text) {
        this.completeTypewriter(step.text);
      }
      return;
    }

    const currentStep = this.steps[this.currentIndex];
    if (currentStep && currentStep.type === 'choice') {
      // Choice selection handles navigation
      return;
    }

    this.loadStep(this.currentIndex + 1);
  }

  renderChoices(choices = []) {
    DOM.clear(this.choiceContainer);
    this.choiceContainer.style.display = 'flex';
    this.continuePrompt.style.display = 'none';

    choices.forEach(c => {
      const btn = DOM.el('button', {
        class: 'script-choice-btn',
        onclick: (e) => {
          e.stopPropagation();
          this.handleNext();
        }
      },
        DOM.el('i', { class: 'bi bi-chat-quote-fill', style: { color: 'var(--accent-gold, #c5a059)' } }),
        DOM.el('span', {}, c.label)
      );
      this.choiceContainer.appendChild(btn);
    });
  }

  scheduleAutoPlayNext() {
    if (this.autoPlayTimer) clearTimeout(this.autoPlayTimer);
    this.autoPlayTimer = setTimeout(() => {
      if (this.isAutoPlay && !this.isTyping) {
        this.handleNext();
      }
    }, AUTO_PLAY_DELAY);
  }

  /* ===========================
     BACKLOG TRANSCRIPT MODAL
     =========================== */
  showBacklogModal() {
    const backdrop = DOM.el('div', { class: 'modal-backdrop fade-in' });
    const listNode = DOM.el('div', { class: 'script-backlog-list' });

    if (this.backlog.length === 0) {
      listNode.appendChild(DOM.el('p', { style: { color: 'var(--text-muted)' } }, 'No dialogue recorded in transcript yet.'));
    } else {
      this.backlog.forEach(item => {
        listNode.appendChild(
          DOM.el('div', { class: 'script-backlog-item' },
            DOM.el('span', { class: 'backlog-speaker' }, `${item.speaker}:`),
            DOM.el('span', { class: 'backlog-text' }, item.text)
          )
        );
      });
    }

    const card = DOM.el('div', { class: 'modal-card glass-panel script-backlog-card' },
      DOM.el('div', { class: 'modal-header' },
        DOM.el('h3', {}, 'Scenario Transcript Backlog'),
        DOM.el('button', { class: 'modal-close-btn', onclick: () => backdrop.remove() }, '×')
      ),
      DOM.el('div', { class: 'modal-body' }, listNode),
      DOM.el('div', { class: 'modal-footer' },
        DOM.el('button', { class: 'btn btn-primary', onclick: () => backdrop.remove() }, 'Close')
      )
    );

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
  }

  /* ===========================
     AUDIO & CLEANUP
     =========================== */
  playMusic(src) {
    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.loop = true;
    }
    this.audioElement.src = src;
    this.audioElement.play().catch(e => console.warn('ScriptEngine audio play blocked:', e));
  }

  finishScript() {
    if (this.textContent) {
      this.textContent.textContent = '— End of Scenario Scene —';
    }
    if (this.continuePrompt) {
      this.continuePrompt.style.display = 'none';
    }
  }

  destroy() {
    if (this.typewriterTimer) clearInterval(this.typewriterTimer);
    if (this.autoPlayTimer) clearTimeout(this.autoPlayTimer);
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
    }
    if (this.overlay) {
      this.overlay.remove();
    }
  }
}

export default ScriptEngine;
