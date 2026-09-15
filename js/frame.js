function longer(u, v) {
    v = v.toString();
    while (v.length < u) v = '0' + v;
    return v;
}

function getTitle(songid, diff) {
    var x = slst.songs.find((x) => {
        return x.id == songid;
    })
    var t;
    if (x.difficulties[diff].title_localized != undefined) t = x.difficulties[diff].title_localized;
    else t = x.title_localized;
    return t[songLang] || t['en'];
}

function gethtml(songid, diff, mxp, mis, far, rankk, isScoreOnly, record) {
    if (record && Number.isFinite(record.score)) return importedCard(record, rankk);
    const note = sdb[songid][diff].note;
    let pure = note - mis - far, shownFar = far, shownLost = mis;
    if (isScoreOnly) {
        if (pure < 0) {
            shownFar = (far + 2 * pure) + '-2n';
            shownLost = -pure + '+n';
            pure = 'n';
        } else {
            shownFar = far + '-2n';
            shownLost = 'n';
            pure = pure === 0 ? 'n' : pure + '+n';
        }
    }
    return importedCard({
        songid,
        diff,
        score: Math.floor(1e7 * (note - mis - far / 2) / note + mxp),
        constant: sdb[songid][diff].constant / 10,
        potential: getptt(songid, diff, mxp, mis, far, record?.clearType ?? 1),
        mxp,
        pure,
        far: shownFar,
        mis: shownLost,
        clearType: record?.clearType ?? 1
    }, rankk);

}

function getText(songid, diff, mxp, mis, far, isScoreOnly, record) {
    if (record && Number.isFinite(record.score)) return escapeRecord(importedText(record));
    var title = getTitle(songid, diff);
    var diffText = ['PST', 'PRS', 'FTR', 'BYD', 'ETR'][diff];
    var constant = sdb[songid][diff].constant / 10;
    var note = sdb[songid][diff].note;
    var lstInfo = slst.songs.find((x) => {
        return x.id == songid;
    })
    var level = (lstInfo.difficulties[diff].rating == null ? '?' : lstInfo.difficulties[diff].rating.toString() + (lstInfo.difficulties[diff].ratingPlus ? '+' : ''));
    var pur = note - mis - far;
    var score = Math.floor(1e7 * (pur + far / 2) / note + mxp);
    var a = Math.floor(score / 1e6), b = Math.floor(score / 1e3) % 1000, c = score % 1000;
    a = longer(2, a), b = longer(3, b), c = longer(3, c);
    var ptt = scorePotential(constant, score, record?.clearType ?? 1);
    ptt = Math.floor(ptt * 100000) / 100000;
    return `${title} [${diffText} ${level}] ` + (isScoreOnly ? "" : `${pur}(+${mxp})-${far}-${mis} `) + `${a}'${b}'${c} (${constant} -> ${ptt})`;
}

function showMain() {
    if (Object.keys(recentplay).length != 0) {
        document.getElementById("recent").innerHTML = gethtml(recentplay.songid, recentplay.diff, recentplay.mxp,
            recentplay.mis, recentplay.far, 'REC', recentplay.isScoreOnly, recentplay);
        document.getElementById("recentText").innerHTML = getText(recentplay.songid, recentplay.diff, recentplay.mxp,
            recentplay.mis, recentplay.far, recentplay.isScoreOnly, recentplay);
    } else {
        document.getElementById("recent").innerHTML = "暂无最近游玩记录";
        document.getElementById("recentText").innerHTML = '';
    }
    playlist.sort((a, b) => recordPtt(b) - recordPtt(a));
    const summary = potentialSummary(playlist);
    const cards = playlist.map((r, i) => gethtml(r.songid, r.diff, r.mxp, r.mis, r.far, '#' + (i + 1), r.isScoreOnly, r));
    document.getElementById('all').innerHTML = cards.join('');
    const fmt = n => n === null ? '—' : n.toFixed(5);
    document.getElementById('new-ptt').textContent = fmt(summary.current);
    document.getElementById('old-ptt').textContent = fmt(summary.legacy);
    document.getElementById('b10avg').textContent = 'B10 平均：' + fmt(summary.b10 / 10);
    document.getElementById('b50avg').textContent = 'B50 平均：' + fmt(summary.b50 / 50);
    document.getElementById('old-b10avg').textContent = 'B10 平均：' + fmt(summary.oldB10 === null ? null : summary.oldB10 / 10);
    document.getElementById('b30avg').textContent = 'B30 平均：' + fmt(summary.oldB30 === null ? null : summary.oldB30 / 30);
    document.getElementById('calculation-status').textContent = summary.missing
        ? summary.missing + ' 条成绩缺少通关类型，旧版结果暂不计算。重新导入原 CSV 可补全；手动记录可在下方选择通关类型。'
        : '共 ' + summary.count + ' 张谱面。两个版本分别排序选取最佳成绩；不足数量按 0 补齐。';

}

function filter() {
    var songcur = '';
    var listsong = [];
    var diffi = [0, 0, 0, 0, 0];
    for (var i = 0; i < 5; i++) diffi[i] = document.getElementsByName("diff1")[i].checked;
    if (!(diffi[0] || diffi[1] || diffi[2] || diffi[3] || diffi[4])) diffi = [true, true, true, true, true];
    var constantMin = parseFloat(document.getElementById('rankmin').value),
        constantMax = parseFloat(document.getElementById('rankmax').value);
    if (isNaN(constantMin)) constantMin = 0.0;
    constantMin = Math.max(constantMin, 0.0);
    if (isNaN(constantMax)) constantMax = 20.0;
    constantMax = Math.min(constantMax, 20.0);
    var name = document.getElementById('songtitlea').value;
    for (i in sdb) {
        var lstInfo = slst.songs.find((x) => {
            return x.id == i;
        })
        if (lstInfo.deleted) continue;
        var t = true;
        {
            var flagTitle = false;
            var searchName = name.replaceAll(' ', '').toLocaleLowerCase();
            var originalNames = [];
            for (var j in lstInfo.title_localized) originalNames.push(lstInfo.title_localized[j]);
            originalNames.push(lstInfo.artist);
            for (var j in lstInfo.search_title) for (var k in lstInfo.search_title[j]) originalNames.push(lstInfo.search_title[j][k]);
            for (var j in lstInfo.search_artist) for (var k in lstInfo.search_artist[j]) originalNames.push(lstInfo.search_artist[j][k]);
            for (var j in lstInfo.difficulties) if (lstInfo.difficulties[j].title_localized != undefined)
                for (var k in lstInfo.difficulties[j].title_localized) originalNames.push(lstInfo.difficulties[j].title_localized[k]);
            for (var j in lstInfo.difficulties) if (lstInfo.difficulties[j].artist != undefined)
                originalNames.push(lstInfo.difficulties[j].artist);
            for (var j in originalNames) if (originalNames[j].replaceAll(' ', '').toLocaleLowerCase().includes(searchName)) flagTitle = true;
            if (!flagTitle) t = false;
        }
        var flag = false;
        for (var j = 0; j < 5; j++) if (diffi[j] && sdb[i].length > j && sdb[i][j].constant / 10 >= constantMin && sdb[i][j].constant / 10 <= constantMax) flag = true;
        if (!flag) t = false;
        if (t) listsong.push({lst: lstInfo, info: sdb[i]});
    }
    var method = document.getElementById("sortMethod").value;
    var mainDiff = 0;
    let ord = [4, 3, 0, 1, 2];
    for (let i = 0; i < 5; i++) if (diffi[ord[i]]) mainDiff = ord[i];
    var sortValue = (a) => {
        return 1;
    }
    if (method == "name") sortValue = (a) => {
        if (a.lst.difficulties[mainDiff]?.title_localized != undefined)
            return a.lst.difficulties[mainDiff]?.title_localized.en.toLocaleLowerCase();
        return a.lst.title_localized.en.toLocaleLowerCase();
    };
    else if (method == "const") sortValue = (a) => {
        return a.info[mainDiff]?.constant ?? -11;
    };
    else if (method == "note") sortValue = (a) => {
        return a.info[mainDiff]?.note ?? -11;
    };
    else if (method == "time") sortValue = (a) => {
        if (a.lst.difficulties[mainDiff]?.date != undefined)
            return a.lst.difficulties[mainDiff]?.date;
        return a.lst.date;
    };
    listsong.sort((a, b) => {
        return sortValue(a) < sortValue(b) ? -1 : (sortValue(a) > sortValue(b) ? 1 : 0);
    });
    if (document.getElementById("sortWay").checked) listsong.reverse();
    for (i in listsong) {
        var x = listsong[i].lst;
        songcur += '<div class="title"><div class="ui grid"><div class="six wide column">' + escapeRecord(x.title_localized[songLang] || x.title_localized.en);
        for (var j = 0; j < 5; j++) if (x.difficulties.length > j && x.difficulties[j].title_localized != undefined) {
            let t = x.difficulties[j].title_localized;
            songcur += '<div class="ui ' + ['pst', 'prs', 'ftr', 'byd', 'etr'][j] + '-color horizontal label" style="margin-left:0.5em">' + escapeRecord(t[songLang] || t.en) + '</div>';
        }
        songcur += '</div>';
        songcur += '<div class="nine wide column"><div class="ui equal width grid">';
        for (let j = 0; j < 5; j++) {
            const info = listsong[i].info[j];
            songcur += '<div class="column">';
            if (info && info.constant >= 0) songcur += '<div class="ui ' + ['pst', 'prs', 'ftr', 'byd', 'etr'][j] + '-color horizontal label">' + (info.constant / 10).toFixed(1) + '</div>';
            songcur += '</div>';
        }

        songcur += "<div class='column'>" + (x.wikiOnly ? "<span class='ui tiny label'>ID 映射待补全</span>" : "<div class='mini ui blue submit button' onclick='jumpToPlayUpload(\"" + x.id + "\")'>录入成绩</div>") + "</div>";
        songcur += '</div></div></div></div>';
    }
    document.getElementById('songcur').innerHTML = songcur;
}

function loadExample() {
    document.getElementById("example").innerHTML =
        gethtml('espebranch', 2, 948, 1, 10, '#4', false) +
        gethtml('aegleseeker', 1, 1023, 14, 35, 'REC', false);
}