import { state } from '../state.js';
import { saveToLocalStorage } from '../utils.js';
import { scheduleCodeSync } from '../ui/codeMirror.js';
import { updateWordCount } from '../ui/canvas.js';
import { toggleFindReplace, openInsertHTMLPanel, closeFindReplace, closeInsertHTMLPanel } from './findReplace.js';

let lastEditorRange = null;

// Save editor selection range
export function saveEditorSelection() {
  const ed = document.getElementById('dialogue-editor');
  if (!ed) return;
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    if (ed.contains(range.commonAncestorContainer)) {
      lastEditorRange = range.cloneRange();
    }
  }
}

// Restore editor selection range
export function restoreEditorSelection() {
  const ed = document.getElementById('dialogue-editor');
  if (!ed) return;
  ed.focus();
  if (lastEditorRange) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(lastEditorRange);
  }
}

// Synchronize toolbar select dropdowns with cursor context
export function syncDropdownsToSelection() {
  const ed = document.getElementById('dialogue-editor');
  if (!ed) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!ed.contains(range.commonAncestorContainer)) return;

  let node = range.startContainer;
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement;
  }

  let foundFont = 'inherit';
  let foundSize = '';
  let foundColor = '#e8e4e0';
  let foundEffect = '';

  let curr = node;
  while (curr && curr !== ed) {
    if (curr.nodeType === Node.ELEMENT_NODE) {
      if (foundFont === 'inherit') {
        if (curr.style.fontFamily) {
          foundFont = curr.style.fontFamily;
        } else if (curr.tagName.toLowerCase() === 'font' && curr.hasAttribute('face')) {
          foundFont = curr.getAttribute('face');
        }
      }
      if (!foundSize && curr.style.fontSize) {
        foundSize = curr.style.fontSize;
      }
      if (foundColor === '#e8e4e0' && curr.style.color) {
        foundColor = curr.style.color;
      }
      if (!foundEffect && curr.style.textShadow) {
        const ts = curr.style.textShadow;
        if (ts.includes('#ff3333')) foundEffect = 'glow-red';
        else if (ts.includes('#3388ff')) foundEffect = 'glow-blue';
        else if (ts.includes('#ffcc00')) foundEffect = 'glow-gold';
        else if (ts.includes('rgba(0,0,0,0.8)') || ts.includes('rgba(0, 0, 0, 0.8)')) foundEffect = 'shadow';
      }
      if (!foundEffect && curr.style.textTransform === 'uppercase') {
        foundEffect = 'uppercase';
      }
      if (!foundEffect && curr.style.fontVariant === 'small-caps') {
        foundEffect = 'smallcaps';
      }
    }
    curr = curr.parentElement;
  }

  const fontSel = document.getElementById('font-select');
  if (fontSel) {
    const norm = val => val.replace(/['"]/g, '').toLowerCase();
    const matchedOption = Array.from(fontSel.options).find(opt => norm(opt.value) === norm(foundFont));
    fontSel.value = matchedOption ? matchedOption.value : 'inherit';
  }

  const sizeSel = document.getElementById('fontsize-select');
  if (sizeSel) {
    sizeSel.value = foundSize || '';
  }

  const colorPick = document.getElementById('text-color-picker');
  if (colorPick) {
    if (foundColor.startsWith('#')) {
      colorPick.value = foundColor;
    } else if (foundColor.startsWith('rgb')) {
      const parts = foundColor.match(/\d+/g);
      if (parts && parts.length >= 3) {
        const hex = '#' + parts.slice(0, 3).map(x => Number(x).toString(16).padStart(2, '0')).join('');
        colorPick.value = hex;
      }
    }
  }

  const effectSel = document.getElementById('effect-select');
  if (effectSel) {
    effectSel.value = foundEffect;
  }
}

// Clean nested styles and wrap selection cleanly
export function applyStyleToSelection(styleObj) {
  const ed = document.getElementById('dialogue-editor');
  if (!ed) return;
  ed.focus();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);

  if (range.collapsed) {
    const hasActiveStyle = Object.values(styleObj).some(val => val !== '');
    if (!hasActiveStyle) return;

    const span = document.createElement('span');
    Object.assign(span.style, styleObj);
    span.appendChild(document.createTextNode('\u200B')); // zero-width space
    range.insertNode(span);
    
    range.setStart(span.firstChild, 1);
    range.setEnd(span.firstChild, 1);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    const frag = range.extractContents();
    
    // Clean nested instances of the style properties from children
    const elements = frag.querySelectorAll('*');
    elements.forEach(el => {
      if (el.style) {
        Object.keys(styleObj).forEach(prop => {
          if (prop === 'textShadow') {
            el.style.textShadow = '';
          } else if (prop === 'fontFamily' && el.tagName.toLowerCase() === 'font') {
            el.removeAttribute('face');
          } else {
            el.style[prop] = '';
          }
        });
        if (styleObj.textTransform) el.style.textTransform = '';
        if (styleObj.fontVariant) el.style.fontVariant = '';
      }
      
      if (el.tagName.toLowerCase() === 'span') {
        const hasAttrs = Array.from(el.attributes).some(attr => attr.name !== 'style');
        const hasStyles = el.style.cssText.trim() !== '';
        if (!hasAttrs && !hasStyles) {
          const parent = el.parentNode;
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
          }
          el.remove();
        }
      }
    });

    const hasActiveStyle = Object.entries(styleObj).some(([k, v]) => v !== '');
    if (hasActiveStyle) {
      const span = document.createElement('span');
      Object.entries(styleObj).forEach(([k, v]) => {
        if (v !== '') span.style[k] = v;
      });
      span.appendChild(frag);
      range.insertNode(span);
      range.selectNodeContents(span);
    } else {
      range.insertNode(frag);
    }
    
    sel.removeAllRanges();
    sel.addRange(range);
  }
  updateDialogueContent();
}

// Safe wrapping fallback
export function safeWrap(range, node) {
  try {
    range.surroundContents(node);
  } catch (e) {
    const frag = range.extractContents();
    node.appendChild(frag);
    range.insertNode(node);
  }
}

// Update dialogue editor state
export function updateDialogueContent() {
  const ed = document.getElementById('dialogue-editor');
  if (ed) {
    state.dialogueContent = ed.innerHTML;
    updateWordCount();
    saveToLocalStorage();
    scheduleCodeSync();
  }
}

// Execute format command (bold, italic, etc.)
export function fmt(cmd, val = null) {
  restoreEditorSelection();
  document.execCommand(cmd, false, val);
  updateDialogueContent();
}

// Apply text color
export function applyColor(color) {
  if (!color) return;
  restoreEditorSelection();
  applyStyleToSelection({ color });
}

// Apply font family
export function applyFont(font) {
  restoreEditorSelection();
  if (!font || font === 'inherit') {
    applyStyleToSelection({ fontFamily: '' });
  } else {
    applyStyleToSelection({ fontFamily: font });
  }
}

// Apply font size
export function applyFontSize(size) {
  restoreEditorSelection();
  if (!size) {
    applyStyleToSelection({ fontSize: '' });
  } else {
    applyStyleToSelection({ fontSize: size });
  }
}

// Apply visual effects (glows, drop shadow, text transformation)
export function applyEffect(effect) {
  restoreEditorSelection();
  const clearedStyles = { textShadow: '', textTransform: '', fontVariant: '' };
  if (!effect) {
    applyStyleToSelection(clearedStyles);
  } else {
    let newStyles = {};
    switch(effect) {
      case 'glow-red':  newStyles = { textShadow: '0 0 8px #ff3333,0 0 16px #c00000' }; break;
      case 'glow-blue': newStyles = { textShadow: '0 0 8px #3388ff,0 0 16px #0044cc' }; break;
      case 'glow-gold': newStyles = { textShadow: '0 0 8px #ffcc00,0 0 16px #aa8800' }; break;
      case 'shadow':    newStyles = { textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }; break;
      case 'uppercase': newStyles = { textTransform: 'uppercase' }; break;
      case 'smallcaps': newStyles = { fontVariant: 'small-caps' }; break;
    }
    applyStyleToSelection(Object.assign({}, clearedStyles, newStyles));
  }
}

// Apply paragraph structure / type presets
export function applyTextPreset(preset) {
  if (!preset) return;
  restoreEditorSelection();
  switch(preset) {
    case 'h1':    document.execCommand('formatBlock', false, 'h1'); break;
    case 'h2':    document.execCommand('formatBlock', false, 'h2'); break;
    case 'h3':    document.execCommand('formatBlock', false, 'h3'); break;
    case 'quote': document.execCommand('formatBlock', false, 'blockquote'); break;
    case 'italic-action': fmt('italic'); break;
    case 'code-inline': {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const code = document.createElement('code');
        safeWrap(range, code);
      }
      break;
    }
  }
  updateDialogueContent();
}

// Apply styling presets (Speech, Shout, Whisper)
export function applyPresetStyle(preset) {
  restoreEditorSelection();
  let styles = {};
  switch(preset) {
    case 'italic-action': styles = { fontStyle: 'italic', color: '#a09898' }; break;
    case 'speech':        styles = { color: '#ffffff', fontWeight: '600' }; break;
    case 'bold-red':      styles = { color: '#ff4444', fontWeight: '700' }; break;
    case 'whisper':       styles = { fontSize: '0.85em', color: '#888', fontStyle: 'italic', letterSpacing: '0.05em' }; break;
    case 'shout':         styles = { fontSize: '1.2em', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }; break;
  }
  applyStyleToSelection(styles);
}

// Insert direct image into dialogue HTML
export function insertImageInDialogue() {
  const url = prompt('Image URL:');
  if (!url) return;
  const ed = document.getElementById('dialogue-editor');
  if (!ed) return;
  ed.focus();
  const wrapHtml = `
    <div class="dialogue-image-wrap" contenteditable="false" style="display: block; margin: 6px auto; text-align: center;">
      <img src="${url}" style="max-width:100%; border-radius:4px; width: 100%; height: auto;">
      <div class="img-settings-dots" title="Image Settings"><i class="bi bi-three-dots"></i></div>
    </div>
  `;
  document.execCommand('insertHTML', false, wrapHtml);
  updateDialogueContent();
}

// Insert visual horizontal divider
export function insertHRInDialogue() {
  const ed = document.getElementById('dialogue-editor');
  if (!ed) return;
  ed.focus();
  document.execCommand('insertHTML', false, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.15);margin:12px 0;">');
  updateDialogueContent();
}

// Keyboard shortcut router for dialogue editor
export function dlgKeyDown(e) {
  if (e.key === 'b' && e.ctrlKey && !e.shiftKey) { e.preventDefault(); fmt('bold'); }
  else if (e.key === 'i' && e.ctrlKey && !e.shiftKey) { e.preventDefault(); fmt('italic'); }
  else if (e.key === 'u' && e.ctrlKey && !e.shiftKey) { e.preventDefault(); fmt('underline'); }
  else if (e.key === 'z' && e.ctrlKey && !e.shiftKey) { /* native undo — allow */ }
  else if (e.key === 'y' && e.ctrlKey) { /* native redo — allow */ }
  else if (e.key === 'h' && e.ctrlKey && !e.shiftKey) { e.preventDefault(); toggleFindReplace(); }
  else if (e.key === 'H' && e.ctrlKey && e.shiftKey) { e.preventDefault(); openInsertHTMLPanel(); }
  else if (e.key === 'Escape') { closeFindReplace(); closeInsertHTMLPanel(); }
}

