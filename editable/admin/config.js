(function () {
  var isLocal =
    location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  // When live: set apiBase to your Render/Railway URL after deploying editable/server
  var productionApi = 'https://cousin-editable-api.onrender.com/api';

  window.COUSIN_ADMIN_CONFIG = {
    draftUrl: '../data/directors.draft.json',
    publishedUrl: '../data/directors.json',
    apiBase: isLocal ? '/api' : productionApi,
    assetBase: 'https://cousin-productions.s3.ap-southeast-2.amazonaws.com',
    sitePreviewUrl: '../index.html',
    requireAuth: true,
  };
})();
