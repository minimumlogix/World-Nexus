import jsdom from 'jsdom';
const { JSDOM } = jsdom;
import fs from 'fs';
import path from 'path';

const html = fs.readFileSync(path.resolve('./index.html'), 'utf8');

const dom = new JSDOM(html, {
  url: "http://localhost/",
  runScripts: "dangerously",
  resources: "usable"
});

dom.window.console.error = (...args) => {
  console.log("JSDOM ERROR:", ...args);
};

dom.window.console.log = (...args) => {
  console.log("JSDOM LOG:", ...args);
};

dom.window.console.warn = (...args) => {
  console.log("JSDOM WARN:", ...args);
};

setTimeout(() => {
  console.log("Finished waiting");
}, 2000);
