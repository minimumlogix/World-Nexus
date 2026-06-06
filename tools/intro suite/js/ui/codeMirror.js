import { state, THEMES, MUSIC_BASE, LORE_BASE } from '../state.js';
import { debounce, saveToLocalStorage, showToast } from '../utils.js';
import { renderCanvas } from './canvas.js';

let _cmInitAttempted = false;

export function getThemeURL() {
  const themeSelect = document.getElementById('theme-select');
  const theme = themeSelect ? themeSelect.value : 'vn_red1';
  return THEMES[theme] || THEMES.vn_red1;
}

export function getDialogueRawText() {
  const ed = document.getElementById('dialogue-editor');
  if (!ed) return state.dialogueContent;
  return ed.innerHTML;
}

export function generateFullCode(minify = false) {
  let code = '';
  code += `<link href="${getThemeURL()}" rel="stylesheet">`;
  if (!minify) code += '\n';

  state.elements.forEach(elem => {
    if (elem.type === 'music') {
      const frag = `<iframe allow="autoplay; encrypted-media" src="${elem.src}" style="width:100%;height:75px;border:none"></iframe>`;
      code += minify ? frag : frag + '\n';
    }
    if (elem.type === 'image') {
      const frag = `<div class="vn-image-wrapper"><img src="${elem.url}"${elem.alt ? ` alt="${elem.alt}"` : ''}></div>`;
      code += minify ? frag : frag + '\n';
    }
    if (elem.type === 'character') {
      const cls = elem.cls ? ` class="${elem.cls} vn-character"` : ' class="vn-character"';
      const frag = `<div class="vn-character-container"${elem.bg ? ` style="background-image:url(${elem.bg})"` : ''}><div class="vn-character-group"><div class="vn-character-name">${elem.name || ''}</div><img alt="${elem.name || ''}"${cls} src="${elem.sprite || ''}"></div></div>`;
      code += minify ? frag : frag + '\n';
    }
    if (elem.type === 'vn') {
      const frag = `<iframe allow="autoplay; encrypted-media" src="${elem.url}" style="width:100%;height:${elem.height}px;border:none"></iframe>`;
      code += minify ? frag : frag + '\n';
    }
    if (elem.type === 'lore') {
      const frag = `<details class="vn-lore-details"><summary class="vn-lore-summary"><span>${elem.title || 'Lore Database'}</span><svg class="vn-lore-icon" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" /></svg></summary><div class="vn-lore-content"><iframe allow="autoplay; encrypted-media" src="${elem.url}" style="width:100%;height:${elem.height}px;border:none;border-radius: 5px;"></iframe></div></details>`;
      code += minify ? frag : frag + '\n';
    }
  });

  const dlgContent = getDialogueRawText();
  let dlgStyle = '';
  if (state.dialogueBg) {
    if (state.dialogueBg.startsWith('http') || state.dialogueBg.startsWith('/')) {
      dlgStyle = ` style="background-image:url(${state.dialogueBg})"`;
    } else {
      dlgStyle = ` style="background:${state.dialogueBg}"`;
    }
  }
  const dlgFrag = `<div class="vn-dialogue-box"${dlgStyle}><div class="vn-dialogue-content">\n\n${dlgContent}\n</div></div>`;
  code += minify ? dlgFrag.replace(/\s+/g, ' ') : dlgFrag;

  return code;
}

// Synchronizes Code Editor view to the Visual layout
export function syncFromCode() {
  if (!state.cmEditor) return;
  const val = getCMValue();
  parseCodeToElements(val);
  renderCanvas();
  setCodeStatus('live');
  showToast('✓ Applied from code editor');
}

// Format the code in editor
export function prettifyCode() {
  if (!state.cmEditor) return;
  let code = getCMValue();
  code = code
    .replace(/>[ \t]*</g, '>\n<')
    .replace(/>\n<\//g, '></')
    .trim();

  let indent = 0;
  code = code.split('\n').map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('</')) indent = Math.max(0, indent - 1);
    const result = '  '.repeat(indent) + trimmed;
    if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.startsWith('<br') && !trimmed.startsWith('<hr') && !trimmed.startsWith('<img') && !trimmed.startsWith('<link') && !trimmed.startsWith('<meta') && !trimmed.endsWith('/>') && !trimmed.startsWith('<!')) indent++;
    return result;
  }).join('\n');
  
  setCMValue(code);
}

// Parse generated code block back to model state array
export function parseCodeToElements(code) {
  state.elements = [];
  state.dialogueBg = '';
  state.dialogueContent = '';

  // Parse music iframes
  const musicRe = /src="(https:\/\/minimumlogix\.github\.io\/VN_Engine\/apps\/music\/mw\?[^"]+)"/g;
  let m;
  while ((m = musicRe.exec(code)) !== null) {
    const src = m[1];
    const vidM = src.match(/v=([^&]+)/);
    const apM = src.match(/ap=(\d)/);
    const volM = src.match(/vol=(\d+)/);
    state.elements.push({
      id: Date.now() + Math.random(),
      type: 'music',
      src,
      vid: vidM ? vidM[1] : '',
      autoplay: apM ? apM[1] === '1' : false,
      vol: volM ? volM[1] : '100',
      volmem: !volM,
      label: `YouTube: ${vidM ? vidM[1] : '?'}`
    });
  }

  // Parse character containers
  const charRe = /<div class="vn-character-container"[^>]*>([\s\S]*?)<\/div><\/div><\/div>/g;
  while ((m = charRe.exec(code)) !== null) {
    const full = m[0];
    const bgM = full.match(/background-image:url\(([^)]+)\)/);
    const nameM = full.match(/class="vn-character-name">([^<]+)</);
    const spriteM = full.match(/src="([^"]+)"/);
    const clsM = full.match(/class="([^"]*vn-character[^"]*)"/);
    state.elements.push({
      id: Date.now() + Math.random(),
      type: 'character',
      bg: bgM ? bgM[1] : '',
      name: nameM ? nameM[1] : '',
      sprite: spriteM ? spriteM[1] : '',
      cls: clsM ? clsM[1].replace('vn-character', '').trim() : 'speaking'
    });
  }

  // Parse images
  const imgRe = /<div class="vn-image-wrapper"><img src="([^"]+)"([^>]*)>/g;
  while ((m = imgRe.exec(code)) !== null) {
    const altM = m[2].match(/alt="([^"]*)"/);
    state.elements.push({ id: Date.now() + Math.random(), type: 'image', url: m[1], alt: altM ? altM[1] : '' });
  }

  // Parse lore
  const loreRe = /<details class="vn-lore-details">[\s\S]*?<span>([^<]+)<\/span>[\s\S]*?src="([^"]+)"[\s\S]*?height:(\d+)px[\s\S]*?<\/details>/g;
  while ((m = loreRe.exec(code)) !== null) {
    state.elements.push({ id: Date.now() + Math.random(), type: 'lore', title: m[1], url: m[2], height: m[3] });
  }

  // Parse dialogue box
  const dlgM = code.match(/<div class="vn-dialogue-box"([^>]*)><div class="vn-dialogue-content">([\s\S]*?)<\/div><\/div>/);
  if (dlgM) {
    const styleM = dlgM[1].match(/style="([^"]*)"/);
    if (styleM) {
      const bgM2 = styleM[1].match(/background(?:-image)?:url\(([^)]+)\)/);
      state.dialogueBg = bgM2 ? bgM2[1] : styleM[1].replace('background:', '').trim();
    }
    state.dialogueContent = dlgM[2].trim();
  }
}

// Debounced sync loops
export const scheduleCodeSync = debounce(() => {
  if (state._suppressCodeSync) return;
  state._suppressCodeSync = true;
  updateCodeEditor();
  state._suppressCodeSync = false;
  
  if (state.outPanelOpen) {
    const { updateOutput } = window.App || {};
    if (updateOutput) updateOutput();
  }
  updateCodeInfoBadge();
}, 150);

export const scheduleDesignSync = debounce(() => {
  if (!state.cmEditor) return;
  setCodeStatus('syncing');
  const val = getCMValue();
  parseCodeToElements(val);
  renderCanvas();
  setCodeStatus('live');
  updateCodeInfoBadge();
}, 600);

export function setCodeStatus(status) {
  const badge = document.getElementById('code-status-badge');
  const text = document.getElementById('code-status-text');
  if (!badge || !text) return;
  badge.className = 'code-status-badge ' + status;
  text.textContent = status === 'live' ? 'Live' : 'Syncing…';
}

export function updateCodeInfoBadge() {
  const el = document.getElementById('code-info-text');
  if (!el || !state.cmEditor) return;
  const doc = state.cmEditor.state.doc;
  const lines = doc.lines;
  const bytes = Math.round(doc.length / 1024 * 10) / 10;
  el.textContent = `${lines} lines · ${bytes} KB`;
}

export function getCMValue() {
  if (!state.cmEditor) return '';
  if (state.cmEditor._isFallback) return state.cmEditor._ta.value;
  return state.cmEditor.state.doc.toString();
}

export function setCMValue(code) {
  if (!state.cmEditor) return;
  if (state.cmEditor._isFallback) {
    state.cmEditor._ta.value = code;
    const lines = code.split('\n').length;
    const bytes = Math.round(code.length / 1024 * 10) / 10;
    const infoEl = document.getElementById('code-info-text');
    if (infoEl) infoEl.textContent = `${lines} lines · ${bytes} KB`;
    return;
  }
  state._suppressCodeSync = true;
  state.cmEditor.dispatch({
    changes: { from: 0, to: state.cmEditor.state.doc.length, insert: code }
  });
  state._suppressCodeSync = false;
  updateCodeInfoBadge();
}

export function updateCodeEditor() {
  if (!state.cmEditor) return;
  const code = generateFullCode(false);
  setCMValue(code);
}

// Asynchronously load CodeMirror 6 resources or fallback to a regular textarea
export function initCodeMirror() {
  const wrap = document.getElementById('code-editor-wrap');
  if (!wrap || state.cmEditor) return;

  const CM = window.CM;

  // Fallback: If modules aren't available, build a styled textarea
  if (!CM || !CM.EditorView) {
    if (_cmInitAttempted) return;
    _cmInitAttempted = true;
    
    const ta = document.createElement('textarea');
    ta.id = 'code-editor-textarea';
    ta.style.cssText = 'flex:1;resize:none;background:var(--bg);color:#c0e0ff;font-family:var(--font-mono);font-size:13px;line-height:1.7;padding:20px 24px;border:none;outline:none;overflow-y:auto;tab-size:2;width:100%;height:100%;';
    ta.placeholder = 'Paste or type your intro code here...';
    wrap.appendChild(ta);
    
    ta.addEventListener('input', () => {
      setCodeStatus('syncing');
      if (state._designSyncTimer) clearTimeout(state._designSyncTimer);
      state._designSyncTimer = setTimeout(() => {
        parseCodeToElements(ta.value);
        renderCanvas();
        setCodeStatus('live');
        updateCodeInfoBadge();
      }, 600);
      
      const lines = ta.value.split('\n').length;
      const bytes = Math.round(ta.value.length / 1024 * 10) / 10;
      const infoEl = document.getElementById('code-info-text');
      if (infoEl) infoEl.textContent = `${lines} lines · ${bytes} KB`;
    });
    
    ta.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = ta.selectionStart, end = ta.selectionEnd;
        ta.value = ta.value.substring(0, s) + '  ' + ta.value.substring(end);
        ta.selectionStart = ta.selectionEnd = s + 2;
      }
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        syncFromCode();
      }
    });
    
    state.cmEditor = {
      state: {
        get doc() {
          return {
            toString: () => ta.value,
            get lines() { return ta.value.split('\n').length; },
            get length() { return ta.value.length; }
          };
        }
      },
      dispatch: () => {},
      _ta: ta,
      _isFallback: true
    };
    return;
  }

  // CM6 initialized using window.CM exposed extensions
  _cmInitAttempted = true;
  try {
    const {
      EditorState, EditorView, keymap, lineNumbers, highlightActiveLine,
      highlightActiveLineGutter, drawSelection, defaultKeymap, historyKeymap,
      history: cmHistory, indentWithTab, html, syntaxHighlighting,
      defaultHighlightStyle, foldGutter, indentOnInput, bracketMatching,
      autocompletion, closeBrackets,
    } = CM;

    const startDoc = generateFullCode(false);

    const updateListener = EditorView.updateListener.of(update => {
      if (update.docChanged && !state._suppressCodeSync) {
        setCodeStatus('syncing');
        scheduleDesignSync();
      }
    });

    const cmState = EditorState.create({
      doc: startDoc,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        foldGutter(),
        drawSelection(),
        cmHistory(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        html(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView.theme({ '&': { background: 'var(--bg)', color: '#c0e0ff' } }),
        updateListener,
        EditorView.lineWrapping,
      ]
    });

    state.cmEditor = new EditorView({ state: cmState, parent: wrap });
    updateCodeInfoBadge();
  } catch (err) {
    console.warn('CodeMirror 6 init failed, falling back to textarea:', err);
    state.cmEditor = null;
    _cmInitAttempted = false;
    window.CM = null; // force textarea fallback
    initCodeMirror();
  }
}
