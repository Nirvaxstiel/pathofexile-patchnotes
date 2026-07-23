// Headless smoke test for the static SPA (no build step).
// Extracts index.html's inline <script> to a temp .mjs, stubs DOM+fetch, imports it,
// confirms it boots and renders rows without throwing. Run: node _t.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const REPO = '.';
const html = fs.readFileSync(REPO + '/index.html', 'utf8');
const mm = html.match(/<script>([\s\S]*?)<\/script>/);
const js = mm[1];

// Write the inline script as a module so top-level await is legal
const tmpJs = path.join(os.tmpdir(), 'poe_differ_inline.mjs');
fs.writeFileSync(tmpJs, js);

// Turn the temp path into a valid file:// URL (Windows needs this for dynamic import)
const fileUrl = 'file:///' + tmpJs.split(path.sep).join('/').replace(/^\/+/, '');

const prelude = `
const reg = {};
function El(id) {
  this.id = id; this.style = {}; this._cls = new Set(); this.dataset = {}; this._html = ''; this._click = null;
  this.classList = {
    add: c => this._cls.add(c), remove: c => this._cls.delete(c),
    toggle: (c, f) => { if (f === undefined) f = !this._cls.has(c); f ? this._cls.add(c) : this._cls.delete(c); },
    contains: c => this._cls.has(c)
  };
  this.setAttribute = (k, v) => { if (k === 'data-t') this.dataset.t = v; };
  this.getAttribute = k => k === 'data-t' ? this.dataset.t : null;
  this.addEventListener = (ev, fn) => { if (ev === 'click') this._click = fn; };
  Object.defineProperty(this, 'innerHTML', { get: () => this._html, set: v => { this._html = v; } });
  this.querySelectorAll = sel => {
    if (sel === '#app .row') return reg.app._rows || [];
    if (sel === '#app section') return [];
    if (sel.indexOf('.lg') >= 0) return reg.legend._filters;
    return [];
  };
  this.querySelector = sel => reg.legend._clr || new El('x');
  this.closest = () => null;
}
reg.app = new El('app');
reg.legend = new El('legend');
reg.legend._filters = ['buff','nerf','chg','new'].map(c => { const e = new El('f'+c); e.dataset.filter = c; return e; });
reg.legend._clr = new El('clr');
['meta','mnav','toc','tocSearch','leagueIn','leagueList','leagueDD','lightbox','lbImg','lbStage','h1'].forEach(id => reg[id] = new El(id));
global.document = {
  getElementById: id => reg[id] || new El(id),
  createElement: () => new El('x'),
  addEventListener: (ev, fn) => { if (ev === 'click') reg._docClick = fn; },
  body: new El('x'), querySelector: sel => reg.h1, querySelectorAll: () => []
};
global.window = { addEventListener: () => {} };
import fs from 'fs';
global.fs = fs;
global.fetch = async p => ({ ok: true, json: async () => JSON.parse(global.fs.readFileSync('${REPO}/' + p, 'utf8')) });
global.__reg = reg;
`;

const runner = `
import('${fileUrl}').then(() => {
  setTimeout(() => {
    const reg = global.__reg;
    const types = [...(reg.app._html || '').matchAll(/data-t="(\\w+)"/g)].map(x => x[1]);
    const counts = {}; types.forEach(t => counts[t] = (counts[t]||0)+1);
    console.log('rendered rows:', types.length, 'types:', JSON.stringify(counts));
    const nerf = reg.legend._filters.find(f => f.dataset.filter === 'nerf');
    if (nerf._click) nerf._click();
    console.log('after NERF click no throw; off:', [...reg.legend._filters].filter(f => f._cls.has('off')).map(f => f.dataset.filter));
    process.exit(0);
  }, 300);
}).catch(e => { console.error('BOOT FAILED:', e.message); process.exit(1); });
`;

const runnerPath = path.join(os.tmpdir(), 'poe_differ_runner.mjs');
fs.writeFileSync(runnerPath, prelude + runner);
try {
  console.log(execSync('node ' + runnerPath, { encoding: 'utf8', timeout: 20000 }));
} finally {
  fs.unlinkSync(tmpJs);
  fs.unlinkSync(runnerPath);
}
