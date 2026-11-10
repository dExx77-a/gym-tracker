# Gym Tracker

A personal, offline gym tracker. Plain HTML + CSS + JavaScript: no installs, no internet, no server.

## Open it
Double-click **`index.html`**. It opens in your default browser (Edge or Chrome work best).
Tip: bookmark the page or pin the tab so it's one click away.

## Back up your data
Your data lives **only in this browser on this computer** (localStorage).
Clearing browser data, or opening the app in a different browser, means you won't see it there.

- **Me → Export** downloads `gym-tracker-backup-YYYY-MM-DD.json`. Do this weekly and keep the file in OneDrive or Google Drive.
- **Me → Import** loads a backup file. It *replaces* all current data, so you're asked to confirm first.

## Use it on your iPhone later
Safari on iPhone can't run an HTML file straight from the Files app, so put the folder online once (free):

1. **Netlify Drop**: go to app.netlify.com/drop and drag this whole folder onto the page. You get a link.
   (Or: push the folder to a GitHub repo and turn on **GitHub Pages**.)
2. Open the link in **Safari** on your iPhone → Share → **Add to Home Screen**. It now opens like an app.
3. Move your data across: **Export** on the PC → save the file to iCloud Drive/OneDrive → on the iPhone, **Me → Import**.

Each device keeps its own copy of the data. Pick one main device (your phone, since you log at the gym)
and use Export/Import whenever you switch.

## How the rules work
| Feature | Rule |
|---|---|
| Minimum version | Each workout has a "bad-day minimum" (first N exercises, purple numbers). Doing those still counts. |
| Skip | Skipping an exercise has no penalty. Skipped exercises are ignored for the minimum. |
| Streak | +1 for every workout where you hit the minimum. Rest days never break it. |
| Shield | 1 per week (Mon–Sun). Forgives one missed planned day. A 2nd miss that week resets the streak. |
| Overload hint | If every set last time reached the top of the rep range, it suggests +2.5 kg. |
| Plateau | If your best estimated 1RM in the last 3 sessions isn't higher than before, you get a warning. |
| e1RM | Epley formula: weight × (1 + reps / 30). |
| XP | +10 per set, +50 per workout, +25 for going past the minimum, +100 per PR, +5 per weigh-in. |

## Files (where to edit what)
```
index.html            page shell, icon sprite, script list
css/styles.css        all styling; colours at the top (light + dark)
js/utils.js           date and number helpers
js/data.js            starting exercise library + your plan  <- change defaults here
js/storage.js         save / load / export / import
js/stats.js           PRs, hints, plateau, streak, volume, heatmap
js/game.js            XP values, ranks, achievements          <- tune the game here
js/ui.js              element builder, dialogs, toasts
js/charts.js          canvas line chart
js/timer.js           rest timer + beep
js/screens/*.js       one file per screen
js/app.js             starts the app, switches screens
```
Note: `data.js` is only used the first time (or after **Reset all data**). After that, change your plan in the app on the **Plan** tab.
