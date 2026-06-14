/* js/utils/Security.js */

/**
 * Sanitizes URLs to prevent XSS via javascript: or non-image data: schemes.
 * If dynamic avatar/image input is suspicious, it swaps in a safe premium SVG.
 * @param {string} url - Target URL to sanitize
 * @param {string} [fallbackChar='?'] - Initial character to display in fallback avatar
 * @returns {string} Safe URL or safe inline SVG fallback
 */
export function sanitizeUrl(url, fallbackChar = '?') {
  if (!url) {
    const char = fallbackChar.charAt(0).toUpperCase();
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%231e293b"/><text x="50" y="55" fill="%2394a3b8" font-size="32" font-family="Outfit" text-anchor="middle">${char}</text></svg>`;
  }

  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  // Rejects dangerous protocols
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.includes('javascript:') ||
    lower.includes('vbscript:') ||
    (lower.startsWith('data:') && !lower.startsWith('data:image/'))
  ) {
    console.warn(`[Security] Harmful URL blocked: "${trimmed}"`);
    const char = fallbackChar.charAt(0).toUpperCase();
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23991b1b"/><text x="50" y="55" fill="%23fef2f2" font-size="32" font-family="Outfit" text-anchor="middle">${char}</text></svg>`;
  }

  return trimmed;
}

/**
 * Sanitizes a URL for use inside a CSS background-image url("...") block.
 * Strips quotes and parentheses to prevent breakout from style rule context.
 * @param {string} url - Target background image URL
 * @returns {string} Safe background URL
 */
export function sanitizeCssUrl(url) {
  const safe = sanitizeUrl(url, 'B');
  // Strip quotes and parentheses to block CSS injection breakout
  return safe.replace(/["'()]/g, '');
}
