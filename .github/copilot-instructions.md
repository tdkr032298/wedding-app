# GitHub Copilot Instructions

- This repo is a Next.js 16 app using the App Router and a client-only page at `src/app/page.tsx`.
- `src/app/page.tsx` is a React client component (`"use client"`) that manages form state, reads from Supabase, and inserts guest messages.
- Supabase is initialized in `src/lib/supabase.ts` using runtime environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- The app reads from the `message` table and expects columns `guest_name`, `message`, and `created_at`.
- Styling uses Tailwind v4 through `postcss.config.mjs` and `src/app/globals.css`.
- The app root layout is in `src/app/layout.tsx`; it uses Google fonts via `next/font/google` and sets the HTML/body wrapper.
- Build and development commands are from `package.json`:
  - `npm run dev`
  - `npm run build`
  - `npm run start`
  - `npm run lint`
- There is no server-side API route or backend folder in this repo; all Supabase access is done directly from the client.
- Do not invent additional services or frameworks beyond Next.js, React, Tailwind, and Supabase.
- Keep changes consistent with the existing page structure: a single main screen, input fields, save button, and message list.
- For linting, use the existing `eslint.config.mjs` configuration, which extends `eslint-config-next` core web vitals and TypeScript.
- When modifying data access, preserve the current data flow: fetch messages on mount with `useEffect`, then refresh after inserts.
- Avoid adding test frameworks or build tools that are not already present in `package.json`.
- If environment variables are needed, note that the repo currently expects `.env.local` for local development.

> Useful files:
> - `src/app/page.tsx`
> - `src/lib/supabase.ts`
> - `src/app/globals.css`
> - `postcss.config.mjs`
> - `eslint.config.mjs`
> - `package.json`
