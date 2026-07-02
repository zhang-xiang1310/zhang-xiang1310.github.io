# Personal Intro Site

Private personal introduction site with one admin account, authenticated uploads, and Vercel Functions.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Default admin account:

- Email: `1403608175@qq.com`
- Password: `zhangxiang1310`

## Vercel Setup

1. Push this folder to GitHub.
2. Import the repository in Vercel.
3. Create a Vercel Blob store and connect it to the project.
4. Set these environment variables in Vercel:

```bash
SITE_ADMIN_EMAIL=1403608175@qq.com
SITE_ADMIN_PASSWORD=zhangxiang1310
SESSION_SECRET=replace-with-a-long-random-secret
```

Uploads use local files during development.
In Vercel production, connect the Blob store to the project; Vercel will inject the Blob store settings automatically.

Vercel settings should use:

- Framework Preset: `Other`
- Build Command: empty
- Output Directory: `.`
