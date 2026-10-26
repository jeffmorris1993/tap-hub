This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# tap-hub

## Google Calendar push (one-time setup)

Published events are pushed to a church Google Calendar (insert on approve/publish,
update on edit, delete on unpublish/reject/delete). To enable it:

1. In Google Calendar, open the target calendar's **Settings → Share with specific
   people** and add the service account email (`GCP_SERVICE_ACCOUNT_EMAIL`, or the
   `client_email` from `GOOGLE_SERVICE_ACCOUNT_JSON`) with **"Make changes to events"**.
2. Copy the calendar's ID (Settings → Integrate calendar — looks like
   `…@group.calendar.google.com`) into the `GOOGLE_CALENDAR_ID` env var on Vercel.
3. The push reuses the same Google auth as Chat notifications (WIF via Vercel OIDC,
   or the JSON key fallback). With WIF, no extra GCP config is needed — the
   calendar scope is requested per-call. Until `GOOGLE_CALENDAR_ID` is set, the
   push is a silent no-op.

## Event reminder emails (cron)

`vercel.json` schedules `/api/cron/reminders` daily at 12:00 UTC (Detroit morning —
Vercel Hobby only allows daily crons). Set `CRON_SECRET` in Vercel (the platform
sends it as a bearer token automatically). Everyone signed up with an email contact
gets one reminder per occurrence, sent the morning run before it starts
(`REMINDER_HOURS_BEFORE` window, default 36h); the `event_reminder_sends` table
makes reruns idempotent.

## Session expiry

Portal sessions are capped at 7 days with a 24-hour inactivity timeout,
enforced in `proxy.ts` (Supabase's own `[auth.sessions]` timebox requires a
Pro plan — the equivalent block sits commented in `supabase/config.toml`,
ready to uncomment and `supabase config push` after an upgrade).
