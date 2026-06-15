function sitePath(path) {
  if (!path) return path;
  if (path.indexOf('http') === 0) return path;
  const prefix = (window.COUSIN_PATH_PREFIX || '').replace(/\/?$/, '/');
  return prefix + path.replace(/^\//, '');
}

function assetUrl(path) {
  if (!path) return path;
  if (path.indexOf('http') === 0) return path;
  const base = (window.COUSIN_ASSET_BASE || '').replace(/\/$/, '');
  if (!base) return sitePath(path);
  const encodedPath = path
    .replace(/^\//, '')
    .split('/')
    .map(function (seg) {
      return encodeURIComponent(seg);
    })
    .join('/');
  return base + '/' + encodedPath;
}

function rewriteStaticAssetUrls() {
  const base = (window.COUSIN_ASSET_BASE || '').replace(/\/$/, '');
  if (!base) return;

  document
    .querySelectorAll(
      'link[href^="assets/"], link[href^="../assets/"], link[href^="directors/"], img[src^="assets/"], img[src^="../assets/"], img[src^="directors/"]'
    )
    .forEach(function (el) {
      const attr = el.hasAttribute('src') ? 'src' : 'href';
      const val = el.getAttribute(attr);
      if (!val || val.indexOf('http') === 0) return;
      const key = val.replace(/^\.\.\//, '');
      el.setAttribute(attr, base + '/' + key);
    });

  const cursor = document.querySelector('.custom-cursor');
  if (cursor) {
    cursor.style.backgroundImage = 'url(' + base + '/assets/images/C_1.png)';
    cursor.setAttribute('data-cursor-active-url', base + '/assets/images/C_2.png');
  }

  const style = document.createElement('style');
  style.textContent =
    '.custom-cursor.active { background-image: url(' + base + '/assets/images/C_2.png) !important; }';
  document.head.appendChild(style);
}

rewriteStaticAssetUrls();
