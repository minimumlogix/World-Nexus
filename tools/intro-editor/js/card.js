/* 
========================================================================
WORLD NEXUS CARD SYSTEM DEVELOPER GUIDE
========================================================================

Welcome, developer! This file manages all card-specific client-side animations,
interactivity, and logic for the World Nexus intro slides.

1. ARCHITECTURE & LIFECYCLE:
   - Cards are block-level components designed to be rendered within a slide feed.
   - The entire lifecycle is wrapped in a DOMContentLoaded listener, which triggers
     an initial scan of cards.
   - IMPORTANT: To support live updates in the editor canvas (#canvas-live), this script
     exposes `window.initCards = function() { ... }`.
   - Whenever the editor re-renders canvas items, it calls `window.initCards()` to
     re-initialize event listeners, auto-detect themes, and set up local state.
   - Each initialization routine should check if an element is already initialized
     (e.g., using `el.dataset.initialized`) to prevent redundant bindings.

2. EDITOR SCOPE VS. PRODUCTION SCOPE:
   - In production (viewing the live slide), cards run their intro timelines
     (e.g., typewriter delays, combination puzzle lock states, play/pause sound).
   - In the editor canvas (#canvas-live), certain timelines and locks are bypassed.
     For example:
     - iMessage chat rows reveal text statically so the user can inline-edit them.
     - Steampunk Vault doors remain pre-opened (with dial codes matching) so the
       user can view and edit the secret vault text.

3. SCHEMA & MARKUP SPECIFICATIONS:
   - Private Dispatch (`.vn-card-template-wrapper`):
     A static stamp letter template. Has active hover scaling.
   - Bladerunner Terminal (`.vn-bladerunner-typewriter`):
     Runs a monospaced terminal scanline typewriter effect. Bypassed in editor.
   - iMessage Chat (`.vn-imessage-chat`):
     Authentic chat balloon timelines with status bar battery, signal icons,
     and dynamic typing bubbles. Supports custom fonts/background variables.
   - SFX Player (`.vn-sfx-card`):
     Full-width 75px media block. Supports:
       - `.vn-sfx-touch`: Clicking the card plays/toggles the audio URL.
       - `.vn-sfx-transcript`: Shows play/pause buttons, active SVG waveform scales,
         and sync typewriter transcription text.
   - Steampunk Vault (`.vn-steampunk-card`):
     3-digit lockbox combination puzzle. Clicking arrow button dials (0-9) changes
     values. Matching combination code slides the steel/brass vault door up
     to reveal parchment secret document. Bypassed in editor to stay open.

========================================================================
*/

document.addEventListener('DOMContentLoaded', () => {
    // Add subtle interactive click response for the premium letter stamp cards
    const cardTemplates = document.querySelectorAll('.vn-card-template-wrapper');
    cardTemplates.forEach(wrapper => {
        wrapper.addEventListener('click', () => {
            wrapper.style.transition = 'transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            wrapper.style.transform = 'scale(1.005) translateY(-1px)';
            setTimeout(() => {
                wrapper.style.transform = 'none';
            }, 150);
        });
    });

    // Bladerunner typewriter animation
    const typewriters = document.querySelectorAll('.vn-bladerunner-typewriter');
    typewriters.forEach(el => {
        // Prevent typewriter running if inside the live canvas editor
        if (el.closest('#canvas-live')) {
            return;
        }

        const raw = el.getAttribute('data-raw-text');
        const fullText = raw ? decodeURIComponent(raw) : el.innerHTML;
        el.innerHTML = '';
        
        const textContainer = document.createElement('span');
        const cursor = document.createElement('span');
        cursor.className = 'vn-bladerunner-cursor';
        el.appendChild(textContainer);
        el.appendChild(cursor);
        
        let charIndex = 0;
        let currentHTML = '';
        
        function typeChar() {
            if (charIndex >= fullText.length) {
                return;
            }
            
            if (fullText.charAt(charIndex) === '<') {
                const endTag = fullText.indexOf('>', charIndex);
                if (endTag !== -1) {
                    currentHTML += fullText.substring(charIndex, endTag + 1);
                    charIndex = endTag + 1;
                    textContainer.innerHTML = currentHTML;
                    typeChar();
                    return;
                }
            }
            
            currentHTML += fullText.charAt(charIndex);
            textContainer.innerHTML = currentHTML;
            charIndex++;
            
            const speed = Math.random() * 20 + 15;
            setTimeout(typeChar, speed);
        }
        
        typeChar();
    });

    // Exposed global card initialization function
    window.initCards = function() {
        // 1. Auto-detect and configure dark / light modes
        function checkDarkTheme() {
            const bodyBg = window.getComputedStyle(document.body).backgroundColor;
            if (!bodyBg) return false;
            const rgb = bodyBg.match(/\d+/g);
            if (rgb && rgb.length >= 3) {
                const r = parseInt(rgb[0]);
                const g = parseInt(rgb[1]);
                const b = parseInt(rgb[2]);
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                return brightness < 128;
            }
            return false;
        }

        const isPageDark = checkDarkTheme();

        const imessageChats = document.querySelectorAll('.vn-imessage-chat');
        imessageChats.forEach(chat => {
            const mode = chat.getAttribute('data-mode') || 'auto';
            if (mode === 'dark') {
                chat.classList.add('dark-mode');
            } else if (mode === 'light') {
                chat.classList.remove('dark-mode');
            } else {
                // auto mode: follow page theme
                if (isPageDark) {
                    chat.classList.add('dark-mode');
                } else {
                    chat.classList.remove('dark-mode');
                }
            }

            const convo = chat.querySelector('.conversation');
            if (!convo) return;

            // Prevent duplicate header injection
            if (!chat.querySelector('.imessage-phone-header')) {
                // Extract contact name and avatar from left messages
                const leftRow = convo.querySelector('.row.left');
                let contactName = 'User';
                let contactAvatar = '';

                if (leftRow) {
                    const metaEl = leftRow.querySelector('.meta');
                    if (metaEl) {
                        contactName = metaEl.textContent.trim();
                    }
                    const avatarEl = leftRow.querySelector('.avatar');
                    if (avatarEl) {
                        contactAvatar = avatarEl.getAttribute('src') || '';
                    }
                }

                // Build header
                const header = document.createElement('div');
                header.className = 'imessage-phone-header';
                
                const now = new Date();
                let hours = now.getHours();
                let minutes = now.getMinutes();
                if (minutes < 10) minutes = '0' + minutes;
                const timeStr = `${hours}:${minutes}`;

                header.innerHTML = `
                    <div class="status-bar">
                        <span class="time">${timeStr}</span>
                        <div class="status-icons">
                            <span class="signal-icon"><span></span><span></span><span></span><span></span></span>
                            <span class="wifi-icon">📶</span>
                            <span class="battery-icon"><span></span></span>
                        </div>
                    </div>
                    <div class="contact-bar">
                        <div class="back-btn">&#x2039;</div>
                        <div class="contact-info">
                            ${contactAvatar ? `<img src="${contactAvatar}" class="header-avatar">` : `<div class="header-avatar-placeholder">${contactName[0] || 'U'}</div>`}
                            <span class="contact-name">${contactName}</span>
                        </div>
                        <div class="info-btn">&#x2139;</div>
                    </div>
                `;
                chat.insertBefore(header, convo);
            }
        });

        // Typewriter text function using split-spans to maintain layout sizing
        function typewriteText(bubble) {
            return new Promise(resolve => {
                const fullText = bubble.textContent.trim();
                bubble.innerHTML = '';
                
                const typedSpan = document.createElement('span');
                typedSpan.className = 'vn-imessage-typed';
                
                const untypedSpan = document.createElement('span');
                untypedSpan.className = 'vn-imessage-untyped';
                untypedSpan.textContent = fullText;
                
                bubble.appendChild(typedSpan);
                bubble.appendChild(untypedSpan);
                
                let charIndex = 0;
                function nextChar() {
                    if (charIndex <= fullText.length) {
                        typedSpan.textContent = fullText.slice(0, charIndex);
                        untypedSpan.textContent = fullText.slice(charIndex);
                        charIndex++;
                        const speed = Math.random() * 30 + 20;
                        setTimeout(nextChar, speed);
                    } else {
                        bubble.innerHTML = '';
                        bubble.textContent = fullText;
                        resolve();
                    }
                }
                nextChar();
            });
        }

        // 2. Run iMessage conversations timeline animations
        const conversations = document.querySelectorAll('.vn-imessage-chat .conversation');
        conversations.forEach(async convo => {
            if (convo.dataset.initialized) return;
            
            const rows = Array.from(convo.querySelectorAll('.row'));
            
            // Skip timeline animation if inside the live canvas editor
            if (convo.closest('#canvas-live')) {
                rows.forEach(row => {
                    row.classList.remove('hidden-on-load');
                    row.classList.remove('hidden');
                    const bubble = row.querySelector('.bubble');
                    if (bubble) bubble.style.visibility = 'visible';
                    const meta = row.querySelector('.meta');
                    if (meta) meta.style.visibility = 'visible';
                });
                return;
            }

            convo.dataset.initialized = "true";
            rows.forEach(row => {
                row.classList.add('hidden-on-load');
                const bubble = row.querySelector('.bubble');
                if (bubble) bubble.style.visibility = 'hidden';
                const meta = row.querySelector('.meta');
                if (meta) meta.style.visibility = 'hidden';
            });

            const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

            // Sequence runner
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const isLeft = row.classList.contains('left');
                const bubble = row.querySelector('.bubble');
                const meta = row.querySelector('.meta');

                // Wait before starting the next message
                await delay(i === 0 ? 800 : 1200);

                if (isLeft && bubble) {
                    // Show row structure (avatar visible, text/meta invisible)
                    row.classList.remove('hidden-on-load');
                    bubble.style.visibility = 'hidden';
                    if (meta) meta.style.visibility = 'hidden';

                    const bubbleParent = bubble.parentElement;
                    if (bubbleParent) {
                        bubbleParent.style.position = 'relative';

                        const typingIndicator = document.createElement('div');
                        typingIndicator.className = 'typing';
                        typingIndicator.innerHTML = `
                            <span></span>
                            <span></span>
                            <span></span>
                        `;
                        typingIndicator.style.position = 'absolute';
                        typingIndicator.style.left = '0';
                        typingIndicator.style.top = '0';
                        typingIndicator.style.zIndex = '10';

                        bubbleParent.appendChild(typingIndicator);

                        // Run typing bubbles for 1.5s
                        await delay(1500);

                        typingIndicator.remove();
                    }

                    // Show actual bubble and metadata immediately
                    bubble.style.visibility = 'visible';
                    if (meta) meta.style.visibility = 'visible';
                    bubble.classList.add('bubble-pop');

                    // Let the popup finish naturally
                    await delay(500);

                } else {
                    // Right side (outgoing): pop in and type out
                    row.classList.remove('hidden-on-load');
                    if (bubble) {
                        bubble.style.visibility = 'visible';
                        bubble.classList.add('bubble-pop');
                        // Typewrite right side text
                        await typewriteText(bubble);
                    }
                    if (meta) meta.style.visibility = 'visible';

                    await delay(300);
                }
            }
        });

        // 3. Upgraded SFX Card component playback & transcript sync
        const sfxCards = document.querySelectorAll('.vn-sfx-card');
        sfxCards.forEach(card => {
            if (card.dataset.initialized) return;
            card.dataset.initialized = "true";

            const sfxUrl = card.getAttribute('data-url');
            if (!sfxUrl) return;

            const isTouchTheme = card.classList.contains('vn-sfx-touch');
            const playBtn = card.querySelector('.vn-sfx-play-btn');
            const transcript = decodeURIComponent(card.getAttribute('data-transcript') || '');
            const transcriptText = card.querySelector('.vn-sfx-transcript-text');

            // Shared playback trigger
            function toggleSfx() {
                // If this card is already playing, pause it
                if (card.classList.contains('playing')) {
                    if (card.audioObj) {
                        card.audioObj.pause();
                        card.audioObj.currentTime = 0;
                    }
                    card.classList.remove('playing');
                    if (playBtn) playBtn.textContent = '▶';
                    if (transcriptText && transcript) {
                        transcriptText.textContent = transcript;
                    }
                    return;
                }

                // Stop any other currently playing SFX cards to avoid overlapping audio
                document.querySelectorAll('.vn-sfx-card.playing').forEach(activeCard => {
                    if (activeCard.audioObj) {
                        activeCard.audioObj.pause();
                        activeCard.audioObj.currentTime = 0;
                    }
                    activeCard.classList.remove('playing');
                    const activeBtn = activeCard.querySelector('.vn-sfx-play-btn');
                    if (activeBtn) activeBtn.textContent = '▶';
                    const activeText = activeCard.querySelector('.vn-sfx-transcript-text');
                    const origTranscript = decodeURIComponent(activeCard.getAttribute('data-transcript') || '');
                    if (activeText && origTranscript) {
                        activeText.textContent = origTranscript;
                    }
                });

                // Create or reuse audio object
                if (!card.audioObj) {
                    card.audioObj = new Audio(sfxUrl);
                    card.audioObj.addEventListener('ended', () => {
                        card.classList.remove('playing');
                        if (playBtn) playBtn.textContent = '▶';
                        if (transcriptText && transcript) {
                            transcriptText.textContent = transcript;
                        }
                    });
                }

                card.audioObj.play().catch(err => console.log("SFX play block:", err));
                card.classList.add('playing');
                if (playBtn) playBtn.textContent = '❚❚';

                // Playback transcript typewriter sync animation
                if (transcriptText && transcript) {
                    transcriptText.textContent = '';
                    let idx = 0;
                    const charDelay = 35; // 35ms per character
                    const typingInterval = setInterval(() => {
                        if (!card.classList.contains('playing')) {
                            clearInterval(typingInterval);
                            return;
                        }
                        if (idx < transcript.length) {
                            transcriptText.textContent += transcript[idx];
                            idx++;
                        } else {
                            clearInterval(typingInterval);
                        }
                    }, charDelay);
                }
            }

            if (isTouchTheme) {
                card.addEventListener('click', toggleSfx);
            } else if (playBtn) {
                playBtn.addEventListener('click', toggleSfx);
            }
        });

        // 4. Steampunk Vault dials lock & slide open sequence
        const steampunkCards = document.querySelectorAll('.vn-steampunk-card');
        steampunkCards.forEach(card => {
            if (card.dataset.initialized) return;
            card.dataset.initialized = "true";

            const code = card.getAttribute('data-code') || '394';
            const statusLabel = card.querySelector('.vn-steampunk-status');

            // If inside live canvas editor, vault remains pre-deciphered
            if (card.closest('#canvas-live')) {
                card.classList.add('unlocked');
                for (let i = 0; i < 3; i++) {
                    const dialEl = card.querySelector(`.vn-steampunk-dial.dial-${i}`);
                    if (dialEl) dialEl.textContent = code[i] || '0';
                }
                if (statusLabel) statusLabel.textContent = 'VAULT DECIPHERED';
                return;
            }

            const currentDials = [0, 0, 0];

            // Click dials logic
            const upBtns = card.querySelectorAll('.vn-steampunk-dial-btn.up');
            const downBtns = card.querySelectorAll('.vn-steampunk-dial-btn.down');

            function checkVaultUnlocked() {
                const combined = `${currentDials[0]}${currentDials[1]}${currentDials[2]}`;
                if (combined === code) {
                    card.classList.remove('unlocking');
                    card.classList.add('unlocked');
                    if (statusLabel) statusLabel.textContent = 'ACCESS GRANTED';
                }
            }

            function cycleDial(dialIdx, direction) {
                if (card.classList.contains('unlocked')) return;

                if (direction === 'up') {
                    currentDials[dialIdx] = (currentDials[dialIdx] + 1) % 10;
                } else {
                    currentDials[dialIdx] = (currentDials[dialIdx] - 1 + 10) % 10;
                }

                const dialEl = card.querySelector(`.vn-steampunk-dial.dial-${dialIdx}`);
                if (dialEl) {
                    dialEl.textContent = currentDials[dialIdx];
                }

                // Add unlocking class temporarily to spin gears during action click
                card.classList.add('unlocking');
                setTimeout(() => {
                    if (!card.classList.contains('unlocked')) {
                        card.classList.remove('unlocking');
                    }
                }, 300);

                checkVaultUnlocked();
            }

            upBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.getAttribute('data-dial'));
                    cycleDial(idx, 'up');
                });
            });

            downBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.getAttribute('data-dial'));
                    cycleDial(idx, 'down');
                });
            });
        });
    };

    // Run card initialization on DOM load
    window.initCards();
});
