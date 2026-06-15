/**
 * Site configuration — edit here for environment / path changes.
 * Live site at cousin.site/ is untouched; this copy lives under /editable/.
 */
window.COUSIN_ASSET_BASE = 'https://cousin-productions.s3.ap-southeast-2.amazonaws.com';

// Prefix for same-origin assets when served from a subfolder (e.g. /editable/)
window.COUSIN_PATH_PREFIX = '../';

var _cousinHost = window.location.hostname;
window.COUSIN_API_BASE =
  _cousinHost === 'localhost' || _cousinHost === '127.0.0.1'
    ? '/api'
    : 'https://cousin-editable-api.onrender.com/api';

// Director metadata — nav DOM ids must match index.html
window.COUSIN_DIRECTORS = [
  {
    id: 'ariel_martin',
    navId: 'ariel',
    name: 'Ariel Martin',
    logo: 'directors/ariel_martin/Ariel.png',
    projectsContainerId: 'ariel-projects',
    toggleId: 'ariel-toggle',
  },
  {
    id: 'kyra_bartley',
    navId: 'kyra',
    name: 'Kyra Bartley',
    logo: 'directors/kyra_bartley/Kyra.png',
    projectsContainerId: 'kyra-projects',
    toggleId: 'kyra-toggle',
  },
  {
    id: 'toby_morris',
    navId: 'toby',
    name: 'Toby Morris',
    logo: 'directors/toby_morris/Toby.png',
    projectsContainerId: 'toby-projects',
    toggleId: 'toby-toggle',
  },
];
