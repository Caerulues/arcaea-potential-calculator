/* Yurisaki CSV support. No network requests; source timestamps are milliseconds. */
(function (root) {
    'use strict';

    function parse(text) {
        const rows = [];
        let row = [], field = '', quoted = false;
        text = text.replace(/^\uFEFF/, '');
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (c === '"') {
                if (quoted && text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else if (quoted || field === '') quoted = !quoted; else throw Error('CSV 引号格式错误');
            } else if (c === ',' && !quoted) {
                row.push(field);
                field = '';
            } else if ((c === '\n' || c === '\r') && !quoted) {
                if (c === '\r' && text[i + 1] === '\n') i++;
                row.push(field);
                if (row.some(x => x.trim())) rows.push(row);
                row = [];
                field = '';
            } else field += c;
        }
        if (quoted) throw Error('CSV 引号未闭合');
        row.push(field);
        if (row.some(x => x.trim())) rows.push(row);
        if (rows.length < 2) throw Error('CSV 没有数据行');
        const headers = rows.shift().map(x => x.trim());
        if (new Set(headers).size !== headers.length) throw Error('CSV 存在重复列名');
        return {
            headers, rows: rows.map((r, i) => {
                if (r.length !== headers.length) throw Error('第 ' + (i + 2) + ' 行列数不正确');
                return Object.fromEntries(headers.map((h, j) => [h, r[j].trim()]));
            })
        };
    }

    function decode(text) {
        const data = parse(text), rating = data.headers.includes('UserRating');
        const required = rating ? ['Timestamp', 'UserRating'] : ['SongId', 'Difficulty', 'Score', 'Constant', 'Potential', 'MaxPure', 'Pure', 'Far', 'Lost', 'Timestamp'];
        for (const h of required) if (!data.headers.includes(h)) throw Error('缺少列：' + h);
        const valid = [], errors = [];
        data.rows.forEach((r, i) => {
            try {
                const n = (key, min = 0, integer = false) => {
                    const v = Number(r[key]);
                    if (r[key] === '' || !Number.isFinite(v) || v < min || (integer && !Number.isInteger(v))) throw Error(key + ' 无效');
                    return v;
                };
                const timestamp = n('Timestamp', 1, true);
                if (timestamp > 8640000000000000) throw Error('Timestamp 超出日期范围');
                if (rating) {
                    valid.push({timestamp, userRating: n('UserRating')});
                    return;
                }
                const diff = n('Difficulty', 0, true);
                if (diff > 4) throw Error('Difficulty 无效');
                if (!r.SongId) throw Error('SongId 为空');
                const record = {
                    songid: r.SongId,
                    diff,
                    score: n('Score', 0, true),
                    constant: n('Constant'),
                    potential: n('Potential'),
                    mxp: n('MaxPure', 0, true),
                    pure: n('Pure', 0, true),
                    far: n('Far', 0, true),
                    mis: n('Lost', 0, true),
                    timestamp,
                    isScoreOnly: false
                };
                if (data.headers.includes('ClearType')) {
                    record.clearType = n('ClearType', 0, true);
                    if (record.clearType > 5) throw Error('ClearType 无效');
                }
                if (record.mxp > record.pure || record.pure + record.far + record.mis === 0 || record.score > 10000000 + record.pure + record.far + record.mis) throw Error('分数或判定数量无效');
                valid.push(record);
            } catch (e) {
                errors.push('第 ' + (i + 2) + ' 行：' + e.message);
            }
        });
        if (!valid.length) throw Error('没有有效记录。' + errors.slice(0, 3).join('；'));
        return {type: rating ? 'ratings' : 'scores', records: valid, errors};
    }

    function merge(base, incoming, key) {
        const map = new Map(base.map(x => [key(x), x]));
        incoming.forEach(x => map.set(key(x), x));
        return [...map.values()].sort((a, b) => a.timestamp - b.timestamp);
    }

    function apply(state, batches) {
        const next = {
            ...state,
            playlist: [...(state.playlist || [])],
            ratings: [...(state.ratings || [])],
            scoreHistory: [...(state.scoreHistory || [])]
        };
        for (const batch of batches) {
            if (batch.type === 'ratings') next.ratings = merge(next.ratings, batch.records, x => x.timestamp);
            else next.scoreHistory = merge(next.scoreHistory, batch.records, x => JSON.stringify([x.songid, x.diff, x.timestamp, x.score]));
        }
        const best = new Map(next.playlist.map(r => [JSON.stringify([r.songid, r.diff]), r]));
        for (const r of batches.filter(b => b.type === 'scores').flatMap(b => b.records)) {
            const k = JSON.stringify([r.songid, r.diff]), old = best.get(k);
            const oldScore = old ? (Number.isFinite(old.score) ? old.score : (typeof root.recordScore === 'function' ? root.recordScore(old) : -1)) : -1;
            if (r.score > oldScore || (r.score === oldScore && r.timestamp >= (old.timestamp || 0))) best.set(k, r);
        }
        next.playlist = [...best.values()];
        const last = batches.filter(b => b.type === 'scores').flatMap(b => b.records).sort((a, b) => a.timestamp - b.timestamp).at(-1);
        if (last && (!next.recentplay?.timestamp || last.timestamp >= next.recentplay.timestamp)) next.recentplay = last;
        return next;
    }

    async function readFiles(files) {
        if (!files.length) throw Error('请先选择 CSV 文件');
        const batches = [];
        for (const f of files) {
            try {
                batches.push({...decode(await f.text()), name: f.name});
            } catch (e) {
                throw Error(f.name + '：' + e.message);
            }
        }
        return batches;
    }

    root.ArcCSV = {parse, decode, merge, apply, readFiles};
    if (typeof module !== 'undefined') module.exports = root.ArcCSV;
})(typeof window !== 'undefined' ? window : globalThis);

async function importYurisaki(inputId, statusId) {
    const status = document.getElementById(statusId), input = document.getElementById(inputId);
    input.disabled = true;
    try {
        if (typeof sdb === 'undefined' || !sdb) throw Error('曲库尚未加载完成，请稍后重试');
        const batches = await ArcCSV.readFiles([...input.files]);
        const next = ArcCSV.apply({playlist, recentplay, songLang, ratings, scoreHistory}, batches);
        next.playlist.sort((a, b) => recordPtt(b) - recordPtt(a));
        localStorage.arcsave = Base64.encode(JSON.stringify(next));
        ({playlist, recentplay, ratings, scoreHistory} = next);
        showMain();
        window.dispatchEvent(new Event('arcaea-save-changed'));
        const errors = batches.flatMap(b => b.errors.map(e => b.name + '：' + e));
        status.textContent = '导入完成：' + playlist.length + ' 张谱面最佳成绩，' + scoreHistory.length + ' 条成绩历史，' + ratings.length + ' 条账号记录。' + (errors.length ? ' 已跳过 ' + errors.length + ' 行：' + errors.slice(0, 5).join('；') : '重复记录已自动合并。');
    } catch (e) {
        status.textContent = '导入失败：' + e.message;
    } finally {
        input.disabled = false;
    }
}
