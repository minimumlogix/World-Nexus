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
  return { tag, attrs, children, appendChild: () => {}, querySelector: () => null, querySelectorAll: () => [] };
};
DOM.clear = (node) => {};

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

    console.log('Testing buildHierarchicalLore...');
    const mockContentNode = {
      children: [],
      innerHTML: '',
      appendChild: () => {},
      querySelectorAll: () => []
    };
    const mockNavNode = {
      appendChild: () => {}
    };
    LoreService.buildHierarchicalLore(htmlMarkdown, mockContentNode, mockNavNode, bot);
    console.log('All tests passed successfully without throwing exceptions!');
  } catch (err) {
    console.error('CRITICAL ERROR DURING PARSING/RENDERING:', err);
  }
}

test();
