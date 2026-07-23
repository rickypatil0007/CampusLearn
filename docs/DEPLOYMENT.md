# Deployment (Vercel)

1. **Push this repository to GitHub/GitLab/Bitbucket.**

2. **Import the project into Vercel** (https://vercel.com/new) and select the repository. Vercel auto-detects
   Next.js — no build command changes needed (`next build`).

3. **Set environment variables** in the Vercel project settings (`Settings → Environment Variables`), matching
   `.env.example`:
   - `NEXT_PUBLIC_APP_URL` — your production URL (e.g. `https://campuslearn.vercel.app`)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public, safe for the browser
   - `SUPABASE_SERVICE_ROLE_KEY` — **server-only**, mark it as a "Sensitive"/encrypted value, never expose it via
     `NEXT_PUBLIC_`
   - `ANTHROPIC_API_KEY`, `EMBEDDING_PROVIDER`, `EMBEDDING_API_KEY` — server-only
   - `ALLOWED_EMAIL_DOMAIN`, `MAX_UPLOAD_SIZE_MB`, `AI_REQUESTS_PER_USER_PER_DAY`
   - Do **not** set `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` in production — those are dev-only.

4. **Update Supabase Auth redirect URLs** to include your Vercel domain (`Authentication → URL Configuration`),
   otherwise email verification and password-reset links will redirect to the wrong place.

5. **Deploy.** Vercel builds and deploys on every push to the connected branch.

6. **Post-deploy checklist:**
   - Register a test account with an `@tcetmumbai.in` email and confirm the verification email arrives and works
   - Confirm a `gmail.com` registration attempt is rejected
   - Log in, confirm the dashboard loads real (likely empty, until seeded/used) data
   - If you ran `npm run seed` against this project during development, confirm you're comfortable with that demo
     data existing, or reset the project before going live
   - Set your Super Administrator per `docs/SUPABASE_SETUP.md` step 6, Option B

## Notes on the security headers / CSP
`next.config.ts` sets a Content-Security-Policy, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and a
restrictive `Permissions-Policy`. If you add new third-party scripts or embeds, you will need to extend the CSP in
`next.config.ts` accordingly rather than loosening it broadly.
