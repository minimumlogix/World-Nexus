import fs from 'fs';
import path from 'path';
import { LoreService } from '../js/services/LoreService.js';

// Mock the DOM and window object since we are in Node
global.window = {
  location: { hostname: 'localhost', pathname: '/' }
};
global.document = {
  createElement: () => ({ setAttribute: () => {} }),
  querySelectorAll: () => []
};
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock DOM.el and DOM.clear since we use DOM.js
import { DOM } from '../js/utils/DOM.js';
DOM.el = (tag, attrs, ...children) => {
  const node = { 
    tag, 
    attrs, 
    children: children || [], 
    querySelector: () => null, 
    querySelectorAll: () => [] 
  };
  node.appendChild = (child) => {
    node.children.push(child);
  };
  return node;
};
DOM.clear = (node) => {
  if (node) node.children = [];
};

async function test() {
  try {
    const rawMarkdown = fs.readFileSync('Worlds/arcanis/mary-ultara/data/mary-ultara_lore.md', 'utf8');
    const bot = {
      name: 'Mary Ultara',
      avatar: 'avatar.png',
      rawLoreMarkdown: rawMarkdown
    };

    console.log('Testing parseMarkdownSections...');
    bot.loreSections = LoreService.parseMarkdownSections(rawMarkdown);
    console.log('Keys in loreSections:', Object.keys(bot.loreSections));

    console.log('Testing extractAbilities...');
    bot.abilities = LoreService.extractAbilities(bot.loreSections);
    console.log('Abilities:', bot.abilities);

    console.log('Testing extractRelations...');
    bot.relations = LoreService.extractRelations(bot.loreSections);
    console.log('Relations:', bot.relations);

    console.log('Testing parseMarkdown...');
    const htmlMarkdown = LoreService.parseMarkdown(rawMarkdown);

    console.log('Testing parseRoleplayExamples...');
    const rawExamples = bot.loreSections['Roleplay Examples'];
    const messages = LoreService.parseRoleplayExamples(rawExamples, bot);
    console.log('Parsed roleplay messages count:', messages.length);

    console.log('Testing renderRoleplayChat...');
    const chatEl = LoreService.renderRoleplayChat(messages, bot);
    console.log('Successfully rendered chat elements.');

    console.log('Testing HTML Purification (Script tags, events, javascript: links)...');
    const dirtyHtml = '<script>alert("hack")</script><div onclick="exploit()">Hello</div><a href="javascript:attack()">Click</a>';
    const cleanHtml = LoreService.purifyHtml(dirtyHtml);
    console.log('Purified HTML:', cleanHtml);
    if (cleanHtml.includes('script') || cleanHtml.includes('onclick') || cleanHtml.includes('javascript')) {
      throw new Error('HTML purification failed!');
    }
    console.log('HTML purification test passed.');

    console.log('Testing custom VN Intro Markdown Parsing and Injection...');
    const rawIntroMarkdown = `
## Roleplay Intro - Dialogue & Narration
\`\`\`
<link href="vn.css" rel="stylesheet">
<div class="vn-dialogue-box">
*I land...* "Well fuck me sideways, if it isn't {{user}}..."
</div>
\`\`\`
`;
    const introSections = LoreService.parseMarkdownSections(rawIntroMarkdown);
    const mockBot = {
      name: 'Max Smasher',
      loreSections: introSections
    };

    console.log('Testing buildHierarchicalLore...');
    const mockContentNode = {
      children: [
        {
          tagName: 'H2',
          textContent: 'Roleplay Intro - Dialogue & Narration',
          appendChild: () => {}
        }
      ],
      innerHTML: '',
      appendChild: (child) => {
        mockContentNode.children.push(child);
      },
      querySelectorAll: () => []
    };
    const mockNavNode = {
      appendChild: () => {}
    };
    LoreService.buildHierarchicalLore('', mockContentNode, mockNavNode, mockBot);
    
    // Find nested vn-intro-container
    let vnIntroFound = false;
    mockContentNode.children.forEach(card => {
      if (card.children) {
        card.children.forEach(c => {
          if (c.tag === 'div' && c.attrs && c.attrs.class === 'vn-intro-container') {
            vnIntroFound = true;
            console.log('Verified: VN-intro successfully injected inside card! Contents:', c.children);
          }
        });
      }
    });
    if (!vnIntroFound) {
      throw new Error('VN-intro container was not found in the card children!');
    }
    console.log('All tests passed successfully without throwing exceptions!');
  } catch (err) {
    console.error('CRITICAL ERROR DURING PARSING/RENDERING:', err);
    process.exit(1);
  }
}

test();
