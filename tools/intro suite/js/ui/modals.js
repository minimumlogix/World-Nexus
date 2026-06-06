import { state, MODALS, MUSIC_BASE, LORE_BASE } from '../state.js';
import { saveToLocalStorage } from '../utils.js';
import { renderCanvas } from './canvas.js';

export function addComponent(type) {
  const cfg = MODALS[type];
  if (!cfg) return;
  state.currentModal = type;

  const titleEl = document.getElementById('modal-title');
  const subEl = document.getElementById('modal-sub');
  if (titleEl) titleEl.textContent = cfg.title;
  if (subEl) subEl.textContent = cfg.sub;

  let html = '';
  cfg.fields.forEach(f => {
    html += `<div class="modal-field">`;
    html += `<label class="modal-label">${f.label}</label>`;
    if (f.type === 'toggle') {
      const on = f.default !== false;
      html += `<div class="modal-toggle-row">
        <div class="toggle-track ${on ? 'on' : ''}" id="toggle-${f.id}" data-toggle-id="${f.id}">
          <div class="toggle-thumb"></div>
        </div>
        <span class="prop-toggle-label">${on ? 'Enabled' : 'Disabled'}</span>
      </div>`;
    } else {
      html += `<input class="modal-input" id="minput-${f.id}" type="text" placeholder="${f.placeholder || ''}" value="${f.default || ''}">`;
    }
    html += `</div>`;
  });

  const fieldsEl = document.getElementById('modal-fields');
  if (fieldsEl) fieldsEl.innerHTML = html;

  // Bind clicks for the toggle tracks inside the modal fields
  fieldsEl.querySelectorAll('.toggle-track').forEach(track => {
    track.addEventListener('click', () => {
      const id = track.dataset.toggleId;
      toggleModal(id);
    });
  });

  const backdrop = document.getElementById('modal-backdrop');
  if (backdrop) backdrop.classList.add('open');
}

export function toggleModal(id) {
  const track = document.getElementById('toggle-' + id);
  if (!track) return;
  const isOn = track.classList.contains('on');
  track.classList.toggle('on');
  if (track.nextElementSibling) {
    track.nextElementSibling.textContent = isOn ? 'Disabled' : 'Enabled';
  }
}

export function isToggleOn(id) {
  const el = document.getElementById('toggle-' + id);
  return el ? el.classList.contains('on') : false;
}

export function getModalVal(id) {
  const el = document.getElementById('minput-' + id);
  return el ? el.value.trim() : '';
}

export function closeModal() {
  const backdrop = document.getElementById('modal-backdrop');
  if (backdrop) backdrop.classList.remove('open');
  state.currentModal = null;
}

export function closeModalBackdrop(e) {
  if (e.target === document.getElementById('modal-backdrop')) {
    closeModal();
  }
}

export function confirmModal() {
  if (!state.currentModal) return;
  const type = state.currentModal;

  let elem = { id: Date.now(), type };

  if (type === 'music') {
    let vid = getModalVal('yt-url');
    // Extract video ID from URL
    const match = vid.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    if (match) vid = match[1];
    const vol = getModalVal('vol') || '100';
    const autoplay = isToggleOn('autoplay');
    const volmem = isToggleOn('volmem');
    // Color = accent from theme
    const themeColors = { vn_red1: 'c00000', vn_dark1: '111111', vn_blue1: '0a3aab', vn_gold1: 'b8860b', vn_green1: '1a5c1a', vn_purple1: '5b21b6' };
    const themeSelect = document.getElementById('theme-select');
    const theme = themeSelect ? themeSelect.value : 'vn_red1';
    const c = themeColors[theme] || 'c00000';
    let src = `${MUSIC_BASE}?v=${vid}&c=${c}`;
    if (autoplay) src += '&ap=1';
    if (!volmem) src += `&vol=${vol}`;
    elem.vid = vid;
    elem.src = src;
    elem.autoplay = autoplay;
    elem.volmem = volmem;
    elem.vol = vol;
    elem.label = `YouTube: ${vid}`;
  }

  if (type === 'image') {
    elem.url = getModalVal('img-url');
    elem.alt = getModalVal('img-alt') || '';
  }

  if (type === 'character') {
    elem.name = getModalVal('char-name');
    elem.sprite = getModalVal('char-sprite');
    elem.bg = getModalVal('char-bg');
    elem.cls = getModalVal('char-class') || 'speaking';
  }

  if (type === 'vn') {
    elem.url = getModalVal('vn-url');
    elem.height = getModalVal('vn-height') || '500';
  }

  if (type === 'dialogue') {
    elem.bgImg = getModalVal('dlg-bg');
    state.dialogueBg = elem.bgImg;
  }

  if (type === 'lore') {
    let lurl = getModalVal('lore-url');
    if (!lurl.startsWith('http')) lurl = LORE_BASE + lurl;
    elem.url = lurl;
    elem.title = getModalVal('lore-title') || 'Lore Database';
    elem.height = getModalVal('lore-height') || '400';
  }

  state.elements.push(elem);
  closeModal();
  renderCanvas();
  saveToLocalStorage();
}
