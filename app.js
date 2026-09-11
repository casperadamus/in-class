const TZ = 'America/New_York';
const DAY_ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function fmtMinutes(mins) {
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  let h = h24 % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getNYNow() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(map.minute, 10);
  return {
    weekday: map.weekday,
    minutes: hour * 60 + minute,
  };
}

function getNYDateISO() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(now); // en-CA gives YYYY-MM-DD
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

function statusFor(person, weekday, minutes) {
  const weekdayIdx = DAY_ORDER.indexOf(weekday);
  const current = getCurrentClass(person, weekday, minutes);
  const next = getNextClass(person, weekdayIdx, minutes);
  return { current, next };
}

function render() {
  const { weekday, minutes } = getNYNow();
  const clockEl = document.getElementById('clock');
  const dayName = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());
  clockEl.textContent = `${dayName} · ${fmtMinutes(minutes)} ET`;

  const todayISO = getNYDateISO();
  const banner = document.getElementById('banner');
  if (todayISO < SEMESTER.start || todayISO > SEMESTER.end) {
    banner.hidden = false;
    banner.className = 'banner out-of-session';
    banner.textContent = `Outside the tracked semester (${SEMESTER.start} to ${SEMESTER.end}) — schedule may not be in effect.`;
  } else {
    banner.hidden = true;
  }

  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  for (const person of PEOPLE) {
    const { current, next } = statusFor(person, weekday, minutes);
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.personId = person.id;

    const top = document.createElement('div');
    top.className = 'card-top';
    top.innerHTML = `<h2>${person.name}</h2>`;

    const pill = document.createElement('span');
    pill.className = `pill ${current ? 'busy' : 'free'}`;
    pill.textContent = current ? 'In Class' : 'Free';
    top.appendChild(pill);

    card.appendChild(top);

    const statusLine = document.createElement('div');
    statusLine.className = 'status-line';
    const subLine = document.createElement('div');
    subLine.className = 'sub-line';

    if (current) {
      statusLine.innerHTML = `<strong>${current.course}</strong> (${current.type}) — ${current.location}`;
      subLine.textContent = `Until ${fmtMinutes(toMinutes(current.end))}`;
    } else if (next) {
      const when = next.daysAhead === 0 ? 'today' : next.daysAhead === 1 ? 'tomorrow' : `on ${next.day}`;
      statusLine.textContent = `Free now`;
      subLine.innerHTML = `Next: <strong>${next.course}</strong> ${when} at ${fmtMinutes(toMinutes(next.start))} — ${next.location}`;
    } else {
      statusLine.textContent = 'Free';
      subLine.textContent = 'No upcoming classes found';
    }

    card.appendChild(statusLine);
    card.appendChild(subLine);

    const details = document.createElement('div');
    details.className = 'details';
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
      const list = classesForDay(person, day);
      if (!list.length) continue;
      const block = document.createElement('div');
      block.className = 'day-block';
      const isToday = day === weekday;
      block.innerHTML = `<h3>${day}${isToday ? ' (today)' : ''}</h3>`;
      for (const c of list) {
        const row = document.createElement('div');
        const isCurrent = isToday && minutes >= toMinutes(c.start) && minutes < toMinutes(c.end);
        row.className = 'class-row' + (isCurrent ? ' current' : '');
        row.innerHTML = `<span>${c.course} — ${c.location}</span><span class="time">${fmtMinutes(toMinutes(c.start))}–${fmtMinutes(toMinutes(c.end))}</span>`;
        block.appendChild(row);
      }
      details.appendChild(block);
    }
    card.appendChild(details);

    card.addEventListener('click', () => card.classList.toggle('open'));

    grid.appendChild(card);
  }
}

render();
setInterval(render, 15000);
