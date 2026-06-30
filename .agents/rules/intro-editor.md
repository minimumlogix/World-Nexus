---
trigger: always_on
---

# INTRO-EDITOR COMPONENT DEVELOPMENT CONTEXT

## Context

The Minified Code will be pasted in a greeting message on an already publicaly hosted website called joyland.

## Primary Goal

Every component must work reliably inside third party platforms that allow HTML but may sanitize or completely block JavaScript.

Compatibility and reliability always take priority over advanced functionality.

---

## Default Assumption

Unless the user explicitly states otherwise, assume the target environment has the following restrictions:

* External JavaScript may be blocked.
* Inline JavaScript may be removed.
* Event handlers (`onclick`, `onload`, etc.) may be stripped.
* DOM manipulation is unavailable.
* Dynamic imports are unavailable.
* Browser storage may be unavailable.
* Some CSS features may be restricted.
* The HTML may be injected into an existing page instead of a standalone document.

Design accordingly.

---

## Core Rule

Build every component using only:

* HTML
* CSS

JavaScript is considered an optional enhancement, never a requirement.

A component should remain visually complete even if **zero JavaScript executes**.

---

## Progressive Enhancement

When interactive functionality is desired:

1. Build a fully functional HTML/CSS version first.
2. Verify it works without JavaScript.
3. Optionally add JavaScript enhancements.
4. The JavaScript version must never be required for the component to render correctly.

---

## Forbidden Dependencies

Never make the visibility or layout of a component depend on JavaScript.

Avoid patterns like:

* `.hidden-on-load`
* `.loading`
* `.pending`
* `.js-enabled`
* Elements hidden until JS removes a class
* Injecting HTML from JavaScript
* Rendering content only after script execution

All essential content must already exist in the HTML.

---

## Component Requirements

Every component should:

* Render immediately.
* Be visually complete.
* Require no initialization.
* Require no DOM manipulation.
* Require no event listeners.
* Require no runtime configuration.
* Be fully self-contained.

---

## CSS Guidelines

Prefer:

* Flexbox
* CSS Grid
* CSS Variables
* Pseudo-elements
* Keyframe animations
* Transitions
* Gradients
* Filters
* Backdrop blur
* Clip paths
* Responsive sizing using `clamp()`
* Relative units (`rem`, `%`, `vw`, `vh`)

Avoid relying on browser APIs that require JavaScript.

---

## Animations

Animations must be implemented entirely with CSS whenever possible.

Allowed examples:

* Fade in
* Slide in
* Floating
* Pulse
* Glow
* Typing cursor
* Typing indicator
* Gradient movement
* Shimmer
* Breathing effect
* Blinking notification
* Ripple
* Hover transitions

Do not use JavaScript timers for visual effects.

---

## Component Philosophy

Components should resemble polished UI taken from real applications.

Examples include:

* iMessage
* WhatsApp
* Discord
* Telegram
* Email client
* Phone call screen
* Notification
* Mission briefing
* RPG quest log
* Character profile
* Trading card
* Newspaper
* Manga panel
* Browser window
* Terminal
* Code editor
* Music player
* Calendar
* Social media post
* Achievement popup
* Inventory window

All should be achievable using HTML and CSS alone.

---

## External Assets

External assets should be optional.

Fonts, images, GIFs, and icons should enhance the design but never prevent rendering if unavailable.

Always provide sensible fallbacks.

---

## Graceful Degradation

If an advanced feature cannot work due to platform restrictions:

Do not leave empty space.

Do not hide the component.

Do not require JavaScript.

Instead, automatically fall back to a simpler visual presentation.

---

## Validation Checklist

Before considering a component complete, verify:

✓ Works with JavaScript disabled.

✓ Renders correctly when injected into an existing webpage.

✓ No console errors if scripts fail to load.

✓ No hidden content waiting for JavaScript.

✓ Responsive across desktop and mobile.

✓ Self-contained.

✓ No unnecessary dependencies.

✓ HTML remains semantic and clean.

✓ CSS is organized and maintainable.

✓ Component still looks polished without enhancements.

---

## Failure Prevention

If a requested design depends on JavaScript, the agent must:

1. Explain that the feature cannot be guaranteed in HTML-only environments.
2. Build the closest possible HTML/CSS equivalent.
3. Reserve JavaScript only as an optional enhancement.

Never generate a component whose core functionality depends on JavaScript unless the user explicitly requests a JavaScript-only implementation.

---

## Development Priority

1. Reliability
2. Compatibility
3. Maintainability
4. Performance
5. Visual polish
6. Optional enhancements

A component that works everywhere is always preferred over one that is more impressive but fails in restricted environments.
