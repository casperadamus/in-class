# Who's in Class?

A single-page live dashboard showing who's currently in class, between classes, or free — built for a group of roommates/friends to check at a glance. No backend, no build step: just static HTML/CSS/JS.

## Features

- **Live status per person** — a progress ring counts down time left in the current class, or time until the next one.
- **Weekly timeline** — expand a card to see each person's full Mon–Sun schedule with a "now" marker on today's row.
- **Live summary bar** — counts of who's in class / between classes / free, updated every second.
- **Semester-aware** — shows a banner if today falls outside the configured semester date range.
- **Optional location badges** — polls a [Traccar](https://www.traccar.org/) status endpoint to show a 🏠 Home / 🎓 Campus badge per person, based on GPS location.

## Running it

This is a static site — no build or install required.

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just open [index.html](index.html) directly in a browser.

## Project structure

| File | Purpose |
|---|---|
| [index.html](index.html) | Page shell/markup |
| [style.css](style.css) | All styling |
| [data.js](data.js) | Schedule data — semester dates and each person's classes |
| [app.js](app.js) | Rendering, live clock/ring updates, location polling |

## Configuring schedules

Edit [data.js](data.js):

- `SEMESTER` — the `start`/`end` dates (ISO, `America/New_York`) the schedule is considered active for.
- `PEOPLE` — an array of people, each with an `id`, display `name`, accent `color`, and a list of `classes` (`day`, `start`/`end` in 24h `HH:MM`, `course`, `type`, `location`).

## Location badges

`app.js` polls `STATUS_ENDPOINT` every 20 seconds for a JSON map of `{ personId: "home" | "campus" }`. This expects a small Traccar-backed status service; if the endpoint is unreachable, badges simply don't show. Update `STATUS_ENDPOINT` in [app.js](app.js) to point at your own service, or remove the polling if you don't need it.
