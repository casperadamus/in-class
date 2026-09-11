const TZ = 'America/New_York';
const DAY_ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LIST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIMELINE_START = 7 * 60 + 30; // 7:30
const TIMELINE_END = 18 * 60 + 30; // 18:30
const TIMELINE_RANGE = TIMELINE_END - TIMELINE_START;
const LOOKAHEAD_SEC = 3 * 3600; // ring "fills up" as a class gets within this many seconds

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function fmtClock12(mins) {
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  let h = h24 % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtCountdown(totalSeconds) {
  totalSeconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getNYNow() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(map.minute, 10);
  const second = parseInt(map.second, 10);
  return {
    weekday: map.weekday,
    minutes: hour * 60 + minute,
    seconds: hour * 3600 + minute * 60 + second,
  };
}

function getNYDateISO() {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(new Date());
}

function classesForDay(person, day) {
  return person.classes.filter((c) => c.day === day).sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

function getCurrentClass(person, weekday, minutes) {
  return classesForDay(person, weekday).find((c) => minutes >= toMinutes(c.start) && minutes < toMinutes(c.end)) || null;
}

function getNextClass(person, weekdayIdx, minutes) {
  for (let i = 0; i < 8; i++) {
    const idx = (weekdayIdx + i) % 7;
    const day = DAY_ORDER[idx];
    let list = classesForDay(person, day);
    if (i === 0) list = list.filter((c) => toMinutes(c.start) > minutes);
    if (list.length) return { ...list[0], daysAhead: i };
  }
  return null;
}

function ringSvg() {
  const r = 42;
  const c = 2 * Math.PI * r;
  return { r, c };
}
const RING = ringSvg();

function buildCard(person) {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.setProperty('--accent', person.accent);

  card.innerHTML = `
    <div class="card-head">
      <div class="avatar">${person.name[0]}</div>
      <div class="who">
        <h2>${person.name}</h2>
        <span class="pill"><span class="dot"></span><span class="pill-text"></span></span>
      </div>
    </div>
    <div class="body-row">
      <div class="ring-wrap">
        <svg viewBox="0 0 100 100">
          <circle class="ring-track" cx="50" cy="50" r="${RING.r}"></circle>
          <circle class="ring-progress" cx="50" cy="50" r="${RING.r}"
            stroke-dasharray="${RING.c}" stroke-dashoffset="${RING.c}"></circle>
        </svg>
        <div class="ring-center">
          <div class="ring-time">--</div>
          <div class="ring-label">--</div>
        </div>
      </div>
      <div class="meta">
        <div class="meta-course"></div>
        <div class="meta-line meta-loc"></div>
        <div class="meta-line meta-extra"></div>
      </div>
    </div>
    <button class="expand-toggle" type="button">
      Full week
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
    </button>
    <div class="details"><div class="details-inner"></div></div>
  `;

  const detailsInner = card.querySelector('.details-inner');
  const dayRefs = {};
  for (const day of DAY_LIST) {
    const list = classesForDay(person, day);
    if (!list.length) continue;
    const block = document.createElement('div');
    block.className = 'day-block';
    block.innerHTML = `
      <div class="day-title"><span class="day-name">${day}</span><span class="today-flag"></span></div>
      <div class="timeline"></div>
      <div class="class-rows"></div>
    `;
    const timeline = block.querySelector('.timeline');
    const rowsWrap = block.querySelector('.class-rows');
    const blockRefs = [];
    for (const c of list) {
      const startPct = ((toMinutes(c.start) - TIMELINE_START) / TIMELINE_RANGE) * 100;
      const widthPct = ((toMinutes(c.end) - toMinutes(c.start)) / TIMELINE_RANGE) * 100;
      const seg = document.createElement('div');
      seg.className = 'block';
      seg.style.left = `${Math.max(0, startPct)}%`;
      seg.style.width = `${Math.max(0.5, widthPct)}%`;
      seg.title = `${c.course} ${c.start}-${c.end}`;
      timeline.appendChild(seg);

      const row = document.createElement('div');
      row.className = 'class-row';
      row.innerHTML = `
        <div class="cr-top"><span class="cr-course">${c.course}</span><span class="time">${fmtClock12(toMinutes(c.start))}–${fmtClock12(toMinutes(c.end))}</span></div>
        <div class="cr-loc">${c.location}</div>
      `;
      rowsWrap.appendChild(row);

      blockRefs.push({ c, seg, row });
    }
    const nowLine = document.createElement('div');
    nowLine.className = 'now-line';
    nowLine.hidden = true;
    timeline.appendChild(nowLine);

    detailsInner.appendChild(block);
    dayRefs[day] = { block, nowLine, items: blockRefs, todayFlag: block.querySelector('.today-flag') };
  }

  const details = card.querySelector('.details');
  card.querySelector('.expand-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    const opening = !card.classList.contains('open');
    card.classList.toggle('open', opening);
    details.style.maxHeight = opening ? `${detailsInner.scrollHeight}px` : '0px';
  });
  window.addEventListener('resize', () => {
    if (card.classList.contains('open')) {
      details.style.maxHeight = `${detailsInner.scrollHeight}px`;
    }
  });

  const refs = {
    card,
    pill: card.querySelector('.pill'),
    pillText: card.querySelector('.pill-text'),
    ring: card.querySelector('.ring-progress'),
    ringTime: card.querySelector('.ring-time'),
    ringLabel: card.querySelector('.ring-label'),
    metaCourse: card.querySelector('.meta-course'),
    metaLoc: card.querySelector('.meta-loc'),
    metaExtra: card.querySelector('.meta-extra'),
    dayRefs,
  };

  return { card, refs };
}

function setRing(refs, fraction, colorVar) {
  const offset = RING.c * (1 - Math.min(1, Math.max(0, fraction)));
  refs.ring.style.strokeDashoffset = String(offset);
  refs.ring.style.stroke = colorVar;
}

function updateCard(person, refs, weekday, weekdayIdx, minutes, seconds) {
  const current = getCurrentClass(person, weekday, minutes);
  const next = getNextClass(person, weekdayIdx, minutes);
  const betweenClasses = !current && next && next.daysAhead === 0;

  refs.pill.className = 'pill ' + (current ? 'busy' : betweenClasses ? 'soon' : 'free');
  refs.pillText.textContent = current ? 'In class' : betweenClasses ? 'Between classes' : 'Free';

  if (current) {
    const startSec = toMinutes(current.start) * 60;
    const endSec = toMinutes(current.end) * 60;
    const remaining = endSec - seconds;
    const fraction = (seconds - startSec) / (endSec - startSec);
    setRing(refs, fraction, 'var(--busy)');
    refs.ringTime.textContent = fmtCountdown(remaining);
    refs.ringLabel.textContent = 'left';
    refs.metaCourse.textContent = current.course;
    refs.metaLoc.textContent = `📍 ${current.location}`;
    refs.metaExtra.textContent = `${current.type} · until ${fmtClock12(toMinutes(current.end))}`;
  } else if (betweenClasses) {
    const startSec = toMinutes(next.start) * 60;
    const until = startSec - seconds;
    const fraction = 1 - Math.min(1, Math.max(0, until / LOOKAHEAD_SEC));
    setRing(refs, fraction, 'var(--soon)');
    refs.ringTime.textContent = fmtCountdown(until);
    refs.ringLabel.textContent = 'until next';
    refs.metaCourse.textContent = next.course;
    refs.metaLoc.textContent = `📍 ${next.location}`;
    refs.metaExtra.textContent = `${next.type} · starts ${fmtClock12(toMinutes(next.start))}`;
  } else if (next) {
    setRing(refs, 0, 'var(--free)');
    refs.ringTime.textContent = 'Free';
    refs.ringLabel.textContent = next.daysAhead === 1 ? 'until tomorrow' : `until ${next.day}`;
    refs.metaCourse.textContent = next.course;
    refs.metaLoc.textContent = `📍 ${next.location}`;
    const when = next.daysAhead === 1 ? 'Tomorrow' : next.day;
    refs.metaExtra.textContent = `${when} · ${fmtClock12(toMinutes(next.start))}`;
  } else {
    setRing(refs, 0, 'var(--free)');
    refs.ringTime.textContent = 'Free';
    refs.ringLabel.textContent = 'all week';
    refs.metaCourse.textContent = 'No more classes';
    refs.metaLoc.textContent = '';
    refs.metaExtra.textContent = '';
  }

  for (const day of Object.keys(refs.dayRefs)) {
    const dref = refs.dayRefs[day];
    const isToday = day === weekday;
    dref.todayFlag.textContent = isToday ? 'today' : '';
    dref.todayFlag.className = 'today-flag' + (isToday ? ' today-tag' : '');
    if (isToday) {
      const pct = Math.min(100, Math.max(0, ((minutes - TIMELINE_START) / TIMELINE_RANGE) * 100));
      dref.nowLine.hidden = false;
      dref.nowLine.style.left = `${pct}%`;
    } else {
      dref.nowLine.hidden = true;
    }
    for (const item of dref.items) {
      const isCurrent = isToday && minutes >= toMinutes(item.c.start) && minutes < toMinutes(item.c.end);
      item.seg.classList.toggle('current', isCurrent);
      item.row.classList.toggle('current', isCurrent);
    }
  }
}

const state = { cards: [] };

function init() {
  const grid = document.getElementById('grid');
  for (const person of PEOPLE) {
    const { card, refs } = buildCard(person);
    grid.appendChild(card);
    state.cards.push({ person, refs });
  }
}

function tick() {
  const { weekday, minutes, seconds } = getNYNow();
  const weekdayIdx = DAY_ORDER.indexOf(weekday);

  const dayName = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());
  document.getElementById('clock').textContent = `${dayName} · ${fmtClock12(minutes)} ET`;

  const todayISO = getNYDateISO();
  const banner = document.getElementById('banner');
  if (todayISO < SEMESTER.start || todayISO > SEMESTER.end) {
    banner.hidden = false;
    banner.textContent = `Outside the tracked semester (${SEMESTER.start} to ${SEMESTER.end}) — schedule may not be in effect.`;
  } else {
    banner.hidden = true;
  }

  let busyCount = 0;
  let soonCount = 0;
  for (const { person, refs } of state.cards) {
    updateCard(person, refs, weekday, weekdayIdx, minutes, seconds);
    const current = getCurrentClass(person, weekday, minutes);
    if (current) {
      busyCount++;
    } else {
      const next = getNextClass(person, weekdayIdx, minutes);
      if (next && next.daysAhead === 0) soonCount++;
    }
  }
  const freeCount = PEOPLE.length - busyCount - soonCount;

  const summary = document.getElementById('summary');
  summary.innerHTML = `
    <span class="chip busy"><span class="dot"></span>${busyCount} in class</span>
    ${soonCount ? `<span class="chip soon"><span class="dot"></span>${soonCount} between classes</span>` : ''}
    <span class="chip free"><span class="dot"></span>${freeCount} free</span>
  `;
}

init();
tick();
setInterval(tick, 1000);
