# Vercel Deployment

Deploy this repo as two Vercel projects:

1. `server` as the API project
2. `client` as the web app project

This is the safest setup for the current codebase because the frontend is a Vite SPA and the backend is an Express + Prisma app.

## 1. Prepare production services

- Create a production MySQL database that Vercel can reach.
- Keep strong production values ready for `JWT_SECRET` and `JWT_REFRESH_SECRET`.

## 2. Deploy the API (`server`)

In Vercel:

- Import the repo as a new project.
- Set the Root Directory to `server`.
- Framework Preset: `Other`.

Environment variables for the `server` project:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_EXPIRES_IN=15m`
- `JWT_REFRESH_EXPIRES_IN=7d`
- `NODE_ENV=production`
- `CORS_ORIGIN=https://YOUR-CLIENT-PROJECT.vercel.app`
- `PUPPETEER_SKIP_DOWNLOAD=true`

Notes:

- `server/vercel.json` increases the function duration and includes the PDF HTML templates.
- PDF generation uses Vercel Chromium when `VERCEL` is present.

After the environment variables are set, deploy once and note the API URL:

- `https://YOUR-SERVER-PROJECT.vercel.app`

Run migrations against the production database before using the app:

```bash
cd server
npm run db:deploy
```

Seed data if you need an initial admin/user setup:

```bash
cd server
npm run db:seed
```

## 3. Deploy the frontend (`client`)

In Vercel:

- Import the same repo as another new project.
- Set the Root Directory to `client`.
- Framework Preset: `Vite`.

Environment variables for the `client` project:

- `VITE_API_URL=https://YOUR-SERVER-PROJECT.vercel.app/api/v1`

Notes:

- `client/vercel.json` rewrites SPA routes to `index.html`, so direct visits to app routes keep working.

## 4. Finalize CORS

After the client project is deployed, update the server project's `CORS_ORIGIN` value to the exact frontend URL:

```text
https://YOUR-CLIENT-PROJECT.vercel.app
```

Redeploy the server after changing it.

## 5. Smoke test

Check these URLs after deployment:

- `https://YOUR-SERVER-PROJECT.vercel.app/api/v1/health`
- `https://YOUR-CLIENT-PROJECT.vercel.app`

Then test:

- login
- creating records
- import/export
- at least one PDF endpoint
