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
});
