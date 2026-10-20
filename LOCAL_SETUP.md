# Australian NatSec50 chart review — local MVP

Open **http://127.0.0.1:8765** while the server is running. The app is local to this Mac; it is not yet a shared or public website.

## Start or restart

Double-click `Start review.command`, or in a terminal:

```sh
cd natsec50-chart-review
python3 server.py --port 8765
```

The interface is already built. Press Control-C in the server terminal to stop it. Votes and comments survive a restart. If the port is occupied, use `--port 8766` and open that address instead.

## Review workflow

- Browse subjects, search titles/findings, or choose an analysis directly.
- Enter your name to vote or comment. This MVP uses self-reported names, not verified accounts; using the same name returns to that reviewer’s feedback.
- Each analysis receives one changeable upvote/downvote per reviewer, regardless of which CDC view is shown. Click your selected vote again to clear it.
- For companion pairs, switch Including/Excluding CDC and record a separate view preference.
- Comments record the chart revision and the currently viewed CDC variant. Reply in the thread, or edit/remove your own comments. Removing a comment retains replies and hides its text.
- Open Results to compare votes, comments and variant preferences; export results, votes or comments as CSV.
- Enlarge a chart to read dense or long charts. Scroll inside the viewer to reach every row. Published charts load live from Datawrapper; unavailable/unpublished charts have a labelled saved draft fallback.

## What is included

The imported live Datawrapper library currently contains **36 analyses / 53 chart views / 17 CDC pairs**. Published chart bodies load live from Datawrapper. Saved draft fallbacks are complete PNG exports served locally. The original chart titles, takeaways and descriptors remain code-native and searchable. No Datawrapper login is required to view the local images. Optional Datawrapper/Google Sheets links retain their normal access requirements. Deleted charts are omitted from the imported live library.

Nothing is published or changed in Datawrapper by this app or its importer.

## Storage and revisions

Feedback is stored in `data/reviews.sqlite3` (SQLite). Back up this file using SQLite’s backup API; do not copy a live database without its WAL. CSV exports provide portable review records.

Images have immutable content-hash filenames, so importing an updated chart does not overwrite an earlier image. Images are in `public/charts/` and their built copies in `dist/charts/`. `data/catalog.json` freezes the review library. Each analysis has a content revision; feedback stays associated with that revision. An importer refresh preserves earlier feedback/snapshots in the database, while the UI shows the current revision. CSV votes/comments exports retain revision identifiers.

To refresh chart snapshots, stop the server, run:

```sh
python3 scripts/import_charts.py
npm run build
python3 server.py
```

Refresh requires the existing local Datawrapper Keychain credential and network access. Ordinary review does not. The importer only calls read/export endpoints; it never publishes charts or includes the API credential in the browser bundle.

## Development and verification

React/Vite frontend; Python standard-library HTTP server; SQLite storage. No database service, cloud hosting, or runtime API keys are needed.

```sh
npm install
npm run build
npm test
```

For frontend development, run the Python server and `npm run dev` in separate terminals. Vite proxies `/api` to port 8765. Use the built app at port 8765 for the normal review workflow.

The server binds to `127.0.0.1` and rejects foreign hosts/origins. This is a local MVP, not an authenticated hosted service. To let remote teammates review independently, the next step is deployment with account sign-in and shared hosted persistence; a localhost link does not work from their computers.
