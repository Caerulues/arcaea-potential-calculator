(function () {
    'use strict';
    const el = id => document.getElementById(id);
    let archive = {}, visibleRows = [], rowLimit = 100;
    const dateText = t => new Date(t).toLocaleString('zh-CN', {hour12: false});
    const signed = n => (n > 0 ? '+' : '') + n.toFixed(2);
    const tone = n => n > 0 ? 'positive' : n < 0 ? 'negative' : '';

    function readArchive() {
        return localStorage.arcsave ? JSON.parse(Base64.decode(localStorage.arcsave)) : {};
    }

    function render() {
        rowLimit = 100;
        const start = el('start').value ? new Date(el('start').value + 'T00:00:00').getTime() : -Infinity;
        let end = Infinity;
        if (el('end').value) {
            const d = new Date(el('end').value + 'T00:00:00');
            d.setDate(d.getDate() + 1);
            end = d.getTime();
        }
        const scale = Number(el('scale').value);
        const points = (archive.ratings || []).filter(r => r.timestamp >= start && r.timestamp < end).sort((a, b) => a.timestamp - b.timestamp).map(r => ({
            t: r.timestamp,
            v: r.userRating / scale
        }));
        el('results').hidden = !points.length;
        el('empty').hidden = !!points.length;
        el('empty').textContent = start >= end ? '开始日期不能晚于结束日期。' : (archive.ratings || []).length ? '所选日期内没有记录。' : '尚无账号历史。导入 ratings.csv 后即可查看曲线和涨幅。';
        if (!points.length) return;
        const first = points[0], last = points.at(-1), peak = points.reduce((a, b) => a.v >= b.v ? a : b),
            delta = last.v - first.v;
        for (const [id, p] of [['first', first], ['last', last], ['peak', peak]]) {
            el(id).textContent = p.v.toFixed(2);
            el(id + '-date').textContent = dateText(p.t);
        }
        el('delta').textContent = signed(delta);
        el('delta').className = tone(delta);
        el('count').textContent = points.length + ' 条记录';
        drawChart(points);
        visibleRows = points.map((p, i) => ({
            ...p,
            change: i ? p.v - points[i - 1].v : null,
            total: p.v - first.v
        })).filter(p => !el('changes').checked || (p.change !== null && Math.abs(p.change) > 1e-9)).reverse();
        renderRows();
    }

    function renderRows() {
        el('rows').replaceChildren();
        for (const p of visibleRows.slice(0, rowLimit)) {
            const row = document.createElement('tr');
            for (const [text, cls] of [[dateText(p.t), ''], [p.v.toFixed(2), ''], [p.change === null ? '—' : signed(p.change), tone(p.change)], [signed(p.total), tone(p.total)]]) {
                const cell = document.createElement('td');
                cell.textContent = text;
                cell.className = cls;
                row.append(cell);
            }
            el('rows').append(row);
        }
        el('more').hidden = rowLimit >= visibleRows.length;
        el('table-count').textContent = '显示 ' + Math.min(rowLimit, visibleRows.length) + ' / ' + visibleRows.length + ' 条记录（最新在前）';
    }

    function drawChart(points) {
        const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 980 340');
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', 'Potential 随时间变化曲线，详细数值见下方变化明细');
        const add = (tag, attrs, text) => {
            const n = document.createElementNS(ns, tag);
            for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
            if (text !== undefined) n.textContent = text;
            svg.append(n);
            return n;
        };
        const values = points.map(p => p.v), min = Math.min(...values), max = Math.max(...values),
            pad = Math.max((max - min) * .15, .02), low = min - pad, high = max + pad;
        const first = points[0].t, last = points.at(-1).t;
        const x = t => last === first ? 510 : 64 + (t - first) / (last - first) * 890,
            y = v => 285 - (v - low) / (high - low) * 260;
        for (let i = 0; i < 5; i++) {
            const v = low + (high - low) * i / 4, py = y(v);
            add('line', {x1: 64, x2: 954, y1: py, y2: py, stroke: '#eeeeee'});
            add('text', {x: 52, y: py + 4, 'text-anchor': 'end'}, v.toFixed(2));
        }
        const path = points.map((p, i) => (i ? 'L' : 'M') + x(p.t) + ',' + y(p.v)).join(' ');
        if (points.length > 1) {
            add('path', {d: path + ' L' + x(last) + ',285 L' + x(first) + ',285 Z', fill: '#e8f4fc'});
            add('path', {d: path, fill: 'none', stroke: '#2185d0', 'stroke-width': 2.5});
        }
        points.forEach(p => {
            const c = add('circle', {cx: x(p.t), cy: y(p.v), r: 3.5, tabindex: 0});
            const title = document.createElementNS(ns, 'title');
            title.textContent = dateText(p.t) + ' · ' + p.v.toFixed(2);
            c.setAttribute('aria-label', title.textContent);
            c.append(title);
        });
        add('text', {x: 64, y: 320}, new Date(first).toLocaleDateString('zh-CN'));
        add('text', {x: 954, y: 320, 'text-anchor': 'end'}, new Date(last).toLocaleDateString('zh-CN'));
        el('chart').replaceChildren(svg);
        el('chart-caption').textContent = '悬停或聚焦圆点查看时间及数值。连线仅连接已有记录，不代表期间连续变化。';
    }

    for (const id of ['start', 'end', 'scale', 'changes']) el(id).addEventListener('change', render);
    el('reset').addEventListener('click', () => {
        el('start').value = '';
        el('end').value = '';
        render();
    });
    el('more').addEventListener('click', () => {
        rowLimit += 100;
        renderRows();
    });

    function refresh() {
        try {
            archive = readArchive();
            el('history-status').textContent = '';
            render();
        } catch (e) {
            el('history-status').textContent = '无法读取存档：' + e.message;
        }
    }

    window.addEventListener('storage', event => {
        if (event.key === 'arcsave' || event.key === null) refresh();
    });
    window.addEventListener('arcaea-save-changed', refresh);
    refresh();

})();
