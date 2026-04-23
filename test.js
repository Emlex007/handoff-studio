const fs = require('fs');
let code = fs.readFileSync('code.js', 'utf8');
const fakeFigma = {
  showUI: () => {},
  on: () => {},
  mixed: 'MIXED',
  variables: {},
  currentPage: {
    selection: [
      {
        id: '1:1', type: 'FRAME', name: 'Button', 
        layoutMode: 'HORIZONTAL', fills: [{type: 'SOLID', visible: true, color: {r: 1, g: 0, b:0}}],
        strokes: [], itemSpacing: 8, children: [
          {id: '1:2', type: 'TEXT', name: 'Click Me', characters: 'Click Me', fills: [], strokes: []}
        ]
      }
    ]
  },
  ui: {
    postMessage: (msg) => console.log('postMessage:', JSON.stringify(msg, null, 2))
  }
};
code = 'const figma = fakeFigma; const __html__ = ""; ' + code + ';\nhandleSelection();';
try { eval(code); } catch(e) { console.error('CRASH:', e.message, e.stack); }
