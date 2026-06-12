import { marked } from '../js/lib/marked.esm.js';

console.log('marked:', typeof marked);
console.log('marked.parse:', typeof marked.parse);
console.log('marked.parseInline:', typeof marked.parseInline);

const testString = 'This is *italic* and [link](http://example.com)';
console.log('parse:', marked.parse(testString));
console.log('parseInline:', marked.parseInline(testString));
