(function () {
  var cfg = window.COUSIN_ADMIN_CONFIG;
  var TOKEN_KEY = 'cousinAdminToken';
  var isLocal =
    location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  var state = {
    data: null,
    activeDirectorId: null,
    dirty: false,
    saving: false,
    dragIndex: null,
  };

  var loginScreen = document.getElementById('login-screen');
  var editorScreen = document.getElementById('editor-screen');
  var loginForm = document.getElementById('login-form');
  var loginError = document.getElementById('login-error');
  var passwordInput = document.getElementById('password');
  var loadError = document.getElementById('load-error');
  var directorTabs = document.getElementById('director-tabs');
  var projectList = document.getElementById('project-list');
  var statusPill = document.getElementById('status-pill');
  var saveBtn = document.getElementById('save-btn');
  var previewBtn = document.getElementById('preview-btn');
  var logoutBtn = document.getElementById('logout-btn');
  var addProjectBtn = document.getElementById('add-project-btn');
  var directorIntro = document.getElementById('director-intro');
  var siteLink = document.getElementById('site-link');
  var previewWindow = null;

  function getSiteUrl() {
    return new URL(cfg.sitePreviewUrl, location.href).href;
  }

  function setupLinks() {
    siteLink.href = getSiteUrl();
  }

  function openPreview() {
    var url = getSiteUrl() + (getSiteUrl().indexOf('?') >= 0 ? '&' : '?') + 'r=' + Date.now();
    if (previewWindow && !previewWindow.closed) {
      previewWindow.location.href = url;
      previewWindow.focus();
    } else {
      previewWindow = window.open(url, 'cousin-preview');
    }
  }

  function refreshPreview() {
    if (previewWindow && !previewWindow.closed) {
      previewWindow.location.reload();
      previewWindow.focus();
    }
  }

  function resolveAssetUrl(path) {
    if (!path) return '';
    if (path.indexOf('http') === 0) return path;
    var base = (cfg.assetBase || '').replace(/\/$/, '');
    var encoded = path
      .replace(/^\//, '')
      .split('/')
      .map(function (seg) {
        return encodeURIComponent(seg);
      })
      .join('/');
    return base ? base + '/' + encoded : path;
  }

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  }

  function apiFetch(path, options) {
    options = options || {};
    var headers = Object.assign({}, options.headers || {});
    if (!options.skipJson) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }
    var token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch(cfg.apiBase + path, Object.assign({}, options, { headers: headers }));
  }

  async function uploadPoster(file, directorId) {
    var form = new FormData();
    form.append('file', file);
    form.append('directorId', directorId);
    var res = await apiFetch('/upload', { method: 'POST', body: form, skipJson: true });
    var body = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) throw new Error(body.error || 'Upload failed');
    return body;
  }

  function showToast(message, isError) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();
    var el = document.createElement('div');
    el.className = 'toast' + (isError ? ' error' : '');
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(function () {
      el.remove();
    }, 3200);
  }

  function setDirty(dirty) {
    state.dirty = dirty;
    statusPill.textContent = dirty ? 'Unsaved' : 'Saved';
    statusPill.className = 'status-pill' + (dirty ? ' dirty' : '');
    saveBtn.disabled = state.saving || !dirty;
  }

  function markDirty() {
    setDirty(true);
  }

  function getActiveDirector() {
    if (!state.data) return null;
    return state.data.directors.find(function (d) {
      return d.id === state.activeDirectorId;
    });
  }

  function projectLabel(project) {
    if (!project.client && !project.title) return 'New project';
    return (project.client || 'Client') + " '" + (project.title || 'Title') + "'";
  }

  function showEditor() {
    loginScreen.classList.add('hidden');
    editorScreen.classList.remove('hidden');
    if (!isLocal && cfg.requireAuth) logoutBtn.classList.remove('hidden');
  }

  function showLogin() {
    editorScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
  }

  function renderTabs() {
    directorTabs.innerHTML = '';
    state.data.directors.forEach(function (director) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'director-tab' + (director.id === state.activeDirectorId ? ' active' : '');
      btn.textContent = director.name;
      btn.addEventListener('click', function () {
        state.activeDirectorId = director.id;
        renderTabs();
        renderProjects();
      });
      directorTabs.appendChild(btn);
    });
  }

  function updatePosterPreview(card, posterPath) {
    if (!card) return;
    var wrap = card.querySelector('.poster-wrap');
    if (!wrap) return;
    var url = resolveAssetUrl(posterPath);
    wrap.innerHTML = '';
    if (!url) {
      var empty = document.createElement('div');
      empty.className = 'poster-preview empty';
      empty.textContent = '+';
      wrap.appendChild(empty);
      return;
    }
    var img = document.createElement('img');
    img.className = 'poster-preview';
    img.alt = '';
    img.src = url;
    img.onerror = function () {
      img.replaceWith(
        Object.assign(document.createElement('div'), {
          className: 'poster-preview empty',
          textContent: '?',
        })
      );
    };
    wrap.appendChild(img);
  }

  function moveProject(director, index, delta) {
    var target = index + delta;
    if (target < 0 || target >= director.projects.length) return;
    var item = director.projects.splice(index, 1)[0];
    director.projects.splice(target, 0, item);
    markDirty();
    renderProjects();
  }

  function setupCardDrag(card, director, index) {
    var grip = card.querySelector('.card-grip');
    grip.setAttribute('draggable', 'true');

    grip.addEventListener('dragstart', function (e) {
      state.dragIndex = index;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    });

    grip.addEventListener('dragend', function () {
      state.dragIndex = null;
      card.classList.remove('dragging');
      projectList.querySelectorAll('.project-card').forEach(function (c) {
        c.classList.remove('drag-over');
      });
    });

    card.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      card.classList.add('drag-over');
    });

    card.addEventListener('dragleave', function () {
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', function (e) {
      e.preventDefault();
      card.classList.remove('drag-over');
      var from = state.dragIndex;
      var to = index;
      if (from === null || from === to) return;
      var item = director.projects.splice(from, 1)[0];
      director.projects.splice(to, 0, item);
      markDirty();
      renderProjects();
    });
  }

  function bindCard(card, director, index) {
    var project = director.projects[index];
    var fields = ['client', 'title', 'video', 'poster'];

    fields.forEach(function (field) {
      var input = card.querySelector('[data-field="' + field + '"]');
      if (!input) return;
      input.addEventListener('input', function () {
        project[field] = input.value.trim();
        markDirty();
        if (field === 'poster') updatePosterPreview(card, project.poster);
      });
    });

    card.querySelector('.move-up-btn').addEventListener('click', function () {
      moveProject(director, index, -1);
    });
    card.querySelector('.move-down-btn').addEventListener('click', function () {
      moveProject(director, index, 1);
    });
    card.querySelector('.delete-btn').addEventListener('click', function () {
      if (!confirm('Delete "' + projectLabel(project) + '"?')) return;
      director.projects.splice(index, 1);
      markDirty();
      renderProjects();
    });

    var fileInput = card.querySelector('.poster-file');
    var uploadBtn = card.querySelector('.upload-poster-btn');
    var statusEl = card.querySelector('.upload-status');
    var posterInput = card.querySelector('[data-field="poster"]');
    var wrap = card.querySelector('.poster-wrap');

    function pickFile() {
      fileInput.click();
    }
    uploadBtn.addEventListener('click', pickFile);
    wrap.addEventListener('click', pickFile);

    fileInput.addEventListener('change', async function () {
      var file = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (!file || !file.type.startsWith('image/')) {
        showToast('Choose an image file', true);
        return;
      }
      uploadBtn.disabled = true;
      statusEl.textContent = 'Uploading…';
      try {
        var result = await uploadPoster(file, director.id);
        project.poster = result.path;
        posterInput.value = result.path;
        markDirty();
        updatePosterPreview(card, project.poster);
        statusEl.textContent = 'Done';
        showToast(result.warning || 'Poster uploaded', Boolean(result.warning));
      } catch (err) {
        statusEl.textContent = '';
        showToast(err.message || 'Upload failed', true);
      } finally {
        uploadBtn.disabled = false;
        setTimeout(function () {
          statusEl.textContent = '';
        }, 2500);
      }
    });

    setupCardDrag(card, director, index);
  }

  function renderProjects() {
    var director = getActiveDirector();
    if (!director) return;

    directorIntro.textContent =
      director.name +
      ' · ' +
      director.projects.length +
      ' projects · drag ⠿ or use ↑↓';

    projectList.innerHTML = '';
    var total = director.projects.length;

    director.projects.forEach(function (project, index) {
      var li = document.createElement('li');
      li.className = 'project-card';
      li.innerHTML =
        '<div class="card-grip" title="Drag to reorder">⠿</div>' +
        '<div class="card-body">' +
        '<div class="card-header">' +
        '<span class="card-num">' +
        (index + 1) +
        '</span>' +
        '<div class="poster-wrap"></div>' +
        '</div>' +
        '<div class="field-grid">' +
        '<div class="field"><label>Client</label><input type="text" data-field="client" value="' +
        escapeAttr(project.client) +
        '" placeholder="Vodafone"></div>' +
        '<div class="field"><label>Title</label><input type="text" data-field="title" value="' +
        escapeAttr(project.title) +
        '" placeholder="Double Coverage"></div>' +
        '<div class="field full"><label>Video URL</label><input type="text" data-field="video" value="' +
        escapeAttr(project.video) +
        '" placeholder="https://… or path"></div>' +
        '<div class="field full poster-row">' +
        '<div class="field"><label>Poster</label><input type="text" data-field="poster" value="' +
        escapeAttr(project.poster) +
        '" placeholder="path or URL"></div>' +
        '<input type="file" class="poster-file hidden" accept="image/jpeg,image/png,image/webp,image/gif">' +
        '<button type="button" class="secondary upload-poster-btn">Upload</button>' +
        '<span class="upload-status"></span>' +
        '</div>' +
        '</div></div>' +
        '<div class="card-actions">' +
        '<button type="button" class="move-up-btn" title="Move up"' +
        (index === 0 ? ' disabled' : '') +
        '>↑</button>' +
        '<button type="button" class="move-down-btn" title="Move down"' +
        (index === total - 1 ? ' disabled' : '') +
        '>↓</button>' +
        '<button type="button" class="danger-ghost delete-btn" title="Delete">×</button>' +
        '</div>';

      updatePosterPreview(li, project.poster);
      bindCard(li, director, index);
      projectList.appendChild(li);
    });
  }

  function escapeAttr(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function validateData() {
    var errors = [];
    state.data.directors.forEach(function (director) {
      director.projects.forEach(function (project, i) {
        var label = director.name + ' #' + (i + 1);
        if (!project.client || !project.title) errors.push(label + ': client & title required');
        if (!project.video) errors.push(label + ': video required');
        if (!project.poster) errors.push(label + ': poster required');
      });
    });
    return errors;
  }

  async function loadData() {
    var res = await fetch(cfg.dataUrl + '?t=' + Date.now());
    if (!res.ok) throw new Error('Could not load director data');
    state.data = await res.json();
    if (!state.activeDirectorId && state.data.directors.length) {
      state.activeDirectorId = state.data.directors[0].id;
    }
    renderTabs();
    renderProjects();
    setDirty(false);
  }

  async function tryRestoreSession() {
    var token = getToken();
    if (!token) return false;
    try {
      var res = await apiFetch('/session', { method: 'GET' });
      if (!res.ok) {
        setToken(null);
        return false;
      }
      return true;
    } catch {
      setToken(null);
      return false;
    }
  }

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    loginError.textContent = '';
    try {
      var res = await fetch(cfg.apiBase + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput.value }),
      });
      var body = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) {
        loginError.textContent = body.error || 'Wrong password';
        return;
      }
      setToken(body.token);
      passwordInput.value = '';
      await loadData();
      showEditor();
    } catch {
      loginError.textContent = 'Cannot reach admin API. Is the server running?';
    }
  });

  saveBtn.addEventListener('click', async function () {
    var errors = validateData();
    if (errors.length) {
      showToast(errors[0], true);
      return;
    }
    state.saving = true;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    state.data.updatedAt = new Date().toISOString().slice(0, 10);
    try {
      var res = await apiFetch('/directors', {
        method: 'PUT',
        body: JSON.stringify(state.data),
      });
      var body = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) throw new Error(body.error || 'Save failed');
      setDirty(false);
      showToast(body.pushedToGitHub ? 'Saved & live on GitHub' : 'Saved');
      refreshPreview();
    } catch (err) {
      showToast(err.message || 'Save failed', true);
    } finally {
      state.saving = false;
      saveBtn.textContent = 'Save';
      saveBtn.disabled = !state.dirty;
    }
  });

  logoutBtn.addEventListener('click', function () {
    if (state.dirty && !confirm('Unsaved changes — sign out anyway?')) return;
    apiFetch('/logout', { method: 'POST' }).catch(function () {});
    setToken(null);
    showLogin();
  });

  previewBtn.addEventListener('click', openPreview);

  addProjectBtn.addEventListener('click', function () {
    var director = getActiveDirector();
    if (!director) return;
    director.projects.push({ client: '', title: '', poster: '', video: '' });
    markDirty();
    renderProjects();
    var last = projectList.querySelector('.project-card:last-child input[data-field="client"]');
    if (last) last.focus();
  });

  window.addEventListener('beforeunload', function (e) {
    if (state.dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  async function init() {
    setupLinks();
    var needAuth = cfg.requireAuth && !isLocal;

    if (needAuth) {
      var sessionOk = await tryRestoreSession();
      if (!sessionOk) {
        showLogin();
        return;
      }
    }

    try {
      await loadData();
      showEditor();
    } catch (err) {
      if (loadError) {
        loadError.classList.remove('hidden');
        loadError.textContent = err.message;
      }
    }
  }

  init();
})();
