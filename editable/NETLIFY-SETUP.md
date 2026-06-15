# Deploy Cousin CMS on Netlify

One platform for everything — site, admin panel, and login. No Render.

## 1. Connect Netlify (5 minutes)

1. Go to **[app.netlify.com](https://app.netlify.com)** → sign in with GitHub
2. **Add new site** → **Import an existing project** → **GitHub**
3. Choose repo **`les-del/cousin-site`**
4. Build settings:
   - **Base directory:** `editable`
   - **Build command:** *(leave empty)*
   - **Publish directory:** `.`
   - **Functions directory:** `netlify/functions`
5. Click **Deploy**

Netlify reads `editable/netlify.toml` automatically.

## 2. Set environment variables

In Netlify → **Site configuration** → **Environment variables**, add:

| Variable | Value | Required |
|---|---|---|
| `COUSIN_ADMIN_PASSWORD` | `CMStest!` | Yes — client login password |
| `GITHUB_TOKEN` | *(GitHub PAT)* | Yes — for Save & Publish |
| `AWS_ACCESS_KEY_ID` | *(your AWS key)* | For poster uploads |
| `AWS_SECRET_ACCESS_KEY` | *(your AWS secret)* | For poster uploads |

**GitHub token:** [github.com/settings/tokens](https://github.com/settings/tokens) → fine-grained → repo `les-del/cousin-site` → Contents: Read and write.

After adding variables, **Trigger deploy** → **Deploy site**.

## 3. Your URLs

After deploy (~1 min), Netlify gives you a URL like:

| | URL |
|---|---|
| **CMS panel** | `https://YOUR-SITE.netlify.app/admin/` |
| **Live site** | `https://YOUR-SITE.netlify.app/` |
| **Password** | `CMStest!` |

Rename the site to `cousin-cms` in Netlify → **Domain management** for a cleaner URL: `https://cousin-cms.netlify.app`

Give your client the **CMS panel** link and password. They use **Live site** and **Draft site** buttons inside the panel.

## 4. Optional: custom domain

In Netlify → **Domain management**, add e.g. `cms.cousin.site` and point DNS.

## Local dev

```bash
cd editable
npm start
```

Site: http://localhost:8787/editable/  
Admin: http://localhost:8787/editable/admin/ (no login when `COUSIN_ADMIN_NO_AUTH=true` in `.env`)
