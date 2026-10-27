// The home screen's two extras, the same as the Bible tab in Wang' Kalam
// Agok Buk:
//   - Prayers: a shelf of the prayers and affirmations in data-prayers.js;
//     tap one to read it, tap again (or Close) to put it away.
//   - The plans on paper: the printed charts (img/bible-plans/), to show
//     someone at a glance how a plan works. Tap a card to open it full
//     screen; arrows or a swipe go to the next one, tapping the chart zooms.
(function(){
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const $ = id => document.getElementById(id);

  // ---------------- Prayers ----------------
  let open = null;
  const paragraphs = text => String(text).split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  function drawShelf(){
    const box = $('prayers');
    if (!box || typeof PRAYERS === 'undefined') return;
    const d = open && PRAYERS.find(x => x.key === open);
    box.innerHTML = `
      <h2 class="extras-title">Prayers</h2>
      <div class="shelf" role="list" aria-label="Prayers and affirmations">
        ${PRAYERS.map(x => `
          <button type="button" class="shelf-card${x.mine ? ' mine' : ''}" data-prayer="${x.key}" aria-expanded="${open === x.key}" role="listitem">
            <b>${esc(x.title)}</b><span>${esc(x.by || ' ')}</span>
          </button>`).join('')}
      </div>
      ${d ? `
        <article class="devotion">
          <div class="devotion-head">
            <div><h3>${esc(d.title)}</h3>${d.by ? `<span class="devotion-by">${esc(d.by)}</span>` : ''}</div>
            <button type="button" class="download-btn" id="prayer-close">Close</button>
          </div>
          <div class="devotion-text">${paragraphs(d.text)}</div>
        </article>` : ''}`;
    box.querySelectorAll('[data-prayer]').forEach(b => {
      b.onclick = () => { open = open === b.dataset.prayer ? null : b.dataset.prayer; drawShelf(); };
    });
    const close = $('prayer-close');
    if (close) close.onclick = () => { open = null; drawShelf(); };
  }

  // ---------------- The plans on paper ----------------
  const CHARTS = [
    { src: 'daily.jpg',              plan: 'Daily Plan',    note: 'A Man After God\'s Own Heart: a passage for every date of the year' },
    { src: '52week.jpg',             plan: '52-Week Plan',  note: 'A different kind of book each weekday, one row per week' },
    { src: 'nt90.jpg',               plan: 'NT in 90 Days', note: 'About three chapters a day, Matthew to Revelation' },
    { src: 'ot60-biblical.jpg',      plan: 'OT in 60 Days', note: 'Biblical order, Genesis to Malachi' },
    { src: 'ot60-chronological.jpg', plan: 'OT in 60 Days', note: 'Chronological order, as the events happened' },
    { src: 'ot60-cover.jpg',         plan: 'OT in 60 Days', note: 'The cover' }
  ];
  const chartSrc = c => 'img/bible-plans/' + c.src;
  let chartAt = 0;

  function drawCharts(){
    const box = $('plan-charts');
    if (!box) return;
    box.innerHTML = `
      <details class="charts" open>
        <summary><h2 class="extras-title">The plans on paper</h2><span class="charts-hint">Tap one to show someone how it works</span></summary>
        <div class="chart-row">
          ${CHARTS.map((c, i) => `
            <button type="button" class="chart-card" data-chart="${i}">
              <img src="${chartSrc(c)}" alt="" loading="lazy">
              <b>${esc(c.plan)}</b><span>${esc(c.note)}</span>
            </button>`).join('')}
        </div>
      </details>`;
    box.querySelectorAll('[data-chart]').forEach(b => b.onclick = () => showChart(+b.dataset.chart));

    const dlg = document.createElement('dialog');
    dlg.id = 'chart-viewer';
    dlg.className = 'chart-viewer';
    dlg.setAttribute('aria-label', 'Reading plan chart');
    dlg.innerHTML = `
      <div class="viewer-bar">
        <button type="button" class="download-btn" id="chart-prev" aria-label="Previous chart">←</button>
        <span id="chart-caption"></span>
        <button type="button" class="download-btn" id="chart-next" aria-label="Next chart">→</button>
        <button type="button" class="download-btn" id="chart-close">Close</button>
      </div>
      <div class="chart-scroll" id="chart-scroll"><img id="chart-img" alt=""></div>`;
    document.body.appendChild(dlg);
    $('chart-prev').onclick = () => showChart(chartAt - 1);
    $('chart-next').onclick = () => showChart(chartAt + 1);
    $('chart-close').onclick = () => dlg.close();
    $('chart-img').onclick = () => dlg.classList.toggle('zoomed');
    dlg.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') showChart(chartAt - 1);
      if (e.key === 'ArrowRight') showChart(chartAt + 1);
    });
    let x0 = null;
    $('chart-scroll').addEventListener('touchstart', e => { x0 = e.touches.length === 1 && !dlg.classList.contains('zoomed') ? e.touches[0].clientX : null; }, { passive: true });
    $('chart-scroll').addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 60) showChart(chartAt + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }

  function showChart(i){
    chartAt = (i + CHARTS.length) % CHARTS.length;
    const c = CHARTS[chartAt], dlg = $('chart-viewer');
    dlg.classList.remove('zoomed');
    $('chart-img').src = chartSrc(c);
    $('chart-img').alt = c.plan + ' chart';
    $('chart-caption').innerHTML = `<b>${esc(c.plan)}</b> · ${esc(c.note)} <span class="viewer-count">(${chartAt + 1}/${CHARTS.length})</span>`;
    $('chart-scroll').scrollTop = 0;
    if (!dlg.open) dlg.showModal();
  }

  drawCharts();
  drawShelf();
})();
