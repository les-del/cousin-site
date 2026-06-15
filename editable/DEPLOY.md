# Deploying Cousin CMS (staging)

## Client URLs

| | URL | Password |
|---|---|---|
| **CMS panel** | https://www.cousin.site/editable/admin/ | Yes |
| **Live site** (published) | https://www.cousin.site/editable/ | No |
| **Draft preview** | Open **Draft site** from inside the CMS | No |

Give clients the **CMS panel** link and password only. They use **Live site** and **Draft site** buttons inside the panel.

## 1. Push static files to GitHub

```bash
git add editable/ render.yaml
git commit -m "Update Cousin CMS staging"
git push live main
```

GitHub Pages redeploys in ~1–2 minutes.

## 2. Deploy admin API (login, save, publish, upload)

GitHub Pages is static only. Deploy the API to [Render](https://render.com) (free tier):

1. Sign in to Render → **New** → **Blueprint** → connect repo `les-del/cousin-site`
2. Render reads `render.yaml` and creates `cousin-editable-api`
3. Set these secrets in the Render dashboard:
   - `COUSIN_ADMIN_PASSWORD` — the password clients use to sign in
   - `GITHUB_TOKEN` — (optional) PAT with Contents write on `cousin-site` so **Publish** updates GitHub
   - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — (optional) for poster uploads to S3
4. After deploy, confirm the API URL matches `editable/admin/config.js` → `productionApi` (default: `https://cousin-editable-api.onrender.com/api`)

## 3. Local dev

```bash
cd editable
cp .env.example .env
# COUSIN_ADMIN_NO_AUTH=true  → skip login on localhost
npm start
```

- Site: http://localhost:8787/editable/
- Admin: http://localhost:8787/editable/admin/
