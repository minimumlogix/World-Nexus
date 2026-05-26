// scratch/test_fix.js
import fs from 'fs';
import path from 'path';

// Set up minimal browser globals for simulation
global.window = {
  addEventListener: () => {},
  scrollTo: () => {},
  requestIdleCallback: (cb) => cb(),
  location: {
    hash: '#world-lore-anchor-1', // Test loading with a hash!
    search: '?id=abyss',
    pathname: '/world.html',
    origin: 'http://localhost:8080',
    href: 'http://localhost:8080/world.html?id=abyss#world-lore-anchor-1'
  },
  history: {
    pushState: () => {}
  }
};

global.Node = class MockNode {};

const createMockElement = (tag = 'div') => {
  const el = Object.create(global.Node.prototype);
  Object.assign(el, {
    tagName: tag.toUpperCase(),
    classList: {
      add: (cls) => {
        console.log(`classList.add called with: ${cls}`);
      },
      remove: (cls) => {
        console.log(`classList.remove called with: ${cls}`);
      },
      toggle: () => {}
    },
    style: {},
    addEventListener: () => {},
    appendChild: () => {},
    querySelector: () => createMockElement(),
    querySelectorAll: () => [],
    getAttribute: () => '',
    setAttribute: () => {}
  });
  return el;
};

global.document = {
  readyState: 'complete',
  getElementById: (id) => {
    console.log('document.getElementById called for:', id);
    return createMockElement();
  },
  querySelector: (sel) => {
    console.log('document.querySelector called for:', sel);
    return createMockElement();
  },
  querySelectorAll: () => [],
  addEventListener: () => {},
  createElement: (tag) => {
    return createMockElement(tag);
  },
  createTextNode: (text) => {
    return createMockElement();
  },
  body: createMockElement('body')
};

global.fetch = async (url) => {
  console.log('Mock fetch called for:', url);
  if (url.includes('config.json')) {
    return {
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ siteName: 'Test Nexus', tagline: 'Test Tagline' })
    };
  }
  if (url.includes('worlds.json')) {
    return {
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ worlds: [{ id: 'abyss', path: 'worlds/abyss' }] })
    };
  }
  if (url.includes('world.json')) {
    return {
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ id: 'abyss', title: 'Abyss', path: 'worlds/abyss', coverImage: 'cover.png', logo: 'logo.svg', lore: 'lore.md', bots: [] })
    };
  }
  return {
    ok: true,
    headers: {
      get: () => 'text/html'
    },
    text: async () => '<html></html>',
    json: async () => ({})
  };
};

global.DOMParser = class {
  parseFromString() {
    return {
      querySelectorAll: () => []
    };
  }
};
global.Image = class {};
Object.defineProperty(global, 'navigator', {
  value: {
    clipboard: {
      writeText: async () => {}
    }
  },
  configurable: true,
  writable: true
});

console.log('Starting app import...');
try {
  const appPath = path.resolve('d:/Hobby/World Nexus/js/app.js');
  await import('file:///' + appPath.replace(/\\/g, '/'));
  console.log('Successfully imported and initialized app.js!');
} catch (e) {
  console.error('CRITICAL ERROR DURING IMPORT:', e);
}
