function switchPotential(version) {
    for (const name of ['b50', 'b30']) {
        const active = name === version;
        document.getElementById(name + '-panel').hidden = !active;
        const button = document.getElementById(name + '-option');
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
    }
}

(function () {
    let queued = false;

    function resizeTitles() {
        queued = false;
        const canvas = document.createElement('canvas'), context = canvas.getContext('2d');
        context.font = '700 16px Lato, Arial, sans-serif';
        document.querySelectorAll('.card-title').forEach(el => {
            const natural = context.measureText(el.textContent).width;
            const available = el.getBoundingClientRect().width;
            if (available > 0) el.style.fontSize = Math.min(16, 16 * available / Math.max(natural, 1)) + 'px';
        });
    }

    function schedule() {
        if (!queued) {
            queued = true;
            requestAnimationFrame(resizeTitles);
        }
    }

    window.addEventListener('arcaea-save-changed', schedule);
    window.addEventListener('resize', schedule);
    const observer = new MutationObserver(schedule);
    for (const id of ['all', 'recent']) observer.observe(document.getElementById(id), {childList: true});
    if (window.ResizeObserver) new ResizeObserver(schedule).observe(document.querySelector('.home-results'));
    if (document.fonts) document.fonts.ready.then(schedule);
    schedule();
})();
