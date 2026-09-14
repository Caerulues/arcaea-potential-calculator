const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'),
    path = require('node:path');
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, '../static', name), 'utf8'));
const sdb = read('sdb.json'), slst = read('slst.json'), source = read('wiki-constants.json');
assert.equal(source.entries.length, 552);
assert.equal(new Set(source.entries.map(x => x.songId)).size, 552);
assert.equal(sdb.last[3].constant, 96);
assert.equal(sdb.lasteternity[3].constant, 97);
assert.equal(sdb.cataclysmcry[3].constant, 118);
assert.equal(sdb.deinosphainein[3].constant, 120);
assert.equal(sdb.cataclysmcry[3].note, 2119, 'Local AFF note count');
assert.equal(sdb.sacrosanct[0].note, -1, 'Unavailable local charts remain unknown');
assert.notDeepEqual(sdb.quon, sdb.quonwacca, 'Quon versions must remain distinct');
for (const row of source.entries) {
    assert.ok(slst.songs.some(s => s.id === row.songId));
    row.constants.forEach((c, i) => {
        if (c !== null) assert.equal(sdb[row.songId][i].constant, c);
    });
}
for (const r of source.unresolvedGameIds) assert.equal(slst.songs.find(s => s.id === r.id).wikiOnly, true);
const elements = {
    songtitlea: {value: ''},
    rankmin: {value: ''},
    rankmax: {value: ''},
    sortMethod: {value: 'name'},
    sortWay: {checked: false},
    songcur: {innerHTML: ''}
};
const diff = Array.from({length: 5}, () => ({checked: false}));
const ctx = {
    sdb,
    slst,
    songLang: 'en',
    document: {getElementById: id => elements[id], getElementsByName: () => diff},
    console
};
vm.createContext(ctx);
for (const file of ['records.js', 'frame.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), ctx);
for (const method of ['name', 'const', 'note', 'time']) for (let d = 0; d < 5; d++) {
    elements.sortMethod.value = method;
    diff.forEach((x, i) => x.checked = i === d);
    ctx.filter();
    assert.ok(elements.songcur.innerHTML.length > 0);
}
elements.songtitlea.value = 'Cataclysm';
diff.forEach(x => x.checked = false);
ctx.filter();
assert.ok(elements.songcur.innerHTML.includes('Cataclysm Cry'));
assert.ok(elements.songcur.innerHTML.includes('11.8'));
console.log('Catalog checks passed: source coverage, distinct variants, unknown metadata, all difficulty/sort combinations, new-song search.');
