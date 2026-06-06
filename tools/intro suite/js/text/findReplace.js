import { state } from '../state.js';
import { updateDialogueContent } from './formatting.js';
import { showToast } from '../utils.js';

let _frOpen = false;

export function toggleFindReplace() {
  const bar = document.getElementById('find-replace-bar');
  if (!bar) return;
  _frOpen = !_frOpen;
  bar.classList.toggle('open', _frOpen);
  if (_frOpen) {
    const inp = document.getElementById('fr-find');
    if (inp) { inp.focus(); inp.select(); }
  } else {
    frClearHighlights();
  }
}

export function closeFindReplace() {
  _frOpen = false;
  const bar = document.getElementById('find-replace-bar');
  if (bar) bar.classList.remove('open');
  frClearHighlights();
}

export function frKeyDown(e) {
  if (e.key === 'Enter') {
    e.shiftKey ? frFindPrev() : frFindNext();
  }
  if (e.key === 'Escape') {
    toggleFindReplace();
  }
}

export function frFind() {
  const query = (document.getElementById('fr-find').value || '').toLowerCase();
  const countEl = document.getElementById('fr-count');
  if (!query) {
    state.frMatches = [];
    state.frIndex = -1;
    if (countEl) countEl.textContent = '';
    return;
  }

  const ed = document.getElementById('dialogue-editor');
  if (!ed) return;
  const text = ed.innerText || '';
  state.frMatches = [];
  let idx = 0;
  while ((idx = text.toLowerCase().indexOf(query, idx)) !== -1) {
    state.frMatches.push(idx);
    idx += query.length;
  }
  state.frIndex = state.frMatches.length > 0 ? 0 : -1;
  if (countEl) {
    countEl.textContent = state.frMatches.length > 0 ? `${state.frIndex + 1} / ${state.frMatches.length}` : 'Not found';
  }
}

export function frFindNext() {
  if (!state.frMatches.length) return;
  state.frIndex = (state.frIndex + 1) % state.frMatches.length;
  frScrollToMatch();
  const countEl = document.getElementById('fr-count');
  if (countEl) countEl.textContent = `${state.frIndex + 1} / ${state.frMatches.length}`;
}

export function frFindPrev() {
  if (!state.frMatches.length) return;
  state.frIndex = (state.frIndex - 1 + state.frMatches.length) % state.frMatches.length;
  frScrollToMatch();
  const countEl = document.getElementById('fr-count');
  if (countEl) countEl.textContent = `${state.frIndex + 1} / ${state.frMatches.length}`;
}

export function frScrollToMatch() {
  const query = document.getElementById('fr-find').value;
  if (query && window.find) {
    window.find(query, false, state.frIndex > 0);
  }
}

export function frClearHighlights() {
  state.frMatches = [];
  state.frIndex = -1;
  const countEl = document.getElementById('fr-count');
  if (countEl) countEl.textContent = '';
}

export function frReplaceOne() {
  const query = document.getElementById('fr-find').value;
  const replacement = document.getElementById('fr-replace').value;
  if (!query) return;
  const ed = document.getElementById('dialogue-editor');
  if (!ed) return;
  ed.focus();
  if (window.find && window.find(query, false, false, false, false, false, false)) {
    document.execCommand('insertText', false, replacement);
    updateDialogueContent();
    frFind(); // recalculate matches
  }
}

export function frReplaceAll() {
  const query = document.getElementById('fr-find').value;
  const replacement = document.getElementById('fr-replace').value;
  if (!query) return;
  const ed = document.getElementById('dialogue-editor');
  if (!ed) return;
  const count = state.frMatches.length;
  if (!count) return;
  // Escape regex specials
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'gi');
  state.dialogueContent = ed.innerHTML.replace(re, replacement);
  ed.innerHTML = state.dialogueContent;
  updateDialogueContent();
  frFind();
  showToast(`✓ Replaced ${count} occurrence${count !== 1 ? 's' : ''}`);
}

// =====================
// INSERT HTML PANEL
// =====================
export function openInsertHTMLPanel() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    state._savedRange = sel.getRangeAt(0).cloneRange();
  }
  const panel = document.getElementById('insert-html-panel');
  if (panel) {
    panel.classList.add('open');
    const ta = document.getElementById('insert-html-input');
    if (ta) { ta.value = ''; ta.focus(); }
  }
}

export function closeInsertHTMLPanel() {
  const panel = document.getElementById('insert-html-panel');
  if (panel) panel.classList.remove('open');
}

export function confirmInsertHTML() {
  const ta = document.getElementById('insert-html-input');
  const html = ta ? ta.value.trim() : '';
  if (!html) { closeInsertHTMLPanel(); return; }

  const ed = document.getElementById('dialogue-editor');
  if (!ed) { closeInsertHTMLPanel(); return; }

  ed.focus();
  if (state._savedRange) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(state._savedRange);
    state._savedRange = null;
  }
  document.execCommand('insertHTML', false, html);
  updateDialogueContent();
  closeInsertHTMLPanel();
}
