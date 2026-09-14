const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'),
    path = require('node:path');
const root = path.join(__dirname, '..');
const ctx = {sdb: JSON.parse(fs.readFileSync(path.join(root, 'static/sdb.json'), 'utf8')), console};
vm.createContext(ctx);
for (const name of ['base64', 'archive']) vm.runInContext(fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), ctx);
const state = {
    playlist: [{songid: 'testify', diff: 2, mxp: 1000, mis: 2, far: 5}],
    recentplay: {},
    songLang: 'en',
    ratings: [{timestamp: 1000, userRating: 129.8}],
    scoreHistory: []
};
const json = JSON.stringify(ctx.archiveDocument(state));
assert.equal(JSON.stringify(ctx.parseArchive(json)), JSON.stringify(state));
assert.equal(JSON.stringify(ctx.parseArchive(ctx.Base64.encode(JSON.stringify(state)))), JSON.stringify(state));
assert.throws(() => ctx.parseArchive('not a save'));
assert.throws(() => ctx.parseArchive(JSON.stringify({playlist: [{songid: 'fake', diff: 2}]})));
assert.throws(() => ctx.parseArchive(JSON.stringify({...state, ratings: [{timestamp: 1, userRating: 'bad'}]})));
assert.throws(() => ctx.parseArchive(JSON.stringify({
    format: 'arcaea-potential-calculator',
    version: 99,
    data: state
})));
const csv = require('../js/csv.js');
if (process.argv[2]) {
    const batches = ['all_scores.csv', 'best_scores.csv', 'ratings.csv'].map(f => csv.decode(fs.readFileSync(path.join(process.argv[2], f), 'utf8')));
    const imported = csv.apply({songLang: 'en'}, batches);
    assert.equal(JSON.stringify(ctx.parseArchive(JSON.stringify(ctx.archiveDocument(imported)))), JSON.stringify({
        playlist: imported.playlist,
        recentplay: imported.recentplay,
        songLang: 'en',
        ratings: imported.ratings,
        scoreHistory: imported.scoreHistory
    }));
}
console.log('Archive round-trip, legacy text compatibility and invalid file rejection passed.');
