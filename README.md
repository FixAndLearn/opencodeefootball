# eFootballMarket

Production-grade marketplace for buying and selling eFootball accounts with
M-Pesa payments, escrow protection, realtime chat, and a full admin console.

## Stack

- **Frontend:** Next.js (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, React Hook Form, Zod, TanStack Query
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions)
- **Payments:** Safaricom Daraja (M-Pesa STK Push) via Edge Functions

## Getting started

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase and M-Pesa credentials.
3. Apply the database migrations: `npx supabase db push` (or run the files in `supabase/migrations` in order).
4. Deploy Edge Functions: `npx supabase functions deploy mpesa-stk-push mpesa-callback`
5. Run the app: `npm run dev`

## Project structure

- `src/app` — routes (pages, layouts, API routes)
- `src/lib` — supabase clients, validation, utilities, API helpers
- `src/middleware.ts` — session refresh + route protection
- `supabase/migrations` — production schema (RLS, indexes, triggers)
- `supabase/functions` — M-Pesa payment Edge Functions

## Data policy

No demo, seed, or placeholder data. Empty tables render empty states. All
statistics are computed from live database records.
