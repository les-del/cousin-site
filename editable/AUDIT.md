# Editable site — audit & changes from live

_Cloned from live `index.html` (commit `8722c71`, May 2026). Production site untouched._

## Problems fixed in the clone

### 1. Monolithic 2,300-line HTML file
**Was:** All CSS and JS inline in one file.  
**Now:** `css/site.css` + seven focused JS modules under `js/`.

### 2. Three duplicate CSV loaders (~260 lines × 3)
**Was:** `Papa.parse` blocks for Ariel, Kyra, and Toby were nearly identical.  
**Now:** One `loadDirectorData()` + `createProjectElement()` in `projects.js`. PapaParse dependency removed.

### 3. Hardcoded poster filename mapping (~45 lines)
**Was:** `getPosterImageForVideo()` matched video URLs to poster filenames with brittle `includes()` checks — duplicated data already in CSV `Thumbnail` column.  
**Now:** Posters read directly from `project.poster` in JSON. Adding a reel = one data row, no JS edit.

### 4. Inconsistent director handling
**Was:** `disableHoverEffects()` only disabled Ariel + Toby, not Kyra. Director click/hover handlers copy-pasted three times.  
**Now:** `COUSIN_DIRECTORS` config drives all three uniformly in `navigation.js`.

### 5. Asymmetric naming
**Was:** Mix of `posterBase` strings (`ariel_martin`, `toby_morris`, `kyra_bartley`), CSV column `Thumbnail`, and `dataset.thumbnail`.  
**Now:** Consistent `poster` / `video` / `client` / `title` in JSON; `dataset.poster` / `dataset.video` in DOM.

### 6. Dead / noisy code
**Was:** Commented-out bio handlers, many `console.log` calls, empty CSS rules for loading states.  
**Now:** Removed from clone (bio HTML/CSS left in place but inactive, same as live).

### 7. Environment config
**Was:** `COUSIN_ASSET_BASE` buried mid-script with staging comment.  
**Now:** Top of `js/config.js` with `COUSIN_PATH_PREFIX` for subfolder deploys.

## Intentionally unchanged (UX parity)

- All layout, grid, loader, cursor, nav animations
- Video player behaviour (hover overlay, director logo swap, fullscreen)
- S3 asset base URL
- Project label format: `Client 'Title'`
- Column guides (G key)

## Next phase: admin panel

The placeholder at `admin/index.html` will become:

1. **Login** — simple auth (session or token; no Sanity)
2. **Per-director editor** — list projects with client, title, video URL, poster URL
3. **Reorder** — drag-and-drop or up/down
4. **Save** — writes `data/directors.json` via a small backend (GitHub API, S3, or serverless function — TBD)

Saving cannot be pure static HTML (browsers can't write files). Options to decide:

| Approach | Pros | Cons |
|----------|------|------|
| GitHub API | No new infra; versioned | Needs PAT / GitHub App |
| AWS Lambda + S3 | Already on S3 | Small AWS setup |
| Netlify/Vercel serverless | Simple deploy | Another host piece |

Recommend starting with GitHub API since the site already deploys from `les-del/cousin-site`.

## Files not touched

- Root `index.html` (live site)
- `staging/`, `staging_2/`, `data/*.csv` (legacy)
- Any assets on S3
