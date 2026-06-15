# Render API setup (required for CMS login)

The CMS panel at https://www.cousin.site/editable/admin/ needs a small API server for login, save, and publish. GitHub Pages is static only.

**Symptom:** Login shows *"Cannot reach admin API"*

## Deploy in ~5 minutes

1. Go to **[dashboard.render.com](https://dashboard.render.com)** and sign in (GitHub login is fine).

2. Click **New +** → **Blueprint**.

3. Connect the **`les-del/cousin-site`** repository.

4. Render will detect `render.yaml` and show a service called **`cousin-editable-api`**.

5. When prompted for environment variables, set:
   - **`COUSIN_ADMIN_PASSWORD`** → `CMStest!`
   - Leave `GITHUB_TOKEN` and AWS keys blank for now (optional — needed later for Publish-to-GitHub and poster uploads).

6. Click **Apply** / **Deploy**. Wait ~2–3 minutes for the build to finish.

7. Confirm the API is live:
   ```
   https://cousin-editable-api.onrender.com/api/health
   ```
   Should return `{"ok":true,...}`

8. Sign in at https://www.cousin.site/editable/admin/ with password **`CMStest!`**

## Already deployed?

- Check the service URL in Render matches `editable/admin/config.js` → `productionApi`
- Confirm `COUSIN_ADMIN_PASSWORD` is set to `CMStest!` in Render → Environment
- Free tier sleeps after inactivity — first login may take ~30s to wake up
