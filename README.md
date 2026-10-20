# Australian NatSec50 chart review

**[Open the chart gallery](https://svdgteam.github.io/natsec50-chart-review/)** · **[Activate comments and votes](SUPABASE_SETUP.md)**

A lightweight review workspace for 33 analyses, 47 chart views and 14 Including/Excluding CDC comparisons. Browse subjects, search findings, enlarge charts, vote on report inclusion, record a preferred CDC view and discuss each chart with your team. Results and comments export to CSV.

## Hosting

GitHub Pages serves the React interface and live published charts with saved draft fallbacks. Supabase Free provides email/password sign-in and shared feedback. The gallery works without Supabase; feedback is clearly marked as awaiting setup until configured. See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for all setup steps.

**Visibility:** the repository, chart images and catalog are public. Comments, reviewer names, votes and email access list are accessible only to approved signed-in reviewers. Sign-in does not make public chart files private.

No database credentials, local feedback or Datawrapper API keys are included in the hosted site. Reviewers do not need a Datawrapper account to view published charts or saved draft fallbacks. Original Datawrapper and source links retain their own access requirements. Nothing is published or changed in Datawrapper by this app.

## Development

Node.js 22+ is recommended.

```sh
npm ci
npm run test:cloud
npm run build:hosted
```

GitHub Actions builds and deploys on pushes to `main` and manual runs. Repository Actions variables `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are public client configuration. Never use secret or service-role keys. A public catalog is generated from `data/catalog.json`; chart assets use immutable content-hash filenames.

The earlier local Python/SQLite mode remains available:

```sh
npm run build
python3 server.py --port 8765
```

Open http://127.0.0.1:8765. Local name-only sessions and hosted Supabase identities are separate. Local feedback is not automatically uploaded. Local mode uses a SQLite database excluded from Git.

## Database

Run `supabase/01-schema.sql` once in a new Supabase project; `supabase/02-catalog.sql` seeds the review library and can be rerun after updates. Members are maintained in `review_private.allowed_emails`. All feedback tables use Row Level Security; browser mutations use validated database functions with owner checks, valid-variant checks and revision guards. Each reviewer has one changeable vote per analysis and revision. Soft-removing a comment retains its replies.

`npm run test:cloud` runs real PostgreSQL schema/RLS/function tests in PGlite plus aggregation and CSV tests. PGlite simulates Supabase's auth roles and JWT helper functions; it does not test a live Supabase Auth deployment. The Python local mode's HTTP/SQLite tests run with `npm test`.

Chart snapshots captured 20 October 2026. This is a team review tool for draft analyses.

## Published chart updates

Republish an existing chart in Datawrapper, then use **Refresh chart**, revisit that analysis or reload the review website. The latest published chart, title and description load from Datawrapper without rebuilding this site (subject to its CDN cache). Charts without a published version show a clearly labelled saved draft. Every view attempts a live embed when opened, so publishing a formerly unpublished chart does not require a website redeploy.

Existing votes/comments remain attached to each analysis and CDC view across republishing. They do not imply approval of every later change. `revision` identifies the imported review-library batch; the live embed is not frozen to that batch. To add/remove analyses or update the draft fallbacks/search metadata, refresh the library and deploy it.

All Charts follows the sidebar subject order: Government awards, Critical technologies, Private investment, People & places, US government, Other analyses. Login and password-change fields have independent Show/Hide controls. The sidebar uses the supplied SVDG logo.

## Australian contracting source policy

Use only TenderTrace’s Federal Tenders AUS table and its associated Master Dashboard rollups. AusTender Contracts and its Master rollups are excluded. US contracting retains its separately approved US-source exception. Procurement-method and Defence-branch analyses were withdrawn on 20 October 2026 because the approved table does not contain those fields. Historical drafts and feedback are retained. `data/source-policy.json` prevents these four views from returning in future imports.

The critical-technology capital and federal-awards analyses are consolidated into one comparison. Old private-capital links redirect to the combined chart and matching CDC view. Earlier private-capital votes/comments remain separately available in the Votes and Comments exports; they are not added to the combined vote totals.
