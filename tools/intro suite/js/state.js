export const state = {
  elements: [],
  selectedId: null,
  dialogueContent: '',
  dialogueBg: '',
  cmEditor: null,           // CodeMirror EditorView or proxy textarea
  _codeSyncTimer: null,     // design → code debounce
  _designSyncTimer: null,   // code → design debounce
  _suppressCodeSync: false, // prevent feedback loops
  _savedRange: null,        // saved dialogue selection for insert-html
  frMatches: [],            // find/replace match list
  frIndex: -1,
  currentModal: null,
  currentTab: 'design',
  outPanelOpen: false,
  currentOutTab: 'minified',
  viewportDevice: 'desktop',
  viewportOrientation: 'portrait'
};

export const THEMES = {
  vn_red1: 'https://minimumlogix.github.io/VN_Engine/apps/single_vn/styles/vn_red1.css',
  vn_dark1: 'https://minimumlogix.github.io/VN_Engine/apps/single_vn/styles/vn_dark1.css',
  vn_blue1: 'https://minimumlogix.github.io/VN_Engine/apps/single_vn/styles/vn_blue1.css',
  vn_gold1: 'https://minimumlogix.github.io/VN_Engine/apps/single_vn/styles/vn_gold1.css',
  vn_green1: 'https://minimumlogix.github.io/VN_Engine/apps/single_vn/styles/vn_green1.css',
  vn_purple1: 'https://minimumlogix.github.io/VN_Engine/apps/single_vn/styles/vn_purple1.css',
};

export const MUSIC_BASE = 'https://minimumlogix.github.io/VN_Engine/apps/music/mw';
export const LORE_BASE = 'https://minimumlogix.github.io/World-Nexus/#/world/';
export const VN_BASE = 'https://minimumlogix.github.io/VN_Engine/apps/single_vn/';

export const MODALS = {
  music: {
    title: '🎵 Music Player',
    sub: 'Add a YouTube music player that streams audio in the intro.',
    fields: [
      { id: 'yt-url', label: 'YouTube URL or Video ID', placeholder: 'https://youtube.com/watch?v=... or video ID', type: 'text' },
      { id: 'vol', label: 'Start Volume (0-100)', placeholder: '100', type: 'text', default: '100' },
      { id: 'autoplay', label: 'Autoplay', type: 'toggle', default: true },
      { id: 'volmem', label: 'Volume Memory (skip vol param)', type: 'toggle', default: true },
    ]
  },
  image: {
    title: '🖼 Full-Width Image',
    sub: 'A full-width banner image. Paste the direct image URL.',
    fields: [
      { id: 'img-url', label: 'Image URL', placeholder: 'https://example.com/image.png', type: 'text' },
      { id: 'img-alt', label: 'Alt Text (optional)', placeholder: 'Description of image', type: 'text' },
    ]
  },
  character: {
    title: '👤 Character Hub',
    sub: 'A character display with sprite and backdrop.',
    fields: [
      { id: 'char-name', label: 'Character Name', placeholder: 'Vireth Solthane', type: 'text' },
      { id: 'char-sprite', label: 'Sprite Image URL', placeholder: 'https://...sprite.png', type: 'text' },
      { id: 'char-bg', label: 'Backdrop Image URL', placeholder: 'https://...backdrop.png', type: 'text' },
      { id: 'char-class', label: 'Sprite CSS Class', placeholder: 'speaking (leave blank for default)', type: 'text' },
    ]
  },
  vn: {
    title: '▶ VN Engine Frame',
    sub: 'Embed an interactive VN storyframe iframe.',
    fields: [
      { id: 'vn-url', label: 'VN Story URL', placeholder: 'https://minimumlogix.github.io/VN_Engine/...', type: 'text' },
      { id: 'vn-height', label: 'Height (px)', placeholder: '500', type: 'text', default: '500' },
    ]
  },
  dialogue: {
    title: '💬 Dialogue Box',
    sub: 'Add the main dialogue/content box. There should only be one.',
    fields: [
      { id: 'dlg-bg', label: 'Background Image URL (optional)', placeholder: 'https://...bg.png or leave blank', type: 'text' },
    ]
  },
  lore: {
    title: '🗄 Lore Database',
    sub: 'A collapsible lore panel with an embedded World-Nexus frame.',
    fields: [
      { id: 'lore-title', label: 'Panel Title', placeholder: 'Lore Database', type: 'text', default: 'Lore Database' },
      { id: 'lore-url', label: 'Lore URL or World ID', placeholder: 'arcanis  OR  full URL', type: 'text' },
      { id: 'lore-height', label: 'Frame Height (px)', placeholder: '400', type: 'text', default: '400' },
    ]
  }
};
