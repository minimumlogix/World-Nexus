const COLOR_REGEX = /#([A-Fa-f0-9]{3}){1,2}\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[0-9.]+\s*)?\)|hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(?:,\s*[0-9.]+\s*)?\)/gi;
const SYNTAX_REGEX = /(<[^>]+>|(?:\*\*\*|\*\*|\*|#+|---|^>))/gm;
const COMPONENT_CATEGORIES = {
    media: [
        { type: 'image', name: 'Image', desc: 'Flexible Alignment & Size', icon: 'bi-image' },
        { type: 'music', name: 'Music Player', desc: 'YouTube Stream', icon: 'bi-music-note-beamed' },
        { type: 'sfx', name: 'SFX Player', desc: 'Audio Trigger Button', icon: 'bi-volume-up' }
    ],
    text: [
        { type: 'gif-heading', name: 'Gif Heading', desc: 'Animated Text Title', icon: 'bi-fonts' },
        { type: 'dialogue', name: 'Dialogue Box', desc: 'Rich Text Content', icon: 'bi-chat-left-dots' },
        { type: 'quote', name: 'Quotes', desc: 'Stylized Blockquote', icon: 'bi-quote' },
        { type: 'terminal', name: 'Terminal Console', desc: 'Monospaced Command Log', icon: 'bi-terminal' },
        { type: 'link', name: 'Link Button', desc: 'External Link Banner', icon: 'bi-link-45deg' },
        { type: 'scene-break', name: 'Scene Break', desc: 'Atmospheric Separator', icon: 'bi-hr' },
        { type: 'lore', name: 'Lore Database', desc: 'Collapsible Info Panel', icon: 'bi-database' }
    ],
    'visual-novel': [
        { type: 'vn-iframe', name: 'VN Engine', desc: 'Interactive Story Iframe', icon: 'bi-play-circle' },
        { type: 'character', name: 'Character Hub', desc: 'Portraits & Backdrop', icon: 'bi-person-bounding-box' }
    ],
    cards: [
        { type: 'card-template', name: 'Private Dispatch', desc: 'Elegant letter card with wax stamp', icon: 'bi-card-text' },
        { type: 'card-bladerunner', name: 'Bladerunner Terminal', desc: 'Cyberpunk terminal console display', icon: 'bi-terminal' },
        { type: 'card-imessage', name: 'iMessage Chat', desc: 'Interactive chat message bubbles', icon: 'bi-chat-text' },
        { type: 'card-steampunk', name: 'Steampunk Vault', desc: 'Clockwork puzzle decoding card', icon: 'bi-gear' }
    ],
    custom: [
        { type: 'custom-html', name: 'Custom HTML', desc: 'Raw HTML & Inline Styles', icon: 'bi-code-slash' },
        { type: 'custom-iframe', name: 'Custom Iframe', desc: 'External URL Parameters', icon: 'bi-window-sidebar' }
    ]
};

const DEFAULT_CARD_TEMPLATE = `<div style="background:radial-gradient(circle at top,#f7f0db 0%,#e7d8b4 58%,#ccb07d 100%);border:1px solid #5f472d;box-shadow:0 10px 28px rgba(40,28,16,.25),inset 0 0 0 1px rgba(255,255,255,.35);padding:30px;color:#322416;font-family:Georgia,'Times New Roman',serif;position:relative;overflow:hidden;">
<div style="position:absolute;top:-40px;right:-30px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,.08);"></div>

<div style="text-align:center;font-size:.72em;letter-spacing:.55em;text-transform:uppercase;color:#8a6b48;margin-bottom:18px;">{{title}}</div>

<div style="font-size:1.05em;line-height:1.9;font-style:italic;">
{{content}}
</div>

<div style="margin-top:24px;text-align:right;">
<div style="font-size:.82em;letter-spacing:.18em;text-transform:uppercase;color:#7b5a35;">{{sigLabel}}</div>
<div style="font-size:1.75em;font-family:'Palatino Linotype',serif;color:#4b3118;">{{sigName}}</div>
</div>

<div style="margin-top:20px;padding-top:14px;border-top:1px dotted rgba(95,71,45,.55);display:flex;justify-content:flex-end;">
<div style="width:56px;height:56px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#b01d1d,#651111 70%,#360707 100%);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 2px 4px rgba(255,255,255,.18),0 3px 8px rgba(0,0,0,.3);">
<span style="color:#f5ddb3;font-size:1.45em;font-family:Georgia,serif;font-weight:bold;">{{stamp}}</span>
</div>
</div>
</div>`;

const DEFAULT_BLADERUNNER_TEMPLATE = `<div class="vn-bladerunner-box" style="background:#0a0d10;border:1px solid #ff8a3d;padding:22px;font-family:'Courier New',monospace;color:#ffb66b;box-shadow:0 0 18px rgba(255,120,40,.18),inset 0 0 20px rgba(255,140,60,.08);position:relative;overflow:hidden;">
<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,150,80,.35);padding-bottom:8px;margin-bottom:16px;font-size:.75em;letter-spacing:.22em;text-transform:uppercase;color:#ff9950;">
<span>{{headerLeft}}</span>
<span>{{headerRight}}</span>
</div>
<div class="vn-bladerunner-content" style="font-size:.92em;line-height:1.75;white-space:pre-wrap;">{{content}}</div>
<div style="margin-top:18px;border-top:1px dashed rgba(255,150,80,.3);padding-top:10px;display:flex;justify-content:space-between;font-size:.78em;color:#ff8a3d;">
<span>{{footerLeft}}</span>
<span>{{footerMiddle}}</span>
<span>{{footerRight}}</span>
</div>
<div style="margin-top:14px;background:rgba(255,120,40,.08);border-left:3px solid #ff8a3d;padding:10px 12px;font-size:.84em;color:#ffd4a1;">
{{tokenLabel}}<br>
<b>{{tokenValue}}</b>
</div>
<div style="margin-top:18px;text-align:right;font-size:.72em;letter-spacing:.28em;color:#ff7a2b;text-transform:uppercase;">
{{endText}}
</div>
</div>`;

// iMessage template elements are rendered dynamically based on character registries and message lists.

let canvasItems = [];
let currentType = null;
let editingIndex = -1;

function flatToModular(flat) {
    if (!flat) return null;
    if (flat.content || flat.font || flat.fill || flat.stroke) {
        return flat;
    }

    const item = {
        id: flat.id || Date.now(),
        type: flat.type || 'text',
        content: {},
        font: {},
        fill: {
            type: 'solid',
            solid: { color: '#ffffff' },
            gradient: { type: 'linear', angle: 90, stops: [] }
        },
        stroke: { enabled: false, color: '', width: 1 },
        shadow: { layers: [] },
        effects: {},
        animation: {},
        layout: {},
        metadata: {}
    };

    if (flat.design !== undefined) {
        item.layout.design = flat.design;
    }

    switch (flat.type) {
        case 'image':
            item.content.imageUrl = flat['image-url'] || '';
            item.layout.alignment = flat['alignment'] || 'full';
            item.layout.width = flat['image-width'] || 'auto';
            item.layout.height = flat['image-height'] || 'auto';
            break;
            
        case 'gif-heading':
            item.content.text = flat.text || 'JOYLAND';
            item.content.gifTitle = {
                enabled: true,
                preset: flat['gif-url'] || ''
            };
            item.font.family = flat['font-family'] || 'Bebas Neue';
            item.font.size = flat['font-size'] || '5em';
            if (flat['stroke-color']) {
                item.stroke.enabled = true;
                item.stroke.color = flat['stroke-color'];
                item.stroke.width = 1;
            }
            break;
            
        case 'music':
            item.content.ytUrl = flat['yt-url'] || '';
            item.content.ytId = flat.ytId || '';
            item.metadata.volume = flat.volume !== undefined ? parseInt(flat.volume) : 100;
            item.metadata.autoplay = flat.autoplay !== undefined ? (flat.autoplay === 'true' || flat.autoplay === true) : true;
            item.metadata.theme = flat.theme || 'nasapunk';
            break;
            
        case 'character':
            item.content.bgUrl = flat['bg-url'] || '';
            item.content.characters = flat.characters || [];
            break;
            
        case 'vn-iframe':
            item.content.storyId = flat['story-id'] || '';
            item.layout.height = flat['iframe-height'] !== undefined ? parseInt(flat['iframe-height']) : 450;
            break;
            
        case 'dialogue':
            item.content.text = flat['dialogue-text'] || '';
            if (flat['speaker-name'] !== undefined) {
                if (!item.metadata) item.metadata = {};
                item.metadata.speakerName = flat['speaker-name'];
            }
            break;
            
        case 'lore':
            item.content.loreLink = flat['lore-link'] || '';
            item.content.loreText = flat['lore-text'] || '';
            item.layout.height = flat['lore-height'] !== undefined ? parseInt(flat['lore-height']) : 450;
            item.layout.open = flat['lore-open'] === 'true';
            break;
            
        case 'custom-html':
            item.content.htmlContent = flat['html-content'] || '';
            break;
            
        case 'custom-iframe':
            item.content.iframeUrl = flat['iframe-url'] || '';
            item.layout.height = flat['iframe-height'] !== undefined ? parseInt(flat['iframe-height']) : 450;
            item.layout.heightMode = flat['iframe-height-mode'] || 'fixed';
            item.metadata.iframeParams = flat['iframe-params'] || '';
            break;
            
        case 'sfx':
            item.content.sfxUrl = flat['sfx-url'] || '';
            item.content.text = flat.text || 'Play Sound Effect';
            item.content.design = flat.design || 'touch';
            item.content.sfxTranscript = flat['sfx-transcript'] || '';
            break;
            
        case 'link':
            item.content.linkUrl = flat['link-url'] || '';
            item.content.text = flat.text || 'Visit Site';
            item.metadata.target = flat.target || '_blank';
            break;
            
        case 'quote':
            item.content.text = flat.text || '';
            item.metadata.author = flat.author || '';
            break;
            
        case 'card':
            item.content.title = flat.title || '';
            item.content.text = flat.text || '';
            break;
            
        case 'terminal':
            item.content.title = flat.title || 'bash';
            item.content.text = flat.text || '';
            break;
            
        case 'scene-break':
            item.content.text = flat.text || '';
            break;
            
        case 'card-template':
            item.content.template = flat.template || DEFAULT_CARD_TEMPLATE;
            item.content.title = flat.title !== undefined ? flat.title : 'Private Dispatch';
            item.content.text = flat.text !== undefined ? flat.text : `To the only soul I trust,\n\nIf this reaches your hands, then fortune has favored us one final time. The silence surrounding Blackmere has begun to crack, and what waits beneath it should never have been unearthed. Every passing hour narrows the path still open to us.\n\nDo not answer this letter. Burn it.\n\nMeet me where the abandoned bell tower overlooks the river, precisely when the final lantern on the eastern quay goes dark. Arrive alone, keep your hood drawn, and allow no one to follow. Bring neither baggage nor questions until we stand face to face.\n\nI have hidden what they seek, though I doubt I can keep it from them much longer.`;
            item.content.sigLabel = flat.sigLabel !== undefined ? flat.sigLabel : 'Until then';
            item.content.sigName = flat.sigName !== undefined ? flat.sigName : 'Aster';
            item.content.stamp = flat.stamp !== undefined ? flat.stamp : '✶';
            item.metadata.htmlMode = flat.htmlMode === 'true';
            break;
        case 'card-bladerunner':
            item.content.headerLeft = flat.headerLeft || '';
            item.content.headerRight = flat.headerRight || '';
            item.content.text = flat.text || '';
            item.content.footerLeft = flat.footerLeft || '';
            item.content.footerMiddle = flat.footerMiddle || '';
            item.content.footerRight = flat.footerRight || '';
            item.content.tokenLabel = flat.tokenLabel || '';
            item.content.tokenValue = flat.tokenValue || '';
            item.content.endText = flat.endText || '';
            break;
        case 'card-imessage':
            item.content.characters = flat.characters || [];
            item.content.messages = flat.messages || [];
            item.content.mode = flat.mode || 'auto';
            item.content['imessage-bg'] = flat['imessage-bg'] || '';
            item.content['imessage-font'] = flat['imessage-font'] || '';
            item.content['imessage-bg-color'] = flat['imessage-bg-color'] || '#ffffff';
            item.content['imessage-incoming-bg'] = flat['imessage-incoming-bg'] || '#e9e9eb';
            item.content['imessage-incoming-text'] = flat['imessage-incoming-text'] || '#000000';
            item.content['imessage-outgoing-bg'] = flat['imessage-outgoing-bg'] || '#0A84FF';
            item.content['imessage-outgoing-text'] = flat['imessage-outgoing-text'] || '#ffffff';
            break;
        case 'card-steampunk':
            item.content.steampunkTitle = flat['steampunk-title'] || '';
            item.content.steampunkText = flat['steampunk-text'] || '';
            item.content.steampunkCode = flat['steampunk-code'] || '394';
            item.content.design = flat.design || 'brass';
            break;
    }

    return item;
}

function modularToFlat(mod) {
    if (!mod) return null;
    if (!mod.content && !mod.font && !mod.layout && !mod.fill) {
        return mod;
    }

    const flat = {
        id: mod.id,
        type: mod.type
    };

    if (mod.layout && mod.layout.design !== undefined) {
        flat.design = mod.layout.design;
    }

    switch (mod.type) {
        case 'image':
            flat['image-url'] = mod.content.imageUrl || '';
            flat['alignment'] = mod.layout.alignment || 'full';
            flat['image-width'] = mod.layout.width || 'auto';
            flat['image-height'] = mod.layout.height || 'auto';
            break;
            
        case 'gif-heading':
            flat.text = mod.content.text || '';
            flat['gif-url'] = mod.content.gifTitle ? (mod.content.gifTitle.preset || '') : '';
            flat['font-family'] = mod.font.family || '';
            flat['font-size'] = mod.font.size || '';
            flat['stroke-color'] = (mod.stroke && mod.stroke.enabled) ? (mod.stroke.color || '') : '';
            break;
            
        case 'music':
            flat['yt-url'] = mod.content.ytUrl || '';
            flat.ytId = mod.content.ytId || '';
            flat.volume = mod.metadata.volume !== undefined ? mod.metadata.volume : 100;
            flat.autoplay = mod.metadata.autoplay !== undefined ? mod.metadata.autoplay : true;
            flat.theme = mod.metadata.theme || 'nasapunk';
            break;
            
        case 'character':
            flat['bg-url'] = mod.content.bgUrl || '';
            flat.characters = mod.content.characters || [];
            break;
            
        case 'vn-iframe':
            flat['story-id'] = mod.content.storyId || '';
            flat['iframe-height'] = mod.layout.height !== undefined ? mod.layout.height : 450;
            break;
            
        case 'dialogue':
            flat['dialogue-text'] = mod.content.text || '';
            flat['speaker-name'] = mod.metadata ? (mod.metadata.speakerName || '') : '';
            break;
            
        case 'lore':
            flat['lore-link'] = mod.content.loreLink || '';
            flat['lore-text'] = mod.content.loreText || '';
            flat['lore-height'] = mod.layout.height !== undefined ? mod.layout.height : 450;
            flat['lore-open'] = mod.layout.open ? 'true' : 'false';
            break;
            
        case 'custom-html':
            flat['html-content'] = mod.content.htmlContent || '';
            break;
            
        case 'custom-iframe':
            flat['iframe-url'] = mod.content.iframeUrl || '';
            flat['iframe-height'] = mod.layout.height !== undefined ? mod.layout.height : 450;
            flat['iframe-height-mode'] = mod.layout.heightMode || 'fixed';
            flat['iframe-params'] = mod.metadata.iframeParams || '';
            break;
            
        case 'sfx':
            flat['sfx-url'] = mod.content.sfxUrl || '';
            flat.text = mod.content.text || '';
            flat.design = mod.content.design || 'touch';
            flat['sfx-transcript'] = mod.content.sfxTranscript || '';
            break;
            
        case 'link':
            flat['link-url'] = mod.content.linkUrl || '';
            flat.text = mod.content.text || '';
            flat.target = mod.metadata.target || '_blank';
            break;
            
        case 'quote':
            flat.text = mod.content.text || '';
            flat.author = mod.metadata.author || '';
            break;
            
        case 'card':
            flat.title = mod.content.title || '';
            flat.text = mod.content.text || '';
            break;
            
        case 'terminal':
            flat.title = mod.content.title || '';
            flat.text = mod.content.text || '';
            break;
            
        case 'scene-break':
            flat.text = mod.content.text || '';
            break;
            
        case 'card-template':
            flat.template = mod.content.template || '';
            flat.title = mod.content.title || '';
            flat.text = mod.content.text || '';
            flat.sigLabel = mod.content.sigLabel || '';
            flat.sigName = mod.content.sigName || '';
            flat.stamp = mod.content.stamp || '';
            flat.htmlMode = mod.metadata.htmlMode ? 'true' : 'false';
            break;
            
        case 'card-bladerunner':
            flat.headerLeft = mod.content.headerLeft || '';
            flat.headerRight = mod.content.headerRight || '';
            flat.text = mod.content.text || '';
            flat.footerLeft = mod.content.footerLeft || '';
            flat.footerMiddle = mod.content.footerMiddle || '';
            flat.footerRight = mod.content.footerRight || '';
            flat.tokenLabel = mod.content.tokenLabel || '';
            flat.tokenValue = mod.content.tokenValue || '';
            flat.endText = mod.content.endText || '';
            break;
            
        case 'card-imessage':
            flat.characters = mod.content.characters || [];
            flat.messages = mod.content.messages || [];
            flat.mode = mod.content.mode || 'auto';
            flat['imessage-bg'] = mod.content['imessage-bg'] || '';
            flat['imessage-font'] = mod.content['imessage-font'] || '';
            flat['imessage-bg-color'] = mod.content['imessage-bg-color'] || '#ffffff';
            flat['imessage-incoming-bg'] = mod.content['imessage-incoming-bg'] || '#e9e9eb';
            flat['imessage-incoming-text'] = mod.content['imessage-incoming-text'] || '#000000';
            flat['imessage-outgoing-bg'] = mod.content['imessage-outgoing-bg'] || '#0A84FF';
            flat['imessage-outgoing-text'] = mod.content['imessage-outgoing-text'] || '#ffffff';
            break;
        case 'card-steampunk':
            flat['steampunk-title'] = mod.content.steampunkTitle || '';
            flat['steampunk-text'] = mod.content.steampunkText || '';
            flat['steampunk-code'] = mod.content.steampunkCode || '394';
            flat.design = mod.content.design || 'brass';
            break;
    }

    return flat;
}

function updateModularProperty(item, fieldId, value) {
    const mod = flatToModular(item);
    
    switch (fieldId) {
        case 'image-url':
            mod.content.imageUrl = value;
            break;
        case 'text':
            mod.content.text = value;
            break;
        case 'gif-url':
            if (!mod.content.gifTitle) mod.content.gifTitle = { enabled: true };
            mod.content.gifTitle.preset = value;
            break;
        case 'stroke-color':
            if (!mod.stroke) mod.stroke = { enabled: true, width: 1 };
            mod.stroke.color = value;
            mod.stroke.enabled = !!value;
            break;
        case 'font-size':
            if (!mod.font) mod.font = {};
            mod.font.size = value;
            break;
        case 'font-family':
            if (!mod.font) mod.font = {};
            mod.font.family = value;
            break;
        case 'imessage-bg':
            mod.content['imessage-bg'] = value;
            break;
        case 'imessage-font':
            mod.content['imessage-font'] = value;
            break;
        case 'sfx-transcript':
            mod.content.sfxTranscript = value;
            break;
        case 'steampunk-title':
            mod.content.steampunkTitle = value;
            break;
        case 'steampunk-text':
            mod.content.steampunkText = value;
            break;
        case 'steampunk-code':
            mod.content.steampunkCode = value;
            break;
        case 'yt-url':
            mod.content.ytUrl = value;
            mod.content.ytId = extractYoutubeId(value) || '';
            break;
        case 'volume':
            if (!mod.metadata) mod.metadata = {};
            mod.metadata.volume = value !== undefined ? parseInt(value) : 100;
            break;
        case 'autoplay':
            if (!mod.metadata) mod.metadata = {};
            mod.metadata.autoplay = (value === 'true' || value === true);
            break;
        case 'theme':
            if (!mod.metadata) mod.metadata = {};
            mod.metadata.theme = value || 'nasapunk';
            break;
        case 'bg-url':
            mod.content.bgUrl = value;
            break;
        case 'story-id':
            mod.content.storyId = value;
            break;
        case 'iframe-height':
            if (!mod.layout) mod.layout = {};
            mod.layout.height = value !== undefined ? parseInt(value) : 450;
            break;
        case 'dialogue-text':
            mod.content.text = value;
            break;
        case 'speaker-name':
            if (!mod.metadata) mod.metadata = {};
            mod.metadata.speakerName = value;
            break;
        case 'lore-link':
            mod.content.loreLink = value;
            break;
        case 'lore-text':
            mod.content.loreText = value;
            break;
        case 'lore-height':
            if (!mod.layout) mod.layout = {};
            mod.layout.height = value !== undefined ? parseInt(value) : 450;
            break;
        case 'lore-open':
            if (!mod.layout) mod.layout = {};
            mod.layout.open = (value === 'true' || value === true);
            break;
        case 'html-content':
            mod.content.htmlContent = value;
            break;
        case 'iframe-url':
            mod.content.iframeUrl = value;
            break;
        case 'iframe-height-mode':
            if (!mod.layout) mod.layout = {};
            mod.layout.heightMode = value;
            break;
        case 'iframe-params':
            if (!mod.metadata) mod.metadata = {};
            mod.metadata.iframeParams = value;
            break;
        case 'design':
            if (!mod.layout) mod.layout = {};
            mod.layout.design = value;
            break;
        default:
            mod[fieldId] = value;
    }
    return mod;
}

function migrateCanvasItems() {
    canvasItems = canvasItems.map(item => flatToModular(item));
}

const AVAILABLE_FONTS = [
    'Inter', 'Playfair Display', 'Orbitron', 'Cinzel', 'Montserrat', 'Special Elite',
    'Dancing Script', 'Creepster', 'Press Start 2P', 'Lora', 'Bebas Neue', 'Roboto',
    'Open Sans', 'Lato', 'Oswald', 'Poppins', 'Outfit', 'Nunito', 'Rubik', 'Quicksand',
    'Heebo', 'Cabin', 'Noto Sans', 'Merriweather', 'EB Garamond', 'Libre Baskerville',
    'Crimson Text', 'Domine', 'Cardo', 'Audiowide', 'Bungee', 'Russo One', 'Rajdhani',
    'Syncopate', 'Uncial Antiqua', 'Metal Mania', 'JetBrains Mono', 'Fira Code',
    'Inconsolata', 'Share Tech Mono', 'Pacifico', 'Caveat', 'Great Vibes', 'Sacramento',
    'Shadows Into Light', 'Alex Brush'
];

const CACHE_KEY = 'nexus_intro_architect_state';

function getThemePrimaryHex() {
    const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
    if (!color) return '00f3ff'; // Default fallback

    // If it's already hex
    if (color.startsWith('#')) return color.replace('#', '');

    // If it's rgb(...)
    const rgb = color.match(/\d+/g);
    if (rgb && rgb.length >= 3) {
        return rgb.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
    }

    return '00f3ff';
}

class HistoryManager {
    constructor(maxSize = 50) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxSize = maxSize;
        this.isApplying = false;
    }

    push(state) {
        if (this.isApplying) return;
        const serialized = JSON.stringify(state);
        if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === serialized) return;
        
        this.undoStack.push(serialized);
        if (this.undoStack.length > this.maxSize) this.undoStack.shift();
        this.redoStack = [];
        this.updateButtons();
    }

    undo() {
        if (this.undoStack.length <= 1) return;
        this.isApplying = true;
        const current = this.undoStack.pop();
        this.redoStack.push(current);
        const previous = JSON.parse(this.undoStack[this.undoStack.length - 1]);
        this.applyState(previous);
        this.isApplying = false;
        this.updateButtons();
    }

    redo() {
        if (this.redoStack.length === 0) return;
        this.isApplying = true;
        const next = JSON.parse(this.redoStack.pop());
        this.undoStack.push(JSON.stringify(next));
        this.applyState(next);
        this.isApplying = false;
        this.updateButtons();
    }

    applyState(state) {
        canvasItems = JSON.parse(JSON.stringify(state.canvasItems));
        migrateCanvasItems();
        if (state.customThemeVars) {
            customThemeVars = JSON.parse(JSON.stringify(state.customThemeVars));
            for (let key in customThemeVars) {
                const input = document.getElementById('input-' + key);
                const swatch = document.getElementById('swatch-' + key);
                if (input) input.value = customThemeVars[key];
                if (swatch) swatch.style.background = customThemeVars[key];
            }
        }
        if (state.theme && document.getElementById('global-theme-select').value !== state.theme) {
            document.getElementById('global-theme-select').value = state.theme;
            syncCustomSelect(state.theme);
            updateTheme(true); // Skip history push
        } else {
            if (document.getElementById('global-theme-select').value === 'vn_custom') {
                applyCustomTheme();
            }
            renderCanvas();
            updateCodeView();
            saveToCache();
        }
    }

    updateButtons() {
        const undoBtn = document.getElementById('btn-undo');
        const redoBtn = document.getElementById('btn-redo');
        if (undoBtn) undoBtn.disabled = this.undoStack.length <= 1;
        if (redoBtn) redoBtn.disabled = this.redoStack.length === 0;
    }
}

const historyManager = new HistoryManager();

function saveToCache() {
    const state = {
        canvasItems,
        theme: document.getElementById('global-theme-select').value,
        customThemeVars
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(state));
}

function recordHistory() {
    const state = {
        canvasItems,
        theme: document.getElementById('global-theme-select').value,
        customThemeVars
    };
    historyManager.push(state);
}

function loadFromCache() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        try {
            const state = JSON.parse(cached);
            canvasItems = state.canvasItems || [];
            migrateCanvasItems();
            if (state.customThemeVars) {
                customThemeVars = state.customThemeVars;
                for (let key in customThemeVars) {
                    const input = document.getElementById('input-' + key);
                    const swatch = document.getElementById('swatch-' + key);
                    if (input) input.value = customThemeVars[key];
                    if (swatch) swatch.style.background = customThemeVars[key];
                }
            }
            if (state.theme) {
                document.getElementById('global-theme-select').value = state.theme;
                syncCustomSelect(state.theme);
                updateTheme();
            }
            renderCanvas();
            updateCodeView();
            saveToCache();
            recordHistory();
            showToast('Previous project restored from cache!');
        } catch (e) {
            console.error('Failed to load cache:', e);
        }
    }
}


window.onload = () => {
    initCustomSelects();
    loadFromCache();
    updateSidebarIcon(); // Sync sidebar chevron and open btn
    
    // Allow clicking the mobile bottom drawer header to expand it
    const sidebarHeader = document.querySelector('.sidebar-header');
    if (sidebarHeader) {
        sidebarHeader.addEventListener('click', (e) => {
            if (e.target.closest('#sidebar-close-btn')) return;
            if (window.innerWidth <= 800 && document.body.classList.contains('sidebar-collapsed')) {
                toggleSidebar(false);
            }
        });
    }

    window.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            historyManager.undo();
        } else if (e.ctrlKey && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            historyManager.redo();
        }
    });

    const toolbar = document.getElementById('rich-text-toolbar');
    if (toolbar) {
        toolbar.addEventListener('mousedown', (e) => {
            // Instantly capture selection before focus shifts to the toolbar button
            _saveLastSelection();
            
            // If it's a simple format button, prevent default to keep focus in editor if possible
            const btn = e.target.closest('.toolbar-btn');
            if (btn && !btn.id.includes('color') && !btn.id.includes('image') && !btn.id.includes('gradient')) {
                // For bold/italic etc, we can often keep focus
                // but let the click handler deal with it
            }
        });
    }
};

function updateTheme(skipHistory = false) {
    const theme = document.getElementById('global-theme-select').value;
    const link = document.getElementById('dynamic-theme');
    const targetHref = theme === 'vn_custom' ? `styles/vn_base.css` : `styles/${theme}`;

    const onLoadHandler = () => {
        if (theme === 'vn_custom') {
            applyCustomTheme();
        } else {
            removeCustomThemeStyles();
        }
        renderCanvas();
        updateCodeView();
        saveToCache();
        if (!skipHistory) {
            recordHistory();
        }
    };

    if (link.getAttribute('href') === targetHref) {
        onLoadHandler();
    } else {
        link.onload = onLoadHandler;
        link.href = targetHref;
    }
}

function switchTab(tab) {
    const live = document.getElementById('canvas-live');
    const preview = document.getElementById('canvas-preview-container');
    const code = document.getElementById('canvas-code-container');
    const buttons = document.querySelectorAll('.tab-btn');

    // Hide all tab sections
    live.style.display = 'none';
    if (preview) preview.style.display = 'none';
    code.style.display = 'none';

    // Remove active class from all buttons
    buttons.forEach(btn => btn.classList.remove('active'));

    if (tab === 'live') {
        live.style.display = 'flex';
        if (buttons[0]) buttons[0].classList.add('active');
    } else if (tab === 'preview') {
        if (preview) preview.style.display = 'flex';
        if (buttons[1]) buttons[1].classList.add('active');
        renderLivePreview();
    } else if (tab === 'code') {
        code.style.display = 'block';
        if (buttons[2]) buttons[2].classList.add('active');
        updateCodeView();
    }
}

// --- VIEWPORT SIMULATOR & PREVIEW LOGIC ---
function switchViewport(width) {
    const wrapper = document.getElementById('canvas-preview-wrapper');
    if (wrapper) {
        wrapper.style.width = width + 'px';
    }
    
    // Toggle active class on viewport buttons
    const buttons = document.querySelectorAll('.viewport-btn');
    buttons.forEach(btn => {
        const btnWidth = parseInt(btn.getAttribute('data-width'), 10);
        if (btnWidth === width) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update the height of the preview iframe since width changed
    const iframe = wrapper ? wrapper.querySelector('iframe') : null;
    if (iframe) {
        setTimeout(() => {
            try {
                const innerDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (innerDoc && innerDoc.documentElement) {
                    iframe.style.height = innerDoc.documentElement.scrollHeight + 'px';
                }
            } catch (e) {
                console.error('Viewport switch height update failed:', e);
            }
        }, 350); // Wait for the 300ms CSS width transition to complete
    }
}

function renderLivePreview() {
    const wrapper = document.getElementById('canvas-preview-wrapper');
    if (!wrapper) return;
    
    // Clear and build clean iframe
    wrapper.innerHTML = '';
    
    const iframe = document.createElement('iframe');
    iframe.className = 'preview-iframe';
    iframe.style.width = '100%';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.style.display = 'block';
    
    wrapper.appendChild(iframe);
    
    const theme = document.getElementById('global-theme-select').value;
    
    let headHTML = '';
    if (theme === 'vn_custom') {
        headHTML += `<link href="styles/vn_base.css" rel="stylesheet">`;
        headHTML += `<style>`;
        headHTML += `html {`;
        headHTML += `--primary-color: ${customThemeVars['primary']};`;
        headHTML += `--text-color: ${customThemeVars['text']};`;
        
        let bgVal = customThemeVars['bg'];
        if (bgVal.startsWith('#') && bgVal.length === 7) {
            const rgb = hexToRgbHelper(bgVal);
            bgVal = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.95)`;
        }
        headHTML += `--background-color: ${bgVal};`;
        
        let glowVal = customThemeVars['glow'];
        if (glowVal.startsWith('#') && glowVal.length === 7) {
            const rgb = hexToRgbHelper(glowVal);
            glowVal = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.3)`;
        }
        headHTML += `--glow-color: ${glowVal};`;
        
        let gradVal = customThemeVars['gradient'];
        if (gradVal.startsWith('#') && gradVal.length === 7) {
            const rgb = hexToRgbHelper(gradVal);
            gradVal = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.4)`;
        }
        headHTML += `--gradient-color: ${gradVal};`;
        
        headHTML += `--heading-color: ${customThemeVars['heading']};`;
        headHTML += `--strong-color: ${customThemeVars['strong']};`;
        headHTML += `--emphasis-color: ${customThemeVars['emphasis']};`;
        headHTML += `--code-bg-color: ${customThemeVars['code-bg']};`;
        headHTML += `--quote-color: ${customThemeVars['quote']};`;
        headHTML += `--gif-stroke-color: ${customThemeVars['gif-stroke']};`;
        headHTML += `}`;
        headHTML += `</style>`;
    } else {
        headHTML += `<link href="styles/${theme}" rel="stylesheet">`;
    }
    headHTML += `<link rel="preconnect" href="https://fonts.googleapis.com">`;
    headHTML += `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`;
    headHTML += `<link href="styles/fonts.css" rel="stylesheet">`;
    headHTML += `<link href="styles/intro_effects.css" rel="stylesheet">`;
    
    const hasCards = canvasItems.some(item => item.type === 'card' || item.type === 'card-template' || item.type === 'card-bladerunner' || item.type === 'card-imessage' || item.type === 'card-steampunk');
    if (hasCards) {
        headHTML += `<link href="styles/card.css" rel="stylesheet">`;
        headHTML += `<script src="js/card.js"></script>`;
    }
    
    // Compile components HTML
    let componentsHTML = '';
    canvasItems.forEach(item => {
        componentsHTML += getPreviewHTML(item);
    });
    
    // Formulate final HTML
    const fullIframeHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            ${headHTML}
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    overflow-x: hidden;
                    background: transparent;
                }
                .vn-character {
                    max-height: 220px !important;
                }
                .vn-character-container.vn-char-style-grid .vn-character {
                    max-height: 160px !important;
                }
                /* Force elements to fit horizontal boundaries */
                img, iframe, video {
                    max-width: 100% !important;
                }
                /* Make all visual novel components completely flush horizontally */
                .vn-lore-details,
                .vn-dialogue-box,
                .vn-story-intro,
                .vn-music-wrapper,
                .vn-iframe-wrapper,
                .vn-custom-iframe-wrapper,
                .vn-image-wrapper,
                .vn-character-container {
                    width: 100% !important;
                    max-width: 100% !important;
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    margin-top: 15px !important;
                    margin-bottom: 15px !important;
                    box-sizing: border-box !important;
                }
                /* Ensure nested content inside details / summary is also flush */
                .vn-lore-content {
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                }
                .vn-lore-details summary {
                    width: 100% !important;
                    box-sizing: border-box !important;
                }
                * {
                    box-sizing: border-box;
                    word-break: break-word;
                    overflow-wrap: break-word;
                }
            </style>
        </head>
        <body>
            ${componentsHTML}
        </body>
        </html>
    `;
    
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(fullIframeHTML);
    doc.close();
    
    iframe.onload = () => {
        try {
            const innerDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (innerDoc && innerDoc.body) {
                let lastHeight = 0;
                let heightAdjustCount = 0;
                let resetTimer = null;

                const updateHeight = () => {
                    const newHeight = innerDoc.documentElement.scrollHeight;
                    if (newHeight === lastHeight) return;
                    
                    // Throttling / Loop protection: disconnect observer if height increases rapidly in succession
                    clearTimeout(resetTimer);
                    heightAdjustCount++;
                    if (heightAdjustCount > 12) {
                        console.warn("ResizeObserver layout loop detected and safely broken.");
                        resizeObserver.disconnect();
                        return;
                    }
                    
                    resetTimer = setTimeout(() => {
                        heightAdjustCount = 0;
                    }, 300);

                    lastHeight = newHeight;
                    iframe.style.height = newHeight + 'px';
                };
                
                // Create a loop-safe ResizeObserver for dynamic resources (images/stylesheets) loading
                const resizeObserver = new ResizeObserver(updateHeight);
                resizeObserver.observe(innerDoc.body);
                
                // Trigger layout checks
                updateHeight();
                setTimeout(updateHeight, 50);
                setTimeout(updateHeight, 150);
                setTimeout(updateHeight, 300);
                setTimeout(updateHeight, 600);
                setTimeout(updateHeight, 1200);
            }
        } catch (e) {
            console.error('Preview rendering and height adjustment failed:', e);
        }
    };
}

function updateCodeView() {
    const gutter = document.querySelector('.code-gutter');
    const content = document.querySelector('.code-content');
    if (content) {
        const rawHtml = generateFullHTML(false);
        const highlighted = highlightHTML(rawHtml);
        content.innerHTML = highlighted;

        // Update line numbers
        const lineCount = rawHtml.split('\n').length;
        gutter.innerHTML = Array.from({length: lineCount}, (_, i) => i + 1).join('<br>');
    }
}

function highlightHTML(html) {
    // Escape HTML special characters
    let escaped = html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // 1. Highlight Comments: <!-- ... -->
    escaped = escaped.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="hl-comm">$1</span>');

    // 2. Highlight Tags and Attributes
    // This regex looks for &lt;tag ... &gt; or &lt;/tag&gt;
    // We use a replacement function to avoid matching our own <span> tags
    return escaped.replace(/(&lt;\/?[a-z1-6]+)(.*?)(&gt;)/gi, (match, tagStart, content, tagEnd) => {
        // Highlight the tag name part
        let highlightedTag = tagStart.replace(/(&lt;\/?)([a-z1-6]+)/i, '$1<span class="hl-tag">$2</span>');

        // Highlight attributes within the tag content
        let highlightedContent = content.replace(/([a-z-]+)=("[^"]*")/gi,
            ' <span class="hl-attr">$1</span>=<span class="hl-str">$2</span>');

        return highlightedTag + highlightedContent + tagEnd;
    });
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'nexus-toast';
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

const FORM_TEMPLATES = {
    'image': [
        { label: 'Image URL', id: 'image-url', type: 'text', placeholder: 'https://.../image.png' },
        { label: 'Design Style', id: 'design', type: 'select', value: 'default', options: [
            { name: 'Default', value: 'default' },
            { name: 'Ruby Border', value: 'ruby' },
            { name: 'Diagonal Skew Banner', value: 'skew' },
            { name: 'Tech Matte Frame', value: 'frame' }
        ] },
        { label: 'Alignment', id: 'alignment', type: 'select', value: 'full', options: [
            { name: 'Full Width', value: 'full' },
            { name: 'Center', value: 'center' },
            { name: 'Left', value: 'left' },
            { name: 'Right', value: 'right' }
        ] },
        { label: 'Width (e.g. 300px, 50%, auto)', id: 'image-width', type: 'text', placeholder: 'auto', value: 'auto' },
        { label: 'Height (e.g. 200px, auto)', id: 'image-height', type: 'text', placeholder: 'auto', value: 'auto' }
    ],
    'gif-heading': [
        { label: 'Heading Text', id: 'text', type: 'text', placeholder: 'Enter heading text...', value: 'JOYLAND' },
        { label: 'Gif URL', id: 'gif-url', type: 'text', placeholder: 'https://.../sky1.gif', value: 'https://minimumlogix.github.io/World-Nexus/assets/gif-library/morning-sky-1.gif' },
        { label: 'Stroke Color (Leave blank to use theme default)', id: 'stroke-color', type: 'text', placeholder: 'e.g. #f1d0d7', value: '' },
        { label: 'Font Size', id: 'font-size', type: 'text', placeholder: '5em', value: '5em' },
        { label: 'Font Family', id: 'font-family', type: 'select', value: 'Bebas Neue', options: AVAILABLE_FONTS.map(f => ({ name: f, value: f })) }
    ],
    'music': [
        { label: 'YouTube URL', id: 'yt-url', type: 'text', placeholder: 'https://www.youtube.com/watch?v=...' },
        { label: 'Default Volume (0-100)', id: 'volume', type: 'number', value: 100, min: 0, max: 100 },
        { label: 'Autoplay', id: 'autoplay', type: 'select', value: 'true', options: [
            { name: 'Enabled (Autoplay on load)', value: 'true' },
            { name: 'Disabled (Click play to start)', value: 'false' }
        ] },
        { label: 'Player Theme', id: 'theme', type: 'select', value: 'nasapunk', options: [
            { name: 'Nasapunk (Default)', value: 'nasapunk' },
            { name: 'Cyberpunk', value: 'cyberpunk' },
            { name: 'Celestial', value: 'celestial' }
        ] },
        { label: 'Design Style', id: 'design', type: 'select', value: 'default', options: [
            { name: 'Default Frame', value: 'default' },
            { name: 'Compact Pill Widget', value: 'compact' },
            { name: 'Tech Control Deck', value: 'deck' }
        ] }
    ],
    'character': [
        { label: 'Background Image URL', id: 'bg-url', type: 'text', placeholder: 'https://.../bg.png' }
    ],
    'vn-iframe': [
        { label: 'Story ID / URL', id: 'story-id', type: 'text', placeholder: 'Sakuragaoka:VN1' },
        { label: 'Height (px)', id: 'iframe-height', type: 'number', value: 450 },
        { label: 'Design Style', id: 'design', type: 'select', value: 'default', options: [
            { name: 'Clean Borderless', value: 'default' },
            { name: 'CRT Console Bezel', value: 'console' },
            { name: 'Floating Hologram HUD', value: 'hologram' }
        ] }
    ],
    'dialogue': [
        { label: 'Dialogue Text', id: 'dialogue-text', type: 'textarea', placeholder: 'Enter your dialogue here... (Markdown supported)' },
        { label: 'Design Style', id: 'design', type: 'select', value: 'default', options: [
            { name: 'Glassmorphic Top Border', value: 'default' },
            { name: 'Retro Opaque Console', value: 'nvl' },
            { name: 'Aesthetic Speech Bubble', value: 'bubble' }
        ] }
    ],
    'lore': [
        { label: 'Lore World / Link (Optional)', id: 'lore-link', type: 'text', placeholder: 'Cyberpunk2011' },
        { label: 'Lore Content Text (Pasted) (Optional)', id: 'lore-text', type: 'textarea', placeholder: 'Paste or write your custom lore content here... (Markdown supported)' },
        { label: 'Height (px) (For Link Only)', id: 'lore-height', type: 'number', value: 400 },
        { label: 'Start Open', id: 'lore-open', type: 'select', value: 'false', options: [
            { name: 'No (Collapsed)', value: 'false' },
            { name: 'Yes (Open)', value: 'true' }
        ] },
        { label: 'Design Style', id: 'design', type: 'select', value: 'default', options: [
            { name: 'Default Gradient Summary', value: 'default' },
            { name: 'Minimalist Flat Cyber-Tab', value: 'cyber' },
            { name: 'Hex-Clipped Console Panel', value: 'hex' }
        ] }
    ],
    'custom-html': [
        { label: 'Raw HTML Content', id: 'html-content', type: 'textarea', placeholder: '<div style="padding: 20px; border: 1px solid var(--accent); text-align: center; background: rgba(0,0,0,0.2); border-radius: 8px;">\n  <h3>Custom HTML Section</h3>\n  <p>Modify this HTML in the editor modal.</p>\n</div>' }
    ],
    'custom-iframe': [
        { label: 'Base URL', id: 'iframe-url', type: 'text', placeholder: 'https://example.com/player' },
        { label: 'Height Mode', id: 'iframe-height-mode', type: 'select', value: 'fixed', options: [
            { name: 'Fixed Height (px)', value: 'fixed' },
            { name: 'Full Webpage Height (Dynamic / 100vh)', value: 'full' }
        ] },
        { label: 'Height (px)', id: 'iframe-height', type: 'number', value: 450 },
        { label: 'Design Style', id: 'design', type: 'select', value: 'default', options: [
            { name: 'Clean Borderless', value: 'default' },
            { name: 'Bordered Frame', value: 'bordered' }
        ] },
        { label: 'URL Parameters / Variables (One per line, e.g. player={{user}})', id: 'iframe-params', type: 'textarea', placeholder: 'player={{user}}\nworld=arcanis' }
    ],
    'sfx': [
        { label: 'SFX Audio URL', id: 'sfx-url', type: 'text', placeholder: 'https://.../sound.mp3' },
        { label: 'Audio Title / Text', id: 'text', type: 'text', placeholder: 'Transmission #09', value: 'Transmission #09' },
        { label: 'SFX Transcript', id: 'sfx-transcript', type: 'textarea', placeholder: 'Enter transcription text...' },
        { label: 'Design Style', id: 'design', type: 'select', value: 'touch', options: [
            { name: 'Full Card Touch to Play', value: 'touch' },
            { name: 'Interactive Audio Transcript Log', value: 'transcript' }
        ] }
    ],
    'link': [
        { label: 'Link URL', id: 'link-url', type: 'text', placeholder: 'https://...' },
        { label: 'Link Text', id: 'text', type: 'text', placeholder: 'Visit Site', value: 'Visit Site' },
        { label: 'Open in', id: 'target', type: 'select', value: '_blank', options: [
            { name: 'New Tab', value: '_blank' },
            { name: 'Same Tab', value: '_self' }
        ] },
        { label: 'Design Style', id: 'design', type: 'select', value: 'default', options: [
            { name: 'Default Button', value: 'default' },
            { name: 'Cyberpunk Banner', value: 'cyber' },
            { name: 'Minimal Underline', value: 'minimal' }
        ] }
    ],
    'quote': [
        { label: 'Quote Text', id: 'text', type: 'textarea', placeholder: 'Enter quote text here...' },
        { label: 'Author / Source', id: 'author', type: 'text', placeholder: 'Author Name' },
        { label: 'Design Style', id: 'design', type: 'select', value: 'default', options: [
            { name: 'Classic Blockquote', value: 'default' },
            { name: 'Elegant Serif Accent', value: 'elegant' },
            { name: 'Modern Minimalist', value: 'modern' }
        ] }
    ],
    'card': [
        { label: 'Card Title', id: 'title', type: 'text', placeholder: 'Card Title' },
        { label: 'Card Content (Markdown supported)', id: 'text', type: 'textarea', placeholder: 'Enter card content here...' },
        { label: 'Design Style', id: 'design', type: 'select', value: 'default', options: [
            { name: 'Theme Glass Panel', value: 'default' },
            { name: 'Glowing Neon Border', value: 'neon' },
            { name: 'Flat Solid Panel', value: 'flat' }
        ] }
    ],
    'terminal': [
        { label: 'Terminal Header Title', id: 'title', type: 'text', placeholder: 'bash', value: 'bash' },
        { label: 'Terminal Content / Code', id: 'text', type: 'textarea', placeholder: '$ cat system.log\n[OK] System initialized.' },
        { label: 'Design Style', id: 'design', type: 'select', value: 'default', options: [
            { name: 'Classic Green Phosphor', value: 'default' },
            { name: 'Amber Scanline CRT', value: 'cyber' },
            { name: 'Retro Monospaced Panel', value: 'retro' }
        ] }
    ],
    'scene-break': [
        { label: 'Scene Break Text', id: 'text', type: 'text', placeholder: 'Scene description — setting, atmosphere, time of day...', value: 'Scene description — setting, atmosphere, time of day...' },
        { label: 'Design Style', id: 'design', type: 'select', value: 'default', options: [
            { name: 'Gold Double Line', value: 'default' },
            { name: 'Minimal Dot Separator', value: 'minimal' },
            { name: 'Faded Clean Lines', value: 'faded' }
        ] }
    ],
    'card-template': [
        { label: 'Edit Mode', id: 'htmlMode', type: 'select', value: 'false', options: [
            { name: 'Rich Form Editor', value: 'false' },
            { name: 'Raw HTML/CSS Template', value: 'true' }
        ] },
        { label: 'Card Header / Title', id: 'title', type: 'text', placeholder: 'Private Dispatch', value: 'Private Dispatch' },
        { label: 'Card Content', id: 'text', type: 'textarea', placeholder: 'Enter text here...' },
        { label: 'Signature Label', id: 'sigLabel', type: 'text', placeholder: 'Until then', value: 'Until then' },
        { label: 'Signature Name', id: 'sigName', type: 'text', placeholder: 'Aster', value: 'Aster' },
        { label: 'Stamp Character/Symbol', id: 'stamp', type: 'text', placeholder: '✶', value: '✶' },
        { label: 'Raw HTML Template (use {{title}}, {{content}}, {{sigLabel}}, {{sigName}}, {{stamp}} placeholders)', id: 'template', type: 'textarea', placeholder: '...' }
    ],
    'card-bladerunner': [
        { label: 'Relay Title (Header Left)', id: 'headerLeft', type: 'text', placeholder: 'Tyrell Relay Node', value: 'Tyrell Relay Node' },
        { label: 'Uplink Title (Header Right)', id: 'headerRight', type: 'text', placeholder: 'Secure Uplink', value: 'Secure Uplink' },
        { label: 'Console Text (Typewritten)', id: 'text', type: 'textarea', placeholder: 'Enter console transmission text...', value: `> Initializing encrypted carrier...\n> Handshake accepted.\n> Identity confirmed.\n> Quantum relay synchronized.\n\n------------------------------------------------\n\nRECIPIENT: ACTIVE\n\nThe city's surveillance grid has shifted.\n\nThree checkpoints are now blind for exactly\neighty-seven seconds every cycle.\n\nThat window will not appear again.\n\nProceed through Sector 9.\nAvoid aerial transit.\nTrust no synthetic credentials.\n\nIf interception occurs, erase your implant key.\nNo extraction team is coming.\n\nTransmission will self-terminate upon timeout.` },
        { label: 'Signal Status (Footer Left)', id: 'footerLeft', type: 'text', placeholder: 'SIGNAL 98.4%', value: 'SIGNAL 98.4%' },
        { label: 'Trace Status (Footer Middle)', id: 'footerMiddle', type: 'text', placeholder: 'TRACE 03%', value: 'TRACE 03%' },
        { label: 'Endpoint Status (Footer Right)', id: 'footerRight', type: 'text', placeholder: 'ENDPOINT Ω-17', value: 'ENDPOINT Ω-17' },
        { label: 'Auth Token Label', id: 'tokenLabel', type: 'text', placeholder: 'AUTH TOKEN', value: 'AUTH TOKEN' },
        { label: 'Auth Token Code', id: 'tokenValue', type: 'text', placeholder: '4A7F • C991 • Δ88X • F0E2', value: '4A7F • C991 • Δ88X • F0E2' },
        { label: 'End Tag Text', id: 'endText', type: 'text', placeholder: 'Transmission Ends', value: 'Transmission Ends' }
    ],
    'card-imessage': [],
    'card-steampunk': [
        { label: 'Vault Header Title', id: 'steampunk-title', type: 'text', placeholder: 'CLASSIFIED LOCKBOX', value: 'CLASSIFIED LOCKBOX' },
        { label: 'Vault Secret Message', id: 'steampunk-text', type: 'textarea', placeholder: 'Enter secret decoded text...', value: 'Blueprints are located at Sector 7.' },
        { label: '3-Digit Combination Code', id: 'steampunk-code', type: 'text', placeholder: 'e.g. 394', value: '394' },
        { label: 'Steampunk Theme', id: 'design', type: 'select', value: 'brass', options: [
            { name: 'Polished Brass Engine', value: 'brass' },
            { name: 'Rusted Iron Vault', value: 'iron' }
        ]}
    ]
};

function openComponentModal(type) {
    saveActiveDialogueIfEditing();
    editingIndex = -1;
    setupConfigModal(type);
}

function editComponent(index) {
    saveActiveDialogueIfEditing();
    editingIndex = index;
    const item = canvasItems[index];
    setupConfigModal(item.type, modularToFlat(item));
}

function setupConfigModal(type, existingItem = null) {
    currentType = type;
    const fields = FORM_TEMPLATES[type];
    const container = document.getElementById('form-fields');
    const title = document.getElementById('modal-title');
    const addBtn = document.getElementById('add-char-btn');
    const submitBtn = document.querySelector('#config-modal .btn-primary');

    if (existingItem) {
        title.innerText = `EDIT ${type.replace('-', ' ').toUpperCase()}`;
        if (submitBtn) submitBtn.innerText = 'SAVE CHANGES';
    } else {
        title.innerText = `CONFIGURE ${type.replace('-', ' ').toUpperCase()}`;
        if (submitBtn) submitBtn.innerText = 'ADD TO CANVAS';
    }
    container.innerHTML = '';

    if (type === 'character') {
        addBtn.style.display = 'block';
        const bgUrl = existingItem ? (existingItem['bg-url'] || '') : '';
        const bgGroup = createFieldGroup({ label: 'Background Image URL', id: 'bg-url', type: 'text', placeholder: 'https://.../bg.png', value: bgUrl });
        container.appendChild(bgGroup);

        const designVal = existingItem ? (existingItem['design'] || 'default') : 'default';
        const designGroup = createFieldGroup({
            label: 'Design Style',
            id: 'design',
            type: 'select',
            value: designVal,
            options: [
                { name: 'Classic Side-by-Side Stand', value: 'default' },
                { name: 'Glass Card Grid', value: 'grid' },
                { name: 'Cyber Spotlight Frames', value: 'spotlight' }
            ]
        });
        container.appendChild(designGroup);
        
        if (existingItem && existingItem.characters && existingItem.characters.length > 0) {
            existingItem.characters.forEach(char => {
                addCharacterRow(char.name, char.sprite);
            });
        } else {
            addCharacterRow();
        }
    } else if (type === 'card-imessage') {
        addBtn.style.display = 'none';
        setupImessageConfigForm(container, existingItem);
    } else {
        addBtn.style.display = 'none';
        if (fields) {
            fields.forEach(field => {
                const fieldConfig = { ...field };
                if (existingItem && existingItem[field.id] !== undefined) {
                    fieldConfig.value = existingItem[field.id];
                }
                const group = createFieldGroup(fieldConfig);
                container.appendChild(group);

                // Add listeners for rich text
                if (field.type === 'textarea') {
                    const textarea = group.querySelector('textarea');
                    textarea.addEventListener('mouseup', handleTextSelection);
                    textarea.addEventListener('keyup', handleTextSelection);
                }
            });
        }

        // Setup toggle for custom-iframe height mode in the config form
        if (type === 'custom-iframe') {
            const modeSelect = document.getElementById('iframe-height-mode');
            const heightInput = document.getElementById('iframe-height');
            if (modeSelect && heightInput) {
                const heightGroup = heightInput.closest('.form-group');
                const updateHeightVisibility = () => {
                    if (heightGroup) {
                        heightGroup.style.display = modeSelect.value === 'full' ? 'none' : 'block';
                    }
                };
                modeSelect.addEventListener('change', updateHeightVisibility);
                updateHeightVisibility(); // run initial check
            }
        }

        // Setup toggle for image alignment size fields
        if (type === 'image') {
            const alignSelect = document.getElementById('alignment');
            const widthInput = document.getElementById('image-width');
            const heightInput = document.getElementById('image-height');
            if (alignSelect && widthInput && heightInput) {
                const widthGroup = widthInput.closest('.form-group');
                const heightGroup = heightInput.closest('.form-group');
                const updateSizeVisibility = () => {
                    const show = alignSelect.value !== 'full';
                    if (widthGroup) widthGroup.style.display = show ? 'block' : 'none';
                    if (heightGroup) heightGroup.style.display = show ? 'block' : 'none';
                };
                alignSelect.addEventListener('change', updateSizeVisibility);
                updateSizeVisibility(); // run initial check
            }
        }

        // Setup toggle for card-template edit mode
        if (type === 'card-template') {
            const modeSelect = document.getElementById('htmlMode');
            const titleInput = document.getElementById('title');
            const textInput = document.getElementById('text');
            const sigLabelInput = document.getElementById('sigLabel');
            const sigNameInput = document.getElementById('sigName');
            const stampInput = document.getElementById('stamp');
            const templateInput = document.getElementById('template');

            if (modeSelect) {
                const updateCardFieldsVisibility = () => {
                    const isHtml = modeSelect.value === 'true';
                    if (titleInput) titleInput.closest('.form-group').style.display = isHtml ? 'none' : 'block';
                    if (textInput) textInput.closest('.form-group').style.display = isHtml ? 'none' : 'block';
                    if (sigLabelInput) sigLabelInput.closest('.form-group').style.display = isHtml ? 'none' : 'block';
                    if (sigNameInput) sigNameInput.closest('.form-group').style.display = isHtml ? 'none' : 'block';
                    if (stampInput) stampInput.closest('.form-group').style.display = isHtml ? 'none' : 'block';
                    if (templateInput) templateInput.closest('.form-group').style.display = isHtml ? 'block' : 'none';
                };
                modeSelect.addEventListener('change', updateCardFieldsVisibility);
                updateCardFieldsVisibility(); // run initial check
            }
        }
    }

    document.getElementById('config-modal').style.display = 'flex';
}

function createFieldGroup(field) {
    const group = document.createElement('div');
    group.className = 'form-group';

    const label = document.createElement('label');
    label.innerText = field.label;

    let input;
    if (field.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 4;
        if (field.value !== undefined && field.value !== null) {
            input.value = field.value;
        }
    } else if (field.type === 'select') {
        if (field.id === 'font-family' || field.id === 'imessage-font') {
            input = document.createElement('input');
            input.type = 'text';
            input.id = field.id;
            input.value = field.value || 'Bebas Neue';
            input.readOnly = true;
            input.style.cursor = 'pointer';
            input.style.fontFamily = `'${input.value}', sans-serif`;
            input.onclick = () => openFontGalleryPopup(field.id);

            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.gap = '8px';
            wrapper.style.alignItems = 'center';
            
            input.style.flex = '1';
            
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'control-btn';
            btn.style.width = '36px';
            btn.style.height = '36px';
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'center';
            btn.style.padding = '0';
            btn.title = 'Browse Font Gallery';
            btn.innerHTML = '<i class="bi bi-fonts" style="font-size: 14px;"></i>';
            btn.onclick = () => openFontGalleryPopup(field.id);
            
            wrapper.appendChild(input);
            wrapper.appendChild(btn);
            group.appendChild(label);
            group.appendChild(wrapper);
            return group;
        } else {
            input = document.createElement('select');
            (field.options || []).forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.innerText = opt.name;
                if (String(field.value) === String(opt.value)) {
                    option.selected = true;
                }
                input.appendChild(option);
            });
        }
    } else {
        input = document.createElement('input');
        input.type = field.type;
        if (field.value !== undefined && field.value !== null) {
            input.value = field.value;
        }
        if (field.min !== undefined) input.min = field.min;
        if (field.max !== undefined) input.max = field.max;
    }

    input.id = field.id;
    if (field.placeholder) {
        input.placeholder = field.placeholder;
    }

    if (field.id === 'gif-url' || field.id === 'imessage-bg') {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.gap = '8px';
        wrapper.style.alignItems = 'center';
        
        input.style.flex = '1';
        
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'control-btn';
        btn.style.width = '36px';
        btn.style.height = '36px';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.padding = '0';
        btn.title = 'Browse Gif Library';
        btn.innerHTML = '<i class="bi bi-images" style="font-size: 14px;"></i>';
        btn.onclick = () => openGifLibraryPopup(field.id);
        
        wrapper.appendChild(input);
        wrapper.appendChild(btn);
        group.appendChild(label);
        group.appendChild(wrapper);
    } else {
        group.appendChild(label);
        group.appendChild(input);
    }
    return group;
}

function addCharacterRow(name = '', sprite = '') {
    const container = document.getElementById('form-fields');
    const row = document.createElement('div');
    row.className = 'char-row';
    row.innerHTML = `
        <button type="button" class="remove-char" onclick="this.parentElement.remove()">×</button>
        <div class="form-group">
            <label>Character Name</label>
            <input type="text" class="char-name" placeholder="e.g. Jax">
        </div>
        <div class="form-group">
            <label>Sprite Image URL</label>
            <input type="text" class="char-sprite" placeholder="https://.../sprite.png">
        </div>
    `;
    row.querySelector('.char-name').value = name;
    row.querySelector('.char-sprite').value = sprite;
    container.appendChild(row);
}

function updateMessageCharacterDropdowns() {
    const chars = [];
    const charRows = document.querySelectorAll('.imessage-char-row');
    charRows.forEach(row => {
        const id = row.getAttribute('data-char-id');
        const name = row.querySelector('.imessage-char-name').value || `Character ${id}`;
        chars.push({ id, name });
    });

    const selects = document.querySelectorAll('.imessage-msg-char-select');
    selects.forEach(select => {
        const currentVal = select.getAttribute('data-selected-val') || select.value;
        select.innerHTML = '';
        chars.forEach(char => {
            const opt = document.createElement('option');
            opt.value = char.id;
            opt.innerText = char.name;
            select.appendChild(opt);
        });
        if (chars.some(c => c.id === currentVal)) {
            select.value = currentVal;
            select.setAttribute('data-selected-val', currentVal);
        }
    });
}

function addImessageCharacterRow(charListContainer, char = null) {
    const charId = char ? char.id : Date.now() + Math.random().toString(36).substr(2, 5);
    const name = char ? char.name : '';
    const avatar = char ? (char.avatar || '') : '';
    const side = char ? (char.side || 'left') : 'left';

    const row = document.createElement('div');
    row.className = 'imessage-char-row char-row';
    row.setAttribute('data-char-id', charId);
    row.style.position = 'relative';
    row.style.paddingRight = '30px';
    row.innerHTML = `
        <button type="button" class="remove-char" style="position: absolute; right: 10px; top: 10px; z-index: 10;">×</button>
        <div style="display: flex; gap: 10px; width: 100%;">
            <div class="form-group" style="flex: 1; margin-bottom: 0;">
                <label>Name</label>
                <input type="text" class="imessage-char-name" placeholder="e.g. Jax" value="${name}">
            </div>
            <div class="form-group" style="flex: 1.5; margin-bottom: 0;">
                <label>Profile Image URL</label>
                <input type="text" class="imessage-char-avatar" placeholder="https://.../avatar.png" value="${avatar}">
            </div>
            <div class="form-group" style="flex: 1; margin-bottom: 0;">
                <label>Side</label>
                <select class="imessage-char-side">
                    <option value="left" ${side === 'left' ? 'selected' : ''}>Left (Incoming)</option>
                    <option value="right" ${side === 'right' ? 'selected' : ''}>Right (Outgoing)</option>
                </select>
            </div>
        </div>
    `;

    row.querySelector('.remove-char').addEventListener('click', () => {
        row.remove();
        updateMessageCharacterDropdowns();
    });

    row.querySelector('.imessage-char-name').addEventListener('input', updateMessageCharacterDropdowns);
    charListContainer.appendChild(row);
    updateMessageCharacterDropdowns();
}

function addImessageMessageRow(msgListContainer, msg = null) {
    const text = msg ? msg.text : '';
    const selectedCharId = msg ? msg.charId : '';

    const row = document.createElement('div');
    row.className = 'imessage-msg-row char-row';
    row.style.position = 'relative';
    row.style.paddingRight = '30px';
    row.innerHTML = `
        <button type="button" class="remove-char" style="position: absolute; right: 10px; top: 10px; z-index: 10;">×</button>
        <div style="display: flex; gap: 10px; width: 100%;">
            <div class="form-group" style="flex: 1.2; margin-bottom: 0;">
                <label>Sender</label>
                <select class="imessage-msg-char-select" data-selected-val="${selectedCharId}"></select>
            </div>
            <div class="form-group" style="flex: 2; margin-bottom: 0;">
                <label>Message Content</label>
                <input type="text" class="imessage-msg-text" placeholder="Write message..." value="${text}">
            </div>
        </div>
    `;

    row.querySelector('.remove-char').addEventListener('click', () => {
        row.remove();
    });

    row.querySelector('.imessage-msg-char-select').addEventListener('change', (e) => {
        e.target.setAttribute('data-selected-val', e.target.value);
    });

    msgListContainer.appendChild(row);
    updateMessageCharacterDropdowns();
}

function setupImessageConfigForm(container, existingItem = null) {
    const modeVal = existingItem ? (existingItem['mode'] || 'auto') : 'auto';
    const modeGroup = createFieldGroup({
        label: 'THEME MODE',
        id: 'imessage-mode',
        type: 'select',
        value: modeVal,
        options: [
            { name: 'Auto (Detect from Page)', value: 'auto' },
            { name: 'Force Light Mode', value: 'light' },
            { name: 'Force Dark Mode', value: 'dark' }
        ]
    });
    container.appendChild(modeGroup);

    const bgVal = existingItem ? (existingItem['imessage-bg'] || '') : '';
    const bgGroup = createFieldGroup({
        label: 'BACKGROUND IMAGE / GIF URL',
        id: 'imessage-bg',
        type: 'text',
        placeholder: 'https://... or empty',
        value: bgVal
    });
    container.appendChild(bgGroup);

    const fontVal = existingItem ? (existingItem['imessage-font'] || '') : '';
    const fontGroup = createFieldGroup({
        label: 'FONT FAMILY',
        id: 'imessage-font',
        type: 'select',
        value: fontVal
    });
    container.appendChild(fontGroup);

    // Helper to create a cell
    function createColorCell(labelStr, idStr, defaultVal) {
        const cell = document.createElement('div');
        cell.className = 'color-picker-cell';
        cell.style.display = 'flex';
        cell.style.flexDirection = 'column';
        cell.style.alignItems = 'center';
        cell.style.background = 'rgba(0, 0, 0, 0.2)';
        cell.style.border = '1px solid var(--border)';
        cell.style.borderRadius = 'var(--radius-sm)';
        cell.style.padding = '8px 4px';
        cell.style.textAlign = 'center';
        
        const input = document.createElement('input');
        input.type = 'color';
        input.id = idStr;
        input.value = existingItem ? (existingItem[idStr] || defaultVal) : defaultVal;
        input.style.width = '36px';
        input.style.height = '36px';
        input.style.border = 'none';
        input.style.background = 'transparent';
        input.style.cursor = 'pointer';
        input.style.padding = '0';
        
        const label = document.createElement('label');
        label.innerText = labelStr;
        label.style.fontSize = '8px';
        label.style.fontWeight = '800';
        label.style.letterSpacing = '0.5px';
        label.style.marginTop = '6px';
        label.style.color = 'var(--text-dim)';
        label.style.textAlign = 'center';
        label.style.display = 'block';
        label.style.width = '100%';
        label.style.whiteSpace = 'nowrap';
        label.style.overflow = 'hidden';
        label.style.textOverflow = 'ellipsis';
        
        cell.appendChild(input);
        cell.appendChild(label);
        return cell;
    }

    const paletteLabel = document.createElement('div');
    paletteLabel.className = 'sidebar-section-label';
    paletteLabel.innerText = 'CARD PALETTE COLORS';
    paletteLabel.style.marginTop = '15px';
    container.appendChild(paletteLabel);

    const paletteGrid = document.createElement('div');
    paletteGrid.className = 'imessage-color-palette-grid';
    paletteGrid.style.display = 'grid';
    paletteGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
    paletteGrid.style.gap = '8px';
    paletteGrid.style.marginBottom = '20px';

    paletteGrid.appendChild(createColorCell('CARD BG', 'imessage-bg-color', '#ffffff'));
    paletteGrid.appendChild(createColorCell('INC BUBBLE', 'imessage-incoming-bg', '#e9e9eb'));
    paletteGrid.appendChild(createColorCell('INC TEXT', 'imessage-incoming-text', '#000000'));
    paletteGrid.appendChild(createColorCell('OUT BUBBLE', 'imessage-outgoing-bg', '#0A84FF'));
    paletteGrid.appendChild(createColorCell('OUT TEXT', 'imessage-outgoing-text', '#ffffff'));

    container.appendChild(paletteGrid);

    const charHeader = document.createElement('div');
    charHeader.className = 'sidebar-section-label';
    charHeader.innerText = 'CHARACTERS LIST';
    charHeader.style.marginTop = '15px';
    container.appendChild(charHeader);

    const charListContainer = document.createElement('div');
    charListContainer.className = 'imessage-char-list';
    container.appendChild(charListContainer);

    const addCharBtn = document.createElement('button');
    addCharBtn.type = 'button';
    addCharBtn.className = 'btn btn-secondary btn-sm';
    addCharBtn.style.display = 'block';
    addCharBtn.style.width = '100%';
    addCharBtn.style.marginBottom = '20px';
    addCharBtn.innerHTML = '<i class="bi bi-person-plus"></i> ADD CHARACTER';
    addCharBtn.addEventListener('click', () => addImessageCharacterRow(charListContainer));
    container.appendChild(addCharBtn);

    const msgHeader = document.createElement('div');
    msgHeader.className = 'sidebar-section-label';
    msgHeader.innerText = 'CHAT CONVERSATION';
    container.appendChild(msgHeader);

    const msgListContainer = document.createElement('div');
    msgListContainer.className = 'imessage-msg-list';
    container.appendChild(msgListContainer);

    const addMsgBtn = document.createElement('button');
    addMsgBtn.type = 'button';
    addMsgBtn.className = 'btn btn-secondary btn-sm';
    addMsgBtn.style.display = 'block';
    addMsgBtn.style.width = '100%';
    addMsgBtn.style.marginBottom = '20px';
    addMsgBtn.innerHTML = '<i class="bi bi-plus-circle"></i> ADD MESSAGE';
    addMsgBtn.addEventListener('click', () => addImessageMessageRow(msgListContainer));
    container.appendChild(addMsgBtn);

    if (existingItem && existingItem.characters && existingItem.characters.length > 0) {
        existingItem.characters.forEach(char => {
            addImessageCharacterRow(charListContainer, char);
        });
        if (existingItem.messages && existingItem.messages.length > 0) {
            existingItem.messages.forEach(msg => {
                addImessageMessageRow(msgListContainer, msg);
            });
        }
    } else {
        const defaultChar1 = { id: 'c1', name: 'Jax', avatar: '', side: 'right' };
        const defaultChar2 = { id: 'c2', name: 'Nova', avatar: '', side: 'left' };
        addImessageCharacterRow(charListContainer, defaultChar1);
        addImessageCharacterRow(charListContainer, defaultChar2);

        addImessageMessageRow(msgListContainer, { charId: 'c1', text: 'Hey... are you still awake?' });
        addImessageMessageRow(msgListContainer, { charId: 'c2', text: 'I was waiting for your message. Meet me downstairs in five minutes. Don\'t text back.' });
        addImessageMessageRow(msgListContainer, { charId: 'c1', text: 'On my way.' });
    }
}

/* --- RICH TEXT LOGIC --- */
window.lastSavedSelectionRange = null;

function _getEditableFromRange(range) {
    if (!range) return null;
    const container = range.commonAncestorContainer;
    const node = container.nodeType === 3 ? container.parentNode : container;
    return node ? node.closest('[contenteditable="true"]') : null;
}

function _getItemIndexFromEditable(editable) {
    if (editable && editable.id === 'focus-dialogue-content') {
        const activeCanvasItem = document.querySelector('.canvas-item.active-edit');
        if (activeCanvasItem) {
            return Array.from(document.querySelectorAll('.canvas-item')).indexOf(activeCanvasItem);
        }
    }
    const itemEl = editable ? editable.closest('.canvas-item') : null;
    if (!itemEl) return -1;
    return Array.from(document.querySelectorAll('.canvas-item')).indexOf(itemEl);
}

function _syncRichEditable(editable) {
    const idx = _getItemIndexFromEditable(editable);
    if (idx === -1 || !canvasItems[idx]) return;
    const field = editable.classList.contains('speaker-edit') ? 'speaker-name' : 'dialogue-text';
    const val = field === 'speaker-name'
        ? editable.innerText
        : editable.classList.contains('source-editing')
            ? _getSourceValue(editable)
            : _serializeRichContent(editable);
            
    canvasItems[idx] = updateModularProperty(canvasItems[idx], field, val);
            
    // Update live preview element on canvas if editing in focus mode
    if (editable.id === 'focus-dialogue-content') {
        const activeCanvasItem = document.querySelector('.canvas-item.active-edit');
        if (activeCanvasItem) {
            const canvasContent = activeCanvasItem.querySelector('.vn-dialogue-content');
            if (canvasContent) {
                canvasContent.innerHTML = parseMarkdown(modularToFlat(canvasItems[idx])['dialogue-text']);
            }
        }
    }
    
    updateCodeView();
    saveToCache();
}

function _getSourceValue(el) {
    if (el.classList.contains('source-editing')) {
        if (typeof el._sourceValue === 'string') return el._sourceValue;
        return _serializeDecorated(el);
    }
    return _serializeRichContent(el);
}

function _setSourceValue(el, value, options = {}) {
    el._sourceValue = value;
    _commitSourceValue(el);
    _scanAndDecorateColors(el, {
        force: true,
        preserveCursor: options.preserveCursor !== false
    });
}

function _commitSourceValue(el) {
    const idx = _getItemIndexFromEditable(el);
    if (idx === -1 || !canvasItems[idx]) return;
    canvasItems[idx] = updateModularProperty(canvasItems[idx], 'dialogue-text', _getSourceValue(el));
    saveToCache();
    updateCodeView();
}

function _closestWithin(node, selector, root) {
    const el = node && (node.nodeType === 3 ? node.parentNode : node);
    if (!el || !el.closest) return null;
    const match = el.closest(selector);
    return match && root.contains(match) ? match : null;
}

function _isCursorInsideMarkdownMarker(editable, range, marker) {
    if (!range) return false;
    const node = range.startContainer;
    if (node.nodeType !== 3) return false;

    const text = node.textContent;
    const offset = range.startOffset;

    // Find all star groups in text
    const groups = [];
    let i = 0;
    while (i < text.length) {
        if (text[i] === '*') {
            let start = i;
            while (i < text.length && text[i] === '*') {
                i++;
            }
            groups.push({
                index: start,
                length: i - start
            });
        } else {
            i++;
        }
    }

    // Filter groups that are entirely before the cursor offset
    const groupsBefore = groups.filter(g => g.index + g.length <= offset);

    if (marker === '**') {
        // Count groups of length 2 or 3
        const count = groupsBefore.filter(g => g.length === 2 || g.length === 3).length;
        return (count % 2) === 1;
    } else if (marker === '*') {
        // Count groups of length 1 or 3
        const count = groupsBefore.filter(g => g.length === 1 || g.length === 3).length;
        return (count % 2) === 1;
    }

    return false;
}

function _removeMarkdownMarkerAroundSelection(editable, range, marker) {
    if (!range) return;
    const node = range.startContainer;
    if (node.nodeType !== 3 || range.startContainer !== range.endContainer) return;

    const text = node.textContent;
    const offsetStart = range.startOffset;
    const offsetEnd = range.endOffset;

    // Find all star groups
    const groups = [];
    let i = 0;
    while (i < text.length) {
        if (text[i] === '*') {
            let start = i;
            while (i < text.length && text[i] === '*') {
                i++;
            }
            groups.push({
                index: start,
                length: i - start
            });
        } else {
            i++;
        }
    }

    // Find opening group: last group before offsetStart that matches marker length criteria
    const openGroups = groups.filter(g => g.index + g.length <= offsetStart);
    let openGroup = null;
    if (marker === '**') {
        const matchGroups = openGroups.filter(g => g.length === 2 || g.length === 3);
        if (matchGroups.length > 0) openGroup = matchGroups[matchGroups.length - 1];
    } else {
        const matchGroups = openGroups.filter(g => g.length === 1 || g.length === 3);
        if (matchGroups.length > 0) openGroup = matchGroups[matchGroups.length - 1];
    }

    // Find closing group: first group after offsetEnd that matches marker length criteria
    const closeGroups = groups.filter(g => g.index >= offsetEnd);
    let closeGroup = null;
    if (marker === '**') {
        const matchGroups = closeGroups.filter(g => g.length === 2 || g.length === 3);
        if (matchGroups.length > 0) closeGroup = matchGroups[0];
    } else {
        const matchGroups = closeGroups.filter(g => g.length === 1 || g.length === 3);
        if (matchGroups.length > 0) closeGroup = matchGroups[0];
    }

    if (!openGroup || !closeGroup) return;

    const openRemoveStart = openGroup.index + openGroup.length - marker.length;
    const openRemoveEnd = openGroup.index + openGroup.length;

    const closeRemoveStart = closeGroup.index;
    const closeRemoveEnd = closeGroup.index + marker.length;

    const newText = text.substring(0, openRemoveStart) + 
                    text.substring(openRemoveEnd, closeRemoveStart) + 
                    text.substring(closeRemoveEnd);

    node.textContent = newText;

    const newRange = document.createRange();
    newRange.setStart(node, offsetStart - marker.length);
    newRange.setEnd(node, offsetEnd - marker.length);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(newRange);
    window.lastSavedSelectionRange = newRange.cloneRange();
}

function _getActiveStyle(range, editable) {
    const node = range.startContainer;
    const span = _closestWithin(node, 'span[style]', editable);
    
    let isBold = !!_closestWithin(node, 'strong,b', editable);
    let isItalic = !!_closestWithin(node, 'em,i', editable);
    
    if (editable && !editable.classList.contains('source-editing')) {
        if (_isCursorInsideMarkdownMarker(editable, range, '**')) {
            isBold = true;
        }
        if (_isCursorInsideMarkdownMarker(editable, range, '*')) {
            isItalic = true;
        }
    }

    return {
        bold: isBold,
        italic: isItalic,
        color: span && span.style.color ? span.style.color : '',
        gradient: span && span.style.background ? span.style.background : '',
        fontFamily: span && span.style.fontFamily ? span.style.fontFamily.replace(/['"]/g, '').split(',')[0].trim() : '',
        fontSize: span && span.style.fontSize ? span.style.fontSize : '',
        shadow: !!(span && span.style.textShadow)
    };
}

function handleTextSelection(e) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const editable = _getEditableFromRange(range);
    const textarea = document.querySelector('#form-fields textarea');
    const isTextareaRange = textarea && document.activeElement === textarea;
    if (!editable && !isTextareaRange) return;

    window.lastSavedSelectionRange = range.cloneRange();
    const active = editable ? _getActiveStyle(range, editable) : {};

    document.getElementById('btn-bold').classList.toggle('active', !!active.bold);
    document.getElementById('btn-italic').classList.toggle('active', !!active.italic);
    document.getElementById('btn-shadow').classList.toggle('active', !!active.shadow);
    
    const activeSpoiler = editable ? !!_closestWithin(range.startContainer, 'span.spoiler-text', editable) : false;
    const btnSpoiler = document.getElementById('btn-spoiler');
    if (btnSpoiler) {
        btnSpoiler.classList.toggle('active', activeSpoiler);
    }
    
    const colorBar = document.querySelector('#btn-color .color-bar');
    if (colorBar) {
        colorBar.style.background = active.color || '#ffffff';
    }
    const fontCurrent = document.querySelector('.font-current');
    if (fontCurrent) {
        const fontName = active.fontFamily || 'Inter';
        fontCurrent.innerHTML = `${fontName} <i class="bi bi-chevron-down" style="font-size: 10px; margin-left: 5px;"></i>`;
    }
    const fontSizeCurrent = document.querySelector('.font-size-current');
    if (fontSizeCurrent) {
        const sizeName = active.fontSize || '1em';
        fontSizeCurrent.innerHTML = `${sizeName} <i class="bi bi-chevron-down" style="font-size: 10px; margin-left: 5px;"></i>`;
    }
    document.getElementById('btn-color').classList.toggle('active', !!active.color);
}

function _unwrapElement(el) {
    const parent = el.parentNode;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
}

function _removeStyleFromFragment(fragment, prop) {
    fragment.querySelectorAll && fragment.querySelectorAll('[style]').forEach(el => {
        el.style[prop] = '';
        if (!el.getAttribute('style')) _unwrapElement(el);
    });
}

function _selectNodeContents(node) {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node);
    sel.removeAllRanges();
    sel.addRange(range);
    window.lastSavedSelectionRange = range.cloneRange();
}

function _saveLastSelection() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const editable = _getEditableFromRange(range);
    const textarea = document.querySelector('#form-fields textarea');
    if (!editable && !textarea) return;
    window.lastSavedSelectionRange = range.cloneRange();
}

function _serializeNodeText(node) {
    // IMPORTANT: This function must map DOM nodes to the raw SOURCE TEXT coordinates.
    // nexus-color-decorator nodes contribute their dataset.color string (the raw token like "#ff0000")
    // nexus-ghost-syntax nodes contribute their textContent (the raw syntax chars like "<span style=\"")
    // Both of these are atomic tokens in source-editing mode — we must NOT walk their visual children,
    // because those children (swatch div, text span) do not correspond to source characters.
    let text = "";
    const walk = (current) => {
        if (current.nodeType === 3) {
            text += current.textContent;
            return;
        }
        if (current.nodeType !== 1 && current.nodeType !== 11) return;
        if (current.tagName === 'BR') {
            text += "\n";
            return;
        }
        if (current.tagName === 'IMG' || current.tagName === 'IFRAME') {
            // Images and iframes have exactly 0 length in selection offset calculations
            return;
        }
        if (current.classList && Array.from(current.classList).some(c => c.includes('vn-'))) {
            // Custom components have exactly 0 length in selection offset calculations
            return;
        }
        if (current.classList && current.classList.contains('nexus-color-decorator')) {
            // Return the raw source color token, not the visual swatch child text.
            text += current.dataset.color || '';
            return;
        }
        if (current.classList && current.classList.contains('nexus-ghost-syntax')) {
            // Return the raw syntax characters.
            text += current.textContent || '';
            return;
        }
        for (let child of current.childNodes) walk(child);
    };
    walk(node);
    return text;
}

function _getSourceRange(editable, range) {
    const preRange = range.cloneRange();
    preRange.selectNodeContents(editable);
    preRange.setEnd(range.startContainer, range.startOffset);

    const selected = range.cloneContents();
    const start = _serializeNodeText(preRange.cloneContents()).length;
    const selectedText = _serializeNodeText(selected);
    return {
        start,
        end: start + selectedText.length,
        text: selectedText
    };
}

function _replaceSourceRange(editable, range, replacement) {
    const sourceRange = _getSourceRange(editable, range);
    const source = _getSourceValue(editable);
    editable._sourceValue = source.slice(0, sourceRange.start) + replacement + source.slice(sourceRange.end);
    _commitSourceValue(editable);
    _scanAndDecorateColors(editable, { force: true, preserveCursor: false });
    return { ...sourceRange, replacement };
}

function _applySourceFormat(editable, range, type, value) {
    if (!editable) return;
    const isImage = type === 'image';
    const isComponent = type === 'music' || type === 'gif-heading';
    
    if (range.collapsed && !isImage && !isComponent) {
        let syntaxOpen = '';
        let syntaxClose = '';
        if (type === 'bold') {
            syntaxOpen = '**';
            syntaxClose = '**';
        } else if (type === 'italic') {
            syntaxOpen = '*';
            syntaxClose = '*';
        } else if (type === 'color') {
            syntaxOpen = `<span style="color:${value}">`;
            syntaxClose = '</span>';
        } else if (type === 'gradient') {
            syntaxOpen = `<span style="${value}">`;
            syntaxClose = '</span>';
        } else if (type === 'font') {
            syntaxOpen = `<span style="font-family: '${value}'">`;
            syntaxClose = '</span>';
        } else if (type === 'font-size') {
            syntaxOpen = `<span style="font-size: ${value}">`;
            syntaxClose = '</span>';
        } else if (type === 'shadow') {
            syntaxOpen = '<span style="text-shadow: 2px 2px 4px rgba(0,0,0,0.5)">';
            syntaxClose = '</span>';
        } else if (type === 'effect') {
            const dataAttr = value === 'effect-glitch' ? ' data-text=""' : '';
            syntaxOpen = `<span class="${value}"${dataAttr}>`;
            syntaxClose = '</span>';
        } else if (type === 'spoiler') {
            syntaxOpen = '<span class="spoiler-text">';
            syntaxClose = '</span>';
        } else if (type === 'link') {
            syntaxOpen = `[${value.text || ''}](${value.url || ''}`;
            syntaxClose = ')';
        } else if (type === 'sfx') {
            syntaxOpen = `<span class="vn-sfx-trigger" onclick="new Audio('${value.url || ''}').play()">🔊 ${value.text || ''}`;
            syntaxClose = '</span>';
        }
        
        if (syntaxOpen) {
            const replacement = syntaxOpen + syntaxClose;
            const res = _replaceSourceRange(editable, range, replacement);
            _restoreCursor(editable, res.start + syntaxOpen.length);
        }
        return;
    }
    
    const sourceRange = _getSourceRange(editable, range);
    if (!sourceRange.text && !isImage && !isComponent) return;

    let replacement = sourceRange.text || '';
    const source = _getSourceValue(editable);
    
    // Improved detection: check if text is ALREADY wrapped in the source
    const before = source.slice(0, sourceRange.start);
    const after = source.slice(sourceRange.end);

    const isBold = (t) => t.startsWith('**') && t.endsWith('**');
    const isItalic = (t) => t.startsWith('*') && !t.startsWith('**') && t.endsWith('*') && !t.endsWith('**');
    
    if (type === 'bold') {
        if (isBold(sourceRange.text)) replacement = sourceRange.text.slice(2, -2);
        else if (before.endsWith('**') && after.startsWith('**')) {
            // Selection is inside bold, we need to split it
            // For simplicity, let's just use the standard wrapping if not perfectly aligned
            replacement = `**${sourceRange.text}**`;
        } else replacement = `**${sourceRange.text}**`;
    } else if (type === 'italic') {
        if (isItalic(sourceRange.text)) replacement = sourceRange.text.slice(1, -1);
        else replacement = `*${sourceRange.text}*`;
    } else if (type === 'color') {
        // Remove existing spans of same type if they exist exactly around selection
        const spanRegex = /<span style="color:[^"]+">(.*?)<\/span>/;
        if (spanRegex.test(sourceRange.text)) {
            replacement = sourceRange.text.replace(spanRegex, '$1');
        }
        replacement = `<span style="color:${value}">${replacement}</span>`;
    } else if (type === 'gradient') {
        // Replace existing style/gradient
        replacement = `<span style="${value}">${sourceRange.text.replace(/<span style="[^"]+">(.*?)<\/span>/g, '$1')}</span>`;
    } else if (type === 'font') {
        replacement = `<span style="font-family: '${value}'">${sourceRange.text}</span>`;
    } else if (type === 'font-size') {
        replacement = `<span style="font-size: ${value}">${sourceRange.text}</span>`;
    } else if (type === 'image') {
        replacement = `![image](${value})`;
    } else if (type === 'music' || type === 'gif-heading') {
        replacement = value;
    } else if (type === 'shadow') {
        replacement = `<span style="text-shadow: 2px 2px 4px rgba(0,0,0,0.5)">${sourceRange.text}</span>`;
    } else if (type === 'effect') {
        const dataAttr = value === 'effect-glitch' ? ` data-text="${sourceRange.text}"` : '';
        replacement = `<span class="${value}"${dataAttr}>${sourceRange.text}</span>`;
    } else if (type === 'spoiler') {
        replacement = `<span class="spoiler-text">${sourceRange.text}</span>`;
    } else if (type === 'link') {
        replacement = `[${value.text || sourceRange.text}](${value.url})`;
    } else if (type === 'sfx') {
        replacement = `<span class="vn-sfx-trigger" onclick="new Audio('${value.url}').play()">🔊 ${value.text || sourceRange.text}</span>`;
    }

    const res = _replaceSourceRange(editable, range, replacement);
    _setSelectionOffsets(editable, res.start, res.start + replacement.length);
}

// --- FLAT STRUCTURED DOCUMENT MODEL (AST / TEXT RUNS) ---

function domToRuns(node, parentStyles = {}) {
    let runs = [];
    let currentStyles = { ...parentStyles };

    if (node.nodeType === 3) { // Text Node
        const text = node.textContent;
        if (text) {
            runs.push({ text, ...currentStyles });
        }
        return runs;
    }

    if (node.nodeType === 1) { // Element Node
        const tag = node.tagName;

        if (tag === 'DIV' && node.classList.contains('vn-image-wrapper')) {
            const img = node.querySelector('img');
            runs.push({
                text: '',
                isImage: true,
                imageUrl: img ? img.getAttribute('src') || '' : '',
                imageAlt: img ? img.getAttribute('alt') || '' : '',
                ...currentStyles
            });
            return runs;
        }

        if (tag === 'IMG') {
            runs.push({
                text: '',
                isImage: true,
                imageUrl: node.getAttribute('src') || '',
                imageAlt: node.getAttribute('alt') || '',
                ...currentStyles
            });
            return runs;
        }

        if (node.classList && Array.from(node.classList).some(c => c.includes('vn-'))) {
            // Keep custom theme components as raw HTML blocks in the runs model
            runs.push({
                text: '',
                isRawHTML: true,
                htmlContent: node.outerHTML,
                ...currentStyles
            });
            return runs;
        }

        if (tag === 'BR') {
            runs.push({ text: '\n', ...currentStyles });
            return runs;
        }

        // Apply style properties based on elements
        if (tag === 'STRONG' || tag === 'B') {
            currentStyles.bold = true;
        } else if (tag === 'EM' || tag === 'I') {
            currentStyles.italic = true;
        } else if (tag === 'A') {
            currentStyles.isLink = true;
            currentStyles.linkUrl = node.getAttribute('href') || '';
        } else if (tag === 'SPAN') {
            if (node.classList.contains('spoiler-text')) {
                currentStyles.spoiler = true;
            }
            if (node.classList.contains('vn-sfx-trigger')) {
                currentStyles.isSfx = true;
                const clickAttr = node.getAttribute('onclick') || '';
                const match = clickAttr.match(/new Audio\('([^']+)'\)/);
                if (match) currentStyles.sfxUrl = match[1];
            }
            
            // Check effects classes
            Array.from(node.classList).forEach(cls => {
                if (cls.startsWith('effect-')) {
                    currentStyles.effect = cls;
                }
            });

            // Check style attributes
            if (node.style.color) {
                currentStyles.color = node.style.color;
            }
            if (node.style.fontSize) {
                currentStyles.fontSize = node.style.fontSize;
            }
            if (node.style.fontFamily) {
                // Strip quotes and fallback list
                let font = node.style.fontFamily.replace(/['"]/g, '');
                currentStyles.fontFamily = font.split(',')[0].trim();
            }
            if (node.style.textShadow) {
                currentStyles.shadow = true;
            }
            const c1 = node.style.getPropertyValue('--grad-c1');
            const c2 = node.style.getPropertyValue('--grad-c2');
            if (c1) currentStyles.gradC1 = c1;
            if (c2) currentStyles.gradC2 = c2;
            if (node.getAttribute('style') && (node.getAttribute('style').includes('gradient') || (node.style.backgroundImage && node.style.backgroundImage.includes('gradient')) || (node.style.background && node.style.background.includes('gradient')))) {
                currentStyles.gradient = node.getAttribute('style');
            }
        }

        const isBlock = ['DIV', 'P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tag);
        let childRuns = [];
        
        for (let child of node.childNodes) {
            childRuns = childRuns.concat(domToRuns(child, currentStyles));
        }

        if (isBlock && childRuns.length > 0) {
            const lastRun = childRuns[childRuns.length - 1];
            if (lastRun && !lastRun.text.endsWith('\n')) {
                childRuns.push({ text: '\n', ...currentStyles });
            }
        }
        runs = runs.concat(childRuns);
    }

    return runs;
}

function mergeRuns(runs) {
    if (runs.length === 0) return [];
    
    const merged = [];
    let current = { ...runs[0] };
    
    for (let i = 1; i < runs.length; i++) {
        const next = runs[i];
        
        let identical = true;
        if (current.isRawHTML || next.isRawHTML || current.isImage || next.isImage) {
            identical = false;
        } else {
            // Check if style properties are identical
            const keys = new Set([...Object.keys(current), ...Object.keys(next)]);
            keys.delete('text');
            
            for (let key of keys) {
                if (current[key] !== next[key]) {
                    identical = false;
                    break;
                }
            }
        }
        
        if (identical) {
            current.text += next.text;
        } else {
            if (current.text || current.isRawHTML || current.isImage) {
                merged.push(current);
            }
            current = { ...next };
        }
    }
    
    if (current.text || current.isRawHTML || current.isImage) {
        merged.push(current);
    }
    
    return merged;
}

function runToHTML(run) {
    let html = '';
    if (run.isRawHTML) {
        html = run.htmlContent;
    } else if (run.isImage) {
        html = `<div class="vn-image-wrapper vn-image-style-default"><img src="${run.imageUrl}" alt="${run.imageAlt || ''}"></div>`;
    } else {
        html = run.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    }
    
    let classes = [];
    let style = {};
    let attributes = {};
    
    if (run.spoiler) {
        classes.push('spoiler-text');
    }
    if (run.effect) {
        classes.push(run.effect);
        if (run.effect === 'effect-glitch') {
            attributes['data-text'] = run.text || '';
        }
        if (run.effect === 'effect-gradient-loop') {
            if (run.gradC1) style['--grad-c1'] = run.gradC1;
            if (run.gradC2) style['--grad-c2'] = run.gradC2;
        }
    }
    if (run.gradient) {
        run.gradient.split(';').forEach(part => {
            const index = part.indexOf(':');
            if (index > 0) {
                const k = part.substring(0, index).trim();
                const v = part.substring(index + 1).trim();
                if (k && v) {
                    style[k] = v;
                }
            }
        });
    }
    if (run.color) style.color = run.color;
    if (run.fontFamily) style.fontFamily = `'${run.fontFamily}', sans-serif`;
    if (run.fontSize) style.fontSize = run.fontSize;
    if (run.shadow) style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
    
    if (run.isSfx) {
        return `<span class="vn-sfx-trigger" onclick="new Audio('${run.sfxUrl}').play()">🔊 ${run.text}</span>`;
    }
    
    let styleStr = Object.entries(style).map(([k, v]) => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}: ${v}`).join('; ');
    let classStr = classes.join(' ');
    let attrStr = Object.entries(attributes).map(([k, v]) => `${k}="${v.replace(/"/g, '&quot;')}"`).join(' ');
    
    let wrapped = html;
    if (styleStr || classStr || attrStr) {
        let spanTag = '<span';
        if (classStr) spanTag += ` class="${classStr}"`;
        if (styleStr) spanTag += ` style="${styleStr};"`;
        if (attrStr) spanTag += ` ${attrStr}`;
        spanTag += '>';
        wrapped = `${spanTag}${wrapped}</span>`;
    }
    
    if (run.italic) {
        wrapped = `<em>${wrapped}</em>`;
    }
    if (run.bold) {
        wrapped = `<strong>${wrapped}</strong>`;
    }
    if (run.isLink) {
        wrapped = `<a href="${run.linkUrl}" target="_blank">${wrapped}</a>`;
    }
    
    return wrapped;
}

function runsToHTML(runs) {
    return mergeRuns(runs).map(runToHTML).join('');
}

function getRangeOffsets(editable, range) {
    if (!range || !editable.contains(range.startContainer)) return null;
    
    const preRange = range.cloneRange();
    preRange.selectNodeContents(editable);
    preRange.setEnd(range.startContainer, range.startOffset);
    const start = _serializeNodeText(preRange.cloneContents()).length;
    
    const postRange = range.cloneRange();
    postRange.selectNodeContents(editable);
    postRange.setEnd(range.endContainer, range.endOffset);
    const end = _serializeNodeText(postRange.cloneContents()).length;
    
    return { start, end };
}

function splitRunsAtOffsets(runs, offsets) {
    const points = Array.from(new Set(offsets)).sort((a, b) => a - b);
    let currentOffset = 0;
    let result = [];
    
    for (let run of runs) {
        let runLen = run.text.length;
        let runStart = currentOffset;
        let runEnd = currentOffset + runLen;
        
        let splits = points.filter(p => p > runStart && p < runEnd);
        
        if (splits.length > 0) {
            let lastSplit = runStart;
            for (let split of splits) {
                result.push({
                    ...run,
                    text: run.text.substring(lastSplit - runStart, split - runStart)
                });
                lastSplit = split;
            }
            result.push({
                ...run,
                text: run.text.substring(lastSplit - runStart)
            });
        } else {
            result.push(run);
        }
        
        currentOffset += runLen;
    }
    
    return result;
}

function applyFormatToRuns(runs, type, value, start, end) {
    if (start === end) {
        let split = splitRunsAtOffsets(runs, [start]);
        let result = [];
        let currentOffset = 0;
        let inserted = false;
        
        for (let run of split) {
            let runLen = run.text.length;
            if (currentOffset === start && !inserted) {
                if (type === 'bold' || type === 'italic') {
                    const marker = type === 'bold' ? '**' : '*';
                    result.push({
                        ...run,
                        text: `${marker}\u200B${marker}`
                    });
                } else if (type === 'spoiler') {
                    result.push({
                        ...run,
                        text: '\u200B',
                        spoiler: true
                    });
                } else if (type === 'color') {
                    result.push({
                        ...run,
                        text: '\u200B',
                        color: value
                    });
                } else if (type === 'font') {
                    result.push({
                        ...run,
                        text: '\u200B',
                        fontFamily: value
                    });
                } else if (type === 'font-size') {
                    result.push({
                        ...run,
                        text: '\u200B',
                        fontSize: value
                    });
                } else if (type === 'shadow') {
                    result.push({
                        ...run,
                        text: '\u200B',
                        shadow: true
                    });
                } else if (type === 'effect') {
                    result.push({
                        ...run,
                        text: '\u200B',
                        effect: value
                    });
                } else if (type === 'gradient') {
                    result.push({
                        ...run,
                        text: '\u200B',
                        gradient: value
                    });
                } else if (type === 'link') {
                    result.push({
                        text: value.text,
                        isLink: true,
                        linkUrl: value.url
                    });
                } else if (type === 'sfx') {
                    result.push({
                        text: value.text,
                        isSfx: true,
                        sfxUrl: value.url
                    });
                } else if (type === 'music' || type === 'gif-heading') {
                    result.push({
                        text: '',
                        isRawHTML: true,
                        htmlContent: value
                    });
                } else if (type === 'image') {
                    result.push({
                        text: '',
                        isImage: true,
                        imageUrl: value,
                        imageAlt: 'image'
                    });
                }
                inserted = true;
            }
            result.push(run);
            currentOffset += runLen;
        }
        
        if (!inserted) {
            let baseStyles = split.length > 0 ? split[split.length - 1] : {};
            let newRun = { ...baseStyles, text: '' };
            if (type === 'bold' || type === 'italic') {
                const marker = type === 'bold' ? '**' : '*';
                newRun.text = `${marker}\u200B${marker}`;
            } else if (type === 'link') {
                newRun.text = value.text;
                newRun.isLink = true;
                newRun.linkUrl = value.url;
            } else if (type === 'sfx') {
                newRun.text = value.text;
                newRun.isSfx = true;
                newRun.sfxUrl = value.url;
            } else if (type === 'music' || type === 'gif-heading') {
                newRun.text = '';
                newRun.isRawHTML = true;
                newRun.htmlContent = value;
            } else if (type === 'image') {
                newRun.text = '';
                newRun.isImage = true;
                newRun.imageUrl = value;
                newRun.imageAlt = 'image';
            } else {
                newRun.text = '\u200B';
                if (type === 'spoiler') newRun.spoiler = true;
                else if (type === 'color') newRun.color = value;
                else if (type === 'font') newRun.fontFamily = value;
                else if (type === 'font-size') newRun.fontSize = value;
                else if (type === 'shadow') newRun.shadow = true;
                else if (type === 'effect') newRun.effect = value;
                else if (type === 'gradient') newRun.gradient = value;
            }
            result.push(newRun);
        }
        
        return mergeRuns(result);
    }

    if (type === 'link' || type === 'sfx' || type === 'music' || type === 'gif-heading' || type === 'image') {
        let split = splitRunsAtOffsets(runs, [start, end]);
        let result = [];
        let currentOffset = 0;
        let replaced = false;
        
        for (let run of split) {
            let runLen = run.text.length;
            let runStart = currentOffset;
            let runEnd = currentOffset + runLen;
            
            if (runEnd > start && runStart < end) {
                if (!replaced) {
                    if (type === 'link') {
                        result.push({
                            text: value.text,
                            isLink: true,
                            linkUrl: value.url
                        });
                    } else if (type === 'sfx') {
                        result.push({
                            text: value.text,
                            isSfx: true,
                            sfxUrl: value.url
                        });
                    } else if (type === 'image') {
                        result.push({
                            text: '',
                            isImage: true,
                            imageUrl: value,
                            imageAlt: 'image'
                        });
                    } else { // music or gif-heading
                        result.push({
                            text: '',
                            isRawHTML: true,
                            htmlContent: value
                        });
                    }
                    replaced = true;
                }
            } else {
                result.push(run);
            }
            currentOffset += runLen;
        }
        return mergeRuns(result);
    }

    if (type === 'bold' || type === 'italic') {
        const marker = type === 'bold' ? '**' : '*';
        let selectedText = '';
        let split = splitRunsAtOffsets(runs, [start, end]);
        let currentOffset = 0;
        
        for (let run of split) {
            let runLen = run.text.length;
            let runStart = currentOffset;
            let runEnd = currentOffset + runLen;
            
            if (runEnd > start && runStart < end) {
                selectedText += run.text;
            }
            currentOffset += runLen;
        }
        
        let replacementText = '';
        if (selectedText.startsWith(marker) && selectedText.endsWith(marker)) {
            replacementText = selectedText.slice(marker.length, -marker.length);
        } else {
            replacementText = `${marker}${selectedText}${marker}`;
        }
        
        let result = [];
        currentOffset = 0;
        let replaced = false;
        
        for (let run of split) {
            let runLen = run.text.length;
            let runStart = currentOffset;
            let runEnd = currentOffset + runLen;
            
            if (runEnd > start && runStart < end) {
                if (!replaced) {
                    result.push({
                        ...run,
                        text: replacementText
                    });
                    replaced = true;
                }
            } else {
                result.push(run);
            }
            currentOffset += runLen;
        }
        
        return mergeRuns(result);
    }

    if (type === 'clear') {
        let split = splitRunsAtOffsets(runs, [start, end]);
        let result = [];
        let currentOffset = 0;
        
        for (let run of split) {
            let runLen = run.text.length;
            let runStart = currentOffset;
            let runEnd = currentOffset + runLen;
            
            if (runEnd > start && runStart < end) {
                result.push({
                    text: run.text
                });
            } else {
                result.push(run);
            }
            currentOffset += runLen;
        }
        return mergeRuns(result);
    }

    let split = splitRunsAtOffsets(runs, [start, end]);
    let currentOffset = 0;
    
    let toggleOn = true;
    if (type === 'shadow' || type === 'spoiler') {
        let allHaveIt = true;
        let anyInSelection = false;
        
        for (let run of split) {
            let runLen = run.text.length;
            let runStart = currentOffset;
            let runEnd = currentOffset + runLen;
            
            if (runEnd > start && runStart < end) {
                anyInSelection = true;
                const prop = type === 'shadow' ? run.shadow : run.spoiler;
                if (!prop) {
                    allHaveIt = false;
                }
            }
            currentOffset += runLen;
        }
        
        if (anyInSelection && allHaveIt) {
            toggleOn = false;
        }
    }
    
    currentOffset = 0;
    let result = [];
    
    for (let run of split) {
        let runLen = run.text.length;
        let runStart = currentOffset;
        let runEnd = currentOffset + runLen;
        
        if (runEnd > start && runStart < end) {
            if (type === 'shadow') run.shadow = toggleOn;
            else if (type === 'spoiler') run.spoiler = toggleOn;
            else if (type === 'color') {
                if (value) run.color = value;
                else delete run.color;
            }
            else if (type === 'font') {
                if (value) run.fontFamily = value;
                else delete run.fontFamily;
            }
            else if (type === 'font-size') {
                if (value) run.fontSize = value;
                else delete run.fontSize;
            }
            else if (type === 'effect') {
                if (value) {
                    if (run.effect === value) delete run.effect;
                    else run.effect = value;
                } else delete run.effect;
            }
            else if (type === 'gradient') {
                if (value) run.gradient = value;
                else delete run.gradient;
            }
        }
        
        result.push(run);
        currentOffset += runLen;
    }
    
    return mergeRuns(result);
}

function _wrapRange(range, tagName, options = {}) {
    const wrapper = document.createElement(tagName);
    if (options.style) Object.assign(wrapper.style, options.style);

    const fragment = range.extractContents();
    if (options.clearStyle) _removeStyleFromFragment(fragment, options.clearStyle);
    wrapper.appendChild(fragment);
    range.insertNode(wrapper);
    wrapper.normalize();
    _selectNodeContents(wrapper);
    return wrapper;
}

function _applyInlineDomFormat(editable, range, type, value) {
    if (!editable) return;

    if (editable.classList.contains('source-editing')) {
        _applySourceFormat(editable, range, type, value);
        return;
    }

    // 1. Convert current DOM tree to runs
    let runs = domToRuns(editable);
    
    // 2. Get selection offsets relative to the plain text content
    let offsets = getRangeOffsets(editable, range);
    if (!offsets) return;
    
    // 3. Apply format to runs
    let newRuns = applyFormatToRuns(runs, type, value, offsets.start, offsets.end);
    
    // Check if the format was applied at the very end of the string
    const totalLength = runs.reduce((sum, r) => sum + r.text.length, 0);
    const plainText = runs.map(r => r.text).join('');
    const endsWithSpace = plainText.endsWith(' ') || plainText.endsWith('\u00A0') || plainText.endsWith('\n');
    const isInlineStyle = ['bold', 'italic', 'color', 'gradient', 'font', 'font-size', 'shadow', 'effect', 'spoiler', 'link', 'sfx'].includes(type);
    
    if (isInlineStyle && offsets.end === totalLength && totalLength > 0 && !endsWithSpace) {
        newRuns.push({
            text: '\u00A0'
        });
    }
    
    // 4. Convert runs back to HTML and set editable innerHTML
    editable.innerHTML = runsToHTML(newRuns);
    
    // 5. Calculate new cursor offsets
    let newStartOffset = offsets.start;
    let newEndOffset = offsets.end;
    
    if (offsets.start === offsets.end) {
        if (type === 'bold' || type === 'italic') {
            newStartOffset += 3;
            newEndOffset += 3;
        } else if (type === 'link' || type === 'sfx') {
            newStartOffset += value.text.length;
            newEndOffset += value.text.length;
        } else {
            newStartOffset += 1;
            newEndOffset += 1;
        }
    } else {
        if (type === 'bold' || type === 'italic') {
            const marker = type === 'bold' ? '**' : '*';
            let selectedText = '';
            let currentOffset = 0;
            for (let run of runs) {
                let runLen = run.text.length;
                if (currentOffset + runLen > offsets.start && currentOffset < offsets.end) {
                    let s = Math.max(offsets.start, currentOffset);
                    let e = Math.min(offsets.end, currentOffset + runLen);
                    selectedText += run.text.substring(s - currentOffset, e - currentOffset);
                }
                currentOffset += runLen;
            }
            if (selectedText.startsWith(marker) && selectedText.endsWith(marker)) {
                newEndOffset -= marker.length * 2;
            } else {
                newEndOffset += marker.length * 2;
            }
        } else if (type === 'link' || type === 'sfx') {
            newEndOffset = offsets.start + value.text.length;
        }
    }
    
    // 6. Restore the selection range
    _setSelectionOffsets(editable, newStartOffset, newEndOffset);
    
    // 7. Sync changes back to engine cache
    _syncRichEditable(editable);
    handleTextSelection();
}

function applyFormat(type, value, customRange = null) {
    let sel = window.getSelection();
    let range = customRange;

    if (!range && sel.rangeCount > 0) {
        const container = sel.getRangeAt(0).commonAncestorContainer;
        const isEditable = (container.nodeType === 3 ? container.parentNode : container).closest('[contenteditable="true"], textarea');
        if (isEditable) {
            range = sel.getRangeAt(0);
        }
    }

    if (!range && window.lastSavedSelectionRange) {
        sel.removeAllRanges();
        sel.addRange(window.lastSavedSelectionRange);
        range = window.lastSavedSelectionRange;
    }

    if (!range) return;

    const editable = _getEditableFromRange(range);
    if (editable) {
        // Focus the editable first so the selection is attached to an active element.
        // Then always re-push the range — focusing may clear the selection.
        editable.focus();
        sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
    const textarea = document.querySelector('#form-fields textarea');

    if (type === 'effect' && value === 'effect-gradient-loop' && editable) {
        const btn = document.getElementById('btn-gradient');
        window.NexusColorPicker.open(btn, '#00f3ff', (c1) => {
            setTimeout(() => {
                window.NexusColorPicker.open(btn, '#ff00ff', (c2) => {
                    _applyInlineDomFormat(editable, range, 'effect', value);
                    // Find the newly created/updated span and set variables
                    const activeNode = range.startContainer;
                    const span = _closestWithin(activeNode, '.effect-gradient-loop', editable);
                    if (span) {
                        span.style.setProperty('--grad-c1', c1);
                        span.style.setProperty('--grad-c2', c2);
                        _syncRichEditable(editable);
                    }
                });
            }, 300);
        });
        return;
    }

    if (editable) {
        if (editable.classList.contains('source-editing')) {
            _applySourceFormat(editable, range, type, value);
        } else {
            if (type === 'bold' || type === 'italic') {
                const marker = type === 'bold' ? '**' : '*';
                if (_isCursorInsideMarkdownMarker(editable, range, marker)) {
                    _removeMarkdownMarkerAroundSelection(editable, range, marker);
                } else {
                    const selectedText = range.toString();
                    if (selectedText.startsWith(marker) && selectedText.endsWith(marker)) {
                        // Unwrap
                        const cleanText = selectedText.slice(marker.length, -marker.length);
                        range.deleteContents();
                        const textNode = document.createTextNode(cleanText);
                        range.insertNode(textNode);
                        
                        const newRange = document.createRange();
                        newRange.selectNodeContents(textNode);
                        sel.removeAllRanges();
                        sel.addRange(newRange);
                    } else {
                        // Wrap
                        const textNodeStart = document.createTextNode(marker);
                        const textNodeEnd = document.createTextNode(marker);
                        
                        const rangeEnd = range.cloneRange();
                        rangeEnd.collapse(false);
                        rangeEnd.insertNode(textNodeEnd);
                        
                        const rangeStart = range.cloneRange();
                        rangeStart.collapse(true);
                        rangeStart.insertNode(textNodeStart);
                        
                        const newRange = document.createRange();
                        newRange.setStartBefore(textNodeStart);
                        newRange.setEndAfter(textNodeEnd);
                        sel.removeAllRanges();
                        sel.addRange(newRange);
                    }
                }
                _syncRichEditable(editable);
                handleTextSelection();
            } else {
                _applyInlineDomFormat(editable, range, type, value);
            }
        }
    } else if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        let newText = selectedText;

        switch(type) {
            case 'bold':
                if (selectedText.startsWith('**') && selectedText.endsWith('**')) {
                    newText = selectedText.slice(2, -2);
                } else {
                    newText = `**${selectedText}**`;
                }
                break;
            case 'italic':
                // Check for ** first to avoid misidentifying bold as italic
                if (selectedText.startsWith('***') && selectedText.endsWith('***')) {
                    newText = `**${selectedText.slice(3, -3)}**`;
                } else if (selectedText.startsWith('*') && !selectedText.startsWith('**') && selectedText.endsWith('*') && !selectedText.endsWith('**')) {
                    newText = selectedText.slice(1, -1);
                } else {
                    newText = `*${selectedText}*`;
                }
                break;
            case 'color': newText = `<span style="color:${value}">${selectedText}</span>`; break;
            case 'gradient': newText = `<span style="${value}">${selectedText}</span>`; break;
            case 'font-size': newText = `<span style="font-size:${value}">${selectedText}</span>`; break;
            case 'shadow': newText = `<span style="text-shadow: 2px 2px 4px rgba(0,0,0,0.5)">${selectedText}</span>`; break;
            case 'effect': 
                const dataAttr = value === 'effect-glitch' ? ` data-text="${selectedText}"` : '';
                newText = `<span class="${value}"${dataAttr}>${selectedText}</span>`; 
                break;
            case 'spoiler': newText = `<span class="spoiler-text">${selectedText}</span>`; break;
            case 'link': newText = `[${selectedText || value.text}](${value.url})`; break;
            case 'sfx': newText = `<span class="vn-sfx-trigger" onclick="new Audio('${value.url}').play()">🔊 ${selectedText || value.text || 'Play Sound'}</span>`; break;
            case 'image':
                newText = `![image](${value})`;
                break;
            case 'music':
            case 'gif-heading':
                newText = value;
                break;
        }

        textarea.value = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
        textarea.focus();
        textarea.setSelectionRange(start, start + newText.length);
    }
}

const PREMIUM_GRADIENTS = [
    { name: 'Cyberpunk', c1: '#00f3ff', c2: '#ff00ff', angle: 90 },
    { name: 'Sunset', c1: '#ff5f6d', c2: '#ffc371', angle: 45 },
    { name: 'Emerald', c1: '#11998e', c2: '#38ef7d', angle: 135 },
    { name: 'Royal', c1: '#141e30', c2: '#243b55', angle: 180 },
    { name: 'Golden', c1: '#f2994a', c2: '#f2c94c', angle: 90 },
    { name: 'Frost', c1: '#00c6ff', c2: '#0072ff', angle: 45 },
    { name: 'Midnight', c1: '#232526', c2: '#414345', angle: 90 },
    { name: 'Lush', c1: '#56ab2f', c2: '#a8e063', angle: 45 },
    { name: 'Plasma', c1: '#eb3349', c2: '#f45c43', angle: 135 },
    { name: 'Aura', c1: '#614385', c2: '#516395', angle: 90 }
];

function openUnifiedColorStudio(button, startMode) {
    const sel = window.getSelection();
    let range = null;
    if (sel.rangeCount > 0) range = sel.getRangeAt(0);
    if (range) window.lastSavedSelectionRange = range.cloneRange();
    if (!range && window.lastSavedSelectionRange) range = window.lastSavedSelectionRange;
    
    if (!range || range.collapsed) {
        showToast('Please select some text first!');
        return;
    }

    const editable = _getEditableFromRange(range);
    if (!editable) return;

    // Cache the original state for a non-destructive session
    const isSource = editable && editable.classList.contains('source-editing');
    let originalHTML = '';
    let originalOffsets = null;
    let originalSourceValue = '';
    let sourceRange = null;
    let selectedSource = '';
    let activeStart = 0;
    let activeEnd = 0;

    if (isSource) {
        originalSourceValue = _getSourceValue(editable);
        sourceRange = _getSourceRange(editable, range);
        if (!sourceRange.text) return;
        activeStart = sourceRange.start;
        activeEnd = sourceRange.end;
        selectedSource = sourceRange.text;
    } else {
        originalHTML = editable.innerHTML;
        originalOffsets = getRangeOffsets(editable, range);
    }
    
    const activeRange = range.cloneRange();

    // Lock the editable
    editable._toolLock = true;
    editable._colorPickerOpen = true;

    // Hide toolbar to prevent overlay layering issues
    const toolbar = document.getElementById('rich-text-toolbar');
    if (toolbar) toolbar.style.display = 'none';

    // Determine the initial value based on active styles
    const activeStyle = _getActiveStyle(activeRange, editable);
    let initialValue = '#ffffff';

    if (startMode === 'gradient') {
        initialValue = activeStyle.gradient || 'linear-gradient(90deg, rgb(0, 243, 255) 0%, rgb(255, 0, 255) 100%)';
    } else {
        initialValue = activeStyle.color || button.dataset.color || '#ffffff';
    }

    // Call open
    window.NexusColorPicker.open(
        button,
        initialValue,
        // onChange callback (real-time preview)
        (val, mode) => {
            if (isSource) {
                let replacement = '';
                if (mode === 'solid') {
                    replacement = `<span style="color:${val}">${selectedSource}</span>`;
                } else {
                    replacement = `<span style="${val}">${selectedSource}</span>`;
                }
                const source = _getSourceValue(editable);
                editable._sourceValue = source.slice(0, activeStart) + replacement + source.slice(activeEnd);
                activeEnd = activeStart + replacement.length;
                if (mode === 'solid') {
                    button.dataset.color = val;
                    const colorBar = button.querySelector('.color-bar');
                    if (colorBar) colorBar.style.background = val;
                }
                _commitSourceValue(editable);
                _scanAndDecorateColors(editable, { force: true, preserveCursor: false });
            } else {
                if (mode === 'solid') {
                    applyFormat('color', val, activeRange);
                    button.dataset.color = val;
                    const colorBar = button.querySelector('.color-bar');
                    if (colorBar) colorBar.style.background = val;
                } else {
                    applyFormat('gradient', val, activeRange);
                }
                _syncRichEditable(editable);
            }
        },
        // onApply callback (permanently save and record history)
        (val, mode) => {
            // Clean up flags
            editable._toolLock = false;
            editable._colorPickerOpen = false;
            if (toolbar) toolbar.style.display = 'flex';

            if (isSource) {
                if (mode === 'solid') {
                    button.dataset.color = val;
                    const colorBar = button.querySelector('.color-bar');
                    if (colorBar) colorBar.style.background = val;
                }
                _commitSourceValue(editable);
                if (editable.isConnected) {
                    editable.focus({ preventScroll: true });
                }
                _scanAndDecorateColors(editable, { force: true, preserveCursor: false });
            } else {
                if (mode === 'solid') {
                    applyFormat('color', val, activeRange);
                    button.dataset.color = val;
                    const colorBar = button.querySelector('.color-bar');
                    if (colorBar) colorBar.style.background = val;
                } else {
                    applyFormat('gradient', val, activeRange);
                }
                _syncRichEditable(editable);
                if (editable.isConnected) {
                    editable.focus();
                }
            }
            recordHistory();
            showToast(mode === 'solid' ? 'Color applied!' : 'Gradient applied!');
        },
        // onCancel callback (restore state)
        () => {
            // Clean up flags
            editable._toolLock = false;
            editable._colorPickerOpen = false;
            if (toolbar) toolbar.style.display = 'flex';

            if (isSource) {
                editable._sourceValue = originalSourceValue;
                _commitSourceValue(editable);
                _scanAndDecorateColors(editable, { force: true, preserveCursor: false });
                if (editable.isConnected) {
                    editable.focus({ preventScroll: true });
                }
            } else {
                editable.innerHTML = originalHTML;
                _syncRichEditable(editable);
                if (originalOffsets) {
                    _setSelectionOffsets(editable, originalOffsets.start, originalOffsets.end);
                }
                if (editable.isConnected) {
                    editable.focus();
                }
            }
        },
        // onClose callback
        () => {
            editable._toolLock = false;
            editable._colorPickerOpen = false;
            if (toolbar) toolbar.style.display = 'flex';
        }
    );
}

function applyFont(fontName, capturedRange) {
    applyFormat('font', fontName, capturedRange || null);
    
    // Update toolbar display
    const currentFont = document.querySelector('.font-current');
    if (currentFont) {
        currentFont.innerHTML = `${fontName} <i class="bi bi-chevron-down" style="font-size: 10px; margin-left: 5px;"></i>`;
    }
}

function openFontSizePopup() {
    const _sel = window.getSelection();
    const _capturedRange = (_sel && _sel.rangeCount > 0)
        ? _sel.getRangeAt(0).cloneRange()
        : (window.lastSavedSelectionRange || null);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'font-size-popup';
    overlay.style.display = 'flex';
    overlay.style.zIndex = 'var(--z-gallery-overlay)';
    overlay._capturedRange = _capturedRange;

    let currentValue = '1em';
    if (_capturedRange) {
        const activeNode = _capturedRange.startContainer;
        const editable = _getEditableFromRange(_capturedRange);
        const span = _closestWithin(activeNode, 'span[style]', editable);
        if (span && span.style.fontSize) {
            currentValue = span.style.fontSize;
        }
    }

    const grid = document.createElement('div');
    grid.className = 'font-size-grid';
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; padding: 2px;';

    const AVAILABLE_FONT_SIZES = ['0.75em', '0.9em', '1em', '1.1em', '1.25em', '1.5em', '1.75em', '2em', '2.5em', '3em'];

    AVAILABLE_FONT_SIZES.forEach(size => {
        const isSelected = size === currentValue;
        const card = document.createElement('div');
        card.className = 'font-size-card';
        card.style.cssText = `border: 1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}; border-radius: var(--radius-md); padding: 10px; cursor: pointer; text-align: center; background: ${isSelected ? 'var(--accent-dim)' : 'rgba(0,0,0,0.25)'}; transition: all 0.2s; display: flex; flex-direction: column; gap: 4px; align-items: center; justify-content: center; min-height: 55px;`;
        
        card.innerHTML = `
            <div style="font-size: ${size}; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; max-height: 40px; line-height: 1;">Aa</div>
            <div style="font-size: 9px; color: var(--text-dim); margin-top: 4px;">${size}</div>
        `;
        
        card.addEventListener('mouseover', () => { card.style.borderColor = 'var(--accent)'; card.style.transform = 'translateY(-2px)'; });
        card.addEventListener('mouseout', () => { card.style.borderColor = isSelected ? 'var(--accent)' : 'var(--border)'; card.style.transform = 'none'; });
        card.addEventListener('click', () => {
            const savedRange = overlay._capturedRange || window.lastSavedSelectionRange;
            applyFontSize(size, savedRange);
            document.getElementById('font-size-popup').remove();
        });
        grid.appendChild(card);
    });

    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.cssText = 'width: min(100%, 450px); max-height: 80vh; display: flex; flex-direction: column;';
    content.innerHTML = `
        <div class="modal-header">
            <h2>FONT SIZE</h2>
            <p>Select a size scale for the selected text.</p>
        </div>
        <div style="flex: 1; overflow-y: auto; margin-top: 10px; padding-right: 5px;"></div>
        <div style="display: flex; justify-content: flex-end; margin-top: 25px;">
            <button type="button" class="btn-outline" style="width: 120px;">CLOSE</button>
        </div>
    `;
    content.querySelector('div[style*="overflow-y"]').appendChild(grid);
    content.querySelector('.btn-outline').addEventListener('click', () => document.getElementById('font-size-popup').remove());
    overlay.appendChild(content);
    document.body.appendChild(overlay);
}

function applyFontSize(size, range) {
    applyFormat('font-size', size, range || null);
    
    const sizeCurrent = document.querySelector('.font-size-current');
    if (sizeCurrent) {
        sizeCurrent.innerHTML = `${size} <i class="bi bi-chevron-down" style="font-size: 10px; margin-left: 5px;"></i>`;
    }
}

function insertLinkPopup(capturedRange = null) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    
    const sel = window.getSelection();
    let range = capturedRange || null;
    if (!range && sel.rangeCount > 0) range = sel.getRangeAt(0);
    if (range) window.lastSavedSelectionRange = range.cloneRange();
    if (!range && window.lastSavedSelectionRange) range = window.lastSavedSelectionRange;
    
    const editable = range ? _getEditableFromRange(range) : null;
    if (editable) editable._toolLock = true;

    const selectedText = range ? range.toString().trim() : '';

    overlay.innerHTML = `
        <div class="modal-content" style="width: min(100%, 500px);">
            <div class="modal-header">
                <h2>INSERT HYPERLINK</h2>
                <p>Enter the URL and display text for the link.</p>
            </div>
            <div class="form-group">
                <label>Link Text</label>
                <input type="text" id="insert-link-text" value="${selectedText}">
            </div>
            <div class="form-group">
                <label>URL (e.g. https://google.com)</label>
                <input type="text" id="insert-link-url" value="https://">
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button id="confirm-link-btn" class="btn-success" style="flex: 1;">INSERT</button>
                <button id="cancel-link-btn" class="btn-outline" style="flex: 1;">CANCEL</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    const urlInput = document.getElementById('insert-link-url');
    const textInput = document.getElementById('insert-link-text');
    
    if (selectedText) {
        urlInput.focus();
        urlInput.select();
    } else {
        textInput.focus();
        textInput.select();
    }
    
    const cleanup = () => {
        if (editable) {
            editable._toolLock = false;
            if (editable.isConnected && editable.classList.contains('source-editing')) {
                editable.focus();
            }
        }
        overlay.remove();
    };

    document.getElementById('confirm-link-btn').onclick = () => {
        const url = urlInput.value.trim();
        const text = textInput.value.trim() || url;
        if (!url || url === 'https://') {
            alert('Please enter a valid URL.');
            return;
        }
        
        const targetRange = window.lastSavedSelectionRange || range;
        applyFormat('link', { url, text }, targetRange);
        cleanup();
    };

    document.getElementById('cancel-link-btn').onclick = cleanup;
}

function insertSfxPopup(capturedRange = null) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    
    const sel = window.getSelection();
    let range = capturedRange || null;
    if (!range && sel.rangeCount > 0) range = sel.getRangeAt(0);
    if (range) window.lastSavedSelectionRange = range.cloneRange();
    if (!range && window.lastSavedSelectionRange) range = window.lastSavedSelectionRange;
    
    const editable = range ? _getEditableFromRange(range) : null;
    if (editable) editable._toolLock = true;

    const selectedText = range ? range.toString().trim() : '';

    overlay.innerHTML = `
        <div class="modal-content" style="width: min(100%, 500px);">
            <div class="modal-header">
                <h2>INSERT SFX / VOICE PLAYER</h2>
                <p>Embed an audio trigger that plays on click.</p>
            </div>
            <div class="form-group">
                <label>Button Text</label>
                <input type="text" id="insert-sfx-text" value="${selectedText || 'Play Voice'}">
            </div>
            <div class="form-group">
                <label>Audio File URL (mp3, ogg, wav)</label>
                <input type="text" id="insert-sfx-url" placeholder="https://example.com/voice.mp3" value="">
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button id="confirm-sfx-btn" class="btn-success" style="flex: 1;">INSERT</button>
                <button id="cancel-sfx-btn" class="btn-outline" style="flex: 1;">CANCEL</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    const urlInput = document.getElementById('insert-sfx-url');
    const textInput = document.getElementById('insert-sfx-text');
    
    urlInput.focus();
    
    const cleanup = () => {
        if (editable) {
            editable._toolLock = false;
            if (editable.isConnected && editable.classList.contains('source-editing')) {
                editable.focus();
            }
        }
        overlay.remove();
    };

    document.getElementById('confirm-sfx-btn').onclick = () => {
        const url = urlInput.value.trim();
        const text = textInput.value.trim() || 'Play Voice';
        if (!url) {
            alert('Please enter a valid Audio URL.');
            return;
        }
        
        const targetRange = window.lastSavedSelectionRange || range;
        applyFormat('sfx', { url, text }, targetRange);
        cleanup();
    };

    document.getElementById('cancel-sfx-btn').onclick = cleanup;
}

function insertImage(capturedRange = null) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    
    const sel = window.getSelection();
    let range = capturedRange || null;
    if (!range && sel.rangeCount > 0) range = sel.getRangeAt(0);
    if (range) window.lastSavedSelectionRange = range.cloneRange();
    if (!range && window.lastSavedSelectionRange) range = window.lastSavedSelectionRange;
    
    const editable = range ? _getEditableFromRange(range) : null;
    if (editable) editable._toolLock = true;

    overlay.innerHTML = `
        <div class="modal-content" style="width: min(100%, 500px);">
            <div class="modal-header">
                <h2>INSERT IMAGE</h2>
                <p>Enter the URL for the image asset.</p>
            </div>
            <div class="form-group">
                <label>Image URL</label>
                <input type="text" id="insert-image-url" value="https://via.placeholder.com/400x200.png?text=Dialogue+Asset">
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button id="confirm-image-btn" class="btn-success" style="flex: 1;">INSERT</button>
                <button id="cancel-image-btn" class="btn-outline" style="flex: 1;">CANCEL</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    const input = document.getElementById('insert-image-url');
    input.focus();
    input.select();
    
    const cleanup = () => {
        if (editable) {
            editable._toolLock = false;
            if (editable.isConnected && editable.classList.contains('source-editing')) {
                editable.focus();
            }
        }
        overlay.remove();
    };

    document.getElementById('confirm-image-btn').onclick = () => {
        const url = input.value.trim();
        if (!url) {
            alert('Please enter a valid image URL.');
            return;
        }
        if (range) {
            applyFormat('image', url, range);
        } else {
            applyFormat('image', url);
        }
        cleanup();
    };

    document.getElementById('cancel-image-btn').onclick = cleanup;
}

function insertDialogueComponent(type, capturedRange) {
    if (type === 'image') {
        insertImage(capturedRange);
        return;
    }
    if (type === 'link') {
        insertLinkPopup(capturedRange);
        return;
    }
    if (type === 'sfx') {
        insertSfxPopup(capturedRange);
        return;
    }
    
    const sel = window.getSelection();
    let range = capturedRange || null;
    if (!range && sel.rangeCount > 0) range = sel.getRangeAt(0);
    if (range) window.lastSavedSelectionRange = range.cloneRange();
    if (!range && window.lastSavedSelectionRange) range = window.lastSavedSelectionRange;
    // Save the resolved range so both confirm handlers close over the correct value.
    const savedRange = range ? range.cloneRange() : null;
    
    const editable = range ? _getEditableFromRange(range) : null;
    if (editable) editable._toolLock = true;
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    
    if (type === 'music') {
        overlay.innerHTML = `
            <div class="modal-content" style="width: min(100%, 500px);">
                <div class="modal-header">
                    <h2>INSERT MUSIC PLAYER</h2>
                    <p>Configure a YouTube audio stream inside the dialogue box.</p>
                </div>
                <div class="form-group">
                    <label>YouTube URL / ID</label>
                    <input type="text" id="ins-music-url" value="" placeholder="https://www.youtube.com/watch?v=...">
                </div>
                <div class="form-group">
                    <label>Volume (0-100)</label>
                    <input type="number" id="ins-music-volume" value="100" min="0" max="100">
                </div>
                <div class="form-group">
                    <label>Autoplay</label>
                    <select id="ins-music-autoplay" style="width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 8px; border-radius: var(--radius-sm);">
                        <option value="true">Enabled (Autoplay on load)</option>
                        <option value="false">Disabled (Click play to start)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Player Theme</label>
                    <select id="ins-music-theme" style="width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 8px; border-radius: var(--radius-sm);">
                        <option value="nasapunk">Nasapunk (Default)</option>
                        <option value="cyberpunk">Cyberpunk</option>
                        <option value="celestial">Celestial</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Design Style</label>
                    <select id="ins-music-design" style="width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 8px; border-radius: var(--radius-sm);">
                        <option value="default">Default Frame</option>
                        <option value="compact">Compact Pill Widget</option>
                        <option value="deck">Tech Control Deck</option>
                    </select>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="ins-music-confirm" class="btn-success" style="flex: 1;">INSERT</button>
                    <button id="ins-music-cancel" class="btn-outline" style="flex: 1;">CANCEL</button>
                </div>
            </div>
        `;
    } else if (type === 'gif-heading') {
        overlay.innerHTML = `
            <div class="modal-content" style="width: min(100%, 500px);">
                <div class="modal-header">
                    <h2>INSERT GIF HEADING</h2>
                    <p>Add a premium animated text title inside the dialogue box.</p>
                </div>
                <div class="form-group">
                    <label>Heading Text</label>
                    <input type="text" id="ins-gif-text" value="JOYLAND" placeholder="Enter heading text...">
                </div>
                <div class="form-group">
                    <label>Gif URL</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="text" id="ins-gif-url" value="https://minimumlogix.github.io/World-Nexus/assets/gif-library/morning-sky-1.gif" placeholder="https://.../sky1.gif" style="flex: 1;">
                        <button type="button" class="control-btn" style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; padding: 0;" title="Browse Gif Library" onclick="openGifLibraryPopup('ins-gif-url')">
                            <i class="bi bi-images" style="font-size: 14px;"></i>
                        </button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Stroke Color (Leave blank to use theme default)</label>
                    <input type="text" id="ins-gif-stroke" value="" placeholder="e.g. #f1d0d7">
                </div>
                <div class="form-group">
                    <label>Font Size</label>
                    <input type="text" id="ins-gif-size" value="5em" placeholder="5em">
                </div>
                <div class="form-group">
                    <label>Font Family</label>
                    <select id="ins-gif-font" style="width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 8px; border-radius: var(--radius-sm);">
                        ${AVAILABLE_FONTS.map(f => `<option value="${f}">${f}</option>`).join('')}
                    </select>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="ins-gif-confirm" class="btn-success" style="flex: 1;">INSERT</button>
                    <button id="ins-gif-cancel" class="btn-outline" style="flex: 1;">CANCEL</button>
                </div>
            </div>
        `;
    }
    
    document.body.appendChild(overlay);
    
    const cleanup = () => {
        if (editable) {
            editable._toolLock = false;
            if (editable.isConnected && editable.classList.contains('source-editing')) {
                editable.focus();
            }
        }
        overlay.remove();
    };
    
    if (type === 'music') {
        const inputUrl = document.getElementById('ins-music-url');
        inputUrl.focus();
        
        document.getElementById('ins-music-confirm').onclick = () => {
            const url = inputUrl.value.trim();
            const volume = parseInt(document.getElementById('ins-music-volume').value, 10) || 100;
            const autoplayVal = document.getElementById('ins-music-autoplay').value === 'true';
            const musicTheme = document.getElementById('ins-music-theme').value;
            const design = document.getElementById('ins-music-design').value;
            
            const ytId = extractYoutubeId(url) || url;
            if (!ytId) {
                alert('Please enter a valid YouTube URL or video ID.');
                return;
            }
            
            const themeColor = getThemePrimaryHex();
            const musicHeight = design === 'deck' ? 120 : 75;
            const ap = autoplayVal ? '1' : '0';
            const htmlCode = `<div class="vn-music-wrapper vn-music-style-${design}"><iframe allow="autoplay; encrypted-media" src="https://minimumlogix.github.io/World-Nexus/tools/music-player/mw?v=${ytId}&c=${themeColor}&ap=${ap}&vol=${volume}&theme=${musicTheme}" style="width:100%;height:${musicHeight}px;border:none"></iframe></div>`;
            
            // Use the range captured when the popup was opened, not whatever is active now.
            applyFormat('music', htmlCode, savedRange || window.lastSavedSelectionRange);
            cleanup();
        };
        
        document.getElementById('ins-music-cancel').onclick = cleanup;
    } else if (type === 'gif-heading') {
        const inputText = document.getElementById('ins-gif-text');
        inputText.focus();
        inputText.select();
        
        document.getElementById('ins-gif-confirm').onclick = () => {
            const text = inputText.value.trim() || 'JOYLAND';
            const gifUrl = document.getElementById('ins-gif-url').value.trim() || 'https://joylandimages.neocities.org/JOYLAND/GREETING/gifs/sky1.gif';
            const strokeColor = document.getElementById('ins-gif-stroke').value.trim();
            const strokeStyle = strokeColor ? `-webkit-text-stroke: 1px ${strokeColor};` : '';
            const fontSize = document.getElementById('ins-gif-size').value.trim() || '5em';
            const font = document.getElementById('ins-gif-font').value;
            
            const htmlCode = `<div class="vn-gif-heading" style="text-align: center; font-size: ${fontSize}; font-family: '${font}', sans-serif; background-image: url('${gifUrl}'); background-size: cover; -webkit-background-clip: text; -webkit-text-fill-color: transparent; ${strokeStyle} margin: 1rem 0; line-height: 1.2;">${text}</div>`;
            
            // Use the range captured when the popup was opened, not whatever is active now.
            applyFormat('gif-heading', htmlCode, savedRange || window.lastSavedSelectionRange);
            cleanup();
        };
        
        document.getElementById('ins-gif-cancel').onclick = cleanup;
    }
}

function clearFormatting() {
    const sel = window.getSelection();
    let range = null;
    if (sel.rangeCount > 0) range = sel.getRangeAt(0);
    if (!range && window.lastSavedSelectionRange) range = window.lastSavedSelectionRange;
    if (!range || range.collapsed) return;

    const editable = _getEditableFromRange(range);
    if (!editable) return;

    if (editable.classList.contains('source-editing')) {
        const sourceRange = _getSourceRange(editable, range);
        if (!sourceRange.text) return;
        
        // Strip all HTML tags from the source text
        const cleaned = sourceRange.text.replace(/<[^>]*>/g, '');
        _replaceSourceRange(editable, range, cleaned);
        showToast('Formatting cleared!');
    } else {
        let runs = domToRuns(editable);
        let offsets = getRangeOffsets(editable, range);
        if (offsets) {
            let newRuns = applyFormatToRuns(runs, 'clear', null, offsets.start, offsets.end);
            editable.innerHTML = runsToHTML(newRuns);
            _setSelectionOffsets(editable, offsets.start, offsets.end);
        }
        _syncRichEditable(editable);
        handleTextSelection();
        showToast('Formatting cleared!');
    }
}

function applyGradient() {
    const btn = document.getElementById('btn-gradient') || document.getElementById('btn-color');
    openUnifiedColorStudio(btn, 'gradient');
}

function openToolbarColorPicker(button) {
    openUnifiedColorStudio(button, 'solid');
}

function syncInlineChange(index, newContent) {
    // If it's a dialogue, we store the content
    // We try to keep it as raw as possible
    canvasItems[index] = updateModularProperty(canvasItems[index], 'dialogue-text', newContent);
    updateCodeView();
    saveToCache();
}

function parseMarkdown(text) {
    if (!text) return '';

    // 1. Protect existing HTML tags
    const placeholders = [];
    let html = text.replace(/<[^>]+>/g, (match) => {
        const id = `__PH_${placeholders.length}__`;
        placeholders.push(match);
        return id;
    });

    // 2. Line-by-line Processing for Block Elements
    let lines = html.split(/\r?\n/);
    let processedLines = lines.map(line => {
        let trimmed = line.trim();

        // Headings
        if (trimmed.startsWith('#')) {
            const hMatch = trimmed.match(/^(#+) (.*)$/);
            if (hMatch) {
                const level = Math.min(hMatch[1].length, 6);
                return `<h${level} style="margin: 0.5rem 0;">${hMatch[2]}</h${level}>`;
            }
        }

        // Horizontal Rule
        if (trimmed === '---') {
            return '<hr style="border:none;height:1px;background:linear-gradient(90deg,transparent,var(--accent),transparent);margin:20px 0;opacity:0.3">';
        }

        // Lists
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            return `<li style="margin-left:20px;list-style-type:square;color:var(--accent);margin-bottom:4px;"><span style="color:white">${trimmed.substring(2)}</span></li>`;
        }

        // Blockquotes
        if (trimmed.startsWith('> ')) {
            return `<blockquote style="border-left:3px solid var(--accent);padding-left:15px;margin:10px 0;font-style:italic;opacity:0.8">${trimmed.substring(2)}</blockquote>`;
        }

        // Inline transformations
        let content = line
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<div class="vn-image-wrapper"><img src="$2" alt="$1"></div>')
            .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--accent);text-decoration:none;border-bottom:1px dashed var(--accent)">$1</a>');

        return content + (line === '' ? '<br>' : '');
    });

    // Join with <br> but skip for lines that already produced block elements
    html = "";
    for (let i = 0; i < processedLines.length; i++) {
        const line = processedLines[i];
        let isBlock = line.startsWith('<h') || line.startsWith('<hr') || line.startsWith('<li') || line.startsWith('<blockquote') || line.startsWith('<div');
        
        if (!isBlock) {
            const phMatch = line.trim().match(/^__PH_(\d+)__/);
            if (phMatch) {
                const phIdx = parseInt(phMatch[1], 10);
                const tag = placeholders[phIdx];
                if (tag) {
                    const tagNameMatch = tag.match(/^<([a-zA-Z1-6]+)/);
                    if (tagNameMatch) {
                        const tagName = tagNameMatch[1].toLowerCase();
                        if (['div', 'iframe', 'details', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'hr', 'section', 'footer', 'header', 'nav', 'article', 'aside'].includes(tagName)) {
                            isBlock = true;
                        }
                    }
                }
            }
        }
        
        html += line;
        if (!isBlock && i < processedLines.length - 1) {
            html += '<br>';
        }
    }

    // 3. Restore HTML tags
    placeholders.forEach((tag, i) => {
        html = html.replace(`__PH_${i}__`, tag);
    });

    return html;
}

function _saveCursor(el) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);

    // Check if the cursor is actually inside our element
    if (!el.contains(range.startContainer)) return null;

    const preRange = range.cloneRange();
    preRange.selectNodeContents(el);
    preRange.setEnd(range.startContainer, range.startOffset);
    return _serializeNodeText(preRange.cloneContents()).length;
}

function _restoreCursor(el, offset) {
    if (offset === null || offset === undefined) return;
    if (document.activeElement !== el) return;

    const sel = window.getSelection();
    const range = document.createRange();
    let charCount = 0;
    let restored = false;
    const totalLen = _getSourceValue(el).length;
    if (offset > totalLen) offset = totalLen;

    const visit = (node) => {
        if (restored) return;
        if (node.nodeType === 3) {
            const nextCharCount = charCount + node.textContent.length;
            if (offset >= charCount && offset <= nextCharCount) {
                range.setStart(node, offset - charCount);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                restored = true;
                return;
            }
            charCount = nextCharCount;
            return;
        }

        if (node.nodeType !== 1) return;

        if (node.tagName === 'BR') {
            if (charCount === offset) {
                range.setStartBefore(node);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                restored = true;
                return;
            }
            charCount += 1;
            return;
        }

        if (node.classList && (node.classList.contains('nexus-color-decorator') || node.classList.contains('nexus-ghost-syntax'))) {
            const token = _serializeNodeText(node);
            const nextCharCount = charCount + token.length;
            if (offset <= nextCharCount) {
                if (offset - charCount > token.length / 2) {
                    range.setStartAfter(node);
                } else {
                    range.setStartBefore(node);
                }
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                restored = true;
                return;
            }
            charCount = nextCharCount;
            return;
        }

        for (let child of node.childNodes) visit(child);
    };

    for (let child of el.childNodes) visit(child);

    if (!restored) {
        range.selectNodeContents(el);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

function _isRangeSelectingEntireElement(range, element) {
    if (!range || !element) return false;
    const elementRange = document.createRange();
    elementRange.selectNodeContents(element);
    
    const startCompare = range.compareBoundaryPoints(Range.START_TO_START, elementRange);
    const endCompare = range.compareBoundaryPoints(Range.END_TO_END, elementRange);
    
    return startCompare <= 0 && endCompare >= 0;
}

function _setSelectionOffsets(el, startOffset, endOffset) {
    if (startOffset === null || startOffset === undefined) return;
    if (endOffset === null || endOffset === undefined) return;
    
    el.focus();

    const sel = window.getSelection();
    const range = document.createRange();
    
    let charCount = 0;
    let startNode = null;
    let startNodeOffset = 0;
    let endNode = null;
    let endNodeOffset = 0;

    const walk = (node) => {
        if (node.nodeType === 3) {
            const len = node.textContent.length;
            if (startNode === null && startOffset >= charCount && startOffset <= charCount + len) {
                startNode = node;
                startNodeOffset = startOffset - charCount;
            }
            if (endNode === null && endOffset >= charCount && endOffset <= charCount + len) {
                endNode = node;
                endNodeOffset = endOffset - charCount;
            }
            charCount += len;
            return;
        }

        if (node.nodeType === 1) {
            if (node.tagName === 'BR') {
                if (startNode === null && startOffset === charCount) {
                    startNode = node;
                    startNodeOffset = 0;
                }
                if (endNode === null && endOffset === charCount) {
                    endNode = node;
                    endNodeOffset = 0;
                }
                charCount += 1;
                return;
            }
            
            if (node.classList && (node.classList.contains('nexus-color-decorator') || node.classList.contains('nexus-ghost-syntax'))) {
                const tokenLen = _serializeNodeText(node).length;
                if (startNode === null && startOffset >= charCount && startOffset <= charCount + tokenLen) {
                    startNode = node;
                    startNodeOffset = startOffset - charCount > tokenLen / 2 ? 1 : 0;
                }
                if (endNode === null && endOffset >= charCount && endOffset <= charCount + tokenLen) {
                    endNode = node;
                    endNodeOffset = endOffset - charCount > tokenLen / 2 ? 1 : 0;
                }
                charCount += tokenLen;
                return;
            }

            for (let child of node.childNodes) {
                walk(child);
            }
        }
    };

    walk(el);

    if (startNode && endNode) {
        if (startNode.nodeType === 3) {
            range.setStart(startNode, startNodeOffset);
        } else if (startNode.tagName === 'BR') {
            range.setStartBefore(startNode);
        } else {
            if (startNodeOffset === 1) range.setStartAfter(startNode);
            else range.setStartBefore(startNode);
        }

        if (endNode.nodeType === 3) {
            range.setEnd(endNode, endNodeOffset);
        } else if (endNode.tagName === 'BR') {
            range.setEndBefore(endNode);
        } else {
            if (endNodeOffset === 1) range.setEndAfter(endNode);
            else range.setEndBefore(endNode);
        }

        sel.removeAllRanges();
        sel.addRange(range);
        window.lastSavedSelectionRange = range.cloneRange();
    }
}

function _createColorDecorator(token, el, sourceStart, sourceEnd) {
    const decorator = document.createElement('span');
    decorator.className = 'nexus-color-decorator';
    decorator.contentEditable = 'false';
    decorator.dataset.color = token;
    decorator.dataset.sourceStart = sourceStart;
    decorator.dataset.sourceEnd = sourceEnd;
    decorator.innerHTML = `<span class="nexus-color-swatch" style="background:${token}"></span><span class="nexus-color-text">${token}</span>`;

    decorator.querySelector('.nexus-color-swatch').addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
        const swatchEl = decorator.querySelector('.nexus-color-swatch');
        el._colorPickerOpen = true;
        el._toolLock = true;
        let activeSourceStart = sourceStart;
        let activeSourceEnd = sourceEnd;
        window.NexusColorPicker.open(swatchEl, token, (newHex) => {
            const currentSource = _getSourceValue(el);
            el._sourceValue = currentSource.slice(0, activeSourceStart) + newHex + currentSource.slice(activeSourceEnd);
            activeSourceEnd = activeSourceStart + newHex.length;
            _commitSourceValue(el);
            _scanAndDecorateColors(el, { force: true, preserveCursor: false });
        }, () => {
            el._colorPickerOpen = false;
            el._pendingPickerBlur = false;
            el._toolLock = false;
            if (el.isConnected && el.classList.contains('source-editing')) {
                el.focus({ preventScroll: true });
                _scanAndDecorateColors(el, { force: true, preserveCursor: false });
            }
        });
    });
    return decorator;
}

function _scanAndDecorateColors(el, options = {}) {
    // 1. Fast Guard: Don't do anything if we don't have focus or text is unchanged
    if (!options.force && document.activeElement !== el) return;
    if (el._isComposing) return;
    const fullText = _getSourceValue(el);
    if (el._lastDecoratedText === fullText) return;
    el._lastDecoratedText = fullText;

    // 2. Capture precise cursor position JUST before we destroy the DOM
    const cursorOffset = options.preserveCursor === false ? null : _saveCursor(el);
    const frag = document.createDocumentFragment();

    // Combined regex for colors and syntax
    // We use a manual loop to find the nearest match among multiple regexes
    let lastIdx = 0;
    const combinedRegex = new RegExp(`(${COLOR_REGEX.source})|(${SYNTAX_REGEX.source})`, 'gi');
    let match;

    while (match = combinedRegex.exec(fullText)) {
        // Text before the match
        frag.appendChild(document.createTextNode(fullText.substring(lastIdx, match.index)));

        const token = match[0];

        // Is it a color?
        const isColor = new RegExp(`^(${COLOR_REGEX.source})$`, 'i').test(token);

        if (isColor) {
            frag.appendChild(_createColorDecorator(token, el, match.index, combinedRegex.lastIndex));
        } else {
            // It's syntax (Markdown or HTML)
            // Check if this syntax token (like an HTML tag) contains a color inside it
            COLOR_REGEX.lastIndex = 0;
            if (COLOR_REGEX.test(token)) {
                let subIdx = 0;
                let subMatch;
                COLOR_REGEX.lastIndex = 0;
                while (subMatch = COLOR_REGEX.exec(token)) {
                    // Ghost text before sub-color
                    if (subMatch.index > subIdx) {
                        const ghost = document.createElement('span');
                        ghost.className = 'nexus-ghost-syntax';
                        ghost.innerText = token.substring(subIdx, subMatch.index);
                        frag.appendChild(ghost);
                    }

                    // The color itself
                    frag.appendChild(_createColorDecorator(subMatch[0], el, match.index + subMatch.index, match.index + COLOR_REGEX.lastIndex));
                    subIdx = COLOR_REGEX.lastIndex;
                }
                // Trailing ghost text
                if (subIdx < token.length) {
                    const ghost = document.createElement('span');
                    ghost.className = 'nexus-ghost-syntax';
                    ghost.innerText = token.substring(subIdx);
                    frag.appendChild(ghost);
                }
            } else {
                const ghost = document.createElement('span');
                ghost.className = 'nexus-ghost-syntax';
                ghost.innerText = token;
                frag.appendChild(ghost);
            }
        }

        lastIdx = combinedRegex.lastIndex;
    }

    frag.appendChild(document.createTextNode(fullText.substring(lastIdx)));

    el.innerHTML = '';
    el.appendChild(frag);

    if (document.activeElement === el) {
        _restoreCursor(el, cursorOffset);
    }
}

function _serializeDecorated(el) {
    // Reconstructs the raw source text from the decorated DOM in source-editing mode.
    // Rules:
    //   - Text nodes → their text content verbatim (including spaces)
    //   - BR → newline
    //   - nexus-color-decorator → dataset.color (the raw color token, e.g. "#ff0000")
    //   - nexus-ghost-syntax → textContent (the raw HTML syntax characters)
    //   - Block elements (DIV, P, etc.) → wrap with newlines
    let text = "";
    const walk = (node) => {
        if (node.nodeType === 3) {
            text += node.textContent;
        } else if (node.tagName === 'BR') {
            text += "\n";
        } else if (node.classList && node.classList.contains('nexus-color-decorator')) {
            text += node.dataset.color || '';
        } else if (node.classList && node.classList.contains('nexus-ghost-syntax')) {
            text += node.textContent || '';
        } else {
            const isBlock = ['DIV', 'P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.tagName);
            const needsLeadingNewline = isBlock && text.length > 0 && !text.endsWith('\n');
            if (needsLeadingNewline) text += "\n";

            for (let child of node.childNodes) {
                walk(child);
            }

            if (isBlock && !text.endsWith('\n')) text += "\n";
        }
    };
    walk(el);
    // Strip ZWS cursor artefacts. Do NOT call .trim() — it destroys leading/trailing
    // spaces and newlines that are part of the raw HTML source structure.
    const result = text.replace(/\u200B/g, '');
    return result.endsWith('\n') ? result.slice(0, -1) : result;
}

function _escapeAttr(value) {
    return String(value).replace(/"/g, '&quot;');
}

function _serializeRichContent(el) {
    const serialize = (node) => {
        if (node.nodeType === 3) {
            return node.textContent.replace(/\u200B/g, '');
        }
        if (node.nodeType !== 1) return '';

        // Preserve custom components and iframes as raw HTML
        if (node.tagName === 'IFRAME' || (node.classList && Array.from(node.classList).some(c => c.includes('vn-')))) {
            return node.outerHTML;
        }

        const tag = node.tagName;
        if (tag === 'BR') return '\n';
        if (node.classList.contains('nexus-color-decorator')) return node.dataset.color || '';
        if (node.classList.contains('nexus-ghost-syntax')) return node.textContent || '';

        const inner = Array.from(node.childNodes).map(serialize).join('');

        if (tag === 'STRONG' || tag === 'B') return `**${inner}**`;
        if (tag === 'EM' || tag === 'I') return `*${inner}*`;
        if (tag === 'IMG') {
            const src = node.getAttribute('src') || '';
            const alt = node.getAttribute('alt') || '';
            return `![${alt}](${src})`;
        }
        if (tag === 'A') {
            const href = node.getAttribute('href') || '';
            return href ? `[${inner}](${href})` : inner;
        }
        if (/^H[1-6]$/.test(tag)) return `${'#'.repeat(Number(tag[1]))} ${inner}\n`;
        if (tag === 'LI') return `- ${inner}\n`;
        if (tag === 'BLOCKQUOTE') return `> ${inner}\n`;
        if (tag === 'HR') return '---\n';

        if (tag === 'SPAN') {
            const style = node.getAttribute('style');
            const classes = Array.from(node.classList).join(' ');
            const dataText = node.getAttribute('data-text') ? ` data-text="${_escapeAttr(node.getAttribute('data-text'))}"` : '';
            
            let attrs = '';
            if (style) attrs += ` style="${_escapeAttr(style)}"`;
            if (classes) attrs += ` class="${classes}"`;
            if (dataText) attrs += dataText;
            
            if (attrs && inner === '') {
                return `<span${attrs}> </span>`;
            }
            
            return attrs ? `<span${attrs}>${inner}</span>` : inner;
        }

        if (['DIV', 'P'].includes(tag)) {
            return `${inner}${inner.endsWith('\n') ? '' : '\n'}`;
        }

        return inner;
    };

    const raw = Array.from(el.childNodes).map(serialize).join('');
    return raw.endsWith('\n') ? raw.slice(0, -1) : raw;
}

function _finishSourceEdit(el) {
    const idx = _getItemIndexFromEditable(el);
    if (idx === -1 || !canvasItems[idx]) return;

    canvasItems[idx] = updateModularProperty(canvasItems[idx], 'dialogue-text', _getSourceValue(el));
    const flatItem = modularToFlat(canvasItems[idx]);
    el.innerHTML = parseMarkdown(flatItem['dialogue-text']);
    el.classList.remove('editing-mode', 'source-editing');
    
    const activeCanvasItem = document.querySelector('.canvas-item.active-edit');
    if (activeCanvasItem) {
        const canvasContent = activeCanvasItem.querySelector('.vn-dialogue-content');
        if (canvasContent) {
            canvasContent.innerHTML = parseMarkdown(flatItem['dialogue-text']);
        }
        activeCanvasItem.classList.remove('active-edit');
    }
    
    const header = document.getElementById('dialogue-editor-header');
    if (header) {
        header.classList.remove('focus-mode');
        header.style.display = 'none';
        document.body.appendChild(header);
    }

    const overlay = document.getElementById('dialogue-focus-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
    
    el._sourceValue = null;
    el._lastDecoratedText = null;
    el._toolLock = false;
    el._colorPickerOpen = false;
    el._pendingPickerBlur = false;
    
    saveToCache();
    updateCodeView();
    recordHistory();
}

function triggerSaveDialogue() {
    const el = getActiveDialogueEditable();
    if (el) {
        _finishSourceEdit(el);
    }
}

function saveActiveDialogueIfEditing() {
    const el = getActiveDialogueEditable();
    if (el) {
        _finishSourceEdit(el);
    }
}

function _maybeFinishSourceEdit(el) {
    if (el._toolLock || el._colorPickerOpen) {
        el._pendingPickerBlur = true;
        return;
    }
    // Use a small timeout to allow activeElement to stabilize
    setTimeout(() => {
        if (!el.isConnected || !el.classList.contains('editing-mode')) return;
        if (el._toolLock || el._colorPickerOpen) {
            el._pendingPickerBlur = true;
            return;
        }
        
        const active = document.activeElement;
        const toolbar = document.getElementById('rich-text-toolbar');
        const picker = document.getElementById('nexus-color-picker');
        
        // Robust check for focus targets
        const isFocusOnToolbar = toolbar && (toolbar === active || toolbar.contains(active));
        const isFocusOnPicker = picker && (picker === active || picker.contains(active) || active.closest('.nexus-color-picker'));
        const isFocusOnSwatch = active && active.classList.contains('nexus-color-swatch');

        if (active === el) return;
        if (isFocusOnToolbar || isFocusOnPicker || isFocusOnSwatch || (active && active.closest('.modal-overlay'))) return;
        
        // If we reach here, we are truly blurring away from editing
        if (toolbar && toolbar.parentElement !== document.body) {
            toolbar.style.display = 'none';
            document.body.appendChild(toolbar);
        }
        _finishSourceEdit(el);
    }, 100);
}

function closeModal() {
    document.getElementById('config-modal').style.display = 'none';
    editingIndex = -1;
}

function openComponentGallery(category) {
    const list = COMPONENT_CATEGORIES[category] || [];
    const grid = document.getElementById('gallery-cards-grid');
    const title = document.getElementById('gallery-modal-title');
    const desc = document.getElementById('gallery-modal-desc');
    
    if (!grid) return;
    
    title.innerText = `${category.toUpperCase()} COMPONENTS`;
    desc.innerText = `Select a ${category} style component to customize and add to your canvas.`;
    
    grid.innerHTML = '';
    list.forEach(comp => {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.onclick = () => {
            closeGalleryModal();
            openComponentModal(comp.type);
        };
        card.innerHTML = `
            <i class="bi ${comp.icon}"></i>
            <span>${comp.name}</span>
            <small>${comp.desc}</small>
        `;
        grid.appendChild(card);
    });
    
    document.getElementById('gallery-modal').style.display = 'flex';
}

function closeGalleryModal() {
    document.getElementById('gallery-modal').style.display = 'none';
}

function extractYoutubeId(url) {
    if (!url || typeof url !== 'string') return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length == 11) ? match[2] : null;
}

function saveComponent() {
    const itemData = { 
        type: currentType, 
        id: (editingIndex !== -1 && canvasItems[editingIndex].id) ? canvasItems[editingIndex].id : Date.now() 
    };

    if (currentType === 'character') {
        itemData['bg-url'] = document.getElementById('bg-url').value;
        itemData.characters = [];
        const rows = document.querySelectorAll('.char-row');
        rows.forEach(row => {
            itemData.characters.push({
                name: row.querySelector('.char-name').value,
                sprite: row.querySelector('.char-sprite').value
            });
        });
    } else if (currentType === 'card-imessage') {
        itemData.characters = [];
        const charRows = document.querySelectorAll('.imessage-char-row');
        charRows.forEach(row => {
            const charId = row.getAttribute('data-char-id');
            itemData.characters.push({
                id: charId,
                name: row.querySelector('.imessage-char-name').value,
                avatar: row.querySelector('.imessage-char-avatar').value,
                side: row.querySelector('.imessage-char-side').value
            });
        });

        itemData.messages = [];
        const msgRows = document.querySelectorAll('.imessage-msg-row');
        msgRows.forEach(row => {
            itemData.messages.push({
                charId: row.querySelector('.imessage-msg-char-select').value,
                text: row.querySelector('.imessage-msg-text').value
            });
        });

        itemData.mode = document.getElementById('imessage-mode').value;
        itemData['imessage-bg'] = document.getElementById('imessage-bg').value;
        itemData['imessage-font'] = document.getElementById('imessage-font').value;
        itemData['imessage-bg-color'] = document.getElementById('imessage-bg-color').value;
        itemData['imessage-incoming-bg'] = document.getElementById('imessage-incoming-bg').value;
        itemData['imessage-incoming-text'] = document.getElementById('imessage-incoming-text').value;
        itemData['imessage-outgoing-bg'] = document.getElementById('imessage-outgoing-bg').value;
        itemData['imessage-outgoing-text'] = document.getElementById('imessage-outgoing-text').value;
    } else {
        const fields = FORM_TEMPLATES[currentType];
        if (fields) {
            fields.forEach(field => {
                itemData[field.id] = document.getElementById(field.id).value;
            });
        }
    }

    if (currentType === 'music') {
        const ytId = extractYoutubeId(itemData['yt-url']);
        if (!ytId) {
            alert('Invalid YouTube URL');
            return;
        }
        itemData.ytId = ytId;
    }

    const modularItem = flatToModular(itemData);

    if (editingIndex !== -1) {
        canvasItems[editingIndex] = modularItem;
        editingIndex = -1;
    } else {
        canvasItems.push(modularItem);
    }
    renderCanvas();
    updateCodeView();
    saveToCache();
    recordHistory();
    closeModal();
}

function renderCanvas() {
    const canvas = document.getElementById('canvas-live');
    const emptyState = document.getElementById('empty-state');

    // Clear current canvas (except empty state)
    const items = canvas.querySelectorAll('.canvas-item');
    const header = document.getElementById('dialogue-editor-header');
    if (header && header.parentElement !== document.body) {
        header.style.display = 'none';
        document.body.appendChild(header);
    }
    const toolbar = document.getElementById('rich-text-toolbar');
    if (toolbar && header && toolbar.parentElement !== header) {
        toolbar.style.display = 'none';
        header.appendChild(toolbar);
    }
    items.forEach(i => i.remove());

    if (canvasItems.length > 0) {
        emptyState.style.display = 'none';
    } else {
        emptyState.style.display = 'block';
    }

    canvasItems.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'canvas-item';
        
        const editBtn = `<button class="control-btn edit" onclick="editComponent(${index})"><i class="bi bi-pencil"></i></button>`;

        el.innerHTML = `<div class="item-label">${item.type.replace('-', ' ')}</div><div class="item-controls">${editBtn}<button class="control-btn" onclick="moveItem(${index}, -1)"><i class="bi bi-chevron-up"></i></button><button class="control-btn" onclick="moveItem(${index}, 1)"><i class="bi bi-chevron-down"></i></button><button class="control-btn delete" onclick="removeItem(${index})"><i class="bi bi-trash"></i></button></div><div class="item-preview">${getPreviewHTML(item)}</div>`;

        // Enable Focus Mode editing for dialogue
        if (item.type === 'dialogue') {
            const content = el.querySelector('.vn-dialogue-content');
            if (content) {
                content.contentEditable = false;
                content.style.cursor = 'pointer';
                content.title = "Click to edit dialogue in Focus Mode";
                content.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openDialogueFocusEditor(index);
                });
            }
        }

        canvas.appendChild(el);

        // Handle editable regions inside card template
        if (item.type === 'card-template') {
            el.querySelectorAll('.vn-card-template-edit').forEach(editable => {
                editable.addEventListener('blur', () => {
                    const idx = index;
                    const field = editable.getAttribute('data-field');
                    const val = editable.innerText;
                    
                    if (canvasItems[idx]) {
                        canvasItems[idx].content[field] = val;
                        recordHistory();
                        renderLivePreview();
                    }
                });
            });
        }

        if (item.type === 'card-bladerunner') {
            el.querySelectorAll('.vn-bladerunner-edit').forEach(editable => {
                editable.addEventListener('blur', () => {
                    const idx = index;
                    const field = editable.getAttribute('data-field');
                    const val = editable.innerText;
                    
                    if (canvasItems[idx]) {
                        canvasItems[idx].content[field] = val;
                        recordHistory();
                        renderLivePreview();
                    }
                });
            });
        }

        if (item.type === 'card-imessage') {
            el.querySelectorAll('.vn-imessage-edit').forEach(editable => {
                editable.addEventListener('blur', () => {
                    const idx = index;
                    const field = editable.getAttribute('data-field');
                    const val = editable.innerText;
                    
                    if (canvasItems[idx]) {
                        canvasItems[idx].content[field] = val;
                        recordHistory();
                        renderLivePreview();
                    }
                });
            });
        }
        if (item.type === 'card-steampunk') {
            el.querySelectorAll('.vn-steampunk-edit').forEach(editable => {
                editable.addEventListener('blur', () => {
                    const idx = index;
                    const val = editable.innerText;
                    if (canvasItems[idx]) {
                        canvasItems[idx].content.steampunkText = val;
                        recordHistory();
                        renderLivePreview();
                    }
                });
            });
        }
    });

    if (typeof window.initCards === 'function') {
        window.initCards();
    }
}

function getPreviewHTML(item) {
    item = modularToFlat(item);
    const themeColor = getThemePrimaryHex();
    const design = item['design'] || 'default';

    switch(item.type) {
        case 'image':
            if (!item['image-url']) {
                return `<div class="vn-image-wrapper vn-image-style-${design}" style="height: 180px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); border: 2px dashed var(--accent); color: var(--accent); font-family: monospace; font-size: 11px; font-weight: bold; flex-direction: column; gap: 8px; width: 100%;">
                    <i class="bi bi-image" style="font-size: 24px;"></i>
                    <span>NO IMAGE URL SPECIFIED</span>
                </div>`;
            }
            const imgAlign = item['alignment'] || 'full';
            if (imgAlign === 'full') {
                return `<div class="vn-image-wrapper vn-image-style-${design}"><img src="${item['image-url']}"></div>`;
            } else {
                const justifyVal = imgAlign === 'center' ? 'center' : (imgAlign === 'left' ? 'flex-start' : 'flex-end');
                const wVal = item['image-width'] || 'auto';
                const hVal = item['image-height'] || 'auto';
                return `
                    <div style="display: flex; justify-content: ${justifyVal}; width: 100%; margin: 10px 0;">
                        <div class="vn-image-wrapper vn-image-style-${design}" style="width: ${wVal}; height: ${hVal}; max-width: 100%; display: block; position: relative;">
                            <img src="${item['image-url']}" style="width: 100%; height: ${hVal === 'auto' ? 'auto' : '100%'}; object-fit: cover;">
                        </div>
                    </div>
                `;
            }
        case 'gif-heading':
            const headingText = item['text'] || 'JOYLAND';
            const gifUrl = item['gif-url'] || 'https://joylandimages.neocities.org/JOYLAND/GREETING/gifs/sky1.gif';
            const strokeColor = item['stroke-color'];
            const strokeStyle = strokeColor ? `-webkit-text-stroke: 1px ${strokeColor};` : '';
            const fontSize = item['font-size'] || '5em';
            const fontFamily = item['font-family'] || 'Bebas Neue';
            return `<div class="vn-gif-heading" style="text-align: center; font-size: ${fontSize}; font-family: '${fontFamily}', sans-serif; background-image: url('${gifUrl}'); background-size: cover; -webkit-background-clip: text; -webkit-text-fill-color: transparent; ${strokeStyle} margin: 1rem 0; line-height: 1.2;">${headingText}</div>`;
        case 'music':
            const musicHeight = design === 'deck' ? 120 : 75;
            const previewVol = item.volume !== undefined ? item.volume : 100;
            const previewAp = item.autoplay !== false ? 1 : 0;
            const previewTheme = item.theme || 'nasapunk';
            return `
                <div class="vn-music-wrapper vn-music-style-${design}">
                    <iframe allow="autoplay; encrypted-media" src="https://minimumlogix.github.io/VN_Engine/apps/music/mw?v=${item.ytId}&c=${themeColor}&ap=${previewAp}&vol=${previewVol}&theme=${previewTheme}" style="width:100%;height:${musicHeight}px;border:none"></iframe>
                </div>`;
        case 'character':
            let charHtml = `<div class="vn-character-container vn-char-style-${design}" style="background-image:url(${item['bg-url']})">`;
            (item.characters || []).forEach(char => {
                charHtml += `
                    <div class="vn-character-group">
                        <div class="vn-character-name">${char.name}</div>
                        <div class="vn-sprite-frame">
                            <img alt="${char.name}" class="speaking vn-character" src="${char.sprite}">
                        </div>
                    </div>`;
            });
            charHtml += `</div>`;
            return charHtml;
        case 'vn-iframe':
            return `
                <div class="vn-iframe-wrapper vn-iframe-style-${design}">
                    <iframe allow="autoplay; encrypted-media" src="https://minimumlogix.github.io/VN_Engine?story=${item['story-id']}" style="width:100%;height:${item['iframe-height']}px;border:none"></iframe>
                    ${design === 'console' ? '<div class="vn-console-bezel-led"></div>' : ''}
                </div>`;
        case 'dialogue':
            return `<div class="vn-dialogue-box vn-dialogue-style-${design}"><div class="vn-dialogue-content">${parseMarkdown(item['dialogue-text'])}</div></div>`;
        case 'lore':
            const loreLink = item['lore-link'] || '';
            const loreText = item['lore-text'] || '';
            const isUrl = /^(https?:\/\/|\/|\.\/|\.\.\/)/i.test(loreLink);
            const src = isUrl ? loreLink : `https://minimumlogix.github.io/VN_Engine/apps/lore?world=${loreLink}`;
            
            let contentHtml = '';
            if (loreLink) {
                contentHtml = `<iframe allow="autoplay; encrypted-media" src="${src}" style="width:100%;height:${item['lore-height']}px;border:none;border-radius: 5px;"></iframe>`;
            } else if (loreText) {
                contentHtml = `<div class="vn-lore-text-inner" style="color:var(--text-color);line-height:1.75;font-size:1.05rem;">${parseMarkdown(loreText)}</div>`;
            } else {
                contentHtml = `<div style="text-align:center;opacity:0.5;padding:20px;">Edit to set a Lore Link or paste Lore text.</div>`;
            }

            const isOpen = item['lore-open'] === 'true' ? ' open' : '';
            return `
                <details class="vn-lore-details vn-lore-style-${design}"${isOpen}>
                    <summary class="vn-lore-summary">
                        <span>Lore Database</span>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            ${loreLink ? `<a href="${src}" target="_blank" class="vn-lore-external-link" onclick="event.stopPropagation();" title="Open in new window"><i class="bi bi-box-arrow-up-right" style="font-size: 14px; display: inline-block; vertical-align: middle;"></i></a>` : ''}
                            <svg class="vn-lore-icon" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" /></svg>
                        </div>
                    </summary>
                    <div class="vn-lore-content">
                        ${contentHtml}
                    </div>
                </details>`;
        case 'custom-html':
            const customHtmlPreview = item['html-content'] || '<div style="text-align:center;opacity:0.5;padding:20px;">Custom HTML Block (Empty)</div>';
            return `<div class="vn-custom-html-block">${customHtmlPreview}</div>`;
        case 'custom-iframe':
            const customIframeUrl = item['iframe-url'] || '';
            const customIframeHeight = item['iframe-height'] || 450;
            const customIframeParamsText = item['iframe-params'] || '';
            const heightMode = item['iframe-height-mode'] || 'fixed';
            
            let finalIframeUrl = customIframeUrl;
            const iframeParams = [];
            customIframeParamsText.split('\n').forEach(line => {
                const parts = line.split('=');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    const val = parts.slice(1).join('=').trim();
                    if (key) {
                        iframeParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
                    }
                }
            });
            if (iframeParams.length > 0) {
                const separator = finalIframeUrl.includes('?') ? '&' : '?';
                let queryStr = iframeParams.join('&');
                queryStr = queryStr.replace(/%7B%7B/g, '{{').replace(/%7D%7D/g, '}}');
                finalIframeUrl += separator + queryStr;
            }
            
            const heightStyle = heightMode === 'full' 
                ? `width:100%;height:100vh;border:none` 
                : `width:100%;height:${customIframeHeight}px;border:none`;
            const onloadAttr = heightMode === 'full'
                ? ` onload="try { this.style.height = this.contentWindow.document.body.scrollHeight + 'px'; } catch (e) { this.style.height = '100vh'; }"`
                : '';
                
            return `
                <div class="vn-custom-iframe-wrapper vn-custom-iframe-style-${design}${heightMode === 'full' ? ' vn-custom-iframe-full' : ''}">
                    <iframe allow="autoplay; encrypted-media" src="${finalIframeUrl}" style="${heightStyle}"${onloadAttr}></iframe>
                </div>`;
        case 'sfx':
            const sfxUrl = item['sfx-url'] || '';
            const sfxTitle = item.text || 'Transmission #09';
            const sfxTranscript = item['sfx-transcript'] || '';
            const sfxDesign = item.design || 'touch';

            let sfxHtml = `<div class="vn-sfx-card vn-sfx-${sfxDesign}" data-url="${sfxUrl}" data-title="${sfxTitle}" data-transcript="${encodeURIComponent(sfxTranscript)}">`;
            if (sfxDesign === 'touch') {
                sfxHtml += `
                    <div class="vn-sfx-touch-content">
                        <div class="vn-sfx-icon">🔊</div>
                        <div class="vn-sfx-details">
                            <span class="vn-sfx-card-title">${sfxTitle}</span>
                            <span class="vn-sfx-card-subtitle">TAP TO PLAY TRANSMISSION</span>
                        </div>
                    </div>
                `;
            } else {
                sfxHtml += `
                    <div class="vn-sfx-transcript-content">
                        <button class="vn-sfx-play-btn">▶</button>
                        <div class="vn-sfx-waveform">
                            <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
                        </div>
                        <div class="vn-sfx-transcript-body">
                            <div class="vn-sfx-transcript-title">${sfxTitle}</div>
                            <div class="vn-sfx-transcript-text" style="font-family: 'Share Tech Mono', monospace; font-size: 13px;">${sfxTranscript}</div>
                        </div>
                    </div>
                `;
            }
            sfxHtml += `</div>`;
            return sfxHtml;
        case 'card-steampunk':
            const spTitle = item['steampunk-title'] || 'CLASSIFIED VAULT';
            const spText = item['steampunk-text'] || '';
            const spCode = item['steampunk-code'] || '394';
            const spDesign = item.design || 'brass';

            return `
                <div class="vn-steampunk-card-wrapper">
                    <div class="vn-steampunk-card vn-steampunk-${spDesign}" data-code="${spCode}" style="font-family: Georgia, serif;">
                        <div class="vn-steampunk-vault-door">
                            <div class="vn-steampunk-header">${spTitle}</div>
                            
                            <div class="vn-steampunk-gears-assembly">
                                <div class="vn-steampunk-gear gear-left">⚙️</div>
                                <div class="vn-steampunk-gear gear-right">⚙️</div>
                            </div>

                            <div class="vn-steampunk-dials-container">
                                <div class="vn-steampunk-dial-wrapper">
                                    <button class="vn-steampunk-dial-btn up" data-dial="0">▲</button>
                                    <span class="vn-steampunk-dial dial-0">0</span>
                                    <button class="vn-steampunk-dial-btn down" data-dial="0">▼</button>
                                </div>
                                <div class="vn-steampunk-dial-wrapper">
                                    <button class="vn-steampunk-dial-btn up" data-dial="1">▲</button>
                                    <span class="vn-steampunk-dial dial-1">0</span>
                                    <button class="vn-steampunk-dial-btn down" data-dial="1">▼</button>
                                </div>
                                <div class="vn-steampunk-dial-wrapper">
                                    <button class="vn-steampunk-dial-btn up" data-dial="2">▲</button>
                                    <span class="vn-steampunk-dial dial-2">0</span>
                                    <button class="vn-steampunk-dial-btn down" data-dial="2">▼</button>
                                </div>
                            </div>

                            <div class="vn-steampunk-status">VAULT LOCKED</div>
                        </div>
                        <div class="vn-steampunk-parchment-content">
                            <div class="vn-steampunk-parchment-inner">
                                <p class="vn-steampunk-edit" contenteditable="true" style="outline: none;">${spText}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        case 'link':
            return `
                <div style="display: flex; justify-content: center; width: 100%; margin: 10px 0;">
                    <div class="vn-link-block vn-link-style-${design}">
                        <a href="${item['link-url'] || '#'}" target="${item.target || '_blank'}" style="text-decoration: none; color: inherit; display: inline-flex; align-items: center; gap: 6px;">
                            <span>🔗 ${item.text || 'Visit Site'}</span>
                        </a>
                    </div>
                </div>
            `;
        case 'quote':
            const quoteAuthor = item.author ? `<cite style="display: block; text-align: right; margin-top: 8px; font-style: normal; font-size: 0.9em; opacity: 0.7;">— ${item.author}</cite>` : '';
            return `
                <blockquote class="vn-quote vn-quote-style-${design}">
                    <p style="margin: 0; font-style: italic;">"${item.text || ''}"</p>
                    ${quoteAuthor}
                </blockquote>
            `;
        case 'card':
            return `
                <div class="vn-card vn-card-style-${design}">
                    ${item.title ? `<div class="vn-card-title">${item.title}</div>` : ''}
                    <div class="vn-card-content">${parseMarkdown(item.text || '')}</div>
                </div>
            `;
        case 'terminal':
            return `
                <div class="vn-terminal vn-terminal-style-${design}">
                    <div class="vn-terminal-body">
                        <pre><code class="vn-terminal-code">${item.text || ''}</code></pre>
                    </div>
                </div>
            `;
        case 'card-template':
            const cardTemplate = item.template || DEFAULT_CARD_TEMPLATE;
            let previewHtml = cardTemplate;
            
            // Replace template placeholders with contenteditable wrapper elements for live-editing
            previewHtml = previewHtml.replace('{{title}}', `<span class="vn-card-template-edit" data-field="title" contenteditable="true" style="outline: none; display: inline-block; min-width: 50px;">${item.title || ''}</span>`);
            previewHtml = previewHtml.replace('{{content}}', `<div class="vn-card-template-edit" data-field="text" contenteditable="true" style="outline: none; min-width: 100px;">${parseMarkdown(item.text || '')}</div>`);
            previewHtml = previewHtml.replace('{{sigLabel}}', `<span class="vn-card-template-edit" data-field="sigLabel" contenteditable="true" style="outline: none; display: inline-block; min-width: 30px;">${item.sigLabel || ''}</span>`);
            previewHtml = previewHtml.replace('{{sigName}}', `<span class="vn-card-template-edit" data-field="sigName" contenteditable="true" style="outline: none; display: inline-block; min-width: 30px;">${item.sigName || ''}</span>`);
            previewHtml = previewHtml.replace('{{stamp}}', `<span class="vn-card-template-edit" data-field="stamp" contenteditable="true" style="outline: none; display: inline-block; min-width: 15px;">${item.stamp || ''}</span>`);
            
            return `<div class="vn-card-template-wrapper">${previewHtml}</div>`;
            
        case 'card-bladerunner':
            let brHtml = DEFAULT_BLADERUNNER_TEMPLATE;
            
            brHtml = brHtml.replace('{{headerLeft}}', `<span class="vn-bladerunner-edit" data-field="headerLeft" contenteditable="true" style="outline: none; display: inline-block; min-width: 40px;">${item.headerLeft || ''}</span>`);
            brHtml = brHtml.replace('{{headerRight}}', `<span class="vn-bladerunner-edit" data-field="headerRight" contenteditable="true" style="outline: none; display: inline-block; min-width: 40px;">${item.headerRight || ''}</span>`);
            brHtml = brHtml.replace('{{content}}', `<div class="vn-bladerunner-edit vn-bladerunner-typewriter" data-field="text" data-raw-text="${encodeURIComponent(parseMarkdown(item.text || ''))}" contenteditable="true" style="outline: none; min-width: 100px;">${parseMarkdown(item.text || '')}</div>`);
            brHtml = brHtml.replace('{{footerLeft}}', `<span class="vn-bladerunner-edit" data-field="footerLeft" contenteditable="true" style="outline: none; display: inline-block; min-width: 30px;">${item.footerLeft || ''}</span>`);
            brHtml = brHtml.replace('{{footerMiddle}}', `<span class="vn-bladerunner-edit" data-field="footerMiddle" contenteditable="true" style="outline: none; display: inline-block; min-width: 30px;">${item.footerMiddle || ''}</span>`);
            brHtml = brHtml.replace('{{footerRight}}', `<span class="vn-bladerunner-edit" data-field="footerRight" contenteditable="true" style="outline: none; display: inline-block; min-width: 30px;">${item.footerRight || ''}</span>`);
            brHtml = brHtml.replace('{{tokenLabel}}', `<span class="vn-bladerunner-edit" data-field="tokenLabel" contenteditable="true" style="outline: none; display: inline-block; min-width: 40px;">${item.tokenLabel || ''}</span>`);
            brHtml = brHtml.replace('{{tokenValue}}', `<span class="vn-bladerunner-edit" data-field="tokenValue" contenteditable="true" style="outline: none; display: inline-block; min-width: 40px; font-weight: bold;">${item.tokenValue || ''}</span>`);
            brHtml = brHtml.replace('{{endText}}', `<span class="vn-bladerunner-edit" data-field="endText" contenteditable="true" style="outline: none; display: inline-block; min-width: 50px;">${item.endText || ''}</span>`);
            
            return `<div class="vn-bladerunner-wrapper">${brHtml}</div>`;
            
        case 'card-imessage':
            const chars = item.characters || [];
            const msgs = item.messages || [];
            
            let cardStyle = '';
            if (item['imessage-font']) {
                cardStyle += `font-family: '${item['imessage-font']}', sans-serif;`;
            }
            if (item['imessage-bg']) {
                cardStyle += `background-image: url('${item['imessage-bg']}');`;
            } else if (item['imessage-bg-color']) {
                cardStyle += `--im-bg: ${item['imessage-bg-color']};`;
            }
            if (item['imessage-incoming-bg']) {
                cardStyle += `--im-incoming-bg: ${item['imessage-incoming-bg']};`;
            }
            if (item['imessage-incoming-text']) {
                cardStyle += `--im-incoming-text: ${item['imessage-incoming-text']};`;
            }
            if (item['imessage-outgoing-bg']) {
                cardStyle += `--im-outgoing-bg: ${item['imessage-outgoing-bg']};`;
            }
            if (item['imessage-outgoing-text']) {
                cardStyle += `--im-outgoing-text: ${item['imessage-outgoing-text']};`;
            }

            let imHtml = `<div class="vn-imessage-chat" data-mode="${item.mode || 'auto'}" style="${cardStyle}">`;
            imHtml += `<div class="conversation">`;
            
            msgs.forEach((msg, idx) => {
                const char = chars.find(c => c.id === msg.charId) || { name: 'Unknown', side: 'left', avatar: '' };
                const sideClass = char.side === 'right' ? 'right' : 'left';
                const bubbleClass = char.side === 'right' ? 'outgoing' : 'incoming';
                
                imHtml += `<div class="row ${sideClass} hidden-on-load">`;
                if (char.side !== 'right' && char.avatar) {
                    imHtml += `<img src="${char.avatar}" class="avatar">`;
                }
                imHtml += `<div>`;
                imHtml += `<div class="bubble ${bubbleClass} vn-imessage-edit" data-msg-idx="${idx}" contenteditable="true" style="outline: none;">${msg.text || ''}</div>`;
                if (char.name) {
                    if (char.side === 'right') {
                        imHtml += `<div class="meta">${char.name}</div>`;
                    } else {
                        imHtml += `<div class="meta" style="text-align: left; padding-left: 6px;">${char.name}</div>`;
                    }
                }
                imHtml += `</div>`;
                if (char.side === 'right' && char.avatar) {
                    imHtml += `<img src="${char.avatar}" class="avatar-right">`;
                }
                imHtml += `</div>`;
            });
            
            imHtml += `</div>`;
            imHtml += `</div>`;
            
            return `<div class="vn-imessage-chat-wrapper">${imHtml}</div>`;
            
        case 'scene-break':
            return `
                <div class="vn-scene-break vn-break-style-${design}">
                    <div class="vn-break-line"></div>
                    <div class="vn-break-text">${item.text || ''}</div>
                    <div class="vn-break-line"></div>
                </div>
            `;
        default:
            return '';
    }
}

function editMusicLink(index) {
    const item = modularToFlat(canvasItems[index]);
    const currentUrl = item['yt-url'] || `https://www.youtube.com/watch?v=${item.ytId}`;
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    
    overlay.innerHTML = `
        <div class="modal-content" style="width: 500px;">
            <div class="modal-header">
                <h2>UPDATE MUSIC LINK</h2>
                <p>Enter the new YouTube URL for this track.</p>
            </div>
            <div class="form-group">
                <label>YouTube URL</label>
                <input type="text" id="edit-music-url" value="${currentUrl}" style="width: 100%; box-sizing: border-box;">
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button id="save-music-btn" class="btn-success" style="flex: 1;">SAVE</button>
                <button class="btn-outline" style="flex: 1;" onclick="this.closest('.modal-overlay').remove()">CANCEL</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Focus the input
    const input = document.getElementById('edit-music-url');
    input.focus();
    input.select();
    
    document.getElementById('save-music-btn').addEventListener('click', () => {
        const newUrl = input.value;
        const trimmedUrl = newUrl.trim();
        
        if (trimmedUrl === '') {
            showToast('Operation cancelled (Empty URL)');
            overlay.remove();
            return;
        }

        const ytId = extractYoutubeId(trimmedUrl);
        if (ytId) {
            canvasItems[index] = updateModularProperty(canvasItems[index], 'ytId', ytId);
            canvasItems[index] = updateModularProperty(canvasItems[index], 'yt-url', trimmedUrl);
            renderCanvas();
            updateCodeView();
            saveToCache();
            showToast('Music updated successfully!');
            overlay.remove();
        } else {
            alert('Could not detect a valid YouTube ID from that link. Please check the URL format.');
        }
    });
}

function editImageLink(index) {
    const item = modularToFlat(canvasItems[index]);
    const currentUrl = item['image-url'] || '';
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    
    overlay.innerHTML = `
        <div class="modal-content" style="width: min(100%, 500px);">
            <div class="modal-header">
                <h2>UPDATE IMAGE LINK</h2>
                <p>Enter the new URL for this image.</p>
            </div>
            <div class="form-group">
                <label>Image URL</label>
                <input type="text" id="edit-image-url" value="${currentUrl}">
            </div>
            <div style="display: flex; gap: var(--space-md); margin-top: var(--space-xl);">
                <button id="save-image-btn" class="btn-success" style="flex: 1;">SAVE</button>
                <button class="btn-outline" style="flex: 1;" onclick="this.closest('.modal-overlay').remove()">CANCEL</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Focus the input
    const input = document.getElementById('edit-image-url');
    input.focus();
    input.select();
    
    document.getElementById('save-image-btn').addEventListener('click', () => {
        const newUrl = input.value.trim();
        
        if (newUrl === '') {
            showToast('Operation cancelled (Empty URL)');
            overlay.remove();
            return;
        }

        canvasItems[index] = updateModularProperty(canvasItems[index], 'image-url', newUrl);
        renderCanvas();
        updateCodeView();
        saveToCache();
        showToast('Image updated successfully!');
        overlay.remove();
    });
}

function removeItem(index) {
    saveActiveDialogueIfEditing();
    canvasItems.splice(index, 1);
    renderCanvas();
    updateCodeView();
    saveToCache();
    recordHistory();
}

function moveItem(index, direction) {
    saveActiveDialogueIfEditing();
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < canvasItems.length) {
        const temp = canvasItems[index];
        canvasItems[index] = canvasItems[newIndex];
        canvasItems[newIndex] = temp;
        renderCanvas();
        updateCodeView();
        saveToCache();
        recordHistory();
    }
}

function confirmClearCanvas() {
    canvasItems = [];
    renderCanvas();
    updateCodeView();
    localStorage.removeItem(CACHE_KEY);
    recordHistory();
    showToast('Canvas and cache cleared.');
}

function clearCanvas() {
    saveActiveDialogueIfEditing();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    overlay.innerHTML = `
        <div class="modal-content" style="width: 400px; text-align: center;">
            <div class="modal-header">
                <h2 style="color: #ff4757;">CLEAR CANVAS?</h2>
                <p>This will remove all elements from your current project and clear the cache.</p>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button class="btn-primary" style="flex: 1; background: #ff4757; color: white;" onclick="this.closest('.modal-overlay').remove(); confirmClearCanvas();">CLEAR ALL</button>
                <button class="btn-outline" style="flex: 1;" onclick="this.closest('.modal-overlay').remove()">CANCEL</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function generateFullHTML(minified) {
    const theme = document.getElementById('global-theme-select').value;
    const themeColor = getThemePrimaryHex();
    const indent = minified ? '' : '    ';
    const newline = minified ? '' : '\n';

    let html = '';
    html += `<link href="https://minimumlogix.github.io/World-Nexus/tools/intro-editor/styles/fonts.css" rel="stylesheet">${newline}${newline}`;

    if (theme === 'vn_custom') {
        html += `<link href="https://minimumlogix.github.io/World-Nexus/tools/intro-editor/styles/vn_base.css" rel="stylesheet">${newline}`;
        html += `<style>${newline}`;
        html += `html {${newline}`;
        html += `${indent}--primary-color: ${customThemeVars['primary']};${newline}`;
        html += `${indent}--text-color: ${customThemeVars['text']};${newline}`;
        
        let bgVal = customThemeVars['bg'];
        if (bgVal.startsWith('#') && bgVal.length === 7) {
            const rgb = hexToRgbHelper(bgVal);
            bgVal = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.95)`;
        }
        html += `${indent}--background-color: ${bgVal};${newline}`;
        
        let glowVal = customThemeVars['glow'];
        if (glowVal.startsWith('#') && glowVal.length === 7) {
            const rgb = hexToRgbHelper(glowVal);
            glowVal = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.3)`;
        }
        html += `${indent}--glow-color: ${glowVal};${newline}`;
        
        let gradVal = customThemeVars['gradient'];
        if (gradVal.startsWith('#') && gradVal.length === 7) {
            const rgb = hexToRgbHelper(gradVal);
            gradVal = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.4)`;
        }
        html += `${indent}--gradient-color: ${gradVal};${newline}`;
        
        html += `${indent}--heading-color: ${customThemeVars['heading']};${newline}`;
        html += `${indent}--strong-color: ${customThemeVars['strong']};${newline}`;
        html += `${indent}--emphasis-color: ${customThemeVars['emphasis']};${newline}`;
        html += `${indent}--code-bg-color: ${customThemeVars['code-bg']};${newline}`;
        html += `${indent}--quote-color: ${customThemeVars['quote']};${newline}`;
        html += `${indent}--gif-stroke-color: ${customThemeVars['gif-stroke']};${newline}`;
        html += `}${newline}`;
        html += `</style>${newline}${newline}`;
    } else {
        html += `<link href="https://minimumlogix.github.io/World-Nexus/tools/intro-editor/styles/${theme}" rel="stylesheet">${newline}${newline}`;
    }
    html += `<link href="https://minimumlogix.github.io/World-Nexus/tools/intro-editor/styles/intro_effects.css" rel="stylesheet">${newline}${newline}`;

    const hasCards = canvasItems.some(item => item.type === 'card' || item.type === 'card-template' || item.type === 'card-bladerunner' || item.type === 'card-imessage' || item.type === 'card-steampunk');
    if (hasCards) {
        html += `<link href="https://minimumlogix.github.io/World-Nexus/tools/intro-editor/styles/card.css" rel="stylesheet">${newline}`;
        html += `<script src="https://minimumlogix.github.io/World-Nexus/tools/intro-editor/js/card.js"></script>${newline}${newline}`;
    }

    canvasItems.forEach(item => {
        item = modularToFlat(item);
        const design = item['design'] || 'default';
        switch(item.type) {
            case 'image':
                const imgUrl = item['image-url'] || 'https://via.placeholder.com/800x400.png?text=No+Image+Provided';
                const alignVal = item['alignment'] || 'full';
                if (alignVal === 'full') {
                    html += `<div class="vn-image-wrapper vn-image-style-${design}">${newline}`;
                    html += `${indent}<img src="${imgUrl}">${newline}`;
                    html += `</div>${newline}`;
                } else {
                    const justifyVal = alignVal === 'center' ? 'center' : (alignVal === 'left' ? 'flex-start' : 'flex-end');
                    const wVal = item['image-width'] || 'auto';
                    const hVal = item['image-height'] || 'auto';
                    html += `<div style="display: flex; justify-content: ${justifyVal}; width: 100%; margin: 10px 0;">${newline}`;
                    html += `${indent}<div class="vn-image-wrapper vn-image-style-${design}" style="width: ${wVal}; height: ${hVal}; max-width: 100%; display: block; position: relative;">${newline}`;
                    html += `${indent}${indent}<img src="${imgUrl}" style="width: 100%; height: ${hVal === 'auto' ? 'auto' : '100%'}; object-fit: cover;">${newline}`;
                    html += `${indent}</div>${newline}`;
                    html += `</div>${newline}`;
                }
                break;
            case 'gif-heading':
                const textVal = item['text'] || 'JOYLAND';
                const gifUrlVal = item['gif-url'] || 'https://joylandimages.neocities.org/JOYLAND/GREETING/gifs/sky1.gif';
                const strokeColorVal = item['stroke-color'];
                const strokeStyleVal = strokeColorVal ? `-webkit-text-stroke: 1px ${strokeColorVal};` : '';
                const fontSizeVal = item['font-size'] || '5em';
                const fontFamilyVal = item['font-family'] || 'Bebas Neue';
                html += `<div class="vn-gif-heading" style="text-align: center; font-size: ${fontSizeVal}; font-family: '${fontFamilyVal}', sans-serif; background-image: url('${gifUrlVal}'); background-size: cover; -webkit-background-clip: text; -webkit-text-fill-color: transparent; ${strokeStyleVal} margin: 1rem 0; line-height: 1.2;">${textVal}</div>${newline}`;
                break;
            case 'music':
                const musicHeight = design === 'deck' ? 120 : 75;
                const exportVol = item.volume !== undefined ? item.volume : 100;
                const exportAp = item.autoplay !== false ? 1 : 0;
                const exportTheme = item.theme || 'nasapunk';
                html += `<div class="vn-music-wrapper vn-music-style-${design}">${newline}`;
                html += `${indent}<iframe allow="autoplay; encrypted-media" src="https://minimumlogix.github.io/World-Nexus/tools/music-player/mw?v=${item.ytId}&c=${themeColor}&ap=${exportAp}&vol=${exportVol}&theme=${exportTheme}" style="width:100%;height:${musicHeight}px;border:none"></iframe>${newline}`;
                html += `</div>${newline}`;
                break;
            case 'character':
                html += `<div class="vn-character-container vn-char-style-${design}" style="background-image:url(${item['bg-url']})">${newline}`;
                (item.characters || []).forEach(char => {
                    html += `${indent}<div class="vn-character-group">${newline}`;
                    html += `${indent}${indent}<div class="vn-character-name">${char.name}</div>${newline}`;
                    html += `${indent}${indent}<div class="vn-sprite-frame">${newline}`;
                    html += `${indent}${indent}${indent}<img alt="${char.name}" class="speaking vn-character" src="${char.sprite}">${newline}`;
                    html += `${indent}${indent}</div>${newline}`;
                    html += `${indent}</div>${newline}`;
                });
                html += `</div>${newline}`;
                break;
            case 'vn-iframe':
                html += `<div class="vn-iframe-wrapper vn-iframe-style-${design}">${newline}`;
                html += `${indent}<iframe allow="autoplay; encrypted-media" src="https://minimumlogix.github.io/VN_Engine?story=${item['story-id']}" style="width:100%;height:${item['iframe-height']}px;border:none"></iframe>${newline}`;
                if (design === 'console') {
                    html += `${indent}<div class="vn-console-bezel-led"></div>${newline}`;
                }
                html += `</div>${newline}`;
                break;
            case 'dialogue':
                const dialogueText = (item['dialogue-text'] || '').replace(/\r\n/g, '\n');
                if (minified) {
                    html += `<div class="vn-dialogue-box vn-dialogue-style-${design}"><div class="vn-dialogue-content">\n\n${dialogueText}\n</div></div>${newline}`;
                } else {
                    html += `<div class="vn-dialogue-box vn-dialogue-style-${design}">${newline}`;
                    html += `${indent}<div class="vn-dialogue-content">${newline}${newline}`;
                    html += `${dialogueText}${newline}`;
                    html += `${indent}</div>${newline}`;
                    html += `</div>${newline}`;
                }
                break;
            case 'lore':
                const loreLinkOut = item['lore-link'] || '';
                const loreTextOut = item['lore-text'] || '';
                const isUrlOut = /^(https?:\/\/|\/|\.\/|\.\.\/)/i.test(loreLinkOut);
                const srcOut = isUrlOut ? loreLinkOut : `https://minimumlogix.github.io/VN_Engine/apps/lore?world=${loreLinkOut}`;
                
                let contentHtmlOut = '';
                if (loreLinkOut) {
                    contentHtmlOut = `${indent}${indent}<iframe allow="autoplay; encrypted-media" src="${srcOut}" style="width:100%;height:${item['lore-height']}px;border:none;border-radius: 5px;"></iframe>${newline}`;
                } else if (loreTextOut) {
                    contentHtmlOut = `${indent}${indent}<div class="vn-lore-text-inner" style="color:var(--text-color);line-height:1.75;font-size:1.05rem;">${parseMarkdown(loreTextOut)}</div>${newline}`;
                } else {
                    contentHtmlOut = `${indent}${indent}<div style="text-align:center;opacity:0.5;padding:20px;">Edit to set a Lore Link or paste Lore text.</div>${newline}`;
                }

                const isOpenOut = item['lore-open'] === 'true' ? ' open' : '';
                html += `<details class="vn-lore-details vn-lore-style-${design}"${isOpenOut}>${newline}`;
                html += `${indent}<summary class="vn-lore-summary">${newline}`;
                html += `${indent}${indent}<span>Lore Database</span>${newline}`;
                html += `${indent}${indent}<div style="display: flex; align-items: center; gap: 12px;">${newline}`;
                if (loreLinkOut) {
                    html += `${indent}${indent}${indent}<a href="${srcOut}" target="_blank" class="vn-lore-external-link" onclick="event.stopPropagation();" title="Open in new window"><i class="bi bi-box-arrow-up-right" style="font-size: 14px; display: inline-block; vertical-align: middle;"></i></a>${newline}`;
                }
                html += `${indent}${indent}${indent}<svg class="vn-lore-icon" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" /></svg>${newline}`;
                html += `${indent}${indent}</div>${newline}`;
                html += `${indent}</summary>${newline}`;
                html += `${indent}<div class="vn-lore-content">${newline}`;
                html += `${contentHtmlOut}`;
                html += `${indent}</div>${newline}`;
                html += `</details>${newline}`;
                break;
            case 'custom-html':
                const customHtmlVal = item['html-content'] || '';
                html += `<div class="vn-custom-html-block">${newline}`;
                html += `${indent}${customHtmlVal}${newline}`;
                html += `</div>${newline}`;
                break;
            case 'custom-iframe':
                const exportIframeUrl = item['iframe-url'] || '';
                const exportIframeHeight = item['iframe-height'] || 450;
                const exportIframeParamsText = item['iframe-params'] || '';
                const exportHeightMode = item['iframe-height-mode'] || 'fixed';
                
                let finalExportIframeUrl = exportIframeUrl;
                const exportIframeParams = [];
                exportIframeParamsText.split('\n').forEach(line => {
                    const parts = line.split('=');
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const val = parts.slice(1).join('=').trim();
                        if (key) {
                            exportIframeParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
                        }
                    }
                });
                if (exportIframeParams.length > 0) {
                    const separator = finalExportIframeUrl.includes('?') ? '&' : '?';
                    let queryStr = exportIframeParams.join('&');
                    queryStr = queryStr.replace(/%7B%7B/g, '{{').replace(/%7D%7D/g, '}}');
                    finalExportIframeUrl += separator + queryStr;
                }
                
                const exportHeightStyle = exportHeightMode === 'full' 
                    ? `width:100%;height:100vh;border:none` 
                    : `width:100%;height:${exportIframeHeight}px;border:none`;
                const exportOnloadAttr = exportHeightMode === 'full'
                    ? ` onload="try { this.style.height = this.contentWindow.document.body.scrollHeight + 'px'; } catch (e) { this.style.height = '100vh'; }"`
                    : '';
                
                html += `<div class="vn-custom-iframe-wrapper vn-custom-iframe-style-${design}${exportHeightMode === 'full' ? ' vn-custom-iframe-full' : ''}">${newline}`;
                html += `${indent}<iframe allow="autoplay; encrypted-media" src="${finalExportIframeUrl}" style="${exportHeightStyle}"${exportOnloadAttr}></iframe>${newline}`;
                html += `</div>${newline}`;
                break;
            case 'sfx':
                const expSfxUrl = item['sfx-url'] || '';
                const expSfxTitle = item.text || 'Transmission #09';
                const expSfxTranscript = item['sfx-transcript'] || '';
                const expSfxDesign = item.design || 'touch';

                let expSfxHtml = `<div class="vn-sfx-card vn-sfx-${expSfxDesign}" data-url="${expSfxUrl}" data-title="${expSfxTitle}" data-transcript="${encodeURIComponent(expSfxTranscript)}">${newline}`;
                if (expSfxDesign === 'touch') {
                    expSfxHtml += `${indent}<div class="vn-sfx-touch-content">${newline}`;
                    expSfxHtml += `${indent}${indent}<div class="vn-sfx-icon">🔊</div>${newline}`;
                    expSfxHtml += `${indent}${indent}<div class="vn-sfx-details">${newline}`;
                    expSfxHtml += `${indent}${indent}${indent}<span class="vn-sfx-card-title">${expSfxTitle}</span>${newline}`;
                    expSfxHtml += `${indent}${indent}${indent}<span class="vn-sfx-card-subtitle">TAP TO PLAY TRANSMISSION</span>${newline}`;
                    expSfxHtml += `${indent}${indent}</div>${newline}`;
                    expSfxHtml += `${indent}</div>${newline}`;
                } else {
                    expSfxHtml += `${indent}<div class="vn-sfx-transcript-content">${newline}`;
                    expSfxHtml += `${indent}${indent}<button class="vn-sfx-play-btn">▶</button>${newline}`;
                    expSfxHtml += `${indent}${indent}<div class="vn-sfx-waveform">${newline}`;
                    expSfxHtml += `${indent}${indent}${indent}<span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>${newline}`;
                    expSfxHtml += `${indent}${indent}</div>${newline}`;
                    expSfxHtml += `${indent}${indent}<div class="vn-sfx-transcript-body">${newline}`;
                    expSfxHtml += `${indent}${indent}${indent}<div class="vn-sfx-transcript-title">${expSfxTitle}</div>${newline}`;
                    expSfxHtml += `${indent}${indent}${indent}<div class="vn-sfx-transcript-text" style="font-family: 'Share Tech Mono', monospace; font-size: 13px;">${expSfxTranscript}</div>${newline}`;
                    expSfxHtml += `${indent}${indent}</div>${newline}`;
                    expSfxHtml += `${indent}</div>${newline}`;
                }
                expSfxHtml += `</div>`;
                
                html += `<div class="vn-sfx-card-wrapper">${newline}`;
                html += `${indent}${expSfxHtml.split('\n').join(newline + indent)}${newline}`;
                html += `</div>${newline}`;
                break;
            case 'card-steampunk':
                const expSpTitle = item['steampunk-title'] || 'CLASSIFIED VAULT';
                const expSpText = item['steampunk-text'] || '';
                const expSpCode = item['steampunk-code'] || '394';
                const expSpDesign = item.design || 'brass';

                let expSpHtml = `<div class="vn-steampunk-card vn-steampunk-${expSpDesign}" data-code="${expSpCode}" style="font-family: Georgia, serif;">${newline}`;
                expSpHtml += `${indent}<div class="vn-steampunk-vault-door">${newline}`;
                expSpHtml += `${indent}${indent}<div class="vn-steampunk-header">${expSpTitle}</div>${newline}`;
                expSpHtml += `${indent}${indent}<div class="vn-steampunk-gears-assembly">${newline}`;
                expSpHtml += `${indent}${indent}${indent}<div class="vn-steampunk-gear gear-left">⚙️</div>${newline}`;
                expSpHtml += `${indent}${indent}${indent}<div class="vn-steampunk-gear gear-right">⚙️</div>${newline}`;
                expSpHtml += `${indent}${indent}</div>${newline}`;
                expSpHtml += `${indent}${indent}<div class="vn-steampunk-dials-container">${newline}`;
                expSpHtml += `${indent}${indent}<div class="vn-steampunk-dial-wrapper">${newline}`;
                expSpHtml += `${indent}${indent}${indent}<button class="vn-steampunk-dial-btn up" data-dial="0">▲</button>${newline}`;
                expSpHtml += `${indent}${indent}${indent}<span class="vn-steampunk-dial dial-0">0</span>${newline}`;
                expSpHtml += `${indent}${indent}${indent}<button class="vn-steampunk-dial-btn down" data-dial="0">▼</button>${newline}`;
                expSpHtml += `${indent}${indent}${indent}</div>${newline}`;
                expSpHtml += `${indent}${indent}<div class="vn-steampunk-dial-wrapper">${newline}`;
                expSpHtml += `${indent}${indent}${indent}<button class="vn-steampunk-dial-btn up" data-dial="1">▲</button>${newline}`;
                expSpHtml += `${indent}${indent}${indent}<span class="vn-steampunk-dial dial-1">0</span>${newline}`;
                expSpHtml += `${indent}${indent}${indent}<button class="vn-steampunk-dial-btn down" data-dial="1">▼</button>${newline}`;
                expSpHtml += `${indent}${indent}${indent}</div>${newline}`;
                expSpHtml += `${indent}${indent}<div class="vn-steampunk-dial-wrapper">${newline}`;
                expSpHtml += `${indent}${indent}${indent}<button class="vn-steampunk-dial-btn up" data-dial="2">▲</button>${newline}`;
                expSpHtml += `${indent}${indent}${indent}<span class="vn-steampunk-dial dial-2">0</span>${newline}`;
                expSpHtml += `${indent}${indent}${indent}<button class="vn-steampunk-dial-btn down" data-dial="2">▼</button>${newline}`;
                expSpHtml += `${indent}${indent}${indent}</div>${newline}`;
                expSpHtml += `${indent}${indent}</div>${newline}`;
                expSpHtml += `${indent}${indent}<div class="vn-steampunk-status">VAULT LOCKED</div>${newline}`;
                expSpHtml += `${indent}</div>${newline}`;
                expSpHtml += `${indent}<div class="vn-steampunk-parchment-content">${newline}`;
                expSpHtml += `${indent}${indent}<div class="vn-steampunk-parchment-inner">${newline}`;
                expSpHtml += `${indent}${indent}${indent}<p>${expSpText}</p>${newline}`;
                expSpHtml += `${indent}${indent}</div>${newline}`;
                expSpHtml += `${indent}</div>${newline}`;
                expSpHtml += `</div>`;

                html += `<div class="vn-steampunk-card-wrapper">${newline}`;
                html += `${indent}${expSpHtml.split('\n').join(newline + indent)}${newline}`;
                html += `</div>${newline}`;
                break;
            case 'link':
                html += `<div style="display: flex; justify-content: center; width: 100%; margin: 10px 0;">${newline}`;
                html += `${indent}<div class="vn-link-block vn-link-style-${design}">${newline}`;
                html += `${indent}${indent}<a href="${item['link-url'] || '#'}" target="${item.target || '_blank'}" style="text-decoration: none; color: inherit; display: inline-flex; align-items: center; gap: 6px;">${newline}`;
                html += `${indent}${indent}${indent}<span>🔗 ${item.text || 'Visit Site'}</span>${newline}`;
                html += `${indent}${indent}</a>${newline}`;
                html += `${indent}</div>${newline}`;
                html += `</div>${newline}`;
                break;
            case 'quote':
                const qAuthor = item.author ? `<cite style="display: block; text-align: right; margin-top: 8px; font-style: normal; font-size: 0.9em; opacity: 0.7;">— ${item.author}</cite>` : '';
                html += `<blockquote class="vn-quote vn-quote-style-${design}">${newline}`;
                html += `${indent}<p style="margin: 0; font-style: italic;">"${item.text || ''}"</p>${newline}`;
                if (item.author) {
                    html += `${indent}${qAuthor}${newline}`;
                }
                html += `</blockquote>${newline}`;
                break;
            case 'card':
                html += `<div class="vn-card vn-card-style-${design}">${newline}`;
                if (item.title) {
                    html += `${indent}<div class="vn-card-title">${item.title}</div>${newline}`;
                }
                html += `${indent}<div class="vn-card-content">${parseMarkdown(item.text || '')}</div>${newline}`;
                html += `</div>${newline}`;
                break;
            case 'terminal':
                html += `<div class="vn-terminal vn-terminal-style-${design}">${newline}`;
                html += `${indent}<div class="vn-terminal-body">${newline}`;
                html += `${indent}${indent}<pre><code class="vn-terminal-code">${item.text || ''}</code></pre>${newline}`;
                html += `${indent}</div>${newline}`;
                html += `</div>${newline}`;
                break;
            case 'card-template':
                const exportCardTemplate = item.template || DEFAULT_CARD_TEMPLATE;
                let exportHtml = exportCardTemplate;
                
                exportHtml = exportHtml.replace('{{title}}', item.title || '');
                exportHtml = exportHtml.replace('{{content}}', parseMarkdown(item.text || ''));
                exportHtml = exportHtml.replace('{{sigLabel}}', item.sigLabel || '');
                exportHtml = exportHtml.replace('{{sigName}}', item.sigName || '');
                exportHtml = exportHtml.replace('{{stamp}}', item.stamp || '');
                
                html += `<div class="vn-card-template-wrapper">${newline}`;
                html += `${indent}${exportHtml.split('\n').join(newline + indent)}${newline}`;
                html += `</div>${newline}`;
                break;
                
            case 'card-bladerunner':
                let exportBrHtml = DEFAULT_BLADERUNNER_TEMPLATE;
                
                exportBrHtml = exportBrHtml.replace('{{headerLeft}}', item.headerLeft || '');
                exportBrHtml = exportBrHtml.replace('{{headerRight}}', item.headerRight || '');
                exportBrHtml = exportBrHtml.replace('{{content}}', `<div class="vn-bladerunner-typewriter" data-raw-text="${encodeURIComponent(parseMarkdown(item.text || ''))}">${parseMarkdown(item.text || '')}</div>`);
                exportBrHtml = exportBrHtml.replace('{{footerLeft}}', item.footerLeft || '');
                exportBrHtml = exportBrHtml.replace('{{footerMiddle}}', item.footerMiddle || '');
                exportBrHtml = exportBrHtml.replace('{{footerRight}}', item.footerRight || '');
                exportBrHtml = exportBrHtml.replace('{{tokenLabel}}', item.tokenLabel || '');
                exportBrHtml = exportBrHtml.replace('{{tokenValue}}', item.tokenValue || '');
                exportBrHtml = exportBrHtml.replace('{{endText}}', item.endText || '');
                
                html += `<div class="vn-bladerunner-wrapper">${newline}`;
                html += `${indent}${exportBrHtml.split('\n').join(newline + indent)}${newline}`;
                html += `</div>${newline}`;
                break;
                
            case 'card-imessage':
                const expChars = item.characters || [];
                const expMsgs = item.messages || [];
                
                let exportCardStyle = '';
                if (item['imessage-font']) {
                    exportCardStyle += `font-family: '${item['imessage-font']}', sans-serif;`;
                }
                if (item['imessage-bg']) {
                    exportCardStyle += `background-image: url('${item['imessage-bg']}');`;
                } else if (item['imessage-bg-color']) {
                    exportCardStyle += `--im-bg: ${item['imessage-bg-color']};`;
                }
                if (item['imessage-incoming-bg']) {
                    exportCardStyle += `--im-incoming-bg: ${item['imessage-incoming-bg']};`;
                }
                if (item['imessage-incoming-text']) {
                    exportCardStyle += `--im-incoming-text: ${item['imessage-incoming-text']};`;
                }
                if (item['imessage-outgoing-bg']) {
                    exportCardStyle += `--im-outgoing-bg: ${item['imessage-outgoing-bg']};`;
                }
                if (item['imessage-outgoing-text']) {
                    exportCardStyle += `--im-outgoing-text: ${item['imessage-outgoing-text']};`;
                }

                let exportImHtml = `<div class="vn-imessage-chat" data-mode="${item.mode || 'auto'}" style="${exportCardStyle}">${newline}`;
                exportImHtml += `${indent}<div class="conversation">${newline}`;
                
                expMsgs.forEach((msg, idx) => {
                    const char = expChars.find(c => c.id === msg.charId) || { name: 'Unknown', side: 'left', avatar: '' };
                    const sideClass = char.side === 'right' ? 'right' : 'left';
                    const bubbleClass = char.side === 'right' ? 'outgoing' : 'incoming';
                    
                    exportImHtml += `${indent}${indent}<div class="row ${sideClass} hidden-on-load">${newline}`;
                    if (char.side !== 'right' && char.avatar) {
                        exportImHtml += `${indent}${indent}${indent}<img src="${char.avatar}" class="avatar">${newline}`;
                    }
                    exportImHtml += `${indent}${indent}${indent}<div>${newline}`;
                    exportImHtml += `${indent}${indent}${indent}${indent}<div class="bubble ${bubbleClass}">${msg.text || ''}</div>${newline}`;
                    if (char.name) {
                        if (char.side === 'right') {
                            exportImHtml += `${indent}${indent}${indent}${indent}<div class="meta">${char.name}</div>${newline}`;
                        } else {
                            exportImHtml += `${indent}${indent}${indent}${indent}<div class="meta" style="text-align: left; padding-left: 6px;">${char.name}</div>${newline}`;
                        }
                    }
                    exportImHtml += `${indent}${indent}${indent}</div>${newline}`;
                    if (char.side === 'right' && char.avatar) {
                        exportImHtml += `${indent}${indent}${indent}<img src="${char.avatar}" class="avatar-right">${newline}`;
                    }
                    exportImHtml += `${indent}${indent}</div>${newline}`;
                });
                
                exportImHtml += `${indent}</div>${newline}`;
                exportImHtml += `</div>`;
                
                html += `<div class="vn-imessage-chat-wrapper">${newline}`;
                html += `${indent}${exportImHtml.split('\n').join(newline + indent)}${newline}`;
                html += `</div>${newline}`;
                break;
                
            case 'scene-break':
                html += `<div class="vn-scene-break vn-break-style-${design}">${newline}`;
                html += `${indent}<div class="vn-break-line"></div>${newline}`;
                html += `${indent}<div class="vn-break-text">${item.text || ''}</div>${newline}`;
                html += `${indent}<div class="vn-break-line"></div>${newline}`;
                html += `</div>${newline}`;
                break;
        }
    });

    if (minified) {
        return html.trim();
    }
    return html;
}


function copyMinifiedCode() {
    saveActiveDialogueIfEditing();
    const code = generateFullHTML(true);

    // Modern approach
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
            showToast('Minified code copied to clipboard!');
        }).catch(err => {
            console.error('Clipboard error:', err);
            fallbackCopyTextToClipboard(code);
        });
    } else {
        fallbackCopyTextToClipboard(code);
    }
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.style.fontSize = '12pt'; // Prevent auto-zoom on iOS

    document.body.appendChild(textArea);
    
    // Check for iOS selection range fallback
    const isiOS = navigator.userAgent.match(/ipad|iphone/i);
    if (isiOS) {
        const range = document.createRange();
        range.selectNode(textArea);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        textArea.setSelectionRange(0, 999999);
    } else {
        textArea.focus();
        textArea.select();
    }

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showToast('Minified code copied to clipboard!');
        } else {
            showToast('Unable to copy code. Please select from the HTML Code tab.');
        }
    } catch (err) {
        console.error('Fallback copy error:', err);
        showToast('Clipboard error. Please copy from the HTML Code tab.');
    }

    document.body.removeChild(textArea);
}



// Global Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    const activeDialogue = getActiveDialogueEditable();
    const textarea = document.querySelector('#form-fields textarea');
    const isTextareaActive = textarea && document.activeElement === textarea;

    const selection = window.getSelection();
    let isEditable = false;
    if (selection.rangeCount > 0) {
        const container = selection.getRangeAt(0).commonAncestorContainer;
        isEditable = (container.nodeType === 3 ? container.parentNode : container).closest('[contenteditable="true"]');
    }

    if (e.ctrlKey && (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'i')) {
        const type = e.key.toLowerCase() === 'b' ? 'bold' : 'italic';

        if (isEditable || isTextareaActive) {
            e.preventDefault();
            applyFormat(type);

            // Visual feedback via toast for shortcut usage
            if (!isTextareaActive) {
                handleTextSelection();
            }
        }
    } else if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        if (activeDialogue || isEditable || isTextareaActive) {
            e.preventDefault();
            insertLinkPopup();
        }
    } else if (e.ctrlKey && e.key.toLowerCase() === 's') {
        if (activeDialogue) {
            e.preventDefault();
            triggerSaveDialogue();
            showToast('Dialogue saved!');
        }
    } else if (e.key === 'Escape') {
        const overlay = document.getElementById('dialogue-focus-overlay');
        if (overlay && overlay.classList.contains('active')) {
            e.preventDefault();
            cancelFocusDialogue();
        }
    }
});


// --- CUSTOM SELECT DROPDOWN LOGIC ---
function toggleCustomSelect(trigger) {
    const container = trigger.closest('.nexus-select');
    container.classList.toggle('active');
}

function selectCustomOption(optionEl) {
    const container = optionEl.closest('.nexus-select');
    const triggerLabel = container.querySelector('.nexus-select-label');
    const hiddenInput = document.getElementById('global-theme-select');
    
    container.querySelectorAll('.nexus-select-option').forEach(el => el.classList.remove('selected'));
    optionEl.classList.add('selected');
    triggerLabel.innerText = optionEl.innerText;
    
    hiddenInput.value = optionEl.dataset.value;
    hiddenInput.dispatchEvent(new Event('change'));
    container.classList.remove('active');
}

function syncCustomSelect(value) {
    const container = document.getElementById('theme-select-container');
    if (!container) return;
    const triggerLabel = container.querySelector('.nexus-select-label');
    const option = container.querySelector(`.nexus-select-option[data-value="${value}"]`);
    
    container.querySelectorAll('.nexus-select-option').forEach(el => el.classList.remove('selected'));
    
    if (option) {
        option.classList.add('selected');
        triggerLabel.innerText = option.innerText;
    }
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.nexus-select')) {
        document.querySelectorAll('.nexus-select').forEach(el => el.classList.remove('active'));
    }
});

function initCustomSelects() {
    document.querySelectorAll('.nexus-select-option').forEach(option => {
        option.addEventListener('click', (e) => {
            selectCustomOption(e.currentTarget);
        });
    });
}

// --- CUSTOM THEME BUILDER LOGIC ---
let customThemeVars = {
    'primary': '#c00000',
    'text': '#f0f8ff',
    'bg': '#231414',
    'glow': '#ff0000',
    'gradient': '#3c2828',
    'heading': '#ff4d4d',
    'strong': '#ff8080',
    'emphasis': '#ffb3b3',
    'code-bg': '#3d1a1a',
    'quote': '#ffe6e6',
    'gif-stroke': '#f1d0d7'
};

function applyCustomTheme() {
    const panel = document.getElementById('custom-theme-panel');
    if (panel) panel.classList.add('active');
    
    document.documentElement.style.setProperty('--primary-color', customThemeVars['primary']);
    document.documentElement.style.setProperty('--text-color', customThemeVars['text']);
    
    let bgVal = customThemeVars['bg'];
    if (bgVal.startsWith('#') && bgVal.length === 7) {
        const rgb = hexToRgbHelper(bgVal);
        bgVal = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.95)`;
    }
    document.documentElement.style.setProperty('--background-color', bgVal);
    
    let glowVal = customThemeVars['glow'];
    if (glowVal.startsWith('#') && glowVal.length === 7) {
        const rgb = hexToRgbHelper(glowVal);
        glowVal = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.3)`;
    }
    document.documentElement.style.setProperty('--glow-color', glowVal);
    
    let gradVal = customThemeVars['gradient'];
    if (gradVal.startsWith('#') && gradVal.length === 7) {
        const rgb = hexToRgbHelper(gradVal);
        gradVal = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.4)`;
    }
    document.documentElement.style.setProperty('--gradient-color', gradVal);
    
    document.documentElement.style.setProperty('--heading-color', customThemeVars['heading']);
    document.documentElement.style.setProperty('--strong-color', customThemeVars['strong']);
    document.documentElement.style.setProperty('--emphasis-color', customThemeVars['emphasis']);
    document.documentElement.style.setProperty('--code-bg-color', customThemeVars['code-bg']);
    document.documentElement.style.setProperty('--quote-color', customThemeVars['quote']);
    document.documentElement.style.setProperty('--gif-stroke-color', customThemeVars['gif-stroke']);
}

function removeCustomThemeStyles() {
    const panel = document.getElementById('custom-theme-panel');
    if (panel) panel.classList.remove('active');
    
    const vars = ['primary', 'text', 'background', 'glow', 'gradient', 'heading', 'strong', 'emphasis', 'code-bg', 'quote', 'gif-stroke'];
    vars.forEach(v => {
        document.documentElement.style.removeProperty(`--${v}-color`);
    });
    document.documentElement.style.removeProperty('--background-color');
    document.documentElement.style.removeProperty('--code-bg-color');
    document.documentElement.style.removeProperty('--gif-stroke-color');
}

function hexToRgbHelper(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function pickThemeColor(varName, swatchEl) {
    const currentHex = customThemeVars[varName];
    window.NexusColorPicker.open(swatchEl, currentHex, (newHex) => {
        customThemeVars[varName] = newHex;
        swatchEl.style.background = newHex;
        const input = document.getElementById('input-' + varName);
        if (input) input.value = newHex;
        
        if (varName === 'bg') {
            const rgb = hexToRgbHelper(newHex);
            document.documentElement.style.setProperty('--background-color', `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.95)`);
        } else if (varName === 'glow') {
            const rgb = hexToRgbHelper(newHex);
            document.documentElement.style.setProperty('--glow-color', `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.3)`);
        } else if (varName === 'gradient') {
            const rgb = hexToRgbHelper(newHex);
            document.documentElement.style.setProperty('--gradient-color', `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.4)`);
        } else {
            let cssVar = `--${varName}-color`;
            if (varName === 'code-bg') cssVar = '--code-bg-color';
            if (varName === 'gif-stroke') cssVar = '--gif-stroke-color';
            document.documentElement.style.setProperty(cssVar, newHex);
        }
        
        renderCanvas();
        updateCodeView();
    }, () => {
        saveToCache();
    });
}

function toggleSidebar(collapse) {
    const body = document.body;
    if (collapse === undefined) {
        collapse = !body.classList.contains('sidebar-collapsed');
    }
    
    if (collapse) {
        body.classList.add('sidebar-collapsed');
    } else {
        body.classList.remove('sidebar-collapsed');
    }
    
    updateSidebarIcon();
    saveToCache();
}

function updateSidebarIcon() {
    const isMobile = window.innerWidth <= 800;
    const isCollapsed = document.body.classList.contains('sidebar-collapsed');
    const closeIcon = document.querySelector('#sidebar-close-btn i');
    const openBtn = document.getElementById('sidebar-open-btn');
    
    if (closeIcon) {
        if (isCollapsed) {
            closeIcon.className = isMobile ? 'bi bi-chevron-up' : 'bi bi-chevron-right';
            if (openBtn) openBtn.style.display = isMobile ? 'none' : 'flex';
        } else {
            closeIcon.className = isMobile ? 'bi bi-chevron-down' : 'bi bi-chevron-left';
            if (openBtn) openBtn.style.display = 'none';
        }
    }
}

window.addEventListener('resize', updateSidebarIcon);

const GIF_LIBRARY_FILES = [
    "Pink-Purple-Pattern-2.gif",
    "Pink-Purple-Pattern.gif",
    "cherry-blossom-1.gif",
    "cherry-blossom-2.gif",
    "cherry-blossom-transparent.gif",
    "classroom-1.gif",
    "driving-1.gif",
    "fire-1.gif",
    "flowers-1.gif",
    "heart-rain-1.gif",
    "matrix-1.gif",
    "monochrome-pattern-1.gif",
    "monochrome-pattern-2.gif",
    "morning-sky-1.gif",
    "night-sky-1.gif",
    "pool-1.gif",
    "snow-1.gif",
    "sun-1.gif",
    "terminal-1.gif",
    "trippy-1.gif"
];

function openGifLibraryPopup(targetInputId) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'gif-library-popup';
    overlay.style.display = 'flex';
    overlay.style.zIndex = 'var(--z-gallery-overlay)';
    
    let gridHTML = '';
    GIF_LIBRARY_FILES.forEach(filename => {
        const url = `https://minimumlogix.github.io/World-Nexus/assets/gif-library/${filename}`;
        const name = filename.replace('.gif', '').replace(/-/g, ' ');
        gridHTML += `
            <div class="gif-card" style="border: 1px solid var(--border); border-radius: var(--radius-md); padding: 8px; cursor: pointer; text-align: center; background: rgba(0,0,0,0.25); transition: all 0.2s; display: flex; flex-direction: column; gap: 6px; align-items: center;" 
                 onclick="selectGifForInput('${url}', '${targetInputId}'); document.getElementById('gif-library-popup').remove();"
                 onmouseover="this.style.borderColor='var(--accent)'; this.style.transform='translateY(-2px)';" 
                 onmouseout="this.style.borderColor='var(--border)'; this.style.transform='none';">
                <img src="${url}" style="width: 100%; height: 75px; object-fit: cover; border-radius: var(--radius-sm); background: #000;" alt="${name}">
                <div style="font-size: 10px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-dim); width: 100%; text-transform: capitalize;">${name}</div>
            </div>
        `;
    });
    
    overlay.innerHTML = `
        <div class="modal-content" style="width: min(100%, 650px); max-height: 85vh; display: flex; flex-direction: column;">
            <div class="modal-header">
                <h2>GIF LIBRARY</h2>
                <p>Select an animated pattern to apply to your heading background.</p>
            </div>
            <div style="flex: 1; overflow-y: auto; margin-top: 15px; padding-right: 5px;">
                <div class="gif-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; padding: 2px;">
                    ${gridHTML}
                </div>
            </div>
            <div style="display: flex; justify-content: flex-end; margin-top: 25px;">
                <button type="button" class="btn-outline" style="width: 120px;" onclick="document.getElementById('gif-library-popup').remove()">CLOSE</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

function selectGifForInput(url, targetInputId) {
    const input = document.getElementById(targetInputId);
    if (input) {
        input.value = url;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

function openFontGalleryPopup(targetInputId) {
    // Snapshot the active selection NOW — before the popup steals focus — so the
    // font card's onclick can pass it as customRange and wrap the correct text.
    const _sel = window.getSelection();
    const _capturedRange = (_sel && _sel.rangeCount > 0)
        ? _sel.getRangeAt(0).cloneRange()
        : (window.lastSavedSelectionRange || null);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'font-gallery-popup';
    overlay.style.display = 'flex';
    overlay.style.zIndex = 'var(--z-gallery-overlay)';
    // Store captured range on the overlay node so card onclicks can retrieve it.
    overlay._capturedRange = _capturedRange;
    
    let currentValue = 'Bebas Neue';
    if (targetInputId === 'rich-text-font') {
        const currentFont = document.querySelector('.font-current');
        if (currentFont) {
            currentValue = currentFont.textContent.trim();
        }
    } else {
        const currentInput = document.getElementById(targetInputId);
        if (currentInput) {
            currentValue = currentInput.value;
        }
    }
    
    const overlay2 = overlay; // reference for closure below
    const grid = document.createElement('div');
    grid.className = 'font-grid';
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; padding: 2px;';

    AVAILABLE_FONTS.forEach(font => {
        const isSelected = font === currentValue;
        const card = document.createElement('div');
        card.className = 'font-card';
        card.style.cssText = `border: 1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}; border-radius: var(--radius-md); padding: 15px; cursor: pointer; text-align: center; background: ${isSelected ? 'var(--accent-dim)' : 'rgba(0,0,0,0.25)'}; transition: all 0.2s; display: flex; flex-direction: column; gap: 8px; align-items: center; justify-content: center; min-height: 90px;`;
        card.innerHTML = `
            <div style="font-family: '${font}', sans-serif; font-size: 1.5rem; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%;">${font}</div>
            <div style="font-size: 9px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px;">${font}</div>
        `;
        card.addEventListener('mouseover', () => { card.style.borderColor = 'var(--accent)'; card.style.transform = 'translateY(-2px)'; });
        card.addEventListener('mouseout', () => { card.style.borderColor = isSelected ? 'var(--accent)' : 'var(--border)'; card.style.transform = 'none'; });
        card.addEventListener('click', () => {
            // Use the range captured at popup-open time, not whatever the browser
            // has in getSelection() now (focus has moved to the modal).
            const savedRange = overlay2._capturedRange || window.lastSavedSelectionRange;
            selectFontForInput(font, targetInputId, savedRange);
            document.getElementById('font-gallery-popup').remove();
        });
        grid.appendChild(card);
    });

    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.cssText = 'width: min(100%, 750px); max-height: 85vh; display: flex; flex-direction: column;';
    content.innerHTML = `
        <div class="modal-header">
            <h2>FONT GALLERY</h2>
            <p>Select a typography style for your heading text.</p>
        </div>
        <div style="margin-top: 15px; margin-bottom: 5px; position: relative;">
            <i class="bi bi-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-dim); font-size: 14px;"></i>
            <input type="text" placeholder="Search fonts..." style="width: 100%; padding: 8px 12px 8px 36px; background: rgba(0,0,0,0.4); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); font-size: var(--text-sm); outline: none;">
        </div>
        <div style="flex: 1; overflow-y: auto; margin-top: 10px; padding-right: 5px;"></div>
        <div style="display: flex; justify-content: flex-end; margin-top: 25px;">
            <button type="button" class="btn-outline" style="width: 120px;">CLOSE</button>
        </div>
    `;
    content.querySelector('input').addEventListener('input', function() {
        const q = this.value.toLowerCase();
        grid.querySelectorAll('.font-card').forEach(c => { c.style.display = c.textContent.toLowerCase().includes(q) ? 'flex' : 'none'; });
    });
    content.querySelector('div[style*="overflow-y"]').appendChild(grid);
    content.querySelector('.btn-outline').addEventListener('click', () => document.getElementById('font-gallery-popup').remove());
    overlay.appendChild(content);
    document.body.appendChild(overlay);
}

function selectFontForInput(fontName, targetInputId, capturedRange) {
    if (targetInputId === 'rich-text-font') {
        applyFont(fontName, capturedRange);
    } else {
        const input = document.getElementById(targetInputId);
        if (input) {
            input.value = fontName;
            input.style.fontFamily = `'${fontName}', sans-serif`;
            const event = new Event('change', { bubbles: true });
            input.dispatchEvent(event);
        }
    }
}

function openEffectsGalleryPopup() {
    // Snapshot the active selection NOW — before the popup steals focus.
    const _sel = window.getSelection();
    const _capturedRange = (_sel && _sel.rangeCount > 0)
        ? _sel.getRangeAt(0).cloneRange()
        : (window.lastSavedSelectionRange || null);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'effects-gallery-popup';
    overlay.style.display = 'flex';
    overlay.style.zIndex = 'var(--z-gallery-overlay)';
    overlay._capturedRange = _capturedRange;

    const effects = [
        { id: 'effect-glitch', name: 'Glitch', html: '<span class="effect-glitch" data-text="Glitch">Glitch</span>' },
        { id: 'effect-shake', name: 'Shake', html: '<span class="effect-shake">Shake</span>' },
        { id: 'effect-neon', name: 'Neon Glow', html: '<span class="effect-neon">Neon Glow</span>' },
        { id: 'effect-gradient-loop', name: 'Gradient Loop', html: '<span class="effect-gradient-loop" style="--grad-c1: #00f3ff; --grad-c2: #ff00ff;">Gradient Loop</span>' },
        { id: 'effect-bounce', name: 'Bounce', html: '<span class="effect-bounce">Bounce</span>' },
        { id: 'effect-rainbow', name: 'Rainbow Wave', html: '<span class="effect-rainbow">Rainbow Wave</span>' },
        { id: 'effect-flicker', name: 'Flicker', html: '<span class="effect-flicker">Flicker</span>' },
        { id: 'effect-pulse', name: 'Pulse', html: '<span class="effect-pulse">Pulse</span>' },
        { id: 'effect-wavy', name: 'Wavy', html: '<span class="effect-wavy">Wavy</span>' }
    ];

    const grid = document.createElement('div');
    grid.className = 'effects-grid';
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; padding: 2px;';

    effects.forEach(eff => {
        const card = document.createElement('div');
        card.className = 'effect-card';
        card.style.cssText = 'border: 1px solid var(--border); border-radius: var(--radius-md); padding: 20px; cursor: pointer; text-align: center; background: rgba(0,0,0,0.25); transition: all 0.2s; display: flex; flex-direction: column; gap: 8px; align-items: center; justify-content: center; min-height: 100px;';
        card.innerHTML = `
            <div style="font-size: 1.35rem; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%;">${eff.html}</div>
            <div style="font-size: 9px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px;">${eff.name}</div>
        `;
        card.addEventListener('mouseover', () => { card.style.borderColor = 'var(--accent)'; card.style.transform = 'translateY(-2px)'; });
        card.addEventListener('mouseout', () => { card.style.borderColor = 'var(--border)'; card.style.transform = 'none'; });
        card.addEventListener('click', () => {
            const savedRange = overlay._capturedRange || window.lastSavedSelectionRange;
            applyFormat('effect', eff.id, savedRange);
            document.getElementById('effects-gallery-popup').remove();
        });
        grid.appendChild(card);
    });

    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.cssText = 'width: min(100%, 750px); max-height: 85vh; display: flex; flex-direction: column;';
    content.innerHTML = `
        <div class="modal-header">
            <h2>EFFECTS GALLERY</h2>
            <p>Select a dynamic text animation macro to apply to the selected text.</p>
        </div>
        <div style="margin-top: 15px; margin-bottom: 5px; position: relative;">
            <i class="bi bi-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-dim); font-size: 14px;"></i>
            <input type="text" placeholder="Search effects..." style="width: 100%; padding: 8px 12px 8px 36px; background: rgba(0,0,0,0.4); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); font-size: var(--text-sm); outline: none;">
        </div>
        <div style="flex: 1; overflow-y: auto; margin-top: 10px; padding-right: 5px;"></div>
        <div style="display: flex; justify-content: flex-end; margin-top: 25px;">
            <button type="button" class="btn-outline" style="width: 120px;">CLOSE</button>
        </div>
    `;
    content.querySelector('input').addEventListener('input', function() {
        const q = this.value.toLowerCase();
        grid.querySelectorAll('.effect-card').forEach(c => { c.style.display = c.textContent.toLowerCase().includes(q) ? 'flex' : 'none'; });
    });
    content.querySelector('div[style*="overflow-y"]').appendChild(grid);
    content.querySelector('.btn-outline').addEventListener('click', () => document.getElementById('effects-gallery-popup').remove());
    overlay.appendChild(content);
    document.body.appendChild(overlay);
}

function openComponentsGalleryPopup() {
    // Snapshot the active selection NOW — before the popup steals focus.
    const _sel = window.getSelection();
    const _capturedRange = (_sel && _sel.rangeCount > 0)
        ? _sel.getRangeAt(0).cloneRange()
        : (window.lastSavedSelectionRange || null);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'components-gallery-popup';
    overlay.style.display = 'flex';
    overlay.style.zIndex = 'var(--z-gallery-overlay)';
    overlay._capturedRange = _capturedRange;

    const components = [
        { id: 'image', name: 'Image', icon: 'bi-image', desc: 'Display an image inside the dialogue flow.' },
        { id: 'link', name: 'Insert Link', icon: 'bi-link-45deg', desc: 'Add a hyperlink to external resources.' },
        { id: 'sfx', name: 'SFX Player', icon: 'bi-volume-up', desc: 'Embed an audio trigger that plays sound on click.' },
        { id: 'music', name: 'Music Player', icon: 'bi-music-note-beamed', desc: 'Embed an audio/music track from YouTube.' },
        { id: 'gif-heading', name: 'Gif Heading', icon: 'bi-file-earmark-play', desc: 'Show a visual title card with a moving GIF fill.' }
    ];

    const grid = document.createElement('div');
    grid.className = 'components-grid';
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; padding: 2px;';

    components.forEach(comp => {
        const card = document.createElement('div');
        card.className = 'component-card';
        card.style.cssText = 'border: 1px solid var(--border); border-radius: var(--radius-md); padding: 20px; cursor: pointer; text-align: center; background: rgba(0,0,0,0.25); transition: all 0.2s; display: flex; flex-direction: column; gap: 8px; align-items: center; justify-content: center; min-height: 120px;';
        card.innerHTML = `
            <i class="bi ${comp.icon}" style="font-size: 2rem; color: var(--accent);"></i>
            <div style="font-size: 1.1rem; font-weight: 700; color: #fff;">${comp.name}</div>
            <div style="font-size: 10px; color: var(--text-dim); line-height: 1.3;">${comp.desc}</div>
        `;
        card.addEventListener('mouseover', () => { card.style.borderColor = 'var(--accent)'; card.style.transform = 'translateY(-2px)'; });
        card.addEventListener('mouseout', () => { card.style.borderColor = 'var(--border)'; card.style.transform = 'none'; });
        card.addEventListener('click', () => {
            const savedRange = overlay._capturedRange || window.lastSavedSelectionRange;
            insertDialogueComponent(comp.id, savedRange);
            document.getElementById('components-gallery-popup').remove();
        });
        grid.appendChild(card);
    });

    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.cssText = 'width: min(100%, 650px); max-height: 85vh; display: flex; flex-direction: column;';
    content.innerHTML = `
        <div class="modal-header">
            <h2>COMPONENTS GALLERY</h2>
            <p>Insert an inline media or title element into your dialogue sequence.</p>
        </div>
        <div style="margin-top: 15px; margin-bottom: 5px; position: relative;">
            <i class="bi bi-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-dim); font-size: 14px;"></i>
            <input type="text" placeholder="Search components..." style="width: 100%; padding: 8px 12px 8px 36px; background: rgba(0,0,0,0.4); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); font-size: var(--text-sm); outline: none;">
        </div>
        <div style="flex: 1; overflow-y: auto; margin-top: 10px; padding-right: 5px;"></div>
        <div style="display: flex; justify-content: flex-end; margin-top: 25px;">
            <button type="button" class="btn-outline" style="width: 120px;">CLOSE</button>
        </div>
    `;
    content.querySelector('input').addEventListener('input', function() {
        const q = this.value.toLowerCase();
        grid.querySelectorAll('.component-card').forEach(c => { c.style.display = c.textContent.toLowerCase().includes(q) ? 'flex' : 'none'; });
    });
    content.querySelector('div[style*="overflow-y"]').appendChild(grid);
    content.querySelector('.btn-outline').addEventListener('click', () => document.getElementById('components-gallery-popup').remove());
    overlay.appendChild(content);
    document.body.appendChild(overlay);
}

function getActiveDialogueEditable() {
    const focusEl = document.getElementById('focus-dialogue-content');
    if (focusEl && focusEl.isConnected) {
        return focusEl;
    }
    const activeCanvasItem = document.querySelector('.canvas-item.active-edit');
    if (activeCanvasItem) {
        return activeCanvasItem.querySelector('.vn-dialogue-content');
    }
    return null;
}

function setDialogueEditView(mode) {
    const el = getActiveDialogueEditable();
    if (!el) return;

    const currentMode = el.classList.contains('source-editing') ? 'code' : 'markdown';
    if (currentMode === mode) return;

    const sourceVal = _getSourceValue(el);

    const btnMarkdown = document.getElementById('tab-view-markdown');
    const btnCode = document.getElementById('tab-view-code');
    const toolbar = document.getElementById('rich-text-toolbar');
    
    const sheet = el.closest('.dialogue-focus-sheet');
    const normalHeader = sheet ? sheet.querySelector('.dialogue-focus-sheet-header') : null;
    const vscodeHeader = sheet ? sheet.querySelector('.vscode-titlebar') : null;

    if (mode === 'markdown') {
        if (btnMarkdown) btnMarkdown.classList.add('active');
        if (btnCode) btnCode.classList.remove('active');
        if (toolbar) toolbar.style.display = 'flex';

        if (sheet) sheet.classList.remove('code-mode');
        if (normalHeader) normalHeader.style.display = 'flex';
        if (vscodeHeader) vscodeHeader.style.display = 'none';

        el.classList.remove('source-editing');
        el._sourceValue = sourceVal;
        el.innerHTML = sourceVal;
        el._lastDecoratedText = null;
    } else {
        if (btnMarkdown) btnMarkdown.classList.remove('active');
        if (btnCode) btnCode.classList.add('active');
        if (toolbar) toolbar.style.display = 'none';

        if (sheet) sheet.classList.add('code-mode');
        if (normalHeader) normalHeader.style.display = 'none';
        if (vscodeHeader) vscodeHeader.style.display = 'flex';

        el.classList.add('source-editing');
        el._sourceValue = sourceVal;
        el.innerText = sourceVal;
        el._lastDecoratedText = null;
        _scanAndDecorateColors(el, { force: true, preserveCursor: false });
    }
    el.focus();
}

function openDialogueFocusEditor(index) {
    const item = modularToFlat(canvasItems[index]);
    if (!item) return;
    
    const design = item['design'] || 'default';
    
    // Set active edit class on the canvas item so we know which index we are editing
    const items = document.querySelectorAll('.canvas-item');
    items.forEach((it, idx) => {
        if (idx === index) it.classList.add('active-edit');
        else it.classList.remove('active-edit');
    });

    const overlay = document.getElementById('dialogue-focus-overlay');
    const simulatorBox = document.getElementById('dialogue-focus-simulator-box');
    const header = document.getElementById('dialogue-editor-header');

    // Render the premium document-style editor page (Canva Docs / Notion look)
    simulatorBox.innerHTML = `
        <div class="dialogue-focus-sheet">
            <div class="dialogue-focus-sheet-header">
                <span class="sheet-category">DIALOGUE CONTENT</span>
                <span class="sheet-theme-tag">Theme: ${design.toUpperCase()}</span>
            </div>
            
            <div class="vscode-titlebar" style="display: none;">
                <div class="vscode-dots">
                    <span class="dot close"></span>
                    <span class="dot minimize"></span>
                    <span class="dot maximize"></span>
                </div>
                <div class="vscode-tabs">
                    <div class="vscode-tab active">
                        <i class="bi bi-code-slash text-warning" style="font-size: 13px;"></i>
                        <span>dialogue.html</span>
                        <i class="bi bi-x" style="font-size: 12px; opacity: 0.6; cursor: pointer;"></i>
                    </div>
                </div>
                <div class="vscode-actions">
                    <i class="bi bi-play-fill" title="Run Preview" style="cursor: pointer; opacity: 0.8; color: #27c93f;"></i>
                    <i class="bi bi-layout-sidebar-reverse" title="Toggle Sidebar" style="cursor: pointer; opacity: 0.8;"></i>
                </div>
            </div>

            <div class="dialogue-focus-divider"></div>
            <div class="editing-mode inline-edit" contenteditable="true" id="focus-dialogue-content"></div>
        </div>
    `;

    const focusContent = document.getElementById('focus-dialogue-content');
    focusContent._sourceValue = item['dialogue-text'] || '';
    focusContent.innerHTML = focusContent._sourceValue;

    // Register standard events (like input, keyup, mouseup, paste, etc.)
    focusContent.addEventListener('input', () => {
        _syncRichEditable(focusContent);
    });
    focusContent.addEventListener('keyup', handleTextSelection);
    focusContent.addEventListener('mouseup', handleTextSelection);
    focusContent.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        
        // Restore cursor after paste
        const newRange = document.createRange();
        newRange.setStartAfter(textNode);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        
        _syncRichEditable(focusContent);
        handleTextSelection();
    });

    // Pinned toolbar configuration
    header.classList.add('focus-mode');
    header.style.display = 'flex';
    document.body.appendChild(header);

    // Show overlay
    overlay.style.display = 'flex';
    // Small timeout to allow transition to trigger
    setTimeout(() => {
        overlay.classList.add('active');
    }, 10);

    // Focus and select all content
    focusContent.focus();
    const range = document.createRange();
    range.selectNodeContents(focusContent);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    
    // Setup tabs
    const btnMarkdown = document.getElementById('tab-view-markdown');
    const btnCode = document.getElementById('tab-view-code');
    const toolbar = document.getElementById('rich-text-toolbar');
    if (btnMarkdown) btnMarkdown.classList.add('active');
    if (btnCode) btnCode.classList.remove('active');
    if (toolbar) toolbar.style.display = 'flex';
    
    const sheet = focusContent.closest('.dialogue-focus-sheet');
    if (sheet) {
        sheet.classList.remove('code-mode');
        const normalHeader = sheet.querySelector('.dialogue-focus-sheet-header');
        const vscodeHeader = sheet.querySelector('.vscode-titlebar');
        if (normalHeader) normalHeader.style.display = 'flex';
        if (vscodeHeader) vscodeHeader.style.display = 'none';
    }

    focusContent._lastDecoratedText = null;
    focusContent._toolLock = false;
    focusContent._colorPickerOpen = false;
    focusContent._pendingPickerBlur = false;
    focusContent._isComposing = false;

    // Save history point
    recordHistory();
}

function cancelFocusDialogue() {
    const overlay = document.getElementById('dialogue-focus-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }

    const header = document.getElementById('dialogue-editor-header');
    if (header) {
        header.classList.remove('focus-mode');
        header.style.display = 'none';
        document.body.appendChild(header);
    }

    const activeCanvasItem = document.querySelector('.canvas-item.active-edit');
    if (activeCanvasItem) {
        // Re-render original text on canvas just in case it was modified in real-time
        const idx = Array.from(document.querySelectorAll('.canvas-item')).indexOf(activeCanvasItem);
        if (idx !== -1 && canvasItems[idx]) {
            const canvasContent = activeCanvasItem.querySelector('.vn-dialogue-content');
            if (canvasContent) {
                canvasContent.innerHTML = parseMarkdown(modularToFlat(canvasItems[idx])['dialogue-text']);
            }
        }
        activeCanvasItem.classList.remove('active-edit');
    }
    
    // Clear selection
    window.getSelection().removeAllRanges();
}
