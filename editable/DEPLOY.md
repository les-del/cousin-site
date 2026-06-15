# Cousin CMS deployment

**Use Netlify** — see **[NETLIFY-SETUP.md](./NETLIFY-SETUP.md)** for step-by-step instructions.

Quick summary:
1. Connect `les-del/cousin-site` on Netlify (base directory: `editable`)
2. Set `COUSIN_ADMIN_PASSWORD` = `CMStest!` and `GITHUB_TOKEN`
3. Give client: `https://cousin-cms.netlify.app/admin/` + password

Local dev: `cd editable && npm start`
