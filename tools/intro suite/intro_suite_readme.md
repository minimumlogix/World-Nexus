# World Nexus Intro Suite v2.0 - VN Engine

A premium, interactive single-page visual-novel (VN) style builder and editor that generates responsive intro sequences for the World Nexus platform.

## Features & Core Capabilities

### 1. Dual Mode Layout (Design & Code)
- **Visual Design Canvas**: Arrange components (Music Players, Images, Character Hubs, VN Engines, Lore Databases, and Dialogue Boxes) in a drag-and-drop style interface. Move components up/down, delete them, or configure their properties dynamically in the properties toolbar.
- **CodeMirror 6 Editor**: A live code view allowing direct manipulation of the generated page code. Edits are synchronized bidirectionally back to the visual canvas.

### 2. Element Library Components
- **Engine Theme Selector**: Instantly theme your output with curated presets: Crimson Red, Abyss Dark, Azure Blue, Royal Gold, Forest Green, Violet Storm.
- **Full-Width Image**: Responsive banners supporting alt text.
- **Music Player**: YouTube-embedded stream players with options for start volume, autoplay, and volume state memory.
- **Character Hub**: Character displays with sprites, backdrop overlays, and customizable active CSS states (e.g., `speaking`, `hidden`).
- **VN Engine Frame**: Embedded interactive storyframes with height configuration.
- **Lore Database**: Collapsible drawer panels referencing World Nexus world lore keys.
- **Dialogue Box**: A rich text dialogue block styled with preset borders, custom background images, or colors.

### 3. Rich Text Editing Toolbar
- **Paragraph Presets**: Format headings (H1, H2, H3), Blockquotes, and inline Code blocks.
- **Inline Styling**: Standard Bold, Italic, Underline, and Strikethrough controls.
- **Typography & Font sizes**: Choose display fonts (Cinzel, Rajdhani, Georgia, Courier New) and specify pixel sizes.
- **Text Effects**: Apply glows (Red, Blue, Gold), Drop Shadows, Uppercase transforms, and Small Caps.
- **Find & Replace**: Built-in editor search and replace console with shortcut binding (`Ctrl+H`).
- **Inline HTML**: Insert custom raw HTML directly at the cursor block.

### 4. 4-Format Code Syncing Engine
Every modification in the design canvas or code panel instantly formats and updates the following four versions of code:
1. **Pure HTML (Design & Preview)**: The fully expanded HTML code containing embedded layouts, stylesheets, and styling spans. Used to render the design editor canvas and the Live Preview Simulator.
2. **Code Tab Editor HTML**: Complete unminified HTML code where the dialogue content within the dialogue box is represented in clean, unminified Markdown (converting headers, bold, italics, spacing, dividers, and breaks). This keeps the code tab clean and highly readable.
3. **Minified HTML Output**: Output HTML where all layouts and wrapper elements are fully minified for page-load speed, but the dialogue content remains in unminified HTML format to preserve whitespace, next-lines, and formatting in-game.
4. **Dialogue Markdown**: A clean, raw Markdown-only output of the dialogue content.

### 5. Live Preview Simulator
- Simulates rendering on **Desktop**, **Tablet**, and **Mobile Phone** viewports.
- Supports switching orientation between portrait and landscape for simulated mobile/tablet sizes.
- Real-time page refreshes.

### 6. Responsive Topbar Actions
- Relocates all file-level action buttons (Output panel toggle, Clear All, Delete Cache, Discord integration, Copy Minified) to the top bar.
- Uses **Bootstrap Icons** for a cohesive, modern visual language.
- Implements viewport scaling: under **900px**, button text labels are hidden to leave only the icons, preventing topbar wrapping. Under **600px**, secondary buttons (Discord, Delete Cache) are hidden to optimize screen space on mobile devices.