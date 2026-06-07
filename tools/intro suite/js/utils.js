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

// HTML to Markdown converter
export function htmlToMarkdown(html) {
  if (!html) return '';
  let str = html;

  // Replace br tags with \n
  str = str.replace(/<br\s*\/?>/gi, '\n');

  // Replace div blocks with newlines
  str = str.replace(/<div>([\s\S]*?)<\/div>/gi, (match, content) => {
    return '\n' + content;
  });

  // Replace p blocks with newlines
  str = str.replace(/<p>([\s\S]*?)<\/p>/gi, (match, content) => {
    return '\n' + content + '\n';
  });

  // Replace headings
  str = str.replace(/<h1>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  str = str.replace(/<h2>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  str = str.replace(/<h3>([\s\S]*?)<\/h3>/gi, '\n### $1\n');

  // Replace blockquotes
  str = str.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, (match, content) => {
    return '\n> ' + content.trim().replace(/\n/g, '\n> ') + '\n';
  });

  // Replace hr
  str = str.replace(/<hr[^>]*>/gi, '\n---\n');

  // Replace bold, italic, code
  let prev;
  do {
    prev = str;
    str = str.replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**');
    str = str.replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**');
    str = str.replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*');
    str = str.replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*');
    str = str.replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`');
  } while (str !== prev);

  // Convert &nbsp; to space
  str = str.replace(/&nbsp;/g, ' ');

  // Standardize multiple newlines
  str = str.replace(/\n{3,}/g, '\n\n');

  return str.trim();
}

// Markdown to HTML converter
export function markdownToHtml(md) {
  if (!md) return '';
  let str = md;

  // Process blocks line by line
  const lines = str.split('\n');
  const processedLines = lines.map(line => {
    let l = line;
    
    // Check if line is a header
    if (l.startsWith('# ')) {
      return `<h1>${l.substring(2)}</h1>`;
    }
    if (l.startsWith('## ')) {
      return `<h2>${l.substring(3)}</h2>`;
    }
    if (l.startsWith('### ')) {
      return `<h3>${l.substring(4)}</h3>`;
    }
    
    // Check if line is a divider
    if (l.trim() === '---') {
      return '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.15);margin:12px 0;">';
    }
    
    // Check if line is a blockquote
    if (l.startsWith('> ')) {
      return `<blockquote>${l.substring(2)}</blockquote>`;
    }

    // Otherwise, wrap in div for next line / block structure
    return l ? `<div>${l}</div>` : '<div><br></div>';
  });

  str = processedLines.join('');

  // Process inline styles
  let prev;
  do {
    prev = str;
    str = str.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
    str = str.replace(/\*([\s\S]*?)\* /g, '<em>$1</em> '); // handle space trailing italic if needed, or simply *text*
    str = str.replace(/\*([\s\S]*?)\*/g, '<em>$1</em>');
    str = str.replace(/`([\s\S]*?)`/g, '<code>$1</code>');
  } while (str !== prev);

  return str;
}
