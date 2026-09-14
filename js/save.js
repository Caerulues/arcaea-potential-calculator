var playlist, recentplay, songLang, ratings = [], scoreHistory = [];

function setNewLang(lang) {
    songLang = lang;
    showMain();
    filter();
    loadExample();
    $('#displayLang').dropdown('set selected', lang)
    save();
}

function load() {
    if (localStorage.arcsave != undefined) {
        let t = JSON.parse(Base64.decode(localStorage.arcsave));
        ratings = t.ratings || [];
        scoreHistory = t.scoreHistory || [];
        recentplay = t.recentplay;
        playlist = t.playlist;
        songLang = t.songLang;
    } else {
        if (localStorage.playlist == undefined) playlist = [];
        else playlist = JSON.parse(Base64.decode(localStorage.playlist));
        if (localStorage.recentplay == undefined) recentplay = {};
        else recentplay = JSON.parse(Base64.decode(localStorage.recentplay));
        localStorage.removeItem('playlist');
        localStorage.removeItem('recentplay');
    }
    if (playlist == undefined) playlist = [];
    if (recentplay == undefined) recentplay = {};
    if (songLang == undefined) songLang = 'en';
    for (let i in slst.songs) {
        if (slst.songs[i].deleted) {
            playlist = playlist.filter(x => Number.isFinite(x.score) || x.songid != slst.songs[i].id);
            if (!Number.isFinite(recentplay.score) && recentplay.songid == slst.songs[i].id) recentplay = {};
        }
    }
    playlist.sort(function (a, b) {
        var ptta = recordPtt(a);
        var pttb = recordPtt(b);
        return pttb - ptta;
    })
    setNewLang(songLang);
}

function save() {
    localStorage.arcsave = Base64.encode(JSON.stringify({
        playlist: playlist,
        recentplay: recentplay,
        songLang: songLang,
        ratings: ratings,
        scoreHistory: scoreHistory
    }));
    window.dispatchEvent(new Event('arcaea-save-changed'));
}

function outersave() {
    const status = document.getElementById('archive-status');
    try {
        if (!Array.isArray(playlist)) throw Error('数据尚未加载完成。');
        const state = {playlist, recentplay, songLang, ratings, scoreHistory};
        const blob = new Blob([JSON.stringify(archiveDocument(state), null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob), link = document.createElement('a');
        link.href = url;
        link.download = 'arcaea-save-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        status.textContent = '已生成下载文件，包含全部成绩和 Potential 历史。';
    } catch (e) {
        status.textContent = '导出失败：' + e.message;
    }
}

async function outerload() {
    const input = document.getElementById('archive-file'), status = document.getElementById('archive-status');
    input.disabled = true;
    try {
        if (typeof sdb === 'undefined' || !sdb) throw Error('曲库尚未加载完成。');
        const file = input.files[0];
        if (!file) throw Error('请先选择存档文件。');
        const next = parseArchive(await file.text());
        if (!confirm('恢复此文件将替换当前成绩与历史记录，确认导入？')) {
            status.textContent = '已取消导入。';
            return;
        }
        localStorage.arcsave = Base64.encode(JSON.stringify(next));
        ({playlist, recentplay, songLang, ratings, scoreHistory} = next);
        setNewLang(songLang);
        status.textContent = '已恢复 ' + playlist.length + ' 张谱面成绩及 ' + ratings.length + ' 条账号记录。';
    } catch (e) {
        status.textContent = '导入失败：' + e.message;
    } finally {
        input.disabled = false;
    }
}

function clearsave() {
    let r = confirm('确定清空存档吗？这会清除所有游玩信息和所有曲目信息！\n建议仅在存档损坏时使用！');
    if (!r) return;
    r = confirm('请再次确认是否清空存档，这会删除所有存储信息！');
    if (!r) return;
    r = confirm('存档被清空后无法被直接恢复（除非提前导出），请最后确认是否清空存档！');
    if (!r) return;
    playlist = [];
    recentplay = {};
    ratings = [];
    scoreHistory = [];
    songLang = 'en';
    setNewLang(songLang);
    alert('存档已经清空。')
}