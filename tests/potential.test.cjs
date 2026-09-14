const assert = require('node:assert/strict');
const fs = require('node:fs');
const {potentialSummary, legacyRecordPtt} = require('../js/records.js');
const csv = require('../js/csv.js');
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
for (const clearType of [1, 2, 3, 4, 5]) close(legacyRecordPtt({potential: 12, clearType}), 11.8);
close(legacyRecordPtt({potential: 12, clearType: 0}), 12);
close(legacyRecordPtt({potential: 12}), 11.8);
const records = Array.from({length: 60}, (_, i) => ({potential: 15 - i / 10, clearType: 1}));
const s = potentialSummary(records);
close(s.current, (145.5 + 627.5) / 60);
close(s.legacy, (143.5 + 400.5) / 40);
close(potentialSummary([{potential: 12}]).legacy, 23.6 / 40);
close(potentialSummary([{potential: 12, clearType: 1}]).current, 24 / 60);
close(potentialSummary([]).current, 0);
close(potentialSummary([]).legacy, 0);
// Failure just below the cutoff overtakes a successful clear after adjustment.
const mixed = Array.from({length: 9}, () => ({potential: 15, clearType: 1})).concat([{
    potential: 12,
    clearType: 1
}, {potential: 11.9, clearType: 0}]);
close(potentialSummary(mixed).oldB10, 9 * 14.8 + 11.9);
// Reimporting identical records backfills previously discarded clear types.
const batch = csv.decode('SongId,Difficulty,Score,Constant,Potential,MaxPure,Pure,Far,Lost,Timestamp,ClearType\nx,2,10000100,10,12.2,100,100,0,0,1000,3');
const old = {...batch.records[0]};
delete old.clearType;
const migrated = csv.apply({playlist: [old], scoreHistory: [old]}, [batch]);
assert.equal(migrated.playlist[0].clearType, 3);
assert.equal(migrated.scoreHistory[0].clearType, 3);
assert.equal(csv.apply(migrated, [batch]).playlist[0].potential, 12.2);
if (process.argv[2]) {
    const batches = ['all_scores.csv', 'best_scores.csv'].map(f => csv.decode(fs.readFileSync(process.argv[2] + '/' + f, 'utf8')));
    const data = csv.apply({}, batches);
    const actual = potentialSummary(data.playlist);
    assert.equal(actual.missing, 0);
    console.log(actual);
}
console.log('Potential formula tests passed');
