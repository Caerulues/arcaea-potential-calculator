function escapeRecord(value) {
    return String(value).replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}

function recordScore(r) {
    if (Number.isFinite(r.score)) return r.score;
    var note = sdb[r.songid][r.diff].note;
    return Math.floor(1e7 * (note - r.mis - r.far / 2) / note + r.mxp);
}

function clearReward(clearType) {
    return (clearType ?? 1) === 0 ? 0 : 0.2;
}

function scorePotential(constant, score, clearType) {
    const reward = clearReward(clearType);
    if (score >= 10000000) return constant + 2 + reward;
    if (score >= 9800000) return constant + 1 + (score - 9800000) / 200000 + reward;
    return Math.max(0, constant + (score - 9500000) / 300000 + reward);
}

function recordPtt(r) {
    return Number.isFinite(r.potential) ? r.potential : getptt(r.songid, r.diff, r.mxp, r.mis, r.far, r.clearType);
}

function importedTitle(r) {
    var song = slst.songs.find(s => s.id === r.songid);
    var title = song && (song.difficulties[r.diff]?.title_localized || song.title_localized);
    return title ? (title[songLang] || title.en) : r.songid;
}

function importedText(r) {
    return importedTitle(r) + ' [' + ['PST', 'PRS', 'FTR', 'BYD', 'ETR'][r.diff] + '] ' + r.score.toLocaleString('en-US') + ' (' + r.constant + ' → ' + r.potential.toFixed(5) + ') · P: ' + r.pure + ' (+' + r.mxp + ') F: ' + r.far + ' L: ' + r.mis;
}

function importedCard(r, rank) {
    const clear = ['Track Lost', 'Track Complete', 'Full Recall', 'Pure Memory', 'Easy Clear', 'Hard Clear'][r.clearType ?? 1];
    const date = r.timestamp ? '<br><small>' + escapeRecord(new Date(r.timestamp).toLocaleString('zh-CN')) + '</small>' : '';
    return '<article class="ui card score-card"><div class="content"><div class="header card-title">' + escapeRecord(importedTitle(r)) + '</div><div class="meta"><span class="ui tiny ' + ['pst', 'prs', 'ftr', 'byd', 'etr'][r.diff] + '-color label">' + ['PST', 'PRS', 'FTR', 'BYD', 'ETR'][r.diff] + '</span><span>定数 ' + r.constant + '</span><span>' + escapeRecord(clear) + '</span><span>' + escapeRecord(rank) + '</span></div><div class="description"><strong class="card-score">' + r.score.toLocaleString('en-US') + '</strong> / ' + r.potential.toFixed(5) + '<br>P: ' + escapeRecord(r.pure) + ' (+' + r.mxp + ') · F: ' + escapeRecord(r.far) + ' · L: ' + escapeRecord(r.mis) + date + '</div></div></article>';
}

// User-selected comparison: current values for B50, successful clears -0.2 for B30.
function legacyRecordPtt(r) {
    const clearType = r.clearType ?? 1;
    if (!Number.isInteger(clearType) || clearType < 0 || clearType > 5) return null;
    return recordPtt(r) - (clearType === 0 ? 0 : 0.2);
}

function potentialSummary(records) {
    const current = records.map(recordPtt).sort((a, b) => b - a);
    const legacyValues = records.map(legacyRecordPtt);
    const missing = legacyValues.filter(v => v === null).length;
    const sum = (values, n) => values.slice(0, n).reduce((total, v) => total + v, 0);
    const b10 = sum(current, 10), b50 = sum(current, 50);
    const legacy = legacyValues.filter(v => v !== null).sort((a, b) => b - a);
    const oldB10 = sum(legacy, 10), oldB30 = sum(legacy, 30);
    return {
        count: records.length,
        missing,
        b10,
        b50,
        current: (b10 + b50) / 60,
        oldB10: missing ? null : oldB10,
        oldB30: missing ? null : oldB30,
        legacy: missing ? null : (oldB10 + oldB30) / 40
    };
}

if (typeof module !== 'undefined') module.exports = {clearReward, scorePotential, recordPtt, legacyRecordPtt, potentialSummary};
