import { state } from '../state.js';
import { showToast, htmlToMarkdown } from '../utils.js';
import { renderCanvas } from './canvas.js';
import { generateFullCode, getDialogueRawText, initCodeMirror } from './codeMirror.js';

export function switchTab(tab) {
  state.currentTab = tab;
  ['design', 'code', 'preview'].forEach(t => {
    const btn = document.getElementById('tab-' + t);
    const el = document.getElementById(t + '-mode');
    if (btn) btn.classList.toggle('active', t === tab);
    if (el) el.style.display = (t === tab) ? 'flex' : 'none';
    if (el && t === 'design') el.style.flexDirection = (t === tab) ? 'column' : '';
  });

  if (tab === 'code') {
    initCodeMirror();
    const { updateCodeEditor, updateCodeInfoBadge } = window.App || {};
    if (updateCodeEditor) updateCodeEditor();
    if (updateCodeInfoBadge) updateCodeInfoBadge();
  }
  if (tab === 'preview') {
    refreshPreview();
  }
}

export function refreshPreview() {
  const code = generateFullCode(false, false);
  const ifrm = document.getElementById('preview-iframe');
  if (!ifrm) return;
  const doc = ifrm.contentDocument || ifrm.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;padding:16px;background:#111;}</style></head><body>${code}</body></html>`);
  doc.close();
}

export function toggleOutput() {
  state.outPanelOpen = !state.outPanelOpen;
  const panel = document.getElementById('output-panel');
  if (panel) {
    panel.classList.toggle('open', state.outPanelOpen);
  }
  if (state.outPanelOpen) {
    updateOutput();
  }
}

export function switchOutTab(tab) {
  state.currentOutTab = tab;
  ['minified', 'dialogue', 'full'].forEach(t => {
    const el = document.getElementById('outtab-' + t);
    if (el) el.classList.toggle('active', t === tab);
  });
  updateOutput();
}

export function updateOutput() {
  const el = document.getElementById('output-code');
  if (!el) return;
  if (state.currentOutTab === 'minified') {
    el.textContent = generateFullCode(true, false);
  } else if (state.currentOutTab === 'dialogue') {
    el.textContent = htmlToMarkdown(getDialogueRawText());
  } else {
    el.textContent = generateFullCode(false, false);
  }
}

export function copyMinified() {
  const code = generateFullCode(true, false);
  navigator.clipboard.writeText(code).then(() => {
    showToast('✓ Minified code copied!');
  }).catch(() => {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = code;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('✓ Copied!');
  });
  if (!state.outPanelOpen) {
    state.outPanelOpen = true;
    const panel = document.getElementById('output-panel');
    if (panel) panel.classList.add('open');
  }
  updateOutput();
}

export function clearAll() {
  if (!confirm('Clear all elements and dialogue? This cannot be undone.')) return;
  state.elements = [];
  state.dialogueContent = '';
  state.dialogueBg = '';
  localStorage.removeItem('introsuite_state');
  renderCanvas();
  showToast('🗑 Cleared');
}

export function deleteCache() {
  localStorage.removeItem('introsuite_state');
  showToast('⟳ Cache cleared');
}

export function joinDiscord() {
  window.open('https://discord.gg/minimumlogix', '_blank');
}

export function toggleSidebarDrawer() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('drawer-backdrop');
  if (!sidebar) return;
  const isOpen = sidebar.classList.contains('open');
  
  sidebar.classList.toggle('open', !isOpen);
  if (backdrop) backdrop.classList.toggle('active', !isOpen);
}

export function closeAllDrawers() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('drawer-backdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('active');
}

// Viewport Simulator controls
export function setViewport(device) {
  state.viewportDevice = device;
  
  ['desktop', 'tablet', 'phone'].forEach(d => {
    const btn = document.getElementById('vp-btn-' + d);
    if (btn) btn.classList.toggle('active', d === device);
  });
  
  const rotateBtn = document.getElementById('vp-btn-rotate');
  const rotateSep = document.getElementById('vp-sep-orientation');
  if (rotateBtn) rotateBtn.style.display = (device === 'desktop') ? 'none' : 'inline-block';
  if (rotateSep) rotateSep.style.display = (device === 'desktop') ? 'none' : 'inline-block';
  
  updateViewportUI();
}

export function toggleViewportOrientation() {
  state.viewportOrientation = (state.viewportOrientation === 'portrait') ? 'landscape' : 'portrait';
  
  const rotateBtn = document.getElementById('vp-btn-rotate');
  if (rotateBtn) {
    rotateBtn.classList.toggle('active', state.viewportOrientation === 'landscape');
  }
  
  updateViewportUI();
}

export function updateViewportUI() {
  const wrapper = document.getElementById('viewport-wrapper');
  const dimsEl = document.getElementById('viewport-dims');
  if (!wrapper) return;
  
  wrapper.className = 'viewport-frame-wrapper';
  
  if (state.viewportDevice === 'desktop') {
    if (dimsEl) dimsEl.textContent = '100% × 100%';
  } else {
    wrapper.classList.add(state.viewportDevice);
    if (state.viewportOrientation === 'landscape') {
      wrapper.classList.add('landscape');
    }
    
    if (dimsEl) {
      if (state.viewportDevice === 'tablet') {
        dimsEl.textContent = (state.viewportOrientation === 'portrait') ? '768 × 1024' : '1024 × 768';
      } else {
        dimsEl.textContent = (state.viewportOrientation === 'portrait') ? '375 × 667' : '667 × 375';
      }
    }
  }
}


