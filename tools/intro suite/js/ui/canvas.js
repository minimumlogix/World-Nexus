import { state, MUSIC_BASE } from '../state.js';
import { saveToLocalStorage, escH } from '../utils.js';
import { scheduleCodeSync } from './codeMirror.js';

export function renderCanvas() {
  const ci = document.getElementById('canvas-inner');
  const es = document.getElementById('empty-state');
  if (!ci) return;

  if (state.elements.length === 0 && !state.dialogueContent) {
    if (es) es.style.display = 'flex';
    ci.querySelectorAll('.elem-block').forEach(e => e.remove());
    return;
  }
  if (es) es.style.display = 'none';

  // Rebuild all elements
  ci.querySelectorAll('.elem-block').forEach(e => e.remove());
  const dlgEl = ci.querySelector('.dialogue-wrapper');
  if (dlgEl) dlgEl.remove();

  state.elements.forEach(elem => {
    const block = document.createElement('div');
    block.className = 'elem-block';
    block.dataset.id = elem.id;
    block.innerHTML = buildElemHTML(elem) + buildControls(elem);
    block.addEventListener('click', (e) => {
      if (e.target.closest('.elem-ctrl-btn')) return;
      selectElem(elem.id);
    });
    ci.appendChild(block);
  });

  // Always render dialogue area at bottom
  renderDialogueBlock(ci);
  scheduleCodeSync();
}

export function buildElemHTML(elem) {
  const t = elem.type;
  if (t === 'music') {
    return `<div class="prev-music">
      <span class="music-icon">🎵</span>
      <div class="music-info">
        <div class="music-title">YouTube Player — ${elem.vid || 'Unknown'}</div>
        <div class="music-meta">Autoplay: ${elem.autoplay ? 'ON' : 'OFF'} · Volume: ${elem.volmem ? 'Memory' : elem.vol + '%'}</div>
      </div>
      <span style="font-size:11px;color:var(--green)">▶ iframe</span>
    </div>`;
  }
  if (t === 'image') {
    if (elem.url) {
      return `<div class="prev-image has-url"><img src="${elem.url}" alt="${elem.alt}" onerror="this.src='';this.closest('.prev-image').classList.remove('has-url');this.closest('.prev-image').innerHTML='🖼 Image (URL not loadable in editor)'"></div>`;
    }
    return `<div class="prev-image">🖼 Full-Width Image</div>`;
  }
  if (t === 'character') {
    return `<div class="prev-char" style="${elem.bg ? 'background-image:url(' + elem.bg + ');background-size:cover;background-position:center' : ''}">
      <div class="prev-char-sprite-box">${elem.sprite ? `<img src="${elem.sprite}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:4px;" onerror="this.outerHTML='👤'">` : '👤'}</div>
      <div class="prev-char-info">
        <div class="prev-char-name">${elem.name || 'Character Name'}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:4px">Class: ${elem.cls || 'speaking'}</div>
      </div>
    </div>`;
  }
  if (t === 'vn') {
    return `<div class="prev-iframe">▶ <strong style="color:var(--text)">VN Engine Frame</strong><span style="flex:1"></span><span style="font-size:11px;color:var(--text3)">${elem.height}px · ${(elem.url || '').substring(0,40)}...</span></div>`;
  }
  if (t === 'lore') {
    return `<div class="prev-lore">
      <span class="lore-icon">🗄</span>
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
    <button class="elem-ctrl-btn" data-action="move-up" data-eid="${elem.id}" title="Move Up">↑</button>
    <button class="elem-ctrl-btn" data-action="move-down" data-eid="${elem.id}" title="Move Down">↓</button>
    <button class="elem-ctrl-btn" data-action="edit" data-eid="${elem.id}" title="Edit">✎</button>
    <button class="elem-ctrl-btn del" data-action="delete" data-eid="${elem.id}" title="Delete">✕</button>
  </div>`;
}

export function renderDialogueBlock(ci) {
  const wrapper = document.createElement('div');
  wrapper.className = 'dialogue-wrapper elem-block';
  wrapper.dataset.id = 'dialogue';
  wrapper.style.marginTop = '12px';

  wrapper.innerHTML = `
  <div class="elem-controls">
    <button class="elem-ctrl-btn" title="Dialogue box is always last">∎</button>
  </div>
  <div class="prev-dialogue" style="position:relative">
    <div class="dialogue-header"><span class="dialogue-dot"></span>Dialogue Box — Rich Text Editor</div>
    <div id="dialogue-editor" contenteditable="true" spellcheck="true">${state.dialogueContent}</div>
    <div class="dialogue-statusbar">
      <span class="dlg-stat-item"><span id="dlg-word-count">0</span> words</span>
      <span class="dlg-stat-item"><span id="dlg-char-count">0</span> chars</span>
      <span style="margin-left:auto;font-size:10px;opacity:0.5">Ctrl+B I U · Ctrl+H Find</span>
    </div>
    <div class="dialogue-bg-bar">
      🖼 Dialogue Background:
      <input type="text" id="dlg-bg-input" placeholder="https://...bg.png or CSS color" value="${state.dialogueBg}">
    </div>
  </div>`;

  wrapper.addEventListener('click', () => {
    selectElem('dialogue');
    showDialogueProps();
  });

  ci.appendChild(wrapper);

  const editor = wrapper.querySelector('#dialogue-editor');
  editor.addEventListener('input', () => {
    state.dialogueContent = editor.innerHTML;
    updateWordCount();
    saveToLocalStorage();
    scheduleCodeSync();
  });

  // Bind keydown events (handled in app.js or locally)
  editor.addEventListener('keydown', (e) => {
    if (window.App && window.App.dlgKeyDown) {
      window.App.dlgKeyDown(e);
    }
  });

  const bgInput = wrapper.querySelector('#dlg-bg-input');
  bgInput.addEventListener('input', () => {
    state.dialogueBg = bgInput.value;
    saveToLocalStorage();
    
    // Update input in Properties Panel if active
    const propBgInput = document.getElementById('prop-dialogue-bg');
    if (propBgInput) {
      propBgInput.value = state.dialogueBg;
    }
  });

  updateWordCount();
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
    <button class="btn btn-ghost" style="font-size:11px;padding:4px 8px;text-transform:none;" data-action="delete" data-eid="${elem.id}">🗑 Delete</button>
    <button class="btn btn-ghost" style="font-size:11px;padding:4px 8px;text-transform:none;" data-action="move-up" data-eid="${elem.id}">↑ Up</button>
    <button class="btn btn-ghost" style="font-size:11px;padding:4px 8px;text-transform:none;" data-action="move-down" data-eid="${elem.id}">↓ Down</button>
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
  <div class="props-section">
    <div class="props-section-title">DIALOGUE PROPS</div>
    <div class="prop-row">
      <span class="prop-label">Background</span>
      <input class="prop-input" id="prop-dialogue-bg" type="text" placeholder="Image URL or CSS color" value="${state.dialogueBg}" style="width:200px;">
    </div>
    <div class="viewport-sep" style="height: 20px; width: 1px; background: var(--border); margin: 0 8px;"></div>
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
    
    // Sync to dialogue-bg-bar
    const editorBgInput = document.getElementById('dlg-bg-input');
    if (editorBgInput) {
      editorBgInput.value = state.dialogueBg;
    }
    saveToLocalStorage();
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
  renderCanvas();
  scheduleCodeSync();
  saveToLocalStorage();
  const pc = document.getElementById('props-bar');
  if (pc) {
    pc.innerHTML = '<div class="props-empty">Select an element to edit its properties, or click a component in the sidebar to add one.</div>';
  }
}

export function moveElem(id, dir) {
  const idx = state.elements.findIndex(e => e.id == id);
  if (idx < 0) return;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= state.elements.length) return;
  const tmp = state.elements[idx];
  state.elements[idx] = state.elements[newIdx];
  state.elements[newIdx] = tmp;
  renderCanvas();
  scheduleCodeSync();
  saveToLocalStorage();
  
  // Re-select the element to update controls outline position
  selectElem(id);
}

// Global delegated clicks within canvas wrapper to handle buttons
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.elem-ctrl-btn[data-action]');
  if (!btn) return;
  
  const id = Number(btn.dataset.eid);
  const action = btn.dataset.action;
  
  if (!id) return;
  
  if (action === 'move-up') moveElem(id, -1);
  if (action === 'move-down') moveElem(id, 1);
  if (action === 'edit') editElem(id);
  if (action === 'delete') removeElem(id);
});
