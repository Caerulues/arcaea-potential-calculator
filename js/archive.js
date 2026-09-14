/* Portable archive validation; both versioned JSON and legacy text are accepted. */
function parseArchive(text) {
    let parsed;
    try {
        parsed = JSON.parse(text.replace(/^\uFEFF/, ''));
    } catch {
        try {
            parsed = JSON.parse(Base64.decode(text.trim()));
        } catch {
            throw Error('无法识别存档，请选择本网站下载的 JSON 或旧存档文本文件。');
        }
    }
    if (parsed?.format === 'arcaea-potential-calculator') {
        if (parsed.version !== 1) throw Error('暂不支持此存档版本。');
        parsed = parsed.data;
    }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.playlist)) throw Error('存档缺少成绩列表。');
    const finite = (v, min = 0) => typeof v === 'number' && Number.isFinite(v) && v >= min;
    const validRecord = r => {
        if (!r || typeof r.songid !== 'string' || !r.songid || !Number.isInteger(r.diff) || r.diff < 0 || r.diff > 4) throw Error('存档含有无效曲目或难度。');
        if (!['mxp', 'mis', 'far'].every(k => finite(r[k]) && Number.isInteger(r[k]))) throw Error('存档含有无效判定。');
        if (r.clearType !== undefined && (!Number.isInteger(r.clearType) || r.clearType < 0 || r.clearType > 5)) throw Error('存档含有无效通关类型。');
        if (r.score !== undefined) {
            if (!Number.isInteger(r.score) || r.score < 0 || !finite(r.potential) || !finite(r.constant) || !Number.isInteger(r.pure) || r.pure < 0 || r.mxp > r.pure || !finite(r.timestamp, 1) || r.timestamp > 8640000000000000) throw Error('存档含有无效成绩或时间。');
        } else if (typeof sdb === 'undefined' || !sdb[r.songid]?.[r.diff] || sdb[r.songid][r.diff].note <= 0) throw Error('旧格式成绩缺少可用曲库信息。');
    };
    parsed.playlist.forEach(validRecord);
    const recent = parsed.recentplay ?? {};
    if (!recent || typeof recent !== 'object' || Array.isArray(recent)) throw Error('最近游玩格式错误。');
    if (Object.keys(recent).length) validRecord(recent);
    const history = parsed.scoreHistory ?? [], ratings = parsed.ratings ?? [];
    if (!Array.isArray(history) || !Array.isArray(ratings)) throw Error('历史记录格式错误。');
    history.forEach(validRecord);
    for (const r of ratings) if (!r || !finite(r.timestamp, 1) || r.timestamp > 8640000000000000 || !finite(r.userRating)) throw Error('账号历史记录格式错误。');
    if (parsed.songLang !== undefined && typeof parsed.songLang !== 'string') throw Error('语言设置格式错误。');
    return {
        playlist: parsed.playlist,
        recentplay: recent,
        songLang: parsed.songLang || 'en',
        ratings,
        scoreHistory: history
    };
}

function archiveDocument(state) {
    return {format: 'arcaea-potential-calculator', version: 1, exportedAt: new Date().toISOString(), data: state};
}
