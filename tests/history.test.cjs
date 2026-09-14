const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

class Element {
    constructor() {
        this.value = '';
        this.textContent = '';
        this.children = [];
        this.events = {};
        this.files = [];
    }

    setAttribute(k, v) {
        this[k] = v;
    }

    append(x) {
        this.children.push(x);
    }

    replaceChildren(...xs) {
        this.children = xs;
    }

    addEventListener(name, fn) {
        this.events[name] = fn;
    }
}

const ids = [...fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8').matchAll(/id="([^"]+)"/g)].map(x => x[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
const elements = Object.fromEntries(ids.map(x => [x, new Element()]));
elements.scale.value = '10';
const events = {};
const storage = {};
const ctx = {
    document: {
        getElementById: id => {
            assert.ok(elements[id], 'Missing element ' + id);
            return elements[id];
        }, createElement: () => new Element(), createElementNS: () => new Element()
    }, localStorage: storage, console, Event: class {
        constructor(type) {
            this.type = type;
        }
    }
};
ctx.window = ctx;
ctx.addEventListener = (name, fn) => events[name] = fn;
ctx.dispatchEvent = e => events[e.type]?.(e);
vm.createContext(ctx);
for (const file of ['base64.js', 'save.js', 'csv.js', 'potential.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), ctx);
assert.equal(elements.results.hidden, true);
// Import on index must refresh the history without navigation or reload.
ctx.sdb = {};
ctx.playlist = [];
ctx.recentplay = {};
ctx.ratings = [];
ctx.scoreHistory = [];
ctx.songLang = 'en';
ctx.showMain = () => {
};
elements['csv-files'].files = [{
    name: 'ratings.csv',
    text: async () => 'Timestamp,UserRating\n1750141268574,125\n1789369344632,129.8'
}];
(async () => {
    await ctx.importYurisaki('csv-files', 'csv-status');
    assert.equal(elements.first.textContent, '12.50');
    assert.equal(elements.last.textContent, '12.98');
    assert.equal(elements.delta.textContent, '+0.48');
    assert.equal(elements.results.hidden, false);
    assert.equal(elements.rows.children.length, 2);
    assert.equal(elements.chart.children.length, 1);
    elements.start.value = '2026-09-14';
    elements.start.events.change();
    assert.equal(elements.delta.textContent, '0.00');
    elements.reset.events.click();
    assert.equal(elements.delta.textContent, '+0.48');
    ctx.ratings = [];
    ctx.save();
    assert.equal(elements.results.hidden, true, 'clear/save must refresh the history');
    assert.equal(JSON.parse(ctx.Base64.decode(storage.arcsave)).ratings.length, 0);
    console.log('Inline history tests passed: unique IDs, import event, date filter, reset, save/clear event.');
})().catch(e => {
    console.error(e);
    process.exit(1)
});
