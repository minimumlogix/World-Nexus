import { state, MUSIC_BASE } from '../state.js';
import { saveToLocalStorage, escH, markdownToHtml, htmlToMarkdown } from '../utils.js';
import { scheduleCodeSync } from './codeMirror.js';

export function renderCanvas() {
  const ci = document.getElementById('canvas-inner');
  const es = document.getElementById('empty-state');
  if (!ci) return;

  const hasElements = state.elements.length > 0;
  const hasDialogue = !!state.dialogueContent;

  if (!hasElements && !hasDialogue) {
    if (es) es.style.display = 'flex';
    ci.querySelectorAll('.elem-block').forEach(e => e.remove());
    return;
  }
  if (es) es.style.display = 'none';

  // Rebuild all elements
  ci.querySelectorAll('.elem-block').forEach(e => e.remove());
  const dlgEl = ci.querySelector('.dialogue-wrapper');
  if (dlgEl) dlgEl.remove();

  if (state.dialogueUnlocked) {
    state.elements.forEach((elem, index) => {
      if (elem.type === 'dialogue') {
        renderDialogueBlock(ci, true, index);
      } else {
        const block = document.createElement('div');
        block.className = 'elem-block';
        block.dataset.id = elem.id;
        block.setAttribute('draggable', 'true');
        block.innerHTML = buildElemHTML(elem) + buildControls(elem);
        block.addEventListener('click', (e) => {
          if (e.target.closest('.elem-ctrl-btn')) return;
          selectElem(elem.id);
        });
        attachDragListeners(block);
        ci.appendChild(block);
      }
    });
  } else {
    state.elements.forEach(elem => {
      if (elem.type !== 'dialogue') {
        const block = document.createElement('div');
        block.className = 'elem-block';
        block.dataset.id = elem.id;
        block.setAttribute('draggable', 'true');
        block.innerHTML = buildElemHTML(elem) + buildControls(elem);
        block.addEventListener('click', (e) => {
          if (e.target.closest('.elem-ctrl-btn')) return;
          selectElem(elem.id);
        });
        attachDragListeners(block);
        ci.appendChild(block);
      }
    });
    // Always render dialogue area at bottom if locked
    renderDialogueBlock(ci, false);
  }

  scheduleCodeSync();
}

export function buildElemHTML(elem) {
  const t = elem.type;
  if (t === 'music') {
    return `<div class="prev-music">
      <span class="music-icon"><i class="bi bi-music-note-beamed"></i></span>
      <div class="music-info">
        <div class="music-title">YouTube Player — ${elem.vid || 'Unknown'}</div>
        <div class="music-meta">Autoplay: ${elem.autoplay ? 'ON' : 'OFF'} · Volume: ${elem.volmem ? 'Memory' : elem.vol + '%'}</div>
      </div>
      <span style="font-size:11px;color:var(--green)">▶ iframe</span>
    </div>`;
  }
  if (t === 'image') {
    if (elem.url) {
      return `<div class="prev-image has-url"><img src="${elem.url}" alt="${elem.alt}" onerror="this.src='';this.closest('.prev-image').classList.remove('has-url');this.closest('.prev-image').innerHTML='<i class=\"bi bi-image\"></i> Image (URL not loadable in editor)'"></div>`;
    }
    return `<div class="prev-image"><i class="bi bi-image"></i> Full-Width Image</div>`;
  }
  if (t === 'character') {
    return `<div class="prev-char" style="${elem.bg ? 'background-image:url(' + elem.bg + ');background-size:cover;background-position:center' : ''}">
      <div class="prev-char-sprite-box">${elem.sprite ? `<img src="${elem.sprite}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:4px;" onerror="this.outerHTML='<i class=\"bi bi-person\"></i>'">` : '<i class="bi bi-person"></i>'}</div>
      <div class="prev-char-info">
        <div class="prev-char-name">${elem.name || 'Character Name'}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:4px">Class: ${elem.cls || 'speaking'}</div>
      </div>
    </div>`;
  }
  if (t === 'vn') {
    return `<div class="prev-iframe"><i class="bi bi-play-circle"></i> <strong style="color:var(--text)">VN Engine Frame</strong><span style="flex:1"></span><span style="font-size:11px;color:var(--text3)">${elem.height}px · ${(elem.url || '').substring(0,40)}...</span></div>`;
  }
  if (t === 'lore') {
    return `<div class="prev-lore">
      <span class="lore-icon"><i class="bi bi-database"></i></span>
      <div>
        <div class="prev-lore-title">${elem.title || 'Lore Database'}</div>
        <div style="font-size:11px;color:var(--text3)">Collapsible · ${elem.height}px iframe</div>
      </div>
    </div>`;
  }
  return `<div style="padding:12px;background:var(--bg3);border-radius:var(--radius);color:var(--text2);font-size:13px">${t}</div>`;
}

export function buildControls(elem) {
  return `<div class="elem-controls">
    <span class="elem-ctrl-drag" title="Drag to reorder" style="cursor: grab; padding: 4px; color: var(--text3); display: flex; align-items: center;"><i class="bi bi-grip-vertical"></i></span>
    <button class="elem-ctrl-btn" data-action="move-up" data-eid="${elem.id}" title="Move Up"><i class="bi bi-arrow-up"></i></button>
    <button class="elem-ctrl-btn" data-action="move-down" data-eid="${elem.id}" title="Move Down"><i class="bi bi-arrow-down"></i></button>
    <button class="elem-ctrl-btn" data-action="edit" data-eid="${elem.id}" title="Edit"><i class="bi bi-pencil"></i></button>
    <button class="elem-ctrl-btn del" data-action="delete" data-eid="${elem.id}" title="Delete"><i class="bi bi-x-lg"></i></button>
  </div>`;
}

export function renderDialogueBlock(ci, placeholder = false, positionIndex = -1) {
  const wrapper = document.createElement('div');
  wrapper.className = 'dialogue-wrapper elem-block';
  wrapper.dataset.id = 'dialogue';
  wrapper.style.marginTop = '12px';
  wrapper.setAttribute('draggable', 'true');

  const lockIcon = state.dialogueUnlocked ? 'bi-unlock-fill' : 'bi-lock-fill';
  const lockTitle = state.dialogueUnlocked ? 'Dialogue box is unlocked. Drag to rearrange.' : 'Dialogue box is locked at bottom';

  wrapper.innerHTML = `
  <div class="elem-controls">
    ${state.dialogueUnlocked ? `
      <span class="elem-ctrl-drag" title="Drag to reorder" style="cursor: grab; padding: 4px; color: var(--text3); display: flex; align-items: center;"><i class="bi bi-grip-vertical"></i></span>
      <button class="elem-ctrl-btn" data-action="move-up" data-eid="dialogue" title="Move Up"><i class="bi bi-arrow-up"></i></button>
      <button class="elem-ctrl-btn" data-action="move-down" data-eid="dialogue" title="Move Down"><i class="bi bi-arrow-down"></i></button>
    ` : ''}
    <button class="elem-ctrl-btn" title="${lockTitle}" onclick="event.stopPropagation(); window.App.toggleDialogueLock()"><i class="bi ${lockIcon}"></i></button>
  </div>
  <div class="prev-dialogue" style="position:relative; z-index:1; overflow:hidden;">
    <div class="dialogue-header" style="position:relative; z-index:3;"><span class="dialogue-dot"></span><i class="bi bi-chat-left-dots"></i> Dialogue Box — Rich Text Editor</div>
    <div id="dialogue-editor" contenteditable="true" spellcheck="true" style="position:relative; z-index:3; min-height:80px;">${state.dialogueContent}</div>
    <div class="dialogue-statusbar" style="position:relative; z-index:3;">
      <span class="dlg-stat-item"><span id="dlg-word-count">0</span> words</span>
      <span class="dlg-stat-item"><span id="dlg-char-count">0</span> chars</span>
      <span style="margin-left:auto;font-size:10px;opacity:0.5">Ctrl+B I U · Ctrl+H Find</span>
    </div>
    <div class="dialogue-bg-bar" style="position:relative; z-index:3;">
      <i class="bi bi-image"></i> Dialogue Background:
      <input type="text" id="dlg-bg-input" placeholder="https://...bg.avif or CSS color" value="${state.dialogueBg || ''}">
    </div>
  </div>`;

  wrapper.addEventListener('click', () => {
    selectElem('dialogue');
    showDialogueProps();
  });

  if (placeholder && positionIndex >= 0) {
    ci.insertBefore(wrapper, ci.children[positionIndex]);
  } else {
    ci.appendChild(wrapper);
  }

  const editor = wrapper.querySelector('#dialogue-editor');
  editor.innerHTML = enrichDialogueHTMLForEditor(state.dialogueContent);

  editor.addEventListener('input', () => {
    state.dialogueContent = editor.innerHTML;
    updateWordCount();
    saveToLocalStorage();
    scheduleCodeSync();
  });

  // Bind keydown events
  editor.addEventListener('keydown', (e) => {
    if (window.App && window.App.dlgKeyDown) {
      window.App.dlgKeyDown(e);
    }
  });

  const bgInput = wrapper.querySelector('#dlg-bg-input');
  bgInput.addEventListener('input', () => {
    state.dialogueBg = bgInput.value;
    updateDialogueVisuals();
    saveToLocalStorage();
    
    // Update input in Properties Panel if active
    const propBgInput = document.getElementById('prop-dialogue-bg');
    if (propBgInput) {
      propBgInput.value = state.dialogueBg;
    }
  });

  attachDragListeners(wrapper);
  updateWordCount();
  updateDialogueVisuals();
}

export function updateWordCount() {
  const ed = document.getElementById('dialogue-editor');
  if (!ed) return;
  const text = ed.innerText || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const wc = document.getElementById('dlg-word-count');
  const cc = document.getElementById('dlg-char-count');
  if (wc) wc.textContent = words;
  if (cc) cc.textContent = chars;
}

export function updateToolbarState() {
  ['bold','italic','underline','strikeThrough'].forEach(cmd => {
    const map = { bold:'btn-bold', italic:'btn-italic', underline:'btn-underline', strikeThrough:'btn-strike' };
    const btn = document.getElementById(map[cmd]);
    if (btn) btn.classList.toggle('active', document.queryCommandState(cmd));
  });
}

export function selectElem(id) {
  document.querySelectorAll('.elem-block').forEach(b => b.classList.remove('selected'));
  const block = document.querySelector(`[data-id="${id}"]`);
  if (block) block.classList.add('selected');
  state.selectedId = id;
  if (id !== 'dialogue') {
    const elem = state.elements.find(e => e.id == id);
    if (elem) showElemProps(elem);
  } else {
    showDialogueProps();
  }
}

export function showElemProps(elem) {
  const pc = document.getElementById('props-bar');
  if (!pc) return;
  let html = `<div class="props-section"><div class="props-section-title">${elem.type.toUpperCase()} PROPS</div>`;

  if (elem.type === 'music') {
    html += propRow('Video ID', elem.vid || '', 'yt-vid', elem.id);
    html += propRow('Volume', elem.vol || '100', 'yt-vol', elem.id);
    html += propToggle('Autoplay', elem.autoplay, 'yt-ap', elem.id);
    html += propToggle('Volume Memory', elem.volmem, 'yt-vm', elem.id);
  } else if (elem.type === 'image') {
    html += propRow('Image URL', elem.url || '', 'img-url', elem.id);
    html += propRow('Alt Text', elem.alt || '', 'img-alt', elem.id);
  } else if (elem.type === 'character') {
    html += propRow('Name', elem.name || '', 'cn', elem.id);
    html += propRow('Sprite URL', elem.sprite || '', 'cs', elem.id);
    html += propRow('Backdrop URL', elem.bg || '', 'cb', elem.id);
    html += propRow('CSS Class', elem.cls || 'speaking', 'cc', elem.id);
  } else if (elem.type === 'vn') {
    html += propRow('URL', elem.url || '', 'vn-url', elem.id);
    html += propRow('Height (px)', elem.height || '500', 'vn-h', elem.id);
  } else if (elem.type === 'lore') {
    html += propRow('Title', elem.title || '', 'lo-t', elem.id);
    html += propRow('URL', elem.url || '', 'lo-u', elem.id);
    html += propRow('Height (px)', elem.height || '400', 'lo-h', elem.id);
  }

  html += `<div class="viewport-sep" style="height: 20px; width: 1px; background: var(--border); margin: 0 8px;"></div>
  <div style="display:flex;gap:6px;align-items:center;">
    <button class="btn btn-ghost" style="font-size:11px;padding:4px 8px;text-transform:none;" data-action="delete" data-eid="${elem.id}"><i class="bi bi-trash"></i> Delete</button>
    <button class="btn btn-ghost" style="font-size:11px;padding:4px 8px;text-transform:none;" data-action="move-up" data-eid="${elem.id}"><i class="bi bi-arrow-up"></i> Up</button>
    <button class="btn btn-ghost" style="font-size:11px;padding:4px 8px;text-transform:none;" data-action="move-down" data-eid="${elem.id}"><i class="bi bi-arrow-down"></i> Down</button>
  </div></div>`;

  pc.innerHTML = html;
  
  // Attach listeners to input fields dynamically
  pc.querySelectorAll('.prop-input').forEach(inp => {
    inp.addEventListener('change', () => {
      applyPropChange(elem.id, inp.dataset.prop, inp.value);
    });
  });
  
  // Attach listeners to toggle tracks dynamically
  pc.querySelectorAll('.toggle-track').forEach(tr => {
    tr.addEventListener('click', () => {
      tr.classList.toggle('on');
      applyPropChange(elem.id, tr.dataset.prop, tr.classList.contains('on'));
    });
  });

  // Attach actions listeners
  pc.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.action;
      if (act === 'delete') removeElem(elem.id);
      if (act === 'move-up') moveElem(elem.id, -1);
      if (act === 'move-down') moveElem(elem.id, 1);
    });
  });
}

export function showDialogueProps() {
  const pc = document.getElementById('props-bar');
  if (!pc) return;
  
  pc.innerHTML = `
  <div class="props-section" style="flex-wrap: wrap; gap: 16px; align-items: center; width:100%;">
    <div class="props-section-title">DIALOGUE PROPS</div>
    
    <div style="display:flex; gap:16px; flex-wrap:wrap; align-items:center; flex:1;">
      <div class="prop-row">
        <span class="prop-label">Bg Image URL</span>
        <input class="prop-input" id="prop-dialogue-bg" type="text" placeholder="https://..." value="${state.dialogueBg || ''}" style="width:130px;">
      </div>
      
      <div class="prop-row">
        <span class="prop-label">Bg Color</span>
        <input class="prop-input" id="prop-dialogue-color" type="text" placeholder="Hex/RGB/transparent" value="${state.dialogueColor || ''}" style="width:100px;">
      </div>
      
      <div class="prop-row">
        <span class="prop-label">Opacity (${Math.round((state.dialogueOpacity ?? 1) * 100)}%)</span>
        <input class="prop-range" id="prop-dialogue-opacity" type="range" min="0" max="1" step="0.05" value="${state.dialogueOpacity ?? 1}" style="width:60px; vertical-align:middle; margin:0; padding:0; background:transparent;">
      </div>
      
      <div class="prop-row">
        <span class="prop-label">Fit Mode</span>
        <select class="rtb-select" id="prop-dialogue-fit" style="height:26px; padding:2px 6px;">
          <option value="cover" ${state.dialogueFit === 'cover' ? 'selected' : ''}>Cover</option>
          <option value="contain" ${state.dialogueFit === 'contain' ? 'selected' : ''}>Contain</option>
          <option value="fill" ${state.dialogueFit === 'fill' ? 'selected' : ''}>Fill</option>
          <option value="none" ${state.dialogueFit === 'none' ? 'selected' : ''}>None</option>
          <option value="scale-down" ${state.dialogueFit === 'scale-down' ? 'selected' : ''}>Scale Down</option>
        </select>
      </div>

      <div class="prop-row">
        <span class="prop-label">Texture</span>
        <select class="rtb-select" id="prop-dialogue-texture" style="height:26px; padding:2px 6px;">
          <option value="none" ${state.dialogueTexture === 'none' ? 'selected' : ''}>None</option>
          <option value="noise" ${state.dialogueTexture === 'noise' ? 'selected' : ''}>Noise</option>
          <option value="scanlines" ${state.dialogueTexture === 'scanlines' ? 'selected' : ''}>Scanlines</option>
          <option value="grid" ${state.dialogueTexture === 'grid' ? 'selected' : ''}>Grid</option>
          <option value="stripes" ${state.dialogueTexture === 'stripes' ? 'selected' : ''}>Stripes</option>
        </select>
      </div>

      <div class="prop-toggle">
        <div class="toggle-track ${state.dialogueUnlocked ? 'on' : ''}" id="prop-dialogue-unlocked" style="margin-right:6px;">
          <div class="toggle-thumb"></div>
        </div>
        <span class="prop-toggle-label" style="display:flex; align-items:center; gap:4px;"><i class="bi ${state.dialogueUnlocked ? 'bi-unlock-fill' : 'bi-lock-fill'}"></i> Unlocked</span>
      </div>
    </div>
    
    <div class="viewport-sep" style="height: 20px; width: 1px; background: var(--border); margin: 0 4px;"></div>
    <span class="prop-label">Presets:</span>
    <div class="preset-grid" style="margin-top:0;display:flex;gap:4px;">
      <div class="preset-pill" data-preset="italic-action" style="padding:3px 8px;font-size:11px;">*Action*</div>
      <div class="preset-pill" data-preset="speech" style="padding:3px 8px;font-size:11px;">"Speech"</div>
      <div class="preset-pill" data-preset="bold-red" style="padding:3px 8px;font-size:11px;">Bold Red</div>
      <div class="preset-pill" data-preset="whisper" style="padding:3px 8px;font-size:11px;">Whisper</div>
      <div class="preset-pill" data-preset="shout" style="padding:3px 8px;font-size:11px;">SHOUT</div>
    </div>
  </div>`;

  const bgInput = pc.querySelector('#prop-dialogue-bg');
  bgInput.addEventListener('input', () => {
    state.dialogueBg = bgInput.value;
    const editorBgInput = document.getElementById('dlg-bg-input');
    if (editorBgInput) editorBgInput.value = state.dialogueBg;
    updateDialogueVisuals();
    saveToLocalStorage();
    scheduleCodeSync();
  });

  const colorInput = pc.querySelector('#prop-dialogue-color');
  colorInput.addEventListener('input', () => {
    state.dialogueColor = colorInput.value;
    updateDialogueVisuals();
    saveToLocalStorage();
    scheduleCodeSync();
  });

  const opacityInput = pc.querySelector('#prop-dialogue-opacity');
  opacityInput.addEventListener('input', () => {
    state.dialogueOpacity = Number(opacityInput.value);
    const label = opacityInput.previousElementSibling;
    if (label) label.textContent = `Opacity (${Math.round(state.dialogueOpacity * 100)}%)`;
    updateDialogueVisuals();
    saveToLocalStorage();
    scheduleCodeSync();
  });

  const fitSelect = pc.querySelector('#prop-dialogue-fit');
  fitSelect.addEventListener('change', () => {
    state.dialogueFit = fitSelect.value;
    updateDialogueVisuals();
    saveToLocalStorage();
    scheduleCodeSync();
  });

  const textureSelect = pc.querySelector('#prop-dialogue-texture');
  textureSelect.addEventListener('change', () => {
    state.dialogueTexture = textureSelect.value;
    updateDialogueVisuals();
    saveToLocalStorage();
    scheduleCodeSync();
  });

  const unlockedToggle = pc.querySelector('#prop-dialogue-unlocked');
  unlockedToggle.addEventListener('click', () => {
    unlockedToggle.classList.toggle('on');
    state.dialogueUnlocked = unlockedToggle.classList.contains('on');
    
    const labelIcon = unlockedToggle.nextElementSibling.querySelector('i');
    if (labelIcon) {
      labelIcon.className = `bi ${state.dialogueUnlocked ? 'bi-unlock-fill' : 'bi-lock-fill'}`;
    }

    if (state.dialogueUnlocked) {
      if (!state.elements.some(e => e.type === 'dialogue')) {
        state.elements.push({ id: 'dialogue', type: 'dialogue' });
      }
    } else {
      state.elements = state.elements.filter(e => e.type !== 'dialogue');
    }
    
    renderCanvas();
    selectElem('dialogue');
    saveToLocalStorage();
    scheduleCodeSync();
  });

  pc.querySelectorAll('.preset-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const preset = pill.dataset.preset;
      if (window.App && window.App.applyPresetStyle) {
        window.App.applyPresetStyle(preset);
      }
    });
  });
}

export function propRow(label, val, key, eid) {
  return `<div class="prop-row"><span class="prop-label">${label}</span><input class="prop-input" type="text" value="${escH(val)}" data-prop="${key}" data-eid="${eid}"></div>`;
}

export function propToggle(label, val, key, eid) {
  return `<div class="prop-toggle">
    <div class="toggle-track ${val ? 'on' : ''}" data-prop="${key}" data-eid="${eid}"><div class="toggle-thumb"></div></div>
    <span class="prop-toggle-label">${label}</span>
  </div>`;
}

export function applyPropChange(eid, key, val) {
  const elem = state.elements.find(e => e.id == eid);
  if (!elem) return;
  const propMap = {
    'yt-vid': 'vid', 'yt-vol': 'vol', 'yt-ap': 'autoplay', 'yt-vm': 'volmem',
    'img-url': 'url', 'img-alt': 'alt',
    'cn': 'name', 'cs': 'sprite', 'cb': 'bg', 'cc': 'cls',
    'vn-url': 'url', 'vn-h': 'height',
    'lo-t': 'title', 'lo-u': 'url', 'lo-h': 'height'
  };
  const prop = propMap[key] || key;
  elem[prop] = val;

  // Rebuild music src
  if (elem.type === 'music') {
    const themeColors = { vn_red1: 'c00000', vn_dark1: '111111', vn_blue1: '0a3aab', vn_gold1: 'b8860b', vn_green1: '1a5c1a', vn_purple1: '5b21b6' };
    const themeSelect = document.getElementById('theme-select');
    const theme = themeSelect ? themeSelect.value : 'vn_red1';
    const c = themeColors[theme] || 'c00000';
    let src = `${MUSIC_BASE}?v=${elem.vid}&c=${c}`;
    if (elem.autoplay) src += '&ap=1';
    if (!elem.volmem) src += `&vol=${elem.vol}`;
    elem.src = src;
    elem.label = `YouTube: ${elem.vid}`;
  }
  
  renderCanvas();
  scheduleCodeSync();
  saveToLocalStorage();
}

export function editElem(id) {
  const elem = state.elements.find(e => e.id == id);
  if (!elem) return;
  selectElem(id);
}

export function removeElem(id) {
  state.elements = state.elements.filter(e => e.id != id);
  state.elements = state.elements.filter(e => e.id != id && !(id === 'dialogue' && e.type === 'dialogue'));
  renderCanvas();
  scheduleCodeSync();
  saveToLocalStorage();
  const pc = document.getElementById('props-bar');
  if (pc) {
    pc.innerHTML = '<div class="props-empty">Select an element to edit its properties, or click a component in the sidebar to add one.</div>';
  }
}

export function moveElem(id, dir) {
  let all = [...state.elements];
  const idx = all.findIndex(e => String(e.id) === String(id) || (id === 'dialogue' && e.type === 'dialogue'));
  if (idx < 0) return;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= all.length) return;
  
  const tmp = all[idx];
  all[idx] = all[newIdx];
  all[newIdx] = tmp;
  state.elements = all;

  renderCanvas();
  scheduleCodeSync();
  saveToLocalStorage();
  
  selectElem(id);
}

// Global delegated clicks within canvas wrapper to handle buttons
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.elem-ctrl-btn[data-action]');
  if (!btn) return;
  
  const id = btn.dataset.eid === 'dialogue' ? 'dialogue' : Number(btn.dataset.eid);
  const action = btn.dataset.action;
  
  if (!id && id !== 'dialogue') return;
  
  if (action === 'move-up') moveElem(id, -1);
  if (action === 'move-down') moveElem(id, 1);
  if (action === 'edit') editElem(id);
  if (action === 'delete') removeElem(id);
});

export function toggleDialogueLock() {
  state.dialogueUnlocked = !state.dialogueUnlocked;
  if (state.dialogueUnlocked) {
    if (!state.elements.some(e => e.type === 'dialogue')) {
      state.elements.push({ id: 'dialogue', type: 'dialogue' });
    }
  } else {
    state.elements = state.elements.filter(e => e.type !== 'dialogue');
  }
  renderCanvas();
  selectElem('dialogue');
  saveToLocalStorage();
  scheduleCodeSync();
}

export function updateDialogueVisuals() {
  const dlg = document.querySelector('.prev-dialogue');
  if (!dlg) return;

  dlg.style.backgroundColor = state.dialogueColor || '';

  let bgOverlay = dlg.querySelector('.prev-dialogue-bg');
  if (!bgOverlay) {
    bgOverlay = document.createElement('div');
    bgOverlay.className = 'prev-dialogue-bg';
    bgOverlay.style.cssText = 'position:absolute; inset:0; z-index:1; pointer-events:none;';
    dlg.insertBefore(bgOverlay, dlg.firstChild);
  }
  
  if (state.dialogueBg) {
    const bgUrl = (state.dialogueBg.startsWith('http') || state.dialogueBg.startsWith('/')) ? state.dialogueBg : '';
    if (bgUrl) {
      bgOverlay.style.backgroundImage = `url(${bgUrl})`;
      bgOverlay.style.background = '';
    } else {
      bgOverlay.style.background = state.dialogueBg;
      bgOverlay.style.backgroundImage = '';
    }
    bgOverlay.style.backgroundSize = state.dialogueFit || 'cover';
    bgOverlay.style.backgroundRepeat = 'no-repeat';
    bgOverlay.style.backgroundPosition = 'center';
    bgOverlay.style.opacity = state.dialogueOpacity ?? 1;
    bgOverlay.style.display = 'block';
  } else {
    bgOverlay.style.display = 'none';
  }

  let textureOverlay = dlg.querySelector('.prev-dialogue-texture');
  if (!textureOverlay) {
    textureOverlay = document.createElement('div');
    textureOverlay.className = 'prev-dialogue-texture';
    textureOverlay.style.cssText = 'position:absolute; inset:0; z-index:2; pointer-events:none;';
    dlg.insertBefore(textureOverlay, bgOverlay.nextSibling);
  }
  
  textureOverlay.className = 'prev-dialogue-texture';
  if (state.dialogueTexture && state.dialogueTexture !== 'none') {
    textureOverlay.classList.add(`vn-texture-${state.dialogueTexture}`);
    textureOverlay.style.display = 'block';
  } else {
    textureOverlay.style.display = 'none';
  }
}

export function enrichDialogueHTMLForEditor(html) {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  temp.querySelectorAll('.dialogue-image-wrap').forEach(wrap => {
    wrap.setAttribute('contenteditable', 'false');
    if (!wrap.querySelector('.img-settings-dots')) {
      const dots = document.createElement('div');
      dots.className = 'img-settings-dots';
      dots.title = 'Image Settings';
      dots.innerHTML = '<i class="bi bi-three-dots"></i>';
      wrap.appendChild(dots);
    }
  });

  temp.querySelectorAll('img').forEach(img => {
    if (!img.closest('.dialogue-image-wrap') && !img.closest('.vn-character-group') && !img.closest('.prev-char-sprite-box') && !img.closest('.prev-image')) {
      const wrap = document.createElement('div');
      wrap.className = 'dialogue-image-wrap';
      wrap.style.display = 'block';
      wrap.style.margin = '6px auto';
      wrap.style.textAlign = 'center';
      wrap.setAttribute('contenteditable', 'false');
      img.parentNode.insertBefore(wrap, img);
      wrap.appendChild(img);
      
      const dots = document.createElement('div');
      dots.className = 'img-settings-dots';
      dots.title = 'Image Settings';
      dots.innerHTML = '<i class="bi bi-three-dots"></i>';
      wrap.appendChild(dots);
    }
  });

  return temp.innerHTML;
}

let dragSrcEl = null;

export function attachDragListeners(block) {
  block.addEventListener('dragstart', (e) => {
    if (e.target.closest('#dialogue-editor')) {
      e.preventDefault();
      return;
    }
    dragSrcEl = block;
    block.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', block.dataset.id);
  });

  block.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = block.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    if (e.clientY < midpoint) {
      block.classList.add('drag-over-top');
      block.classList.remove('drag-over-bottom');
    } else {
      block.classList.add('drag-over-bottom');
      block.classList.remove('drag-over-top');
    }
  });

  block.addEventListener('dragleave', () => {
    block.classList.remove('drag-over-top', 'drag-over-bottom');
  });

  block.addEventListener('drop', (e) => {
    e.preventDefault();
    block.classList.remove('drag-over-top', 'drag-over-bottom');
    const targetId = block.dataset.id;
    const sourceId = e.dataTransfer.getData('text/plain');
    
    if (sourceId === targetId) return;

    const rect = block.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const placeBefore = e.clientY < midpoint;

    reorderElements(sourceId, targetId, placeBefore);
  });

  block.addEventListener('dragend', () => {
    block.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
    document.querySelectorAll('.elem-block').forEach(b => {
      b.classList.remove('drag-over-top', 'drag-over-bottom', 'dragging');
    });
  });
}

function reorderElements(sourceId, targetId, placeBefore) {
  let all = [...state.elements];
  const srcIdx = all.findIndex(e => String(e.id) === String(sourceId) || (sourceId === 'dialogue' && e.type === 'dialogue'));
  if (srcIdx < 0) return;
  const [srcEl] = all.splice(srcIdx, 1);
  
  let tgtIdx = all.findIndex(e => String(e.id) === String(targetId) || (targetId === 'dialogue' && e.type === 'dialogue'));
  if (tgtIdx < 0) return;

  if (placeBefore) {
    all.splice(tgtIdx, 0, srcEl);
  } else {
    all.splice(tgtIdx + 1, 0, srcEl);
  }
  state.elements = all;

  renderCanvas();
  scheduleCodeSync();
  saveToLocalStorage();
}

export function showImageSettingsMenu(wrap, dotsBtn) {
  const existing = document.getElementById('img-settings-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.id = 'img-settings-menu';
  menu.className = 'img-settings-menu';
  
  const img = wrap.querySelector('img');
  
  let currentAlign = 'center';
  if (wrap.style.float === 'left') currentAlign = 'left';
  else if (wrap.style.float === 'right') currentAlign = 'right';
  else if (wrap.style.textAlign === 'left') currentAlign = 'left';
  else if (wrap.style.textAlign === 'right') currentAlign = 'right';
  else if (wrap.style.marginLeft === '0px' || wrap.style.marginLeft === '0') currentAlign = 'left';
  else if (wrap.style.marginRight === '0px' || wrap.style.marginRight === '0') currentAlign = 'right';

  const isFullWidth = img.style.width === '100%' || wrap.classList.contains('full-width');
  
  menu.innerHTML = `
    <div class="menu-item-group">
      <label>Image URL</label>
      <input type="text" id="img-menu-url" value="${img.src}">
    </div>
    <div class="menu-item-group">
      <label>Alignment</label>
      <div class="btn-group-sm">
        <button class="btn btn-ghost btn-sm ${currentAlign === 'left' ? 'active' : ''}" data-align="left"><i class="bi bi-align-left"></i> Left</button>
        <button class="btn btn-ghost btn-sm ${currentAlign === 'center' ? 'active' : ''}" data-align="center"><i class="bi bi-align-center"></i> Center</button>
        <button class="btn btn-ghost btn-sm ${currentAlign === 'right' ? 'active' : ''}" data-align="right"><i class="bi bi-align-right"></i> Right</button>
      </div>
    </div>
    <div class="menu-item-group">
      <label>Size Mode</label>
      <div class="btn-group-sm">
        <button class="btn btn-ghost btn-sm ${isFullWidth ? 'active' : ''}" id="img-menu-full">Full Width</button>
        <button class="btn btn-ghost btn-sm ${!isFullWidth ? 'active' : ''}" id="img-menu-custom">Custom</button>
      </div>
    </div>
    <div class="menu-item-group custom-dims" style="display: ${isFullWidth ? 'none' : 'flex'}; gap: 8px;">
      <div>
        <label>Width</label>
        <input type="text" id="img-menu-w" placeholder="e.g. 200px" value="${img.style.width !== '100%' ? img.style.width : ''}" style="width: 70px;">
      </div>
      <div>
        <label>Height</label>
        <input type="text" id="img-menu-h" placeholder="e.g. 150px" value="${img.style.height !== 'auto' ? img.style.height : ''}" style="width: 70px;">
      </div>
    </div>
    <div style="display: flex; gap: 8px; margin-top: 8px;">
      <button class="btn btn-primary btn-sm" id="img-menu-save" style="flex:1;">Save</button>
      <button class="btn btn-ghost btn-sm" id="img-menu-delete" style="color: var(--red);"><i class="bi bi-trash"></i> Delete</button>
    </div>
  `;

  document.body.appendChild(menu);
  
  const rect = dotsBtn.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.top = `${rect.bottom + window.scrollY + 6}px`;
  menu.style.left = `${Math.min(window.innerWidth - 220, rect.left + window.scrollX - 180)}px`;
  menu.style.zIndex = '1000';

  const urlInput = menu.querySelector('#img-menu-url');
  const saveBtn = menu.querySelector('#img-menu-save');
  const deleteBtn = menu.querySelector('#img-menu-delete');
  const fullBtn = menu.querySelector('#img-menu-full');
  const customBtn = menu.querySelector('#img-menu-custom');
  const customDims = menu.querySelector('.custom-dims');
  const wInput = menu.querySelector('#img-menu-w');
  const hInput = menu.querySelector('#img-menu-h');
  
  let align = currentAlign;
  menu.querySelectorAll('[data-align]').forEach(btn => {
    btn.addEventListener('click', () => {
      menu.querySelectorAll('[data-align]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      align = btn.dataset.align;
    });
  });
  
  fullBtn.addEventListener('click', () => {
    fullBtn.classList.add('active');
    customBtn.classList.remove('active');
    customDims.style.display = 'none';
  });
  
  customBtn.addEventListener('click', () => {
    customBtn.classList.add('active');
    fullBtn.classList.remove('active');
    customDims.style.display = 'flex';
  });
  
  saveBtn.addEventListener('click', () => {
    img.src = urlInput.value;
    
    wrap.style.display = 'block';
    if (align === 'left') {
      wrap.style.marginLeft = '0';
      wrap.style.marginRight = 'auto';
      wrap.style.textAlign = 'left';
    } else if (align === 'center') {
      wrap.style.marginLeft = 'auto';
      wrap.style.marginRight = 'auto';
      wrap.style.textAlign = 'center';
    } else if (align === 'right') {
      wrap.style.marginLeft = 'auto';
      wrap.style.marginRight = '0';
      wrap.style.textAlign = 'right';
    }
    
    if (fullBtn.classList.contains('active')) {
      wrap.classList.add('full-width');
      img.style.width = '100%';
      img.style.height = 'auto';
    } else {
      wrap.classList.remove('full-width');
      img.style.width = wInput.value || 'auto';
      img.style.height = hInput.value || 'auto';
    }
    
    menu.remove();
    const ed = document.getElementById('dialogue-editor');
    if (ed) {
      state.dialogueContent = ed.innerHTML;
      saveToLocalStorage();
      scheduleCodeSync();
    }
  });
  
  deleteBtn.addEventListener('click', () => {
    wrap.remove();
    menu.remove();
    const ed = document.getElementById('dialogue-editor');
    if (ed) {
      state.dialogueContent = ed.innerHTML;
      saveToLocalStorage();
      scheduleCodeSync();
    }
  });

  const clickOutside = (e) => {
    if (!menu.contains(e.target) && !dotsBtn.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', clickOutside);
    }
  };
  setTimeout(() => document.addEventListener('click', clickOutside), 10);
}
