(function(){
  const MONTHS = Object.keys(READING_PLAN);
  const nav = document.getElementById('month-nav');
  const caption = document.getElementById('table-caption');
  const body = document.getElementById('plan-body');

  const now = new Date();
  const todayMonth = MONTHS[now.getMonth()];
  const todayDate = now.getDate();

  const FLAG_NOTES = {
    '8|January': 'Source printed "28-" with no end number — read as 28-29.',
    '9|January': 'Source printed "30" alone on its own line — kept as-is.',
    '21|June': 'Source printed "7985" with no hyphen — read as 79-85.',
    '28|June': 'Source printed "119-" with a trailing hyphen — read as just Psalm 119.'
  };

  // Free-to-fetch translations the passage API serves (all public domain —
  // NIV isn't available this way, hence the separate BibleGateway link).
  const TRANSLATIONS = [
    { code:'web',   label:'WEB',   name:'World English Bible' },
    { code:'kjv',   label:'KJV',   name:'King James Version' },
    { code:'asv',   label:'ASV',   name:'American Standard Version' },
    { code:'bbe',   label:'BBE',   name:'Bible in Basic English' },
    { code:'ylt',   label:'YLT',   name:"Young's Literal Translation" },
    { code:'darby', label:'DARBY', name:'Darby Translation' }
  ];
  let currentTranslation = TRANSLATIONS[0];

  // 52-Week plan: which week number and category (Sun=Epistles..Sat=Gospels)
  // today falls on. Week = ceil(day-of-year / 7), capped at 52 so the last
  // few days of the year land in week 52 rather than overflowing.
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const currentWeekNum = Math.min(52, Math.floor((dayOfYear - 1) / 7) + 1);
  const currentCategory = PLAN_52WEEK_DAY_TO_CATEGORY[now.getDay()];
  let selectedWeek = currentWeekNum;

  // Combined-book days (e.g. "Obadiah & Jonah") aren't a single valid
  // BibleGateway reference, so those stay plain text rather than link out
  // to the wrong passage.
  function bibleGatewayUrl(book, chapters){
    if (!book || /[&,]/.test(book)) return null;
    const ref = chapters ? (book + ' ' + chapters) : book;
    return 'https://www.biblegateway.com/passage/?search=' + encodeURIComponent(ref) + '&version=NIV';
  }

  // Full 66-book canon, in order, with chapter counts — verified to sum to
  // 929 OT / 260 NT chapters (the totals the Bible-in-90-Days source itself
  // states). Used to resolve whole-book reads, and as the search index for
  // the verse finder below.
  const BOOK_ORDER = [
    'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
    '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah',
    'Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah',
    'Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum',
    'Habakkuk','Zephaniah','Haggai','Zechariah','Malachi',
    'Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians',
    'Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy',
    '2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John',
    '3 John','Jude','Revelation'
  ];
  const BOOK_CHAPTERS = {
    'Genesis':50,'Exodus':40,'Leviticus':27,'Numbers':36,'Deuteronomy':34,'Joshua':24,'Judges':21,'Ruth':4,
    '1 Samuel':31,'2 Samuel':24,'1 Kings':22,'2 Kings':25,'1 Chronicles':29,'2 Chronicles':36,'Ezra':10,'Nehemiah':13,
    'Esther':10,'Job':42,'Psalms':150,'Proverbs':31,'Ecclesiastes':12,'Song of Solomon':8,'Isaiah':66,'Jeremiah':52,
    'Lamentations':5,'Ezekiel':48,'Daniel':12,'Hosea':14,'Joel':3,'Amos':9,'Obadiah':1,'Jonah':4,'Micah':7,'Nahum':3,
    'Habakkuk':3,'Zephaniah':3,'Haggai':2,'Zechariah':14,'Malachi':4,
    'Matthew':28,'Mark':16,'Luke':24,'John':21,'Acts':28,'Romans':16,'1 Corinthians':16,'2 Corinthians':13,'Galatians':6,
    'Ephesians':6,'Philippians':4,'Colossians':4,'1 Thessalonians':5,'2 Thessalonians':3,'1 Timothy':6,
    '2 Timothy':4,'Titus':3,'Philemon':1,'Hebrews':13,'James':5,'1 Peter':5,'2 Peter':3,'1 John':5,'2 John':1,
    '3 John':1,'Jude':1,'Revelation':22
  };

  // Common abbreviations/variant spellings a member might actually type,
  // mapped to the canonical name above. Lowercased, punctuation-stripped
  // keys — see normalizeBookInput().
  const BOOK_ALIASES = {
    'gen':'Genesis','ge':'Genesis','gn':'Genesis',
    'exo':'Exodus','ex':'Exodus','exod':'Exodus',
    'lev':'Leviticus','le':'Leviticus','lv':'Leviticus',
    'num':'Numbers','nu':'Numbers','nm':'Numbers','numbers':'Numbers',
    'deut':'Deuteronomy','de':'Deuteronomy','dt':'Deuteronomy',
    'josh':'Joshua','jos':'Joshua',
    'judg':'Judges','jdg':'Judges','jgs':'Judges',
    '1sam':'1 Samuel','1sa':'1 Samuel','1st samuel':'1 Samuel','i samuel':'1 Samuel',
    '2sam':'2 Samuel','2sa':'2 Samuel','2nd samuel':'2 Samuel','ii samuel':'2 Samuel',
    '1kgs':'1 Kings','1ki':'1 Kings','1st kings':'1 Kings','i kings':'1 Kings',
    '2kgs':'2 Kings','2ki':'2 Kings','2nd kings':'2 Kings','ii kings':'2 Kings',
    '1chr':'1 Chronicles','1ch':'1 Chronicles','1st chronicles':'1 Chronicles','i chronicles':'1 Chronicles',
    '2chr':'2 Chronicles','2ch':'2 Chronicles','2nd chronicles':'2 Chronicles','ii chronicles':'2 Chronicles',
    'neh':'Nehemiah','ne':'Nehemiah',
    'esth':'Esther','es':'Esther',
    'ps':'Psalms','psalm':'Psalms','psa':'Psalms','pss':'Psalms',
    'prov':'Proverbs','pr':'Proverbs','pro':'Proverbs',
    'eccl':'Ecclesiastes','ecc':'Ecclesiastes','qoheleth':'Ecclesiastes',
    'song':'Song of Solomon','sos':'Song of Solomon','song of songs':'Song of Solomon','canticles':'Song of Solomon',
    'isa':'Isaiah','is':'Isaiah',
    'jer':'Jeremiah','je':'Jeremiah',
    'lam':'Lamentations','la':'Lamentations',
    'ezek':'Ezekiel','eze':'Ezekiel','ezk':'Ezekiel',
    'dan':'Daniel','da':'Daniel','dn':'Daniel',
    'hos':'Hosea','ho':'Hosea',
    'obad':'Obadiah','ob':'Obadiah',
    'mic':'Micah','mi':'Micah',
    'nah':'Nahum','na':'Nahum',
    'hab':'Habakkuk','hb':'Habakkuk',
    'zeph':'Zephaniah','zep':'Zephaniah',
    'hag':'Haggai','hg':'Haggai',
    'zech':'Zechariah','zec':'Zechariah',
    'mal':'Malachi','ml':'Malachi',
    'matt':'Matthew','mt':'Matthew',
    'mk':'Mark','mr':'Mark',
    'lk':'Luke','lu':'Luke',
    'jn':'John','jhn':'John',
    'ac':'Acts',
    'rom':'Romans','ro':'Romans','rm':'Romans',
    '1cor':'1 Corinthians','1co':'1 Corinthians','1st corinthians':'1 Corinthians','i corinthians':'1 Corinthians',
    '2cor':'2 Corinthians','2co':'2 Corinthians','2nd corinthians':'2 Corinthians','ii corinthians':'2 Corinthians',
    'gal':'Galatians','ga':'Galatians',
    'eph':'Ephesians','ep':'Ephesians',
    'phil':'Philippians','php':'Philippians','philip':'Philippians',
    'col':'Colossians','co':'Colossians',
    '1thess':'1 Thessalonians','1th':'1 Thessalonians','1st thessalonians':'1 Thessalonians','i thessalonians':'1 Thessalonians',
    '2thess':'2 Thessalonians','2th':'2 Thessalonians','2nd thessalonians':'2 Thessalonians','ii thessalonians':'2 Thessalonians',
    '1tim':'1 Timothy','1ti':'1 Timothy','1st timothy':'1 Timothy','i timothy':'1 Timothy',
    '2tim':'2 Timothy','2ti':'2 Timothy','2nd timothy':'2 Timothy','ii timothy':'2 Timothy',
    'tit':'Titus','ti':'Titus',
    'philem':'Philemon','phm':'Philemon',
    'heb':'Hebrews','he':'Hebrews',
    'jas':'James','jm':'James',
    '1pet':'1 Peter','1pe':'1 Peter','1st peter':'1 Peter','i peter':'1 Peter',
    '2pet':'2 Peter','2pe':'2 Peter','2nd peter':'2 Peter','ii peter':'2 Peter',
    '1jn':'1 John','1jo':'1 John','1st john':'1 John','i john':'1 John',
    '2jn':'2 John','2jo':'2 John','2nd john':'2 John','ii john':'2 John',
    '3jn':'3 John','3jo':'3 John','3rd john':'3 John','iii john':'3 John',
    'jud':'Jude',
    'rev':'Revelation','re':'Revelation','apocalypse':'Revelation','revelations':'Revelation'
  };

  // Turns loose user input ("1cor", "1 cor.", "I Corinthians", "song of songs")
  // into one of the 66 canonical names above, or null if nothing matches.
  function normalizeBookInput(raw){
    let s = raw.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
    // "1st"/"2nd"/"3rd" and roman numerals -> plain leading digit, to match
    // both the book list's own names and the alias keys above.
    s = s.replace(/^(1st|i)\b/, '1').replace(/^(2nd|ii)\b/, '2').replace(/^(3rd|iii)\b/, '3');
    const byName = BOOK_ORDER.find(b => b.toLowerCase() === s);
    if (byName) return byName;
    if (BOOK_ALIASES[s]) return BOOK_ALIASES[s];
    const tight = s.replace(/\s+/g, '');
    if (BOOK_ALIASES[tight]) return BOOK_ALIASES[tight];
    // Last resort: unambiguous prefix match ("hab" already covered above,
    // this catches anything typed longer than its alias, e.g. "genes").
    const prefixMatches = BOOK_ORDER.filter(b => b.toLowerCase().startsWith(s));
    return prefixMatches.length === 1 ? prefixMatches[0] : null;
  }

  // "John 3:16", "1 Cor 13", "Song of Solomon 2:1-4" -> { book, chapter,
  // verse, verseEnd } (verse/verseEnd null when no verse was given). Only
  // a single chapter is supported — a range that crosses a chapter
  // boundary isn't something the passage API can serve in one request
  // anyway, and it's a rare way to search for "a verse".
  function parseVerseQuery(query){
    const m = query.trim().match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);
    if (!m) return { error: 'Include a chapter — try "John 3" or "John 3:16".' };
    const book = normalizeBookInput(m[1]);
    if (!book) return { error: 'Couldn\'t match "' + m[1].trim() + '" to a book.' };
    const chapter = Number(m[2]);
    const maxCh = BOOK_CHAPTERS[book];
    if (chapter < 1 || chapter > maxCh) return { error: book + ' only has ' + maxCh + ' chapters.' };
    return {
      book, chapter,
      verse: m[3] ? Number(m[3]) : null,
      verseEnd: m[4] ? Number(m[4]) : null
    };
  }

  // Whole-book entries carry no chapter range in the data (chapters is
  // null/falsy) — this fills in the real range (1-N, or just "1" for a
  // single-chapter book) so those days display exactly like every other
  // day instead of a placeholder dash. Combined-book entries (split on
  // "&"/",") resolve each book separately, in order.
  function resolveChapters(book, chapters){
    if (chapters) return chapters;
    return book.split(/,|&/).map(s => s.trim()).filter(Boolean).map(b => {
      const n = BOOK_CHAPTERS[b];
      return n === 1 ? '1' : ('1-' + (n || 1));
    }).join(', ');
  }

  // Full "Book chapters" display string. For a combined-book entry with no
  // explicit range (e.g. "Obadiah & Jonah"), pairs each book with its own
  // resolved range ("Obadiah 1, Jonah 1-4") rather than mashing the whole
  // group's ranges onto the end of the combined name.
  function formatReading(book, chapters){
    if (chapters) return book + ' ' + chapters;
    const books = book.split(/,|&/).map(s => s.trim()).filter(Boolean);
    if (books.length <= 1) return book + ' ' + resolveChapters(book, null);
    return books.map(b => b + ' ' + resolveChapters(b, null)).join(', ');
  }

  // Expands a plan entry into the [{book, chapter}, ...] list of single
  // chapters to fetch from the passage API (which only serves one whole
  // chapter per request).
  function chapterTargets(book, chapters){
    const books = book.split(/,|&/).map(s => s.trim()).filter(Boolean);
    const targets = [];
    books.forEach(b => {
      if (books.length > 1 || !chapters){
        const count = BOOK_CHAPTERS[b];
        for (let c = 1; c <= (count || 1); c++) targets.push({ book: b, chapter: c });
      } else if (/^\d+-\d+$/.test(chapters)){
        const [start, end] = chapters.split('-').map(Number);
        for (let c = start; c <= end; c++) targets.push({ book: b, chapter: c });
      } else {
        targets.push({ book: b, chapter: Number(chapters) });
      }
    });
    return targets;
  }

  // Reading-time estimate, from real per-chapter word counts (WORD_COUNTS,
  // generated once from the site's own passage source) at a 200 words/min
  // pace — the commonly cited average for adult silent reading. Falls back
  // gracefully to null if the word-count data file didn't load.
  const READING_WPM = 200;
  function estimateMinutes(book, chapters){
    if (typeof WORD_COUNTS === 'undefined') return null;
    const targets = chapterTargets(book, chapters);
    let words = 0;
    for (const t of targets){
      const arr = WORD_COUNTS[t.book];
      if (!arr || !arr[t.chapter - 1]) return null;
      words += arr[t.chapter - 1];
    }
    return Math.max(1, Math.round(words / READING_WPM));
  }

  const passageEmpty = document.getElementById('passage-empty');
  const passageLoading = document.getElementById('passage-loading');
  const passageContent = document.getElementById('passage-content');
  const passageTitle = document.getElementById('passage-title');
  const passageBody = document.getElementById('passage-body');
  const passageGatewayLink = document.getElementById('passage-gateway-link');
  const passageSource = document.getElementById('passage-source');
  const passagePanel = document.getElementById('passage-panel');
  const passageListenBtn = document.getElementById('passage-listen-btn');
  let activeLink = null;

  // Read-aloud — the browser's own built-in speech synthesis (Web Speech
  // API), supported natively in every modern browser with no extra
  // software or screen reader needed on the visitor's end. speechText is
  // rebuilt for whichever passage is currently loaded (verse text only,
  // no verse-number digits, so it reads naturally instead of "1 In the
  // beginning 2 the earth was...").
  const speechSupported = 'speechSynthesis' in window;
  let speechText = '';
  let speechState = 'idle'; // idle | playing | paused

  function updateListenBtn(){
    if (!speechSupported) return;
    passageListenBtn.classList.toggle('playing', speechState !== 'idle');
    passageListenBtn.innerHTML = speechState === 'idle' ? '&#128266; Listen'
      : speechState === 'playing' ? '&#10073;&#10073; Pause'
      : '&#9654; Resume';
  }
  function stopSpeech(){
    if (speechSupported) window.speechSynthesis.cancel();
    speechState = 'idle';
    updateListenBtn();
  }
  if (speechSupported){
    passageListenBtn.addEventListener('click', () => {
      if (speechState === 'idle'){
        if (!speechText) return;
        const utter = new SpeechSynthesisUtterance(speechText);
        utter.onend = () => { speechState = 'idle'; updateListenBtn(); };
        utter.onerror = () => { speechState = 'idle'; updateListenBtn(); };
        window.speechSynthesis.speak(utter);
        speechState = 'playing';
      } else if (speechState === 'playing'){
        window.speechSynthesis.pause();
        speechState = 'paused';
      } else {
        window.speechSynthesis.resume();
        speechState = 'playing';
      }
      updateListenBtn();
    });
  }

  // Locks the passage panel to the exact height of whichever day/week/month
  // table is currently visible, so the last row of that table always sits
  // at the same level as the bottom of the reading panel next to it —
  // a fixed height (not just a cap), so a short passage doesn't leave the
  // panel shorter than the table, and a long one scrolls inside it instead
  // of pushing it taller.
  function syncPassageHeight(){
    const ref = activePlan === '52week' ? weekCol
      : (activePlan in DAY_PLANS ? daysCol : dailyCol);
    if (!ref || ref.hidden){ passagePanel.style.height = ''; return; }
    const h = ref.getBoundingClientRect().height;
    passagePanel.style.height = h > 0 ? h + 'px' : '';
  }
  window.addEventListener('resize', () => syncPassageHeight());
  // Google Fonts load asynchronously — the table's row height (and so its
  // total height) can shift slightly once Playfair Display/Lora swap in
  // for the fallback font, so re-measure once that settles.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => syncPassageHeight());

  // On mobile the passage panel stacks below the table, off-screen — after
  // loading a passage there, scroll it into view so tapping a chapter link
  // actually shows the reading rather than silently updating something the
  // reader can't see. On desktop the panel's already visible, so this is a
  // no-op there.
  function scrollPassageIntoViewIfNeeded(){
    const rect = passagePanel.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const fullyVisible = rect.top >= 0 && rect.bottom <= vh;
    if (!fullyVisible) passagePanel.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function showPanelState(state){
    passageEmpty.hidden = state !== 'empty';
    passageLoading.hidden = state !== 'loading';
    passageContent.hidden = state !== 'content';
    if (state === 'content'){
      // restart the fade-in animation on every new passage
      passageContent.style.animation = 'none';
      void passageContent.offsetWidth;
      passageContent.style.animation = '';
    }
  }

  // Remembers whatever passage is currently shown (a plan day, a search
  // result, a browsed verse — not just "today") so switching translation
  // re-shows that same passage in the new translation instead of jumping
  // back to today's reading. ref is the passage's place in the active plan
  // ({ plan, index, seg } — see getUnits) when it was opened from a plan,
  // or null for a search/browse result, which has no "next day".
  let currentPassage = null;
  // Bumped on every load, so a slow fetch that finishes after a newer one
  // (e.g. tapping Next several times quickly) can't overwrite it.
  let loadSeq = 0;

  async function loadPassage(book, chapters, linkEl, highlight, ref){
    const seq = ++loadSeq;
    currentPassage = { book, chapters, linkEl, highlight, ref: ref || null };
    updatePlanBar();
    if (activeLink) activeLink.classList.remove('active');
    if (linkEl) linkEl.classList.add('active');
    activeLink = linkEl || null;

    stopSpeech();
    speechText = '';
    showPanelState('loading');
    const targets = chapterTargets(book, chapters);
    const title = formatReading(book, chapters);

    try {
      const chapterResults = await Promise.all(targets.map(t =>
        fetch('https://bible-api.com/' + encodeURIComponent(t.book + ' ' + t.chapter) + '?translation=' + currentTranslation.code)
          .then(r => r.json())
      ));
      if (seq !== loadSeq) return;

      passageBody.innerHTML = '';
      let liveWordCount = 0;
      const speechParts = [];
      chapterResults.forEach((data, i) => {
        if (!data || !data.verses){ return; }
        const head = document.createElement('div');
        head.className = 'chapter-head';
        head.textContent = targets[i].book + ' ' + targets[i].chapter;
        passageBody.appendChild(head);
        speechParts.push(targets[i].book + ' chapter ' + targets[i].chapter + '.');

        const p = document.createElement('p');
        data.verses.forEach(v => {
          liveWordCount += v.text.trim() ? v.text.trim().split(/\s+/).length : 0;
          if (v.text.trim()) speechParts.push(v.text.trim());
          const span = document.createElement('span');
          span.className = 'verse';
          if (highlight && targets[i].chapter === highlight.chapter &&
              v.verse >= highlight.verse && v.verse <= (highlight.verseEnd || highlight.verse)){
            span.classList.add('verse-highlight');
            span.id = 'search-hit';
          }
          const sup = document.createElement('sup');
          sup.textContent = v.verse;
          span.appendChild(sup);
          span.appendChild(document.createTextNode(v.text.trim() + ' '));
          p.appendChild(span);
        });
        passageBody.appendChild(p);
      });

      if (!passageBody.children.length){
        passageBody.innerHTML = '<div class="passage-error">Couldn\'t load this passage.</div>';
      }

      speechText = speechParts.join(' ');
      passageListenBtn.hidden = !speechSupported || !speechText;

      passageTitle.textContent = title;
      const liveMinutes = liveWordCount ? Math.max(1, Math.round(liveWordCount / READING_WPM)) : null;
      passageSource.textContent = currentTranslation.name + (liveMinutes ? ' · ~' + liveMinutes + ' min read' : '');
      const gwLink = bibleGatewayUrl(book, chapters);
      if (gwLink){
        passageGatewayLink.href = gwLink;
        passageGatewayLink.hidden = false;
      } else {
        passageGatewayLink.hidden = true;
      }
      passagePanel.scrollTop = 0;
      showPanelState('content');

      const hit = document.getElementById('search-hit');
      if (hit) hit.scrollIntoView({ block: 'center', behavior: 'smooth' });
      else scrollPassageIntoViewIfNeeded();
    } catch (e) {
      if (seq !== loadSeq) return;
      passageListenBtn.hidden = true;
      passageTitle.textContent = title;
      passageBody.innerHTML = '<div class="passage-error">Couldn\'t load this passage — try the BibleGateway link instead.</div>';
      const fallbackMinutes = estimateMinutes(book, chapters);
      passageSource.textContent = fallbackMinutes ? '~' + fallbackMinutes + ' min read' : '';
      const gwLink = bibleGatewayUrl(book, chapters);
      passageGatewayLink.href = gwLink || '#';
      passageGatewayLink.hidden = !gwLink;
      showPanelState('content');
      scrollPassageIntoViewIfNeeded();
    }
  }

  function renderMonth(month, scrollToToday = true){
    nav.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.month === month));
    caption.textContent = month;
    body.innerHTML = '';

    let currentBook = '';
    READING_PLAN[month].forEach(entry => {
      if (entry.b) currentBook = entry.b;
      const tr = document.createElement('tr');
      const isToday = month === todayMonth && entry.d === todayDate;
      if (isToday) tr.className = 'today';
      const key = 'daily:' + month + ':' + entry.d;
      markRow(tr, key);

      const dayTd = document.createElement('td');
      dayTd.className = 'day';
      dayTd.textContent = entry.d;

      const bookTd = document.createElement('td');
      bookTd.className = 'book';
      bookTd.textContent = currentBook;

      const chaptersTd = document.createElement('td');
      chaptersTd.className = 'reading';
      const link = bibleGatewayUrl(currentBook, entry.c) || '#';
      const bookForClick = currentBook, chaptersForClick = entry.c;
      const a = document.createElement('a');
      a.href = link;
      a.rel = 'noopener noreferrer';
      a.textContent = resolveChapters(currentBook, entry.c);
      a.onclick = function(e){
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return; // let modified/middle clicks open normally
        e.preventDefault();
        loadPassage(bookForClick, chaptersForClick, a, null, refFor('daily', key, 0));
      };
      chaptersTd.appendChild(a);
      const note = FLAG_NOTES[entry.d + '|' + month];
      if (note){
        const flag = document.createElement('span');
        flag.className = 'flag';
        flag.title = note;
        flag.textContent = '†';
        chaptersTd.appendChild(flag);
      }

      tr.appendChild(dayTd);
      tr.appendChild(bookTd);
      tr.appendChild(chaptersTd);
      tr.appendChild(makeCheckCell(key));
      body.appendChild(tr);
    });

    if (scrollToToday && isTodayVisibleMonth(month)){
      const todayRow = body.querySelector('tr.today');
      if (todayRow) todayRow.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    syncPassageHeight();
  }
  function isTodayVisibleMonth(month){ return month === todayMonth; }

  MONTHS.forEach(month => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = month.slice(0,3);
    btn.dataset.month = month;
    btn.onclick = () => renderMonth(month);
    nav.appendChild(btn);
  });

  // ---------------- 52-Week Plan ----------------
  const weekBody = document.getElementById('week-body');
  const weekCaption = document.getElementById('week-caption');
  const weekLabel = document.getElementById('week-label');

  function renderWeek(weekNum){
    selectedWeek = Math.max(1, Math.min(52, weekNum));
    weekLabel.textContent = 'Week ' + selectedWeek;
    weekCaption.textContent = 'Week ' + selectedWeek;
    weekBody.innerHTML = '';

    const w = PLAN_52WEEK[selectedWeek - 1];
    PLAN_52WEEK_CATEGORIES.forEach(cat => {
      const e = w[cat];
      const isToday = selectedWeek === currentWeekNum && cat === currentCategory;
      const tr = document.createElement('tr');
      if (isToday) tr.className = 'today';
      const key = '52week:' + selectedWeek + ':' + cat;
      markRow(tr, key);

      const catTd = document.createElement('td');
      catTd.className = 'day';
      catTd.textContent = cat;

      const bookTd = document.createElement('td');
      bookTd.className = 'book';
      bookTd.textContent = e.b;

      const chaptersTd = document.createElement('td');
      chaptersTd.className = 'reading';
      const link = bibleGatewayUrl(e.b, e.c) || '#';
      const a = document.createElement('a');
      a.href = link;
      a.rel = 'noopener noreferrer';
      a.textContent = resolveChapters(e.b, e.c);
      a.onclick = function(ev){
        if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button !== 0) return;
        ev.preventDefault();
        loadPassage(e.b, e.c || null, a, null, refFor('52week', key, 0));
      };
      chaptersTd.appendChild(a);

      tr.appendChild(catTd);
      tr.appendChild(bookTd);
      tr.appendChild(chaptersTd);
      tr.appendChild(makeCheckCell(key));
      weekBody.appendChild(tr);
    });
    syncPassageHeight();
  }

  document.getElementById('week-prev').onclick = () => renderWeek(selectedWeek - 1);
  document.getElementById('week-next').onclick = () => renderWeek(selectedWeek + 1);
  document.getElementById('week-today').onclick = () => renderWeek(currentWeekNum);

  // ---------------- Day-sequence plans (no calendar anchor) ----------------
  // NT-90, OT-60, and Bible-90 are all "Day N: reading" plans with no fixed
  // start date, so browsing is just prev/next/jump-to-1 rather than tied to
  // today. A day can have more than one segment (e.g. a day that finishes
  // one book and starts the next) — each segment gets its own clickable
  // chip rather than trying to merge them into a single reference.
  const DAY_PLANS = {
    nt90: { data: PLAN_NT90, total: 90 },
    ot60: { data: PLAN_OT60, total: 60 },
    bible90: { data: PLAN_BIBLE90, total: 90 }
  };
  let selectedDay = 1;
  let activeDayPlanKey = null;
  const daysCol = document.getElementById('days-col');
  const daysBody = document.getElementById('days-body');
  const daysCaption = document.getElementById('days-caption');
  const dayNavEl = document.getElementById('day-nav');
  const dayLabel = document.getElementById('day-label');

  function renderDayPlan(planKey, dayNum){
    const plan = DAY_PLANS[planKey];
    selectedDay = Math.max(1, Math.min(plan.total, dayNum));
    dayLabel.textContent = 'Day ' + selectedDay;
    daysCaption.textContent = 'Day ' + selectedDay;
    daysBody.innerHTML = '';

    const entry = plan.data.find(d => d.d === selectedDay);
    const tr = document.createElement('tr');
    const key = planKey + ':' + selectedDay;
    const hasReading = entry && entry.s.length;
    if (hasReading) markRow(tr, key);

    const dayTd = document.createElement('td');
    dayTd.className = 'day';
    dayTd.textContent = selectedDay;

    const readingTd = document.createElement('td');
    readingTd.className = 'reading';
    if (!entry || !entry.s.length){
      readingTd.textContent = 'Grace day — no reading assigned.';
    } else {
      entry.s.forEach((seg, i) => {
        if (i > 0) readingTd.appendChild(document.createTextNode(', '));
        const a = document.createElement('a');
        a.href = bibleGatewayUrl(seg.b, seg.c) || '#';
        a.rel = 'noopener noreferrer';
        a.textContent = formatReading(seg.b, seg.c);
        a.onclick = function(ev){
          if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button !== 0) return;
          ev.preventDefault();
          loadPassage(seg.b, seg.c || null, a, null, refFor(planKey, key, i));
        };
        readingTd.appendChild(a);
      });
    }

    tr.appendChild(dayTd);
    tr.appendChild(readingTd);
    if (hasReading) tr.appendChild(makeCheckCell(key));
    else tr.appendChild(Object.assign(document.createElement('td'), { className: 'check' }));
    daysBody.appendChild(tr);
    syncPassageHeight();
  }

  document.getElementById('day-prev').onclick = () => renderDayPlan(activeDayPlanKey, selectedDay - 1);
  document.getElementById('day-next').onclick = () => renderDayPlan(activeDayPlanKey, selectedDay + 1);
  document.getElementById('day-start').onclick = () => renderDayPlan(activeDayPlanKey, 1);

  // ---------------- Plan switcher ----------------
  const dailyCol = document.getElementById('daily-col');
  const weekCol = document.getElementById('week-col');
  const weekNavEl = document.getElementById('week-nav');
  let activePlan = 'daily';

  const PLAN_NAMES = {
    daily: 'Daily Plan', '52week': '52-Week Plan', nt90: 'NT in 90 Days',
    ot60: 'OT in 60 Days', bible90: 'Bible in 90 Days'
  };

  function switchPlan(plan){
    activePlan = plan;
    document.querySelectorAll('.plan-switch-btn').forEach(b => b.classList.toggle('active', b.dataset.plan === plan));
    document.getElementById('download-plan-name').textContent = PLAN_NAMES[plan];

    const isWeek = plan === '52week';
    const isDayPlan = plan in DAY_PLANS;

    nav.hidden = isWeek || isDayPlan;
    dailyCol.hidden = isWeek || isDayPlan;
    weekNavEl.hidden = !isWeek;
    weekCol.hidden = !isWeek;
    dayNavEl.hidden = !isDayPlan;
    daysCol.hidden = !isDayPlan;

    if (isDayPlan) activeDayPlanKey = plan;

    // Open whatever the home card points at (today, or the first unread
    // day), so the card and the reading view always agree. The card is
    // only empty if today has no entry in the plan (e.g. Feb 29, which the
    // daily plan skips) — then show the plan's first reading instead.
    updateTodayCard();
    const start = cardRef || { plan, index: 0, seg: 0 };
    openUnit(start.plan, start.index, start.seg);
    updateProgressSummary();
  }

  // ---------------- Progress tracking ----------------
  // Every plan flattens into an ordered list of "units" — the things a
  // reader ticks off: a calendar day (Daily), one category of one week
  // (52-Week), or a numbered day (NT-90/OT-60/Bible-90; grace days with no
  // reading are skipped). Each unit has a stable key, so ticks survive the
  // tables being re-rendered. Progress lives in this browser's localStorage
  // only — it doesn't sync between devices.
  const unitCache = {};
  function getUnits(plan){
    if (unitCache[plan]) return unitCache[plan];
    const units = [];
    if (plan === 'daily'){
      let currentBook = '';
      MONTHS.forEach(month => {
        READING_PLAN[month].forEach(entry => {
          if (entry.b) currentBook = entry.b;
          units.push({ key: 'daily:' + month + ':' + entry.d, label: month + ' ' + entry.d,
            segs: [{ b: currentBook, c: entry.c || null }], month });
        });
      });
    } else if (plan === '52week'){
      PLAN_52WEEK.forEach(w => {
        PLAN_52WEEK_CATEGORIES.forEach(cat => {
          const e = w[cat];
          units.push({ key: '52week:' + w.w + ':' + cat, label: 'Week ' + w.w + ' · ' + cat,
            segs: [{ b: e.b, c: e.c || null }], week: w.w });
        });
      });
    } else {
      DAY_PLANS[plan].data.forEach(d => {
        if (!d.s.length) return;
        units.push({ key: plan + ':' + d.d, label: 'Day ' + d.d,
          segs: d.s.map(seg => ({ b: seg.b, c: seg.c || null })), day: d.d });
      });
    }
    units.byKey = {};
    units.forEach((u, i) => { units.byKey[u.key] = i; });
    return unitCache[plan] = units;
  }

  function refFor(plan, key, seg){
    const index = getUnits(plan).byKey[key];
    return index === undefined ? null : { plan, index, seg };
  }

  function todayKey(plan){
    return plan === '52week'
      ? '52week:' + currentWeekNum + ':' + currentCategory
      : 'daily:' + todayMonth + ':' + todayDate;
  }

  const PROGRESS_STORAGE_KEY = 'brp-progress-v1';
  let progress = {};
  try { progress = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY)) || {}; } catch (e) {}

  function isDone(key){ return !!progress[key]; }

  function saveProgress(){
    try { localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress)); } catch (e) {}
    refreshProgressUI();
  }

  function setDone(key, done){
    if (done) progress[key] = 1;
    else delete progress[key];
    saveProgress();
  }

  function isPlanComplete(plan){
    return doneCount(plan) === getUnits(plan).length;
  }

  function doneCount(plan){
    return getUnits(plan).filter(u => isDone(u.key)).length;
  }

  // Where a day-sequence plan picks up: the first day not yet ticked off
  // (or the last day, once the whole plan is finished).
  function firstUnreadIndex(plan){
    const units = getUnits(plan);
    const i = units.findIndex(u => !isDone(u.key));
    return i === -1 ? units.length - 1 : i;
  }

  function markRow(tr, key){
    tr.dataset.key = key;
    tr.classList.toggle('done', isDone(key));
  }

  function makeCheckCell(key){
    const td = document.createElement('td');
    td.className = 'check';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = isDone(key);
    box.setAttribute('aria-label', 'Mark as read');
    box.onchange = () => setDone(key, box.checked);
    td.appendChild(box);
    return td;
  }

  // Shows a unit in the reading view: brings its month/week/day into the
  // table, then loads the requested segment (a day-sequence day can span
  // several books, each its own segment) into the passage panel.
  function openUnit(plan, index, seg){
    const unit = getUnits(plan)[index];
    if (!unit) return;
    let tbody;
    if (plan === 'daily'){ renderMonth(unit.month, false); tbody = body; }
    else if (plan === '52week'){ renderWeek(unit.week); tbody = weekBody; }
    else { renderDayPlan(plan, unit.day); tbody = daysBody; }
    const row = tbody.querySelector('tr[data-key="' + unit.key + '"]');
    const link = row ? row.querySelectorAll('td.reading a')[seg] : null;
    loadPassage(unit.segs[seg].b, unit.segs[seg].c, link || null, null, { plan, index, seg });
  }

  // Prev/Next walk segment by segment through a multi-book day before
  // moving on to the neighbouring unit.
  function stepUnit(dir){
    const ref = currentPassage && currentPassage.ref;
    if (!ref) return;
    const units = getUnits(ref.plan);
    let { index, seg } = ref;
    if (dir > 0){
      if (seg < units[index].segs.length - 1) seg++;
      else if (index < units.length - 1){ index++; seg = 0; }
      else return;
    } else {
      if (seg > 0) seg--;
      else if (index > 0){ index--; seg = 0; }
      else return;
    }
    openUnit(ref.plan, index, seg);
  }

  const planBar = document.getElementById('plan-bar');
  const planBarLabel = document.getElementById('plan-bar-label');
  const planBarPrev = document.getElementById('plan-bar-prev');
  const planBarDone = document.getElementById('plan-bar-done');
  const planBarNext = document.getElementById('plan-bar-next');

  function updatePlanBar(){
    const ref = currentPassage && currentPassage.ref;
    planBar.hidden = !ref;
    if (!ref) return;
    const units = getUnits(ref.plan);
    const unit = units[ref.index];
    const done = isDone(unit.key);
    planBarLabel.textContent = unit.label +
      (unit.segs.length > 1 ? ' · part ' + (ref.seg + 1) + ' of ' + unit.segs.length : '');
    planBarDone.textContent = done ? '\u2713 Read' : 'Mark as read';
    planBarDone.classList.toggle('done', done);
    planBarPrev.disabled = ref.index === 0 && ref.seg === 0;
    planBarNext.disabled = ref.index === units.length - 1 && ref.seg === unit.segs.length - 1;
    planBarNext.classList.toggle('primary', done);
  }

  planBarPrev.onclick = () => stepUnit(-1);
  planBarNext.onclick = () => stepUnit(1);
  planBarDone.onclick = () => {
    const ref = currentPassage && currentPassage.ref;
    if (!ref) return;
    const key = getUnits(ref.plan)[ref.index].key;
    setDone(key, !isDone(key));
  };

  function updateProgressSummary(){
    const total = getUnits(activePlan).length;
    const done = doneCount(activePlan);
    document.getElementById('plan-progress-text').textContent = done === total
      ? '\uD83C\uDF89 All ' + total + ' read'
      : done + ' of ' + total + ' read';
    document.getElementById('plan-progress-fill').style.width = (total ? done / total * 100 : 0) + '%';
  }

  function refreshProgressUI(){
    document.querySelectorAll('tr[data-key]').forEach(tr => {
      const done = isDone(tr.dataset.key);
      tr.classList.toggle('done', done);
      const box = tr.querySelector('td.check input');
      if (box) box.checked = done;
    });
    updatePlanBar();
    updateProgressSummary();
    updateTodayCard();
  }

  document.querySelectorAll('.plan-switch-btn').forEach(btn => {
    btn.onclick = () => switchPlan(btn.dataset.plan);
  });

  // ---------------- Downloads ----------------
  // Exports whichever plan is currently active, in full — not just the
  // visible week/day/month — as a flat list of {label, reading} rows.
  function getExportRows(plan){
    const rows = [];
    if (plan === 'daily'){
      let currentBook = '';
      MONTHS.forEach(month => {
        READING_PLAN[month].forEach(entry => {
          if (entry.b) currentBook = entry.b;
          rows.push({ label: month + ' ' + entry.d, reading: formatReading(currentBook, entry.c) });
        });
      });
    } else if (plan === '52week'){
      PLAN_52WEEK.forEach(w => {
        PLAN_52WEEK_CATEGORIES.forEach(cat => {
          const e = w[cat];
          rows.push({ label: 'Week ' + w.w + ' — ' + cat, reading: formatReading(e.b, e.c) });
        });
      });
    } else if (plan in DAY_PLANS){
      DAY_PLANS[plan].data.forEach(d => {
        const reading = d.s.length
          ? d.s.map(seg => formatReading(seg.b, seg.c)).join(', ')
          : 'Grace day — no reading assigned.';
        rows.push({ label: 'Day ' + d.d, reading });
      });
    }
    return rows;
  }

  function triggerDownload(filename, content, mime){
    const blob = new Blob([content], { type: mime + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function csvEscape(s){
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function planFilename(ext){
    return PLAN_NAMES[activePlan].replace(/\s+/g, '-').toLowerCase() + '.' + ext;
  }

  document.getElementById('download-txt').onclick = () => {
    const rows = getExportRows(activePlan);
    const title = PLAN_NAMES[activePlan];
    const labelWidth = Math.max(...rows.map(r => r.label.length));
    const lines = [title, '='.repeat(title.length), ''];
    rows.forEach(r => lines.push(r.label.padEnd(labelWidth + 3) + r.reading));
    triggerDownload(planFilename('txt'), lines.join('\n'), 'text/plain');
  };

  document.getElementById('download-csv').onclick = () => {
    const rows = getExportRows(activePlan);
    const lines = ['Day,Reading'];
    rows.forEach(r => lines.push(csvEscape(r.label) + ',' + csvEscape(r.reading)));
    triggerDownload(planFilename('csv'), lines.join('\n'), 'text/csv');
  };

  document.getElementById('download-pdf').onclick = () => {
    const rows = getExportRows(activePlan);
    const title = PLAN_NAMES[activePlan];
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 48, marginTop = 56, marginBottom = 48, lineHeight = 16;
    const labelColWidth = 150;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title, marginLeft, marginTop);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    let y = marginTop + 26;
    const readingColWidth = doc.internal.pageSize.getWidth() - marginLeft - labelColWidth - 48;

    rows.forEach(r => {
      const readingLines = doc.splitTextToSize(r.reading, readingColWidth);
      const rowHeight = Math.max(1, readingLines.length) * lineHeight;
      if (y + rowHeight > pageHeight - marginBottom){
        doc.addPage();
        y = marginTop;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(r.label, marginLeft, y);
      doc.setFont('helvetica', 'normal');
      doc.text(readingLines, marginLeft + labelColWidth, y);
      y += rowHeight;
    });

    doc.save(planFilename('pdf'));
  };

  // Translation switcher — re-shows whatever passage is currently open
  // (a plan day, a search result, a browsed verse) in the new translation,
  // falling back to today's reading only if nothing has been loaded yet.
  const versionList = document.getElementById('version-list');
  TRANSLATIONS.forEach(t => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'version-btn';
    if (t.code === currentTranslation.code) btn.classList.add('active');
    btn.dataset.code = t.code;
    btn.innerHTML = t.label + '<span class="full-name">' + t.name + '</span>';
    btn.onclick = () => {
      currentTranslation = t;
      versionList.querySelectorAll('.version-btn').forEach(b => b.classList.toggle('active', b.dataset.code === t.code));
      if (currentPassage){
        loadPassage(currentPassage.book, currentPassage.chapters, currentPassage.linkEl, currentPassage.highlight, currentPassage.ref);
      } else if (cardRef){
        openUnit(cardRef.plan, cardRef.index, cardRef.seg);
      }
    };
    versionList.appendChild(btn);
  });

  // Today card — reflects whichever plan is currently active, and is the
  // way into the reading view. cardRef is the unit it shows, so tapping
  // the card opens exactly that reading.
  let cardRef = null;
  function updateTodayCard(){
    const card = document.getElementById('today-card');
    const dateEl = document.getElementById('today-date');
    const units = getUnits(activePlan);
    const isDayPlan = activePlan in DAY_PLANS;
    // Day-sequence plans (NT-90/OT-60/Bible-90) have no calendar anchor, so
    // "today" isn't meaningful for them — the card shows the first day not
    // yet read instead.
    const index = isDayPlan ? firstUnreadIndex(activePlan) : units.byKey[todayKey(activePlan)];
    const unit = units[index];
    if (!unit){ card.hidden = true; cardRef = null; return; }
    cardRef = { plan: activePlan, index, seg: 0 };
    card.hidden = false;
    card.dataset.badge = isDayPlan ? 'Up next' : 'Today';
    dateEl.textContent = isDayPlan
      ? unit.label + ' of ' + PLAN_NAMES[activePlan]
      : now.toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' });
    document.getElementById('today-reading').textContent = unit.segs.map(seg => formatReading(seg.b, seg.c)).join(', ');

    let minutes = 0;
    for (const seg of unit.segs){
      const m = estimateMinutes(seg.b, seg.c);
      if (!m){ minutes = null; break; }
      minutes += m;
    }
    const details = [];
    if (minutes) details.push('~' + minutes + ' min read');
    if (isDone(unit.key)) details.push('\u2713 Read');
    const minutesEl = document.getElementById('today-minutes');
    minutesEl.textContent = details.join(' · ');
    minutesEl.hidden = !details.length;
    document.getElementById('today-progress').textContent = doneCount(activePlan) + ' of ' + units.length + ' read';

    // Every reading ticked off: the card celebrates instead of showing a
    // reading (it still opens the reading view when tapped).
    const complete = isPlanComplete(activePlan);
    card.classList.toggle('complete', complete);
    if (complete){
      card.dataset.badge = 'Complete';
      dateEl.textContent = 'You finished ' + PLAN_NAMES[activePlan] + '!';
      document.getElementById('today-reading').textContent = '\uD83C\uDF89 Well done';
      minutesEl.hidden = true;
    }
    const resetBtnEl = document.getElementById('progress-reset');
    if (!resetBtnEl.classList.contains('confirm')) resetBtnEl.textContent = 'Reset ' + PLAN_NAMES[activePlan];
  }

  // ---------------- Progress export / import / reset ----------------
  // Export/import is how progress moves between devices (it's otherwise
  // stored per browser). Import merges into what's already here and only
  // keeps keys that match a real reading in one of the plans.
  const progressStatus = document.getElementById('progress-status');
  let progressStatusTimer = null;
  function showProgressStatus(text){
    progressStatus.textContent = text;
    progressStatus.hidden = false;
    clearTimeout(progressStatusTimer);
    progressStatusTimer = setTimeout(() => { progressStatus.hidden = true; }, 6000);
  }

  const ALL_PLANS = Object.keys(PLAN_NAMES);

  document.getElementById('progress-export').onclick = () => {
    const data = { app: 'bible-reading-plan', version: 1, exported: new Date().toISOString(), progress };
    const stamp = new Date().toISOString().slice(0, 10);
    triggerDownload('bible-reading-progress-' + stamp + '.json', JSON.stringify(data, null, 2), 'application/json');
    showProgressStatus('Exported ' + Object.keys(progress).length + ' ticked readings.');
  };

  const importFileInput = document.getElementById('progress-import-file');
  document.getElementById('progress-import').onclick = () => importFileInput.click();
  importFileInput.onchange = async () => {
    const file = importFileInput.files[0];
    importFileInput.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const incoming = (data && typeof data.progress === 'object') ? data.progress : data;
      const valid = Object.keys(incoming || {}).filter(key =>
        incoming[key] && ALL_PLANS.some(plan => getUnits(plan).byKey[key] !== undefined));
      if (!valid.length){ showProgressStatus('No readings found in that file.'); return; }
      const added = valid.filter(key => !isDone(key)).length;
      valid.forEach(key => { progress[key] = 1; });
      saveProgress();
      showProgressStatus('Imported ' + valid.length + ' ticked readings (' + added + ' new).');
    } catch (e){
      showProgressStatus('That file isn\'t a progress export.');
    }
  };

  // Two taps to reset, so one stray tap can't wipe a plan's progress.
  const resetBtn = document.getElementById('progress-reset');
  let resetArmedTimer = null;
  resetBtn.onclick = () => {
    if (!resetBtn.classList.contains('confirm')){
      resetBtn.classList.add('confirm');
      resetBtn.textContent = 'Tap again to reset';
      resetArmedTimer = setTimeout(() => { resetBtn.classList.remove('confirm'); updateTodayCard(); }, 4000);
      return;
    }
    clearTimeout(resetArmedTimer);
    resetBtn.classList.remove('confirm');
    const cleared = getUnits(activePlan).filter(u => isDone(u.key));
    cleared.forEach(u => { delete progress[u.key]; });
    saveProgress();
    showProgressStatus('Cleared ' + cleared.length + ' ticked readings from ' + PLAN_NAMES[activePlan] + '.');
  };

  // ---------------- Keyboard shortcuts ----------------
  // Reading view only: \u2190/\u2192 step through the plan, M marks the
  // current reading, Esc goes back home. Ignored while typing in a field
  // or when a modifier key is held (so browser shortcuts still work).
  document.addEventListener('keydown', e => {
    if (readingView.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    const ref = currentPassage && currentPassage.ref;
    if (e.key === 'ArrowLeft' && ref) stepUnit(-1);
    else if (e.key === 'ArrowRight' && ref) stepUnit(1);
    else if ((e.key === 'm' || e.key === 'M') && ref) planBarDone.click();
    else if (e.key === 'Escape') history.back();
    else return;
    e.preventDefault();
  });

  // ---------------- Theme ----------------
  // Auto follows the device's light/dark setting; Light and Dark override
  // it. The choice is a per-browser convenience in localStorage (the
  // inline script in index.html applies it before first paint).
  const THEME_STORAGE_KEY = 'brp-theme';
  const THEME_ORDER = ['auto', 'light', 'dark'];
  const THEME_LABELS = { auto: 'Auto', light: '\u2600 Light', dark: '\u263E Dark' };
  let theme = document.documentElement.dataset.theme || 'auto';

  function applyTheme(){
    if (theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.textContent = THEME_LABELS[theme];
      btn.title = 'Theme: ' + theme + (theme === 'auto' ? ' (follows your device)' : '') + ' — click to change';
    });
  }

  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.onclick = () => {
      theme = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];
      try {
        if (theme === 'auto') localStorage.removeItem(THEME_STORAGE_KEY);
        else localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch (e) {}
      applyTheme();
    };
  });
  applyTheme();

  // ---------------- Home / reading view ----------------
  // The home screen ends at the download row; everything below it (tables,
  // passage, translations, credit) lives in a separate reading view that
  // replaces the home screen. Opening it pushes a history entry so the
  // phone/browser back button returns home too.
  const homeView = document.getElementById('home-view');
  const readingView = document.getElementById('reading-view');

  function showReadingView(){
    if (!readingView.hidden) return;
    homeView.hidden = true;
    readingView.hidden = false;
    history.pushState({ view: 'reading' }, '');
    window.scrollTo(0, 0);
  }

  function showHomeView(){
    stopSpeech();
    readingView.hidden = true;
    homeView.hidden = false;
    window.scrollTo(0, 0);
  }

  document.getElementById('today-card').onclick = () => {
    showReadingView();
    const ref = currentPassage && currentPassage.ref;
    const alreadyOpen = ref && cardRef && ref.plan === cardRef.plan && ref.index === cardRef.index && ref.seg === cardRef.seg;
    if (cardRef && !alreadyOpen) openUnit(cardRef.plan, cardRef.index, cardRef.seg);
  };
  document.getElementById('back-home-btn').onclick = () => history.back();
  window.addEventListener('popstate', () => { if (!readingView.hidden) showHomeView(); });

  // ---------------- Verse search ----------------
  const verseSearchForm = document.getElementById('verse-search');
  const verseSearchInput = document.getElementById('verse-search-input');
  const verseSearchError = document.getElementById('verse-search-error');

  verseSearchForm.addEventListener('submit', function(e){
    e.preventDefault();
    const query = verseSearchInput.value;
    if (!query.trim()) return;
    const result = parseVerseQuery(query);
    if (result.error){
      verseSearchError.textContent = result.error;
      verseSearchError.hidden = false;
      return;
    }
    verseSearchError.hidden = true;
    showReadingView();
    loadPassage(result.book, String(result.chapter), null, result.verse ? result : null);
  });

  // ---------------- Browse by book / chapter / verse ----------------
  const browseToggleBtn = document.getElementById('browse-toggle-btn');
  const browsePanel = document.getElementById('browse-panel');
  const browseBreadcrumb = document.getElementById('browse-breadcrumb');
  const browseGrid = document.getElementById('browse-grid');

  browseToggleBtn.onclick = function(){
    const opening = browsePanel.hidden;
    browsePanel.hidden = !opening;
    browseToggleBtn.classList.toggle('open', opening);
    browseToggleBtn.innerHTML = opening
      ? 'Hide book browser <span class="arrow">&#9662;</span>'
      : 'Or browse by book <span class="arrow">&#9662;</span>';
    if (opening) renderBrowseBooks();
  };

  function renderBrowseBooks(){
    browseBreadcrumb.textContent = 'Choose a book';
    browseGrid.className = 'browse-grid books';
    browseGrid.innerHTML = '';
    const otLabel = document.createElement('div');
    otLabel.className = 'browse-section-label';
    otLabel.textContent = 'Old Testament';
    browseGrid.appendChild(otLabel);
    BOOK_ORDER.forEach((book, i) => {
      if (i === 39){
        const ntLabel = document.createElement('div');
        ntLabel.className = 'browse-section-label';
        ntLabel.textContent = 'New Testament';
        browseGrid.appendChild(ntLabel);
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'browse-item';
      btn.textContent = book;
      btn.onclick = () => renderBrowseChapters(book);
      browseGrid.appendChild(btn);
    });
  }

  function renderBrowseChapters(book){
    browseBreadcrumb.innerHTML = '';
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.textContent = '← Books';
    backBtn.onclick = renderBrowseBooks;
    browseBreadcrumb.appendChild(backBtn);
    browseBreadcrumb.appendChild(document.createTextNode(' / ' + book + ' — choose a chapter'));

    browseGrid.className = 'browse-grid chapters';
    browseGrid.innerHTML = '';
    const total = BOOK_CHAPTERS[book];
    for (let c = 1; c <= total; c++){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'browse-item';
      btn.textContent = c;
      btn.onclick = () => renderBrowseVerses(book, c);
      browseGrid.appendChild(btn);
    }
  }

  async function renderBrowseVerses(book, chapter){
    browseBreadcrumb.innerHTML = '';
    const booksBtn = document.createElement('button');
    booksBtn.type = 'button';
    booksBtn.textContent = '← Books';
    booksBtn.onclick = renderBrowseBooks;
    const chapterBtn = document.createElement('button');
    chapterBtn.type = 'button';
    chapterBtn.textContent = book;
    chapterBtn.onclick = () => renderBrowseChapters(book);
    browseBreadcrumb.appendChild(booksBtn);
    browseBreadcrumb.appendChild(document.createTextNode(' / '));
    browseBreadcrumb.appendChild(chapterBtn);
    browseBreadcrumb.appendChild(document.createTextNode(' / Chapter ' + chapter + ' — choose a starting verse'));

    browseGrid.className = 'browse-grid verses';
    browseGrid.innerHTML = '<div class="browse-loading">Loading verses…</div>';

    try {
      const data = await fetch('https://bible-api.com/' + encodeURIComponent(book + ' ' + chapter) + '?translation=' + currentTranslation.code)
        .then(r => r.json());
      browseGrid.innerHTML = '';
      if (!data || !data.verses || !data.verses.length){
        browseGrid.innerHTML = '<div class="browse-loading">Couldn\'t load that chapter.</div>';
        return;
      }
      data.verses.forEach(v => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'browse-item';
        btn.textContent = v.verse;
        btn.onclick = () => {
          showReadingView();
          loadPassage(book, String(chapter), null, { chapter, verse: v.verse, verseEnd: null });
        };
        browseGrid.appendChild(btn);
      });
    } catch (e){
      browseGrid.innerHTML = '<div class="browse-loading">Couldn\'t load that chapter.</div>';
    }
  }

  // Show today's reading by default, filling the passage panel before the
  // member has clicked anything.
  switchPlan('daily');

  // Auto-refresh at midnight and noon (not just every N hours from
  // whenever the tab happened to load) — a tab left open would otherwise
  // keep showing yesterday's "Today" entry until manually reloaded.
  (function scheduleNextRefresh(){
    const now = new Date();
    const next = new Date(now);
    next.setMinutes(0, 0, 0);
    next.setHours(now.getHours() < 12 ? 12 : 24); // 24 rolls over to next midnight
    setTimeout(() => location.reload(), next - now);
  })();
})();
