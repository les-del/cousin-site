(function () {
  var host = location.hostname;
  var isLocal = host === 'localhost' || host === '127.0.0.1';
  var isNetlify = host.endsWith('.netlify.app');

  // After first Netlify deploy, your site will be e.g. cousin-cms.netlify.app
  // Update this if you rename the site on Netlify:
  var netlifySite = 'https://cousin-cms.netlify.app';

  window.COUSIN_ADMIN_CONFIG = {
    draftUrl: '../data/directors.draft.json',
    publishedUrl: '../data/directors.json',
    apiBase: isLocal || isNetlify ? '/api' : netlifySite + '/api',
    assetBase: 'https://cousin-productions.s3.ap-southeast-2.amazonaws.com',
    sitePreviewUrl: '../index.html',
    requireAuth: true,
  };
})();
