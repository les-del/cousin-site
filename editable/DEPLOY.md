# Deploying Cousin editable (staging)

## Live URLs (after deploy)

| | URL |
|---|---|
| **Test site** (no password) | https://www.cousin.site/editable/ |
| **Admin** (password required) | https://www.cousin.site/editable/admin/ |

## 1. Push static files to GitHub

From the repo root:

```bash
git add editable/
git commit -m "Add editable staging site and admin"
git push live main
```

GitHub Pages redeploys in ~1 min. The **test site** works immediately (reads `directors.json`).

## 2. Deploy admin API (save + upload)

The admin panel needs a small Node server for login, save, and poster upload. GitHub Pages is static only — deploy the API to [Render](https://render.com) (free tier):

1. Connect repo `les-del/cousin-site` to Render
2. Use the `render.yaml` in the repo root (or create a Web Service: root dir `editable`, start `node server/index.mjs`)
3. Set environment variables on Render:
   - `COUSIN_ADMIN_PASSWORD` — admin login password
   - `GITHUB_TOKEN` — PAT with Contents write on `cousin-site` (so Save pushes JSON to GitHub)
   - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — for poster uploads to S3
4. Copy your Render URL (e.g. `https://cousin-editable-api.onrender.com`)
5. Update `editable/admin/config.js` → `productionApi` with your Render URL + `/api`
6. Push that change to `live main`

## 3. Local dev

```bash
cd editable
cp .env.example .env
# COUSIN_ADMIN_NO_AUTH=true for password-free local testing
npm start
```

- Site: http://localhost:8787/editable/
- Admin: http://localhost:8787/editable/admin/ (no login locally)

## Password

- **Test site**: never password-protected
- **Admin**: password on Render (`COUSIN_ADMIN_PASSWORD`), skipped on localhost when `COUSIN_ADMIN_NO_AUTH=true`
