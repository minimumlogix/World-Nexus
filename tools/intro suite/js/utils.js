import { state } from './state.js';

// Debounce helper
export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// HTML escape helper
export function escH(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Toast notification manager
let toastTimer = null;
export function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('visible');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('visible'), 2200);
}

// Save application state to local storage
export function saveToLocalStorage() {
  try {
    const themeSelect = document.getElementById('theme-select');
    localStorage.setItem('introsuite_state', JSON.stringify({
      elements: state.elements,
      dialogueContent: state.dialogueContent,
      dialogueBg: state.dialogueBg,
      theme: themeSelect ? themeSelect.value : 'vn_red1'
    }));
  } catch(e) {
    console.warn('LocalStorage save failed:', e);
  }
}

// Load application state from local storage
export function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem('introsuite_state');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state.elements = parsed.elements || [];
    state.dialogueContent = parsed.dialogueContent || '';
    state.dialogueBg = parsed.dialogueBg || '';
    
    // Theme will be set on the select element in app.js init
    if (parsed.theme) {
      const themeSelect = document.getElementById('theme-select');
      if (themeSelect) themeSelect.value = parsed.theme;
    }
  } catch(e) {
    console.warn('LocalStorage load failed:', e);
    state.elements = [];
  }
}
