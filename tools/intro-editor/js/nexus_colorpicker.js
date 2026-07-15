/**
 * nexus_colorpicker.js — Redesigned Color Studio (Solid & Gradient Modes)
 * Local version for Intro Editor
 */

(function () {
    const RECENT_COLORS_KEY = 'nexus_recent_colors_v2';
    const RECENT_GRADS_KEY = 'nexus_recent_gradients_v2';
    const MAX_RECENT = 12;
    const MAX_RECENT_GRADS = 20;

    const DEFAULT_PALETTE = [
        '#00F3FF', '#00FF88', '#FFCC00', '#FF4757', '#8844FF', '#FFFFFF'
    ];

    const GRADIENT_PRESETS = {
        'Sunset': { type: 'linear', angle: 45, colorStops: [{position: 0, color: '#ff5f6d'}, {position: 100, color: '#ffc371'}], opacityStops: [{position: 0, alpha: 100}, {position: 100, alpha: 100}] },
        'Ocean': { type: 'linear', angle: 90, colorStops: [{position: 0, color: '#00c6ff'}, {position: 100, color: '#0072ff'}], opacityStops: [{position: 0, alpha: 100}, {position: 100, alpha: 100}] },
        'Fire': { type: 'linear', angle: 90, colorStops: [{position: 0, color: '#f12711'}, {position: 100, color: '#f5af19'}], opacityStops: [{position: 0, alpha: 100}, {position: 100, alpha: 100}] },
        'Aurora': { type: 'linear', angle: 135, colorStops: [{position: 0, color: '#24c6dc'}, {position: 100, color: '#514a9d'}], opacityStops: [{position: 0, alpha: 100}, {position: 100, alpha: 100}] },
        'Cyber': { type: 'linear', angle: 90, colorStops: [{position: 0, color: '#00f3ff'}, {position: 100, color: '#ff00ff'}], opacityStops: [{position: 0, alpha: 100}, {position: 100, alpha: 100}] },
        'Royal': { type: 'linear', angle: 180, colorStops: [{position: 0, color: '#141e30'}, {position: 100, color: '#243b55'}], opacityStops: [{position: 0, alpha: 100}, {position: 100, alpha: 100}] },
        'Gold': { type: 'linear', angle: 90, colorStops: [{position: 0, color: '#ffe066'}, {position: 50, color: '#f5af19'}, {position: 100, color: '#e65c00'}], opacityStops: [{position: 0, alpha: 100}, {position: 100, alpha: 100}] },
        'Candy': { type: 'linear', angle: 45, colorStops: [{position: 0, color: '#ff0844'}, {position: 100, color: '#ffb199'}], opacityStops: [{position: 0, alpha: 100}, {position: 100, alpha: 100}] },
        'Pastel': { type: 'linear', angle: 90, colorStops: [{position: 0, color: '#ff9a9e'}, {position: 50, color: '#fecfef'}, {position: 100, color: '#a1c4fd'}], opacityStops: [{position: 0, alpha: 100}, {position: 100, alpha: 100}] },
        'Mono': { type: 'linear', angle: 90, colorStops: [{position: 0, color: '#000000'}, {position: 100, color: '#ffffff'}], opacityStops: [{position: 0, alpha: 100}, {position: 100, alpha: 100}] }
    };

    let recentColors = [];
    try { recentColors = JSON.parse(localStorage.getItem(RECENT_COLORS_KEY) || '[]'); } catch (e) { recentColors = []; }

    let recentGradients = [];
    try { recentGradients = JSON.parse(localStorage.getItem(RECENT_GRADS_KEY) || '[]'); } catch (e) { recentGradients = []; }

    function saveRecent(hex) {
        hex = hex.toUpperCase();
        recentColors = [hex, ...recentColors.filter(c => c !== hex)].slice(0, MAX_RECENT);
        try { localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(recentColors)); } catch (e) {}
    }

    function saveRecentGradient(grad) {
        // De-duplicate by comparing serialized JSON strings
        const checkStr = JSON.stringify({ type: grad.type, angle: grad.angle, colorStops: grad.colorStops, opacityStops: grad.opacityStops });
        recentGradients = [grad, ...recentGradients.filter(g => {
            return JSON.stringify({ type: g.type, angle: g.angle, colorStops: g.colorStops, opacityStops: g.opacityStops }) !== checkStr;
        })].slice(0, MAX_RECENT_GRADS);
        try { localStorage.setItem(RECENT_GRADS_KEY, JSON.stringify(recentGradients)); } catch (e) {}
    }

    // --- UTILS ---
    function hsvToRgb(h, s, v) {
        const f = (n) => {
            const k = (n + h / 60) % 6;
            return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
        };
        return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)];
    }

    function rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const d = max - min;
        let h = 0, s = max === 0 ? 0 : d / max, v = max;
        if (d !== 0) {
            if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h *= 60;
        }
        return [h, s, v];
    }

    function hexToRgb(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const n = parseInt(hex, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    }

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function cssColorToHex(name) {
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.fillStyle = name;
        return ctx.fillStyle.startsWith('#') ? ctx.fillStyle : '#ffffff';
    }

    function parseCssColor(str) {
        str = String(str).trim().toLowerCase();
        
        if (str.startsWith('#')) {
            const hex = str.replace('#', '');
            let r, g, b;
            if (hex.length === 3) {
                r = parseInt(hex[0] + hex[0], 16);
                g = parseInt(hex[1] + hex[1], 16);
                b = parseInt(hex[2] + hex[2], 16);
            } else if (hex.length >= 6) {
                r = parseInt(hex.substring(0, 2), 16);
                g = parseInt(hex.substring(2, 4), 16);
                b = parseInt(hex.substring(4, 6), 16);
            } else {
                return [255, 255, 255, 1.0];
            }
            return [r, g, b, 1.0];
        }
        
        const rgbMatch = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+)\s*)?\)/);
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1]);
            const g = parseInt(rgbMatch[2]);
            const b = parseInt(rgbMatch[3]);
            const a = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1.0;
            return [r, g, b, a];
        }
        
        const hex = cssColorToHex(str);
        if (hex.startsWith('#')) {
            return parseCssColor(hex);
        }
        
        return [255, 255, 255, 1.0];
    }

    // --- PICKER STATE ---
    let pickerEl = null;
    let currentMode = 'solid'; // 'solid' or 'gradient'
    let state = { h: 0, s: 1, v: 1 }; // HSV for color picker
    let solidColor = '#ffffff';
    let solidAlpha = 100; // 0 to 100


    let gradientState = {
        type: 'linear',
        angle: 90,
        colorStops: [
            { position: 0, color: '#00f3ff' },
            { position: 100, color: '#ff00ff' }
        ],
        opacityStops: [
            { position: 0, alpha: 100 },
            { position: 100, alpha: 100 }
        ]
    };

    let selectedStop = null;      // Reference to selected stop object
    let selectedStopType = 'color'; // 'color' or 'opacity'

    let activeOnChange = null;
    let activeOnApply = null;
    let activeOnCancel = null;
    let activeOnClose = null;
    let dragging = null; // 'hue', 'sv', 'v'

    // Dragging gradient stops state
    let dragStopRef = null;
    let dragStopType = '';
    let dragStartX = 0;
    let dragStartPos = 0;

    function buildPicker() {
        const el = document.createElement('div');
        el.id = 'nexus-color-picker';
        el.className = 'nexus-color-picker';
        el.setAttribute('data-ignore-close', 'true');
        el.innerHTML = `
            <div class="ncp-header">
                <span class="ncp-title">Color Studio</span>
                <span class="ncp-close">&times;</span>
            </div>
            
            <div class="ncp-tabs">
                <button class="ncp-tab active" data-mode="solid">Solid</button>
                <button class="ncp-tab" data-mode="gradient">Gradient</button>
            </div>

            <!-- Gradient specific panel -->
            <div class="ncp-gradient-content" style="display: none;">
                <div class="ncp-grad-preview-box">
                    <div class="ncp-grad-preview-text">HELLO WORLD</div>
                </div>
                <div class="ncp-grad-builder">
                    <div class="ncp-grad-track ncp-opacity-track" title="Click to add Opacity stop"></div>
                    <div class="ncp-grad-bar-wrapper">
                        <div class="ncp-grad-bar"></div>
                    </div>
                    <div class="ncp-grad-track ncp-color-track" title="Click to add Color stop"></div>
                </div>
                <div class="ncp-grad-controls-row">
                    <div class="ncp-grad-control-group">
                        <label>Angle</label>
                        <div class="ncp-angle-input-wrapper">
                            <input type="range" class="ncp-grad-angle-slider" min="0" max="360" value="90">
                            <input type="number" class="ncp-grad-angle-input" min="0" max="360" value="90">
                        </div>
                    </div>
                    <div class="ncp-grad-control-group">
                        <label>Style</label>
                        <div class="ncp-segmented-control ncp-grad-type">
                            <button class="active" data-type="linear">Linear</button>
                            <button data-type="radial">Radial</button>
                        </div>
                    </div>
                    <button class="ncp-grad-reverse-btn" title="Reverse stops">⇄</button>
                </div>
            </div>
            
            <!-- Shared Picker controls (Wheel, SV, Brightness) -->
            <div class="ncp-shared-picker-controls">
                <div class="ncp-wheel-container">
                    <canvas class="ncp-hue-canvas" width="440" height="440" style="width: 220px; height: 220px;"></canvas>
                    <div class="ncp-hue-cursor"></div>
                    <div class="ncp-sv-container">
                        <canvas class="ncp-sv-canvas" width="220" height="220" style="width: 110px; height: 110px;"></canvas>
                        <div class="ncp-sv-cursor"></div>
                    </div>
                </div>
                
                <div class="ncp-v-bar">
                    <canvas class="ncp-v-canvas" width="440" height="20" style="width: 220px; height: 10px;"></canvas>
                    <div class="ncp-v-cursor"></div>
                </div>

                <!-- Relocated Opacity Slider Row (Shared) -->
                <div class="ncp-opacity-slider-row" style="display: none; margin-top: 8px;">
                    <label>Opacity</label>
                    <div class="ncp-opacity-slider-wrapper">
                        <input type="range" class="ncp-opacity-slider" min="0" max="100" value="100">
                        <span class="ncp-opacity-val">100%</span>
                    </div>
                </div>
            </div>

            <!-- Shared Inputs row -->
            <div class="ncp-shared-inputs-row">
                <div class="ncp-preview-row">
                    <div class="ncp-preview-swatch"></div>
                    <div class="ncp-inputs">
                        <div class="ncp-hex-row" style="display: flex; gap: 4px; width: 100%;">
                            <input class="ncp-hex-input" type="text" maxlength="7" placeholder="#FFFFFF" spellcheck="false" style="flex: 1;">
                            <button class="ncp-copy-btn" title="Copy Hex" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 8px; padding: 0 8px; cursor: pointer; border-radius: 6px;"><i class="bi bi-clipboard"></i></button>
                        </div>
                        <div class="ncp-rgb-row">
                            <input class="ncp-r" type="number" min="0" max="255" placeholder="R">
                            <input class="ncp-g" type="number" min="0" max="255" placeholder="G">
                            <input class="ncp-b" type="number" min="0" max="255" placeholder="B">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bottom Swatches -->
            <div class="ncp-solid-swatches">
                <div class="ncp-section-label">RECENT & PALETTE</div>
                <div class="ncp-grid ncp-palette"></div>
            </div>

            <div class="ncp-gradient-swatches" style="display: none;">
                <div class="ncp-presets-container">
                    <div class="ncp-preset-label">Recent Gradients</div>
                    <div class="ncp-grad-recent-grid"></div>
                    <div class="ncp-preset-label">Presets</div>
                    <div class="ncp-grad-presets-grid"></div>
                </div>
            </div>

            <!-- Custom Name Row (Solid only) -->
            <div class="ncp-name-row" style="display: none; padding: 10px 16px 0 16px; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 8px;">
                <label style="font-size: 8px; font-weight: 800; color: rgba(255,255,255,0.4); letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 4px; display: block;">Custom Name</label>
                <input class="ncp-name-input" type="text" placeholder="Theme Default Color" style="width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 6px 10px; border-radius: 6px; font-size: 11px; outline: none; font-family: inherit;" spellcheck="false">
            </div>

            <!-- Footer actions -->
            <div class="ncp-actions-row">
                <button class="ncp-cancel-btn">Cancel</button>
                <button class="ncp-apply-btn">Apply</button>
            </div>
        `;
        document.body.appendChild(el);
        return el;
    }


    function drawHue(canvas) {
        const ctx = canvas.getContext('2d');
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const outer = canvas.width / 2;
        const inner = outer - 40;

        for (let i = 0; i < 360; i++) {
            const startAngle = (i - 0.5) * Math.PI / 180;
            const endAngle = (i + 0.5) * Math.PI / 180;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, outer, startAngle, endAngle);
            ctx.closePath();
            const [r, g, b] = hsvToRgb(i, 1, 1);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fill();
        }

        // Clip the middle
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(cx, cy, inner, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }

    function drawSV(canvas, hue) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const [r, g, b] = hsvToRgb(hue, 1, 1);
        const hueColor = `rgb(${r},${g},${b})`;

        const lgH = ctx.createLinearGradient(0, 0, w, 0);
        lgH.addColorStop(0, '#fff');
        lgH.addColorStop(1, hueColor);
        ctx.fillStyle = lgH;
        ctx.fillRect(0, 0, w, h);

        const lgV = ctx.createLinearGradient(0, 0, 0, h);
        lgV.addColorStop(0, 'transparent');
        lgV.addColorStop(1, '#000');
        ctx.fillStyle = lgV;
        ctx.fillRect(0, 0, w, h);
    }

    function drawVBar(canvas, hue, s) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        const lg = ctx.createLinearGradient(0, 0, w, 0);
        const [r, g, b] = hsvToRgb(hue, s, 1);
        lg.addColorStop(0, '#000');
        lg.addColorStop(1, `rgb(${r},${g},${b})`);
        ctx.fillStyle = lg;
        ctx.fillRect(0, 0, w, h);
    }

    function updateCursors() {
        const hCursor = pickerEl.querySelector('.ncp-hue-cursor');
        const svCursor = pickerEl.querySelector('.ncp-sv-cursor');
        const vCursor = pickerEl.querySelector('.ncp-v-cursor');

        // Hue cursor
        const angle = state.h * Math.PI / 180;
        const radius = 97.5; // (85 + 110) / 2
        const cx = 110, cy = 110;
        hCursor.style.left = (cx + Math.cos(angle) * radius) + 'px';
        hCursor.style.top = (cy + Math.sin(angle) * radius) + 'px';

        // SV cursor
        svCursor.style.left = (state.s * 110) + 'px';
        svCursor.style.top = ((1 - state.v) * 110) + 'px';

        // V cursor
        vCursor.style.left = (state.v * 220) + 'px';
    }

    function updateUI(skipInputs = false, skipSessionTrigger = false) {
        const svCanvas = pickerEl.querySelector('.ncp-sv-canvas');
        const vCanvas = pickerEl.querySelector('.ncp-v-canvas');
        drawSV(svCanvas, state.h);
        drawVBar(vCanvas, state.h, state.s);
        updateCursors();

        const [r, g, b] = hsvToRgb(state.h, state.s, state.v);
        const hex = rgbToHex(r, g, b);
        
        let displayColor = hex;
        if (currentMode === 'solid') {
            if (solidAlpha < 100) {
                displayColor = `rgba(${r}, ${g}, ${b}, ${solidAlpha / 100})`;
            } else {
                displayColor = hex;
            }
            solidColor = displayColor;
            pickerEl.querySelector('.ncp-preview-swatch').style.background = displayColor;
            
            if (activeOnChange && !skipSessionTrigger) {
                activeOnChange(displayColor, 'solid');
            }
        } else if (currentMode === 'gradient') {
            pickerEl.querySelector('.ncp-preview-swatch').style.background = hex;
            if (selectedStop && selectedStopType === 'color') {
                selectedStop.color = hex;
                updateGradientUI(skipSessionTrigger);
            }
        }
        
        if (!skipInputs) {
            pickerEl.querySelector('.ncp-hex-input').value = hex;
            pickerEl.querySelector('.ncp-r').value = r;
            pickerEl.querySelector('.ncp-g').value = g;
            pickerEl.querySelector('.ncp-b').value = b;
        }
    }

    function setColor(hex, skipInputs = false, skipSessionTrigger = false) {
        try {
            const [r, g, b, alpha] = parseCssColor(hex);
            const [h, s, v] = rgbToHsv(r, g, b);
            state = { h, s, v };
            if (alpha !== undefined && alpha !== null) {
                solidAlpha = Math.round(alpha * 100);
                const opSlider = pickerEl.querySelector('.ncp-opacity-slider');
                const opVal = pickerEl.querySelector('.ncp-opacity-val');
                if (opSlider && opVal) {
                    opSlider.value = solidAlpha;
                    opVal.innerText = solidAlpha + '%';
                }
            }
            updateUI(skipInputs, skipSessionTrigger);
        } catch (e) {}
    }


    function buildPalette() {
        const grid = pickerEl.querySelector('.ncp-palette');
        grid.innerHTML = '';
        
        const combined = [...new Set([...recentColors, ...DEFAULT_PALETTE])].slice(0, 12);
        
        combined.forEach(hex => {
            const sw = document.createElement('div');
            sw.className = 'ncp-swatch';
            sw.style.background = hex;
            sw.title = hex;
            sw.addEventListener('mousedown', e => {
                e.preventDefault();
                setColor(hex);
            });
            grid.appendChild(sw);
        });
    }

    // --- GRADIENT INTERPOLATION & CALCULATION ---
    function interpolateColorAt(position) {
        const stops = gradientState.colorStops;
        let left = null, right = null;
        for (let s of stops) {
            if (s.position <= position) {
                if (!left || s.position > left.position) left = s;
            }
            if (s.position >= position) {
                if (!right || s.position < right.position) right = s;
            }
        }
        if (left && right) {
            if (left.position === right.position) return left.color;
            let ratio = (position - left.position) / (right.position - left.position);
            let c1 = hexToRgb(left.color);
            let c2 = hexToRgb(right.color);
            return rgbToHex(
                Math.round(c1[0] + (c2[0] - c1[0]) * ratio),
                Math.round(c1[1] + (c2[1] - c1[1]) * ratio),
                Math.round(c1[2] + (c2[2] - c1[2]) * ratio)
            );
        }
        return left ? left.color : (right ? right.color : '#ffffff');
    }

    function interpolateAlphaAt(position) {
        const stops = gradientState.opacityStops;
        let left = null, right = null;
        for (let s of stops) {
            if (s.position <= position) {
                if (!left || s.position > left.position) left = s;
            }
            if (s.position >= position) {
                if (!right || s.position < right.position) right = s;
            }
        }
        if (left && right) {
            if (left.position === right.position) return left.alpha;
            let ratio = (position - left.position) / (right.position - left.position);
            return Math.round(left.alpha + (right.alpha - left.alpha) * ratio);
        }
        return left ? left.alpha : (right ? right.alpha : 100);
    }

    function getMergedStops() {
        const positions = new Set([
            ...gradientState.colorStops.map(s => s.position),
            ...gradientState.opacityStops.map(s => s.position),
            0, 100
        ]);
        const sorted = Array.from(positions).sort((a,b) => a - b);
        return sorted.map(pos => {
            const color = interpolateColorAt(pos);
            const alpha = interpolateAlphaAt(pos);
            return { position: pos, color, alpha };
        });
    }

    function getCSSGradientString(isVerticalOrAngle = false) {
        const merged = getMergedStops();
        const stopStrings = merged.map(s => {
            const rgb = hexToRgb(s.color);
            return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${s.alpha / 100}) ${s.position}%`;
        });
        
        if (gradientState.type === 'radial') {
            return `radial-gradient(circle, ${stopStrings.join(', ')})`;
        } else {
            const angle = (isVerticalOrAngle === true || isVerticalOrAngle === 90) ? 90 : (typeof isVerticalOrAngle === 'number' ? isVerticalOrAngle : gradientState.angle);
            return `linear-gradient(${angle}deg, ${stopStrings.join(', ')})`;
        }
    }

    function buildMiniGradientStrip(grad) {
        const merged = [];
        const positions = new Set([
            ...grad.colorStops.map(s => s.position),
            ...grad.opacityStops.map(s => s.position),
            0, 100
        ]);
        const sorted = Array.from(positions).sort((a,b) => a - b);
        sorted.forEach(pos => {
            // Local inline interpolation for presets
            let cLeft = null, cRight = null;
            for (let s of grad.colorStops) {
                if (s.position <= pos) { if (!cLeft || s.position > cLeft.position) cLeft = s; }
                if (s.position >= pos) { if (!cRight || s.position < cRight.position) cRight = s; }
            }
            let color = '#ffffff';
            if (cLeft && cRight) {
                if (cLeft.position === cRight.position) color = cLeft.color;
                else {
                    let r = (pos - cLeft.position) / (cRight.position - cLeft.position);
                    let rgb1 = hexToRgb(cLeft.color), rgb2 = hexToRgb(cRight.color);
                    color = rgbToHex(Math.round(rgb1[0]+(rgb2[0]-rgb1[0])*r), Math.round(rgb1[1]+(rgb2[1]-rgb1[1])*r), Math.round(rgb1[2]+(rgb2[2]-rgb1[2])*r));
                }
            } else if (cLeft) color = cLeft.color;
            else if (cRight) color = cRight.color;

            let aLeft = null, aRight = null;
            for (let s of grad.opacityStops) {
                if (s.position <= pos) { if (!aLeft || s.position > aLeft.position) aLeft = s; }
                if (s.position >= pos) { if (!aRight || s.position < aRight.position) aRight = s; }
            }
            let alpha = 100;
            if (aLeft && aRight) {
                if (aLeft.position === aRight.position) alpha = aLeft.alpha;
                else {
                    let r = (pos - aLeft.position) / (aRight.position - aLeft.position);
                    alpha = Math.round(aLeft.alpha + (aRight.alpha - aLeft.alpha) * r);
                }
            } else if (aLeft) alpha = aLeft.alpha;
            else if (aRight) alpha = aRight.alpha;

            merged.push({ position: pos, color, alpha });
        });

        const stopsStr = merged.map(s => {
            const rgb = hexToRgb(s.color);
            return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${s.alpha / 100}) ${s.position}%`;
        });
        return `linear-gradient(90deg, ${stopsStr.join(', ')})`;
    }

    // --- GRADIENT UI UPDATE & STOPS RENDERING ---
    function selectStop(type, stop) {
        selectedStopType = type;
        selectedStop = stop;
        
        const opacitySliderRow = pickerEl.querySelector('.ncp-opacity-slider-row');
        const sharedPickerSection = pickerEl.querySelector('.ncp-shared-picker-controls');
        const sharedInputsRow = pickerEl.querySelector('.ncp-shared-inputs-row');

        if (type === 'color') {
            opacitySliderRow.style.display = 'none';
            sharedPickerSection.classList.remove('ncp-disabled');
            sharedInputsRow.classList.remove('ncp-disabled');
            setColor(stop.color, false, true); // true to skip session triggers
        } else {
            opacitySliderRow.style.display = 'flex';
            sharedPickerSection.classList.add('ncp-disabled');
            sharedInputsRow.classList.add('ncp-disabled');
            
            const slider = pickerEl.querySelector('.ncp-opacity-slider');
            const valLabel = pickerEl.querySelector('.ncp-opacity-val');
            slider.value = stop.alpha;
            valLabel.innerText = stop.alpha + '%';
        }

        renderStops();
    }

    function renderStops() {
        const opacityTrack = pickerEl.querySelector('.ncp-opacity-track');
        const colorTrack = pickerEl.querySelector('.ncp-color-track');
        
        opacityTrack.innerHTML = '';
        colorTrack.innerHTML = '';

        // Render Opacity Stops
        gradientState.opacityStops.forEach((stop, idx) => {
            const marker = document.createElement('div');
            marker.className = `ncp-stop-marker ncp-opacity-stop${selectedStop === stop ? ' selected' : ''}`;
            marker.style.left = `${stop.position}%`;
            marker.innerHTML = `<div class="ncp-stop-marker-inner" style="background: rgba(128,128,128,${stop.alpha/100});"></div>`;
            
            marker.addEventListener('mousedown', e => {
                e.preventDefault();
                e.stopPropagation();
                selectStop('opacity', stop);
                startDraggingStop(e, 'opacity', stop);
            });
            opacityTrack.appendChild(marker);
        });

        // Render Color Stops
        gradientState.colorStops.forEach((stop, idx) => {
            const marker = document.createElement('div');
            marker.className = `ncp-stop-marker ncp-color-stop${selectedStop === stop ? ' selected' : ''}`;
            marker.style.left = `${stop.position}%`;
            marker.innerHTML = `<div class="ncp-stop-color-swatch" style="background: ${stop.color};"></div>`;
            
            marker.addEventListener('mousedown', e => {
                e.preventDefault();
                e.stopPropagation();
                selectStop('color', stop);
                startDraggingStop(e, 'color', stop);
            });
            // Double click to focus HEX
            marker.addEventListener('dblclick', e => {
                e.preventDefault();
                const hexIn = pickerEl.querySelector('.ncp-hex-input');
                hexIn.focus();
                hexIn.select();
            });
            colorTrack.appendChild(marker);
        });
    }

    function updateGradientUI(skipSessionTrigger = false) {
        const gradBar = pickerEl.querySelector('.ncp-grad-bar');
        const previewText = pickerEl.querySelector('.ncp-grad-preview-text');

        // Update bar strip
        const gradBarCSS = getCSSGradientString(90);
        gradBar.style.background = gradBarCSS;

        // Update preview text box with actual layout
        const actualCSS = getCSSGradientString();
        previewText.style.background = actualCSS;
        previewText.style.webkitBackgroundClip = 'text';
        previewText.style.backgroundClip = 'text';
        previewText.style.webkitTextFillColor = 'transparent';

        // Redraw stops inside tracks
        renderStops();

        // Push real-time formatted CSS to activeOnChange
        if (activeOnChange && !skipSessionTrigger) {
            const inlineStyle = `background: ${actualCSS}; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; display: inline-block;`;
            activeOnChange(inlineStyle, 'gradient');
        }
    }

    // --- STOPS INTERACTION HANDLERS (DRAG & DROP) ---
    function startDraggingStop(e, type, stop) {
        dragStopRef = stop;
        dragStopType = type;
        dragStartX = e.clientX;
        dragStartPos = stop.position;

        window.addEventListener('mousemove', onDragStop);
        window.addEventListener('mouseup', onDragStopEnd);
    }

    function onDragStop(e) {
        if (!dragStopRef) return;
        
        const track = dragStopType === 'opacity' 
            ? pickerEl.querySelector('.ncp-opacity-track') 
            : pickerEl.querySelector('.ncp-color-track');
        const rect = track.getBoundingClientRect();
        const deltaX = e.clientX - dragStartX;
        let newPos = Math.round(dragStartPos + (deltaX / rect.width) * 100);
        newPos = clamp(newPos, 0, 100);

        if (e.shiftKey) {
            newPos = Math.round(newPos / 10) * 10;
        }

        dragStopRef.position = newPos;

        // Visual feedback for deletion when dragged vertically
        const distY = Math.abs(e.clientY - (rect.top + rect.height / 2));
        const marker = pickerEl.querySelector(`.ncp-${dragStopType}-stop.selected`);
        if (marker) {
            if (distY > 30 && canDeleteStop(dragStopType)) {
                marker.style.opacity = '0.35';
            } else {
                marker.style.opacity = '1';
            }
        }

        // Keep array sorted
        if (dragStopType === 'opacity') {
            gradientState.opacityStops.sort((a,b) => a.position - b.position);
        } else {
            gradientState.colorStops.sort((a,b) => a.position - b.position);
        }

        updateGradientUI();
    }

    function onDragStopEnd(e) {
        window.removeEventListener('mousemove', onDragStop);
        window.removeEventListener('mouseup', onDragStopEnd);

        if (dragStopRef) {
            const track = dragStopType === 'opacity' 
                ? pickerEl.querySelector('.ncp-opacity-track') 
                : pickerEl.querySelector('.ncp-color-track');
            const rect = track.getBoundingClientRect();
            const distY = Math.abs(e.clientY - (rect.top + rect.height / 2));

            if (distY > 30) {
                deleteStop(dragStopType, dragStopRef);
            }
            dragStopRef = null;
            dragStopType = '';
            updateGradientUI();
        }
    }

    function canDeleteStop(type) {
        const arr = type === 'opacity' ? gradientState.opacityStops : gradientState.colorStops;
        return arr.length > 2;
    }

    function deleteStop(type, stop) {
        const arr = type === 'opacity' ? gradientState.opacityStops : gradientState.colorStops;
        if (arr.length <= 2) return; // Enforce minimum 2 stops
        
        const idx = arr.indexOf(stop);
        if (idx !== -1) {
            arr.splice(idx, 1);
            if (selectedStop === stop) {
                selectedStop = arr[0];
                selectStop(type, selectedStop);
            }
        }
    }

    function addColorStopAt(xRatio) {
        if (gradientState.colorStops.length >= 10) return; // Enforce maximum 10 stops
        const position = Math.round(xRatio * 100);
        
        // Don't duplicate positions
        if (gradientState.colorStops.some(s => s.position === position)) return;

        const color = interpolateColorAt(position);
        const newStop = { position, color };
        gradientState.colorStops.push(newStop);
        gradientState.colorStops.sort((a,b) => a.position - b.position);
        
        selectStop('color', newStop);
        updateGradientUI();
    }

    function addOpacityStopAt(xRatio) {
        if (gradientState.opacityStops.length >= 10) return; // Enforce maximum 10 stops
        const position = Math.round(xRatio * 100);
        
        // Don't duplicate positions
        if (gradientState.opacityStops.some(s => s.position === position)) return;

        const alpha = interpolateAlphaAt(position);
        const newStop = { position, alpha };
        gradientState.opacityStops.push(newStop);
        gradientState.opacityStops.sort((a,b) => a.position - b.position);

        selectStop('opacity', newStop);
        updateGradientUI();
    }

    // --- REVERSE STOPS ---
    function reverseStops() {
        gradientState.colorStops.forEach(s => {
            s.position = 100 - s.position;
        });
        gradientState.colorStops.sort((a,b) => a.position - b.position);

        gradientState.opacityStops.forEach(s => {
            s.position = 100 - s.position;
        });
        gradientState.opacityStops.sort((a,b) => a.position - b.position);

        updateGradientUI();
    }

    // --- DUPLICATE SELECTED STOP ---
    function duplicateSelectedStop() {
        if (!selectedStop) return;
        const arr = selectedStopType === 'opacity' ? gradientState.opacityStops : gradientState.colorStops;
        if (arr.length >= 10) return;

        const newPos = clamp(selectedStop.position + 5, 0, 100);
        if (selectedStopType === 'opacity') {
            const copy = { position: newPos, alpha: selectedStop.alpha };
            gradientState.opacityStops.push(copy);
            gradientState.opacityStops.sort((a,b) => a.position - b.position);
            selectStop('opacity', copy);
        } else {
            const copy = { position: newPos, color: selectedStop.color };
            gradientState.colorStops.push(copy);
            gradientState.colorStops.sort((a,b) => a.position - b.position);
            selectStop('color', copy);
        }
        updateGradientUI();
    }

    // --- LOAD PRESET / RECENT GRADIENT ---
    function loadGradient(grad) {
        gradientState = JSON.parse(JSON.stringify(grad));
        
        // Set type UI
        pickerEl.querySelectorAll('.ncp-grad-type button').forEach(b => {
            b.classList.toggle('active', b.dataset.type === gradientState.type);
        });

        // Set angle UI
        pickerEl.querySelector('.ncp-grad-angle-slider').value = gradientState.angle;
        pickerEl.querySelector('.ncp-grad-angle-input').value = gradientState.angle;

        // Select first color stop by default
        selectStop('color', gradientState.colorStops[0]);
        updateGradientUI();
    }

    function buildRecentGradients() {
        const grid = pickerEl.querySelector('.ncp-grad-recent-grid');
        grid.innerHTML = '';
        if (recentGradients.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; font-size: 9px; color: rgba(255,255,255,0.25); text-align: center; line-height: 14px;">No recents yet</div>';
            return;
        }

        recentGradients.forEach(grad => {
            const card = document.createElement('div');
            card.className = 'ncp-grad-recent-card';
            card.style.background = buildMiniGradientStrip(grad);
            card.addEventListener('mousedown', e => {
                e.preventDefault();
                loadGradient(grad);
            });
            grid.appendChild(card);
        });
    }

    function buildPresetGradients() {
        const grid = pickerEl.querySelector('.ncp-grad-presets-grid');
        grid.innerHTML = '';
        Object.keys(GRADIENT_PRESETS).forEach(name => {
            const grad = GRADIENT_PRESETS[name];
            const card = document.createElement('div');
            card.className = 'ncp-grad-preset-card';
            card.style.background = buildMiniGradientStrip(grad);
            card.title = name;
            card.addEventListener('mousedown', e => {
                e.preventDefault();
                loadGradient(grad);
            });
            grid.appendChild(card);
        });
    }

    // --- CLIPBOARD ACTIONS ---
    function copyGradientToClipboard() {
        const str = JSON.stringify(gradientState);
        navigator.clipboard.writeText(str).then(() => {
            const title = pickerEl.querySelector('.ncp-title');
            const old = title.innerText;
            title.innerText = 'GRADIENT COPIED!';
            setTimeout(() => title.innerText = old, 1500);
        });
    }

    function pasteGradientFromClipboard() {
        navigator.clipboard.readText().then(text => {
            text = text.trim();
            // Try loading from JSON
            if (text.startsWith('{')) {
                try {
                    const parsed = JSON.parse(text);
                    if (parsed.colorStops && parsed.opacityStops) {
                        loadGradient(parsed);
                        return;
                    }
                } catch (e) {}
            }
            // Fallback: parse as CSS gradient
            const parsedCSS = parseCSSGradient(text);
            if (parsedCSS) {
                loadGradient(parsedCSS);
            }
        });
    }

    // --- KEYBOARD LISTENERS ---
    window.addEventListener('keydown', e => {
        if (!pickerEl || pickerEl.style.display !== 'flex') return;
        if (currentMode !== 'gradient') return;
        
        // Ignore if typing inside any input
        if (document.activeElement.tagName === 'INPUT') return;

        let handled = false;
        const nudge = e.shiftKey ? 10 : 1;

        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedStop && canDeleteStop(selectedStopType)) {
                deleteStop(selectedStopType, selectedStop);
                updateGradientUI();
                handled = true;
            }
        } else if (e.key === 'ArrowLeft') {
            if (selectedStop) {
                selectedStop.position = clamp(selectedStop.position - nudge, 0, 100);
                if (selectedStopType === 'opacity') {
                    gradientState.opacityStops.sort((a,b) => a.position - b.position);
                } else {
                    gradientState.colorStops.sort((a,b) => a.position - b.position);
                }
                updateGradientUI();
                handled = true;
            }
        } else if (e.key === 'ArrowRight') {
            if (selectedStop) {
                selectedStop.position = clamp(selectedStop.position + nudge, 0, 100);
                if (selectedStopType === 'opacity') {
                    gradientState.opacityStops.sort((a,b) => a.position - b.position);
                } else {
                    gradientState.colorStops.sort((a,b) => a.position - b.position);
                }
                updateGradientUI();
                handled = true;
            }
        } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
            copyGradientToClipboard();
            handled = true;
        } else if (e.ctrlKey && e.key.toLowerCase() === 'v') {
            pasteGradientFromClipboard();
            handled = true;
        } else if (e.ctrlKey && e.key.toLowerCase() === 'd') {
            duplicateSelectedStop();
            handled = true;
        }

        if (handled) {
            e.preventDefault();
        }
    });

    // --- PARSING CSS GRADIENT STRINGS ---
    function splitGradients(str) {
        let parts = [];
        let current = "";
        let depth = 0;
        for (let char of str) {
            if (char === '(') depth++;
            else if (char === ')') depth--;
            if (char === ',' && depth === 0) {
                parts.push(current.trim());
                current = "";
            } else {
                current += char;
            }
        }
        if (current.trim()) parts.push(current.trim());
        return parts;
    }

    function parseCSSGradient(cssStr) {
        if (!cssStr) return null;
        cssStr = cssStr.trim();
        
        let type = 'linear';
        if (cssStr.includes('radial-gradient')) {
            type = 'radial';
        }
        
        const startIdx = cssStr.indexOf('(');
        const endIdx = cssStr.lastIndexOf(')');
        if (startIdx === -1 || endIdx === -1) return null;
        
        const inner = cssStr.slice(startIdx + 1, endIdx);
        const parts = splitGradients(inner);
        if (parts.length < 2) return null;
        
        let angle = 90;
        let stopParts = [];
        
        const first = parts[0].toLowerCase();
        if (first.includes('deg') || first.includes('to ') || first.includes('circle') || first.includes('ellipse') || first.includes('at ')) {
            if (first.includes('deg')) {
                angle = parseInt(first) || 90;
            } else if (first.includes('to right')) {
                angle = 90;
            } else if (first.includes('to left')) {
                angle = 270;
            } else if (first.includes('to top')) {
                angle = 0;
            } else if (first.includes('to bottom')) {
                angle = 180;
            }
            stopParts = parts.slice(1);
        } else {
            stopParts = parts;
        }
        
        let colorStops = [];
        let opacityStops = [];
        
        stopParts.forEach((part, idx) => {
            part = part.trim();
            const posMatch = part.match(/\s*(\d+)%?$/);
            let position = 0;
            let colorStr = part;
            if (posMatch) {
                position = parseInt(posMatch[1]);
                colorStr = part.slice(0, posMatch.index).trim();
            } else {
                position = Math.round(idx / (stopParts.length - 1) * 100);
            }
            
            let color = '#ffffff';
            let alpha = 100;
            
            if (colorStr.startsWith('rgba')) {
                const match = colorStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d\.]+)\s*\)/);
                if (match) {
                    color = rgbToHex(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
                    alpha = Math.round(parseFloat(match[4]) * 100);
                }
            } else if (colorStr.startsWith('rgb')) {
                const match = colorStr.match(/rgb?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
                if (match) {
                    color = rgbToHex(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
                    alpha = 100;
                }
            } else if (colorStr.startsWith('#')) {
                if (colorStr.length === 9) {
                    color = colorStr.slice(0, 7);
                    alpha = Math.round(parseInt(colorStr.slice(7, 9), 16) / 255 * 100);
                } else {
                    color = colorStr;
                    alpha = 100;
                }
            } else {
                color = cssColorToHex(colorStr);
                alpha = 100;
            }
            
            colorStops.push({ position, color });
            opacityStops.push({ position, alpha });
        });
        
        if (colorStops.length < 2) return null;
        
        colorStops.sort((a,b) => a.position - b.position);
        opacityStops.sort((a,b) => a.position - b.position);
        
        return { type, angle, colorStops, opacityStops };
    }

    // --- EVENT ATTACHMENTS & EVENT LOOP ---
    function attachEvents() {
        const hueCanvas = pickerEl.querySelector('.ncp-hue-canvas');
        const svContainer = pickerEl.querySelector('.ncp-sv-container');
        const vBar = pickerEl.querySelector('.ncp-v-bar');
        const hexInput = pickerEl.querySelector('.ncp-hex-input');

        function handleHue(e) {
            const rect = hueCanvas.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
            state.h = (angle * 180 / Math.PI + 360) % 360;
            updateUI();
        }

        function handleSV(e) {
            const rect = svContainer.getBoundingClientRect();
            const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
            const y = clamp((e.clientY - rect.top) / rect.height, 0, 1);
            state.s = x;
            state.v = 1 - y;
            updateUI();
        }

        function handleV(e) {
            const rect = vBar.getBoundingClientRect();
            const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
            state.v = x;
            updateUI();
        }

        hueCanvas.addEventListener('mousedown', e => { dragging = 'hue'; handleHue(e); e.preventDefault(); });
        svContainer.addEventListener('mousedown', e => { dragging = 'sv'; handleSV(e); e.preventDefault(); });
        vBar.addEventListener('mousedown', e => { dragging = 'v'; handleV(e); e.preventDefault(); });

        // Touch support
        hueCanvas.addEventListener('touchstart', e => { dragging = 'hue'; handleHue(e.touches[0]); e.preventDefault(); }, {passive:false});
        svContainer.addEventListener('touchstart', e => { dragging = 'sv'; handleSV(e.touches[0]); e.preventDefault(); }, {passive:false});
        vBar.addEventListener('touchstart', e => { dragging = 'v'; handleV(e.touches[0]); e.preventDefault(); }, {passive:false});

        window.addEventListener('mousemove', e => {
            if (!dragging) return;
            if (dragging === 'hue') handleHue(e);
            if (dragging === 'sv') handleSV(e);
            if (dragging === 'v') handleV(e);
        });

        window.addEventListener('touchmove', e => {
            if (!dragging) return;
            if (dragging === 'hue') handleHue(e.touches[0]);
            if (dragging === 'sv') handleSV(e.touches[0]);
            if (dragging === 'v') handleV(e.touches[0]);
            e.preventDefault();
        }, {passive:false});

        window.addEventListener('mouseup', () => { dragging = null; });
        window.addEventListener('touchend', () => { dragging = null; });

        // RGB Inputs
        ['ncp-r', 'ncp-g', 'ncp-b'].forEach(cls => {
            pickerEl.querySelector('.' + cls).addEventListener('input', () => {
                const r = parseInt(pickerEl.querySelector('.ncp-r').value) || 0;
                const g = parseInt(pickerEl.querySelector('.ncp-g').value) || 0;
                const b = parseInt(pickerEl.querySelector('.ncp-b').value) || 0;
                setColor(rgbToHex(clamp(r,0,255), clamp(g,0,255), clamp(b,0,255)));
            });
        });

        hexInput.addEventListener('input', e => {
            const val = e.target.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(val) || /^#[0-9a-fA-F]{3}$/.test(val)) {
                setColor(val);
            }
        });

        pickerEl.querySelector('.ncp-copy-btn').addEventListener('click', () => {
            const hex = pickerEl.querySelector('.ncp-hex-input').value;
            navigator.clipboard.writeText(hex).then(() => {
                const btn = pickerEl.querySelector('.ncp-copy-btn');
                const old = btn.innerHTML;
                btn.innerHTML = '<i class="bi bi-check"></i>';
                setTimeout(() => btn.innerHTML = old, 1500);
            });
        });

        // Tab Switching
        pickerEl.querySelectorAll('.ncp-tab').forEach(btn => {
            btn.addEventListener('mousedown', e => {
                e.preventDefault();
                const mode = btn.dataset.mode;
                switchTab(mode);
            });
        });

        // Click to add stops on tracks
        const opacityTrack = pickerEl.querySelector('.ncp-opacity-track');
        const colorTrack = pickerEl.querySelector('.ncp-color-track');
        const gradBarWrapper = pickerEl.querySelector('.ncp-grad-bar-wrapper');

        function getXRatio(e, element) {
            const rect = element.getBoundingClientRect();
            return clamp((e.clientX - rect.left) / rect.width, 0, 1);
        }

        opacityTrack.addEventListener('mousedown', e => {
            if (e.target === opacityTrack) {
                e.preventDefault();
                addOpacityStopAt(getXRatio(e, opacityTrack));
            }
        });

        colorTrack.addEventListener('mousedown', e => {
            if (e.target === colorTrack) {
                e.preventDefault();
                addColorStopAt(getXRatio(e, colorTrack));
            }
        });

        gradBarWrapper.addEventListener('mousedown', e => {
            // Clicking top half of grad bar adds opacity, bottom half adds color stop
            e.preventDefault();
            const rect = gradBarWrapper.getBoundingClientRect();
            const yRatio = (e.clientY - rect.top) / rect.height;
            const xRatio = (e.clientX - rect.left) / rect.width;
            if (yRatio < 0.5) {
                addOpacityStopAt(xRatio);
            } else {
                addColorStopAt(xRatio);
            }
        });

        // Gradient Angle Sliders/Inputs
        const angleSlider = pickerEl.querySelector('.ncp-grad-angle-slider');
        const angleInput = pickerEl.querySelector('.ncp-grad-angle-input');

        angleSlider.addEventListener('input', () => {
            gradientState.angle = parseInt(angleSlider.value) || 0;
            angleInput.value = gradientState.angle;
            updateGradientUI();
        });

        angleInput.addEventListener('input', () => {
            let val = parseInt(angleInput.value) || 0;
            gradientState.angle = clamp(val, 0, 360);
            angleSlider.value = gradientState.angle;
            updateGradientUI();
        });

        // Gradient Linear/Radial segmented controls
        pickerEl.querySelectorAll('.ncp-grad-type button').forEach(b => {
            b.addEventListener('mousedown', e => {
                e.preventDefault();
                gradientState.type = b.dataset.type;
                pickerEl.querySelectorAll('.ncp-grad-type button').forEach(x => {
                    x.classList.toggle('active', x === b);
                });
                updateGradientUI();
            });
        });

        // Reverse stops
        pickerEl.querySelector('.ncp-grad-reverse-btn').addEventListener('mousedown', e => {
            e.preventDefault();
            reverseStops();
        });

        // Opacity stop slider
        const opSlider = pickerEl.querySelector('.ncp-opacity-slider');
        const opVal = pickerEl.querySelector('.ncp-opacity-val');
        opSlider.addEventListener('input', () => {
            if (currentMode === 'solid') {
                solidAlpha = parseInt(opSlider.value);
                opVal.innerText = solidAlpha + '%';
                updateUI(false, false);
            } else {
                if (selectedStop && selectedStopType === 'opacity') {
                    selectedStop.alpha = parseInt(opSlider.value);
                    opVal.innerText = selectedStop.alpha + '%';
                    updateGradientUI();
                }
            }
        });

        // OK / Apply button
        pickerEl.querySelector('.ncp-apply-btn').addEventListener('click', () => {
            if (currentMode === 'solid') {
                saveRecent(solidColor);
                const nameInput = pickerEl.querySelector('.ncp-name-input');
                const customName = nameInput ? nameInput.value.trim() : '';
                if (activeOnApply) {
                    activeOnApply(solidColor, 'solid', customName);
                }
            } else {
                saveRecentGradient(gradientState);
                if (activeOnApply) {
                    const finalCSS = getCSSGradientString();
                    activeOnApply(finalCSS, 'gradient');
                }
            }
            close();
        });

        // Cancel button
        pickerEl.querySelector('.ncp-cancel-btn').addEventListener('click', () => {
            if (activeOnCancel) activeOnCancel();
            close();
        });


        pickerEl.querySelector('.ncp-close').addEventListener('click', () => {
            if (activeOnCancel) activeOnCancel();
            close();
        });

        // Prevent closing when clicking inside
        pickerEl.addEventListener('mousedown', e => e.stopPropagation());
    }

    function switchTab(mode) {
        currentMode = mode;
        
        pickerEl.querySelectorAll('.ncp-tab').forEach(b => {
            b.classList.toggle('active', b.dataset.mode === mode);
        });

        const gradContent = pickerEl.querySelector('.ncp-gradient-content');
        const solidSwatches = pickerEl.querySelector('.ncp-solid-swatches');
        const gradSwatches = pickerEl.querySelector('.ncp-gradient-swatches');
        const sharedPicker = pickerEl.querySelector('.ncp-shared-picker-controls');
        const sharedInputs = pickerEl.querySelector('.ncp-shared-inputs-row');
        const opacityRow = pickerEl.querySelector('.ncp-opacity-slider-row');
        const nameRow = pickerEl.querySelector('.ncp-name-row');

        if (mode === 'solid') {
            gradContent.style.display = 'none';
            gradSwatches.style.display = 'none';
            solidSwatches.style.display = 'block';
            sharedPicker.classList.remove('ncp-disabled');
            sharedInputs.classList.remove('ncp-disabled');
            
            if (opacityRow) {
                opacityRow.style.display = 'flex';
                const opLabel = opacityRow.querySelector('label');
                if (opLabel) opLabel.innerText = 'Opacity';
            }
            if (nameRow) nameRow.style.display = 'block';
            
            setColor(solidColor, false, false);
        } else {
            gradContent.style.display = 'flex';
            gradSwatches.style.display = 'block';
            solidSwatches.style.display = 'none';
            if (nameRow) nameRow.style.display = 'none';
            
            buildRecentGradients();
            buildPresetGradients();

            // Load selection stop
            if (!selectedStop) {
                selectedStop = gradientState.colorStops[0];
                selectedStopType = 'color';
            }
            selectStop(selectedStopType, selectedStop);
            updateGradientUI();
        }
    }


    function open(anchorEl, initialValue, onChange, onApply, onCancel, onClose) {
        activeOnChange = onChange;
        activeOnApply = onApply;
        activeOnCancel = onCancel;
        activeOnClose = onClose;

        if (!pickerEl) {
            pickerEl = buildPicker();
            drawHue(pickerEl.querySelector('.ncp-hue-canvas'));
            attachEvents();
        }

        buildPalette();

        // 1. Get active selection text & font details for live preview
        const sel = window.getSelection();
        const selectedText = (sel.rangeCount > 0 ? sel.toString().trim() : '') || 'HELLO WORLD';
        const parentNode = sel.rangeCount > 0 ? sel.getRangeAt(0).startContainer.parentElement : null;
        const fontName = parentNode ? window.getComputedStyle(parentNode).fontFamily : 'Outfit';

        const previewLabelText = pickerEl.querySelector('.ncp-grad-preview-text');
        previewLabelText.innerText = selectedText;
        previewLabelText.style.fontFamily = fontName;

        // 2. Load Initial Value
        let mode = 'solid';
        if (typeof initialValue === 'string' && (initialValue.includes('gradient') || initialValue.includes('linear') || initialValue.includes('radial'))) {
            mode = 'gradient';
            const parsed = parseCSSGradient(initialValue);
            if (parsed) {
                gradientState = parsed;
            }
        } else if (typeof initialValue === 'object' && initialValue !== null && initialValue.colorStops && initialValue.opacityStops) {
            mode = 'gradient';
            gradientState = JSON.parse(JSON.stringify(initialValue));
        } else if (typeof initialValue === 'string') {
            solidColor = initialValue;
            const parsedColor = parseCssColor(initialValue);
            solidAlpha = Math.round(parsedColor[3] * 100);
            
            const opSlider = pickerEl.querySelector('.ncp-opacity-slider');
            const opVal = pickerEl.querySelector('.ncp-opacity-val');
            if (opSlider && opVal) {
                opSlider.value = solidAlpha;
                opVal.innerText = solidAlpha + '%';
            }
            mode = 'solid';
        }

        // Set active mode tab
        currentMode = mode;
        switchTab(mode);

        // Prepopulate Custom Name in solid mode
        const nameInput = pickerEl.querySelector('.ncp-name-input');
        if (nameInput) {
            const registry = window.colorNameRegistry || {};
            if (mode === 'solid' && initialValue && registry[initialValue]) {
                nameInput.value = registry[initialValue];
            } else {
                nameInput.value = '';
            }
            
            // Set placeholder to auto-resolved name
            const parsedColor = parseCssColor(initialValue || '#ffffff');
            const autoName = window.getClosestColorName ? window.getClosestColorName(parsedColor[0], parsedColor[1], parsedColor[2]) : 'Theme Default';
            nameInput.placeholder = autoName;
        }

        // Position Picker next to anchorEl without ever going out of viewport bounds
        const rect = anchorEl.getBoundingClientRect();
        pickerEl.style.display = 'flex';
        
        // Measure actual rendered size to handle dynamic content/browser scaling
        const pickerWidth = pickerEl.offsetWidth || 300;
        const pickerHeight = pickerEl.offsetHeight || (mode === 'solid' ? 510 : 660);
        
        const pad = 12; // visual spacing from anchor
        const screenPad = 12; // margin buffer from viewport boundaries
        
        // 1. Determine Horizontal Placement (Prefer Right, then Left, then Center fallback)
        let left;
        if (rect.right + pad + pickerWidth + screenPad <= window.innerWidth) {
            left = rect.right + pad;
        } else if (rect.left - pad - pickerWidth - screenPad >= 0) {
            left = rect.left - pad - pickerWidth;
        } else {
            left = rect.left + (rect.width / 2) - (pickerWidth / 2);
        }
        left = clamp(left, screenPad, window.innerWidth - pickerWidth - screenPad);
        
        // 2. Determine Vertical Placement (Prefer aligning top of picker with top of anchor)
        let top = rect.top;
        if (top + pickerHeight + screenPad > window.innerHeight) {
            top = rect.bottom - pickerHeight;
        }
        top = clamp(top, screenPad, window.innerHeight - pickerHeight - screenPad);
        
        pickerEl.style.left = left + 'px';
        pickerEl.style.top = top + 'px';
    }


    function close() {
        if (pickerEl) pickerEl.style.display = 'none';
        if (activeOnClose) activeOnClose();
        activeOnChange = null;
        activeOnApply = null;
        activeOnCancel = null;
        activeOnClose = null;
    }

    // Global click outside to cancel
    window.addEventListener('mousedown', (e) => {
        if (pickerEl && pickerEl.style.display === 'flex') {
            if (!pickerEl.contains(e.target) && !e.target.closest('[data-ignore-close]')) {
                if (activeOnCancel) activeOnCancel();
                close();
            }
        }
    });

    window.NexusColorPicker = { open, close, saveRecent, parseCSSGradient };
})();
