/* World Nexus Card Component JS */
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
});
