# Cousin — Editable site

Client-editable clone of [cousin.site](https://www.cousin.site). **Production `index.html` is untouched.**

## Quick start

```bash
cd editable
cp .env.example .env          # set COUSIN_ADMIN_PASSWORD
npm start
```

| URL | What |
|-----|------|
| http://localhost:8787/editable/ | Public site preview |
| http://localhost:8787/editable/admin/ | Admin panel |

Default password (if no `.env`): `cousin-dev`

> `python3 -m http.server` only serves static files — **Save won't work**. Use `npm start`.

## Admin

1. Sign in with your password
2. Pick a director tab (Ariel, Kyra, Toby)
3. Edit **Client**, **Title**, **Video URL**, **Poster image**
4. Drag **⋮⋮** to reorder
5. **+ Add project** / **Delete** as needed
6. **Save changes**

Saves write to `editable/data/directors.json`. The public site reads that file on load.

### GitHub push (production)

Add to `.env`:

```
GITHUB_TOKEN=ghp_…
GITHUB_REPO=les-del/cousin-site
```

Create a [fine-grained PAT](https://github.com/settings/tokens?type=beta) with **Contents: Read and write** on `cousin-site`. On save, the server commits `editable/data/directors.json` — GitHub Pages redeploys automatically.

## Structure

```
editable/
  index.html              Public site
  admin/                  Login + reel editor
  data/directors.json     Source of truth
  server/index.mjs        Dev server + save API
  css/  js/               Site assets
```

## Deploy preview

Push the `editable/` folder to `les-del/cousin-site`. Preview at:

- `cousin.site/editable/`
- `cousin.site/editable/admin/` (needs the API server in production — see below)

For admin save on the live domain you’ll run the same `server/index.mjs` on a small host (Railway, Fly, Render) and point `admin/config.js` `apiBase` at that URL. Local dev is fully working today.

See [AUDIT.md](./AUDIT.md) for refactor notes.
