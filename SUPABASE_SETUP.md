# Turn on shared comments and votes — free setup

Gallery: https://svdgteam.github.io/natsec50-chart-review/

Repository: https://github.com/SVDGteam/natsec50-chart-review

The GitHub Pages gallery works before this setup. Complete the steps below to activate sign-in, comments, votes, preferred CDC views and CSV exports. You do not need to deploy a server or purchase a domain.

## 1. Create a free Supabase project

1. Go to https://supabase.com/dashboard and sign in (GitHub sign-in is available).
2. Create an organization on the **Free** plan, then create a project named `natsec50-review`.
3. Choose a region near your reviewers, create a strong database password, and save it in your password manager. Wait for the project to finish provisioning.
4. Stay on the Free plan. No paid add-on is needed for this review.

The database password is not used in the website or GitHub settings.

## 2. Create the review tables

Open **SQL Editor → New query** in Supabase.

1. Open [supabase/01-schema.sql](supabase/01-schema.sql) in this repository. Use the Raw button to copy the entire file, paste it into the SQL Editor, and click **Run**. Run this file once in the new project.
2. Start a new query and run [supabase/02-catalog.sql](supabase/02-catalog.sql). This registers the 36 analyses, their revisions and their valid chart variants. This file is safe to run again after a chart refresh.

The schema enables Row Level Security. Only approved signed-in reviewers can read feedback. Each person can change their own votes and comments; another reviewer cannot change them. The chart library and saved draft images remain public on GitHub Pages; published graphs load live from Datawrapper.

## 3. Add yourself and your team

This app uses email/password sign-in. It does not need outgoing email, a custom SMTP service or GitHub OAuth setup.

1. In **Authentication → Sign In / Providers** (sometimes **Providers** or **Settings**), keep **Email** authentication enabled.
2. Turn **Allow new users to sign up** off. Keep anonymous sign-ins off. The project owner creates the review accounts.
3. In **Authentication → Users**, choose **Add user → Create new user**. Enter the reviewer's email and a unique initial password of at least 12 characters. Enable **Auto Confirm User** / **Auto confirm email** if shown. Repeat for each teammate. Use Create new user, rather than Send invitation; invitations require email delivery and a different onboarding flow.
4. Separately, add those same email addresses to the reviewer list. In SQL Editor run this, replacing the example addresses with the real ones:

```sql
insert into review_private.allowed_emails(email)
values
  ('you@example.com'),
  ('teammate@example.com')
on conflict do nothing;
```

Use lowercase email addresses. Both the Auth account and the allowed-email entry are required. The email list is stored outside the public API schema and is not in GitHub.

Give each person their initial password through your normal private password-sharing method. Do not put passwords in repository files, issues or comments. After signing in, reviewers can click their name and use **Change password**.

If Supabase's dashboard layout changes, its [user-management documentation](https://supabase.com/docs/guides/auth/users) describes the Auth Users controls. An owner can reset a forgotten password through the user-management controls. This app does not implement self-service password recovery.

## 4. Connect Supabase to GitHub

In Supabase, open the project's **Connect** dialog, or **Project Settings → API / API Keys**. Copy these two public client settings:

- **Project URL**, such as `https://YOUR-PROJECT.supabase.co`.
- **Publishable key**, normally beginning `sb_publishable_`. The legacy **anon** key also works.

Do not use a `service_role` key, `sb_secret_` key, personal access token or database password. Those are privileged secrets; this app only uses the public client key. Access to feedback is enforced by database rules and individual sign-in.

In [this repository's Actions variables](https://github.com/SVDGteam/natsec50-chart-review/settings/variables/actions), click **New repository variable** and add:

| Variable name | Value |
|---|---|
| `SUPABASE_URL` | Your Supabase Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Your public publishable key (or legacy anon key) |

Use **Variables**, not a committed `.env` file. These are deliberately public values in the generated browser app; privileged keys must never be entered here.

## 5. Publish the configured version

1. Open [Actions → Publish chart review](https://github.com/SVDGteam/natsec50-chart-review/actions/workflows/pages.yml).
2. Click **Run workflow**, leave the branch as `main`, and run it.
3. Wait for both **build** and **deploy** to show green checks.
4. Open https://svdgteam.github.io/natsec50-chart-review/ and refresh. The setup banner should now say **Sign in to see the team's feedback and add your own**.

Changing variables alone does not update an already published site; run the workflow afterward. Pages publishing should already be configured. If needed, **Repository Settings → Pages → Source → GitHub Actions**.

## 6. Check it with two reviewers

1. Sign in with your email, password and display name.
2. Upvote one chart, switch its CDC variant, and choose your preferred view. The vote applies to the analysis across both variants.
3. Post a comment and a reply.
4. Have a teammate sign in using another browser/profile and check that your feedback appears. The app refreshes feedback every 12 seconds; **Refresh feedback** updates results immediately.
5. Open **Results** and export a CSV. Reload the page and confirm feedback remains.
6. Verify the teammate cannot edit your comment. They can add their own feedback.

## Ongoing use

- **Add a reviewer:** create their Auth account and add their email using step 3.
- **Remove access:** delete the email from `review_private.allowed_emails` in SQL Editor. Example: `delete from review_private.allowed_emails where email='person@example.com';`. This removes access without deleting historical feedback.
- **Back up review results:** export the Results, Votes and Comments CSVs after review sessions. These are review records, not a complete database backup. Free-tier backup/recovery features are limited.
- **Inactive project:** Supabase Free projects may pause after a week of low activity. Open the dashboard and resume the project if necessary. Feedback will be unavailable until it resumes; the public chart gallery should remain usable.
- **Republishing an existing chart:** republish in Datawrapper, then click **Refresh chart** or reopen the analysis. No GitHub deployment is needed. Unpublished graphs show saved drafts and switch to the published embed when available. Existing votes/comments stay with the analysis across republishing.
- **Adding/removing charts or refreshing saved drafts:** update `data/catalog.json` and images, run `node scripts/prepare-hosting.mjs`, then run the updated `supabase/02-catalog.sql` in Supabase before publishing. Earlier feedback remains associated with its original revision and is included in detailed exports. The UI counts the current revision only.

Free allowances should cover a small team reviewing this chart library, but are subject to the providers' current limits. This setup does not enable paid usage or automatic paid upgrades.

## Troubleshooting

| What you see | What to do |
|---|---|
| “Shared comments and votes await Supabase setup” | Add both GitHub variables, then run the publishing workflow. |
| “Invalid login credentials” | Check the email/password, account creation and confirmed email status in Supabase Auth Users. |
| “Not on the reviewer list” | Add the exact lowercase Auth email to `review_private.allowed_emails`. |
| Missing table/function error | Run both SQL files in order in the same project referenced by `SUPABASE_URL`. |
| “This chart has changed” | Run the current `02-catalog.sql`, then refresh the website. |
| Network/database error after inactivity | Check whether Supabase is paused, resume it, then use Refresh feedback. |
| Deployment fails | Read the failed job in GitHub Actions. Check Pages uses GitHub Actions as its source. |

Official references: [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords), [signup configuration](https://supabase.com/docs/guides/auth/general-configuration), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing), [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
