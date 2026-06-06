import { state } from './state.js';
import { loadFromLocalStorage, saveToLocalStorage, showToast } from './utils.js';
import { renderCanvas, updateWordCount, updateToolbarState, applyPropChange, moveElem, editElem, removeElem } from './ui/canvas.js';
import { switchTab, refreshPreview, toggleOutput, switchOutTab, updateOutput, copyMinified, clearAll, deleteCache, joinDiscord, toggleSidebarDrawer, closeAllDrawers, setViewport, toggleViewportOrientation, updateViewportUI } from './ui/tabs.js';
import { initCodeMirror, generateFullCode, getDialogueRawText, syncFromCode, prettifyCode, parseCodeToElements, updateCodeEditor, updateCodeInfoBadge } from './ui/codeMirror.js';
import { addComponent, toggleModal, closeModal, closeModalBackdrop, confirmModal } from './ui/modals.js';
import { fmt, applyColor, applyFont, applyFontSize, applyEffect, applyTextPreset, applyPresetStyle, insertImageInDialogue, insertHRInDialogue, dlgKeyDown, saveEditorSelection, syncDropdownsToSelection } from './text/formatting.js';
import { toggleFindReplace, closeFindReplace, frKeyDown, frFind, frFindNext, frFindPrev, frReplaceOne, frReplaceAll, openInsertHTMLPanel, closeInsertHTMLPanel, confirmInsertHTML } from './text/findReplace.js';

// Bundle all actions on the window.App namespace for inline HTML integration
const App = {
  // state
  state,
  
  // utils
  loadFromLocalStorage,
  saveToLocalStorage,
  showToast,
  
  // canvas
  renderCanvas,
  updateWordCount,
  updateToolbarState,
  applyPropChange,
  moveElem,
  editElem,
  removeElem,
  
  // tabs
  switchTab,
  refreshPreview,
  toggleOutput,
  switchOutTab,
  updateOutput,
  copyMinified,
  clearAll,
  deleteCache,
  joinDiscord,
  toggleSidebarDrawer,
  closeAllDrawers,
  setViewport,
  toggleViewportOrientation,
  updateViewportUI,
  
  // codeMirror
  initCodeMirror,
  generateFullCode,
  getDialogueRawText,
  syncFromCode,
  prettifyCode,
  parseCodeToElements,
  updateCodeEditor,
  updateCodeInfoBadge,
  
  // modals
  addComponent,
  toggleModal,
  closeModal,
  closeModalBackdrop,
  confirmModal,
  
  // formatting
  fmt,
  applyColor,
  applyFont,
  applyFontSize,
  applyEffect,
  applyTextPreset,
  applyPresetStyle,
  insertImageInDialogue,
  insertHRInDialogue,
  dlgKeyDown,
  saveEditorSelection,
  syncDropdownsToSelection,
  
  // findReplace
  toggleFindReplace,
  closeFindReplace,
  frKeyDown,
  frFind,
  frFindNext,
  frFindPrev,
  frReplaceOne,
  frReplaceAll,
  openInsertHTMLPanel,
  closeInsertHTMLPanel,
  confirmInsertHTML,
  
  // theme handler
  onThemeChange
};

// Expose individual functions to the global window scope to match inline HTML calls
Object.assign(window, App);
window.App = App;

// Theme change hook
function onThemeChange() {
  const themeColors = { vn_red1: 'c00000', vn_dark1: '111111', vn_blue1: '0a3aab', vn_gold1: 'b8860b', vn_green1: '1a5c1a', vn_purple1: '5b21b6' };
  const themeSelect = document.getElementById('theme-select');
  const theme = themeSelect ? themeSelect.value : 'vn_red1';
  const c = themeColors[theme] || 'c00000';
  
  state.elements.forEach(elem => {
    if (elem.type === 'music') {
      const musicBaseUrl = 'https://minimumlogix.github.io/VN_Engine/apps/music/mw';
      let src = `${musicBaseUrl}?v=${elem.vid}&c=${c}`;
      if (elem.autoplay) src += '&ap=1';
      if (!elem.volmem) src += `&vol=${elem.vol}`;
      elem.src = src;
    }
  });
  
  renderCanvas();
  saveToLocalStorage();
}

// Global hotkeys mapping
document.addEventListener('keydown', e => {
  // Tab switching: Ctrl+1 / Ctrl+2 / Ctrl+3
  if (e.ctrlKey && !e.shiftKey && !e.altKey) {
    if (e.key === '1') { e.preventDefault(); switchTab('design'); }
    else if (e.key === '2') { e.preventDefault(); switchTab('code'); }
    else if (e.key === '3') { e.preventDefault(); switchTab('preview'); }
    // Ctrl+H (Find/Replace) from outside dialogue editor
    else if (e.key === 'h' && state.currentTab === 'design') { e.preventDefault(); toggleFindReplace(); }
  }
  
  // Ctrl+Shift+H — open insert HTML panel
  if (e.ctrlKey && e.shiftKey && e.key === 'H' && state.currentTab === 'design') {
    e.preventDefault();
    openInsertHTMLPanel();
  }
  
  // Escape — close find replace and insert HTML panels
  if (e.key === 'Escape') {
    closeFindReplace();
    closeInsertHTMLPanel();
  }
});

// Sync selection changed to toolbar states and dropdowns
document.addEventListener('selectionchange', () => {
  saveEditorSelection();
  updateToolbarState();
  syncDropdownsToSelection();
});

// CodeMirror preparation events
window.addEventListener('cm-ready', () => {
  if (state.currentTab === 'code') {
    initCodeMirror();
  }
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadFromLocalStorage();
  renderCanvas();
});

// Fallback if DOMContentLoaded already fired before script execution
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  loadFromLocalStorage();
  renderCanvas();
}
