const assert = require('node:assert/strict');
const fs = require('node:fs');
const csv = require('../js/csv.js');
const header = 'SongId,Difficulty,Score,Constant,Potential,MaxPure,Pure,Far,Lost,Timestamp\n';
const score = (id, score, time) => `${id},2,${score},10,12,100,100,0,0,${time}\n`;
assert.equal(csv.parse('\uFEFFname,value\r\n"a,b","x""y"\r\n').rows[0].value, 'x"y');
assert.throws(() => csv.parse('a,b\n"x,y'), /引号/);
assert.throws(() => csv.decode('Timestamp,UserRating\n123,\n'), /没有有效/);
assert.throws(() => csv.decode('Timestamp,UserRating\n9000000000000000,125'), /日期范围/);
assert.throws(() => csv.decode(header + score('x', 10000000, 0)), /没有有效/);
const batch = csv.decode(header + score('x', 9999999, 2000) + score('x', 10000000, 1000) + score('y', 9999990, 3000));
let state = csv.apply({}, [batch]);
assert.equal(state.playlist.length, 2);
assert.equal(state.playlist[0].score, 10000000);
assert.equal(state.recentplay.timestamp, 3000);
assert.deepEqual(csv.apply(state, [batch]), state);
state.playlist = [];
state.recentplay = {};
const ratings = csv.decode('Timestamp,UserRating\n2000,129.8\n1000,125\n2000,129.8');
state = csv.apply(state, [ratings]);
assert.equal(state.playlist.length, 0);
assert.deepEqual(state.recentplay, {});
assert.equal(state.ratings.length, 2);
assert.equal(state.ratings[0].timestamp, 1000);
const partiallyValid = csv.decode('Timestamp,UserRating\n1000,125\n-1,100');
assert.equal(partiallyValid.errors.length, 1);
if (process.argv[2]) {
    const dir = process.argv[2];
    const batches = ['all_scores.csv', 'best_scores.csv', 'ratings.csv'].map(f => csv.decode(fs.readFileSync(dir + '/' + f, 'utf8')));
    assert.ok(batches.every(b => b.errors.length === 0));
    const imported = csv.apply({}, batches);
    assert.equal(imported.playlist.length, 439);
    assert.equal(imported.ratings.length, 223);
    assert.equal(imported.scoreHistory.length, 859);
    assert.deepEqual(csv.apply(imported, batches), imported);
    assert.equal(imported.ratings[0].userRating / 10, 12.5);
    assert.equal(imported.ratings.at(-1).userRating / 10, 12.98);
    console.log(JSON.stringify({
        charts: imported.playlist.length,
        plays: imported.scoreHistory.length,
        ratings: imported.ratings.length,
        first: imported.ratings[0],
        last: imported.ratings.at(-1)
    }));
}
console.log('CSV tests passed');
