# Cousin website

- **Live site:** [cousin.site](https://www.cousin.site)
- **Staging:** [cousin.site/staging](https://www.cousin.site/staging) — password-protected; three directors (Ariel, Kyra, Toby), assets from S3.

Staging uses `staging/index.html` and `staging/data/*.csv`. Media (videos/posters) are loaded from the S3 bucket when `COUSIN_ASSET_BASE` is set in that page.

## Publishing staging

The staging site is served from the **live** repo when deployed. To put the staging link online (or update it):

1. Commit your changes in this repo.
2. Push the `staging/` folder and any updated assets to the live repo:
   ```bash
   git push live main
   ```
   (Or push a branch that the live host deploys from.)

The live remote is `les-del/cousin-site`. After the deploy, [cousin.site/staging](https://www.cousin.site/staging) will reflect your latest staging build.
