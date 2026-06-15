(function () {
  var cfg = window.COUSIN_ADMIN_CONFIG;
  var TOKEN_KEY = 'cousinAdminToken';
  var isLocal =
    location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  var state = {
    data: null,
    activeDirectorId: null,
    dirty: false,
    hasUnpublishedDraft: false,
    saving: false,
    publishing: false,
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
  var publishBtn = document.getElementById('publish-btn');
  var previewBtn = document.getElementById('preview-btn');
  var logoutBtn = document.getElementById('logout-btn');
  var addProjectBtn = document.getElementById('add-project-btn');
  var directorIntro = document.getElementById('director-intro');
  var liveSiteBtn = document.getElementById('live-site-btn');
  var lastUpdatedEl = document.getElementById('last-updated');
  var previewWindow = null;

  function formatDate(iso) {
    if (!iso) return null;
    var d = new Date(iso + 'T12:00:00');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function getSiteUrl() {
    return new URL(cfg.sitePreviewUrl, location.href).href;
  }

  function getDraftPreviewUrl() {
    var base = getSiteUrl();
    return base + (base.indexOf('?') >= 0 ? '&' : '?') + 'preview=draft';
  }

  function stashPreviewData() {
    if (!state.data) return;
    sessionStorage.setItem('cousinPreviewDraft', JSON.stringify(state.data));
    var token = getToken();
    if (token) sessionStorage.setItem('cousinPreviewToken', token);
  }

  function setupLinks() {
    liveSiteBtn.href = getSiteUrl();
  }

  function updateLastUpdated() {
    if (!lastUpdatedEl) return;
    var liveDate = formatDate(state.liveUpdatedAt);
    var draftDate = formatDate(state.data && state.data.updatedAt);

    if (state.hasUnpublishedDraft && draftDate) {
      lastUpdatedEl.textContent =
        'Draft saved · ' + draftDate + (liveDate ? ' · Live site · ' + liveDate : '');
    } else if (liveDate) {
      lastUpdatedEl.textContent = 'Last published · ' + liveDate;
    } else {
      lastUpdatedEl.textContent = '';
    }
  }

  function openPreview() {
    stashPreviewData();
    var url = getDraftPreviewUrl() + '&r=' + Date.now();
    if (previewWindow && !previewWindow.closed) {
      previewWindow.location.href = url;
      previewWindow.focus();
    } else {
      previewWindow = window.open(url, 'cousin-preview');
    }
  }

  function refreshPreviewIfOpen() {
    if (previewWindow && !previewWindow.closed) {
      stashPreviewData();
      previewWindow.location.reload();
    }
  }

  function updateStatus() {
    if (state.dirty) {
      statusPill.textContent = 'Unsaved changes';
      statusPill.className = 'status-pill dirty';
    } else if (state.hasUnpublishedDraft) {
      statusPill.textContent = 'Draft saved — not published';
      statusPill.className = 'status-pill draft';
    } else {
      statusPill.textContent = 'Published';
      statusPill.className = 'status-pill published';
    }
    saveBtn.disabled = state.saving || state.publishing || !state.dirty;
    publishBtn.disabled =
      state.saving || state.publishing || state.dirty || !state.hasUnpublishedDraft;
    updateLastUpdated();
  }

  function markDirty() {
    state.dirty = true;
    updateStatus();
  }

  function markSavedDraft() {
    state.dirty = false;
    state.hasUnpublishedDraft = true;
    updateStatus();
  }

  function markPublished() {
    state.dirty = false;
    state.hasUnpublishedDraft = false;
    state.liveUpdatedAt =
      (state.data && (state.data.publishedAt || state.data.updatedAt)) || state.liveUpdatedAt;
    updateStatus();
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
    wrap.querySelectorAll('.poster-preview, .poster-hint').forEach(function (el) {
      el.remove();
    });
    wrap.classList.remove('is-uploading');

    var url = resolveAssetUrl(posterPath);
    var hint = document.createElement('span');
    hint.className = 'poster-hint';

    if (!url) {
      var empty = document.createElement('div');
      empty.className = 'poster-preview empty';
      empty.textContent = '+';
      hint.textContent = 'Upload';
      wrap.appendChild(empty);
      wrap.appendChild(hint);
      return;
    }

    var img = document.createElement('img');
    img.className = 'poster-preview';
    img.alt = 'Poster';
    img.src = url;
    hint.textContent = 'Replace';
    img.onerror = function () {
      img.replaceWith(
        Object.assign(document.createElement('div'), {
          className: 'poster-preview empty',
          textContent: '?',
        })
      );
      hint.textContent = 'Upload';
    };
    wrap.appendChild(img);
    wrap.appendChild(hint);
  }

  function setPosterUploading(card, uploading) {
    var wrap = card.querySelector('.poster-wrap');
    if (!wrap) return;
    wrap.classList.toggle('is-uploading', uploading);
    var hint = wrap.querySelector('.poster-hint');
    if (hint) hint.textContent = uploading ? 'Uploading…' : wrap.querySelector('img') ? 'Replace' : 'Upload';
  }

  async function handlePosterFile(card, director, project, file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Choose an image (JPG, PNG, or WebP)', true);
      return;
    }
    setPosterUploading(card, true);
    try {
      var result = await uploadPoster(file, director.id);
      project.poster = result.path;
      markDirty();
      updatePosterPreview(card, project.poster);
      showToast(result.warning || 'Poster uploaded', Boolean(result.warning));
    } catch (err) {
      setPosterUploading(card, false);
      showToast(err.message || 'Upload failed', true);
    }
  }

  function bindPosterUpload(card, director, project) {
    var fileInput = card.querySelector('.poster-file');
    var wrap = card.querySelector('.poster-wrap');

    function pickFile(e) {
      if (e) e.stopPropagation();
      if (dragState) return;
      fileInput.click();
    }

    wrap.addEventListener('click', pickFile);

    wrap.addEventListener('dragover', function (e) {
      e.preventDefault();
      wrap.classList.add('drop-hover');
    });
    wrap.addEventListener('dragleave', function () {
      wrap.classList.remove('drop-hover');
    });
    wrap.addEventListener('drop', function (e) {
      e.preventDefault();
      wrap.classList.remove('drop-hover');
      var file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handlePosterFile(card, director, project, file);
    });

    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (file) handlePosterFile(card, director, project, file);
    });
  }

  var dragState = null;

  function getPlaceholderTarget(y) {
    var siblings = Array.from(projectList.children).filter(function (el) {
      return el !== dragState.card && !el.classList.contains('drag-lift');
    });
    var closest = { offset: Number.NEGATIVE_INFINITY, element: null };
    siblings.forEach(function (child) {
      var box = child.getBoundingClientRect();
      var offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        closest = { offset: offset, element: child };
      }
    });
    return closest.element;
  }

  function movePlaceholder(y) {
    if (!dragState) return;
    var target = getPlaceholderTarget(y);
    if (target) {
      projectList.insertBefore(dragState.placeholder, target);
    } else {
      projectList.appendChild(dragState.placeholder);
    }
  }

  function finishDrag(e) {
    if (!dragState || (e && e.pointerId !== dragState.pointerId)) return;

    var director = getActiveDirector();
    var card = dragState.card;
    var placeholder = dragState.placeholder;
    var grip = dragState.grip;

    projectList.insertBefore(card, placeholder);
    placeholder.remove();

    card.classList.remove('drag-lift');
    card.style.position = '';
    card.style.left = '';
    card.style.top = '';
    card.style.width = '';
    card.style.zIndex = '';

    if (grip && grip.releasePointerCapture) {
      try {
        grip.releasePointerCapture(dragState.pointerId);
      } catch (err) {
        /* ignore */
      }
    }

    if (director) {
      var newOrder = Array.from(projectList.querySelectorAll('.project-card')).map(function (c) {
        return c._project;
      });
      var changed =
        newOrder.length !== director.projects.length ||
        newOrder.some(function (p, i) {
          return p !== director.projects[i];
        });
      if (changed) {
        director.projects = newOrder;
        markDirty();
        renderProjects();
      }
    }

    dragState = null;
    document.body.classList.remove('is-dragging');
  }

  function onDragPointerDown(e) {
    var grip = e.target.closest('.card-grip');
    if (!grip || !projectList.contains(grip)) return;

    var card = grip.closest('.project-card');
    if (!card || dragState) return;

    e.preventDefault();
    grip.setPointerCapture(e.pointerId);

    var rect = card.getBoundingClientRect();
    var placeholder = document.createElement('li');
    placeholder.className = 'project-card drag-placeholder';
    placeholder.style.height = rect.height + 'px';
    projectList.insertBefore(placeholder, card);

    card.classList.add('drag-lift');
    card.style.width = rect.width + 'px';
    card.style.position = 'fixed';
    card.style.left = rect.left + 'px';
    card.style.top = rect.top + 'px';
    card.style.zIndex = '1000';
    document.body.appendChild(card);

    dragState = {
      card: card,
      placeholder: placeholder,
      grip: grip,
      pointerId: e.pointerId,
      offsetY: e.clientY - rect.top,
    };
    document.body.classList.add('is-dragging');
  }

  function onDragPointerMove(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    dragState.card.style.top = e.clientY - dragState.offsetY + 'px';
    movePlaceholder(e.clientY);
  }

  function initRowDrag() {
    if (projectList._dragInit) return;
    projectList._dragInit = true;
    projectList.addEventListener('pointerdown', onDragPointerDown);
    document.addEventListener('pointermove', onDragPointerMove);
    document.addEventListener('pointerup', finishDrag);
    document.addEventListener('pointercancel', finishDrag);
  }

  function bindCard(card, director, index) {
    var project = director.projects[index];
    var fields = ['client', 'title', 'video'];

    fields.forEach(function (field) {
      var input = card.querySelector('[data-field="' + field + '"]');
      if (!input) return;
      input.addEventListener('input', function () {
        project[field] = input.value.trim();
        markDirty();
      });
    });

    card.querySelector('.delete-btn').addEventListener('click', function () {
      if (!confirm('Delete "' + projectLabel(project) + '"?')) return;
      director.projects.splice(index, 1);
      markDirty();
      renderProjects();
    });

    bindPosterUpload(card, director, project);
  }

  function renderProjects() {
    var director = getActiveDirector();
    if (!director) return;

    directorIntro.textContent =
      director.name +
      ' · ' +
      director.projects.length +
      ' projects · drag ⠿ to reorder · click poster to upload';

    projectList.innerHTML = '';

    director.projects.forEach(function (project, index) {
      var li = document.createElement('li');
      li.className = 'project-card';
      li._project = project;
      li.innerHTML =
        '<div class="card-grip" title="Drag to reorder">⠿</div>' +
        '<span class="card-num">' +
        (index + 1) +
        '</span>' +
        '<div class="poster-field">' +
        '<label>Poster</label>' +
        '<div class="poster-wrap" title="Click or drop an image from your computer">' +
        '<input type="file" class="poster-file hidden" accept="image/jpeg,image/png,image/webp,image/gif">' +
        '</div></div>' +
        '<div class="field field-client"><label>Client</label><input type="text" data-field="client" value="' +
        escapeAttr(project.client) +
        '" placeholder="Vodafone"></div>' +
        '<div class="field field-title"><label>Title</label><input type="text" data-field="title" value="' +
        escapeAttr(project.title) +
        '" placeholder="Double Coverage"></div>' +
        '<div class="field field-video"><label>Video URL</label><input type="text" data-field="video" value="' +
        escapeAttr(project.video) +
        '" placeholder="https://… or path"></div>' +
        '<button type="button" class="danger-ghost delete-btn" title="Delete">×</button>';

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
    var publishedRes = await fetch(cfg.publishedUrl + '?t=' + Date.now());
    if (!publishedRes.ok) throw new Error('Could not load director data');
    var published = await publishedRes.json();

    var draft = null;
    if (isLocal) {
      var draftRes = await fetch(cfg.draftUrl + '?t=' + Date.now());
      if (draftRes.ok) draft = await draftRes.json();
    } else {
      var draftRes = await apiFetch('/directors/draft', { method: 'GET' });
      if (draftRes.ok) draft = await draftRes.json();
    }

    state.data = draft || published;
    state.hasUnpublishedDraft =
      draft !== null && JSON.stringify(draft) !== JSON.stringify(published);
    state.liveUpdatedAt = published.publishedAt || published.updatedAt || null;

    if (!state.activeDirectorId && state.data.directors.length) {
      state.activeDirectorId = state.data.directors[0].id;
    }
    renderTabs();
    renderProjects();
    state.dirty = false;
    updateStatus();
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
      loginError.textContent = isLocal
        ? 'Cannot reach admin API. Run npm start in the editable folder.'
        : 'Cannot reach admin API. The CMS backend may still be starting — try again in a minute.';
    }
  });

  saveBtn.addEventListener('click', async function () {
    var errors = validateData();
    if (errors.length) {
      showToast(errors[0], true);
      return;
    }
    state.saving = true;
    updateStatus();
    saveBtn.textContent = 'Saving…';
    state.data.updatedAt = new Date().toISOString().slice(0, 10);
    try {
      var res = await apiFetch('/directors/draft', {
        method: 'PUT',
        body: JSON.stringify(state.data),
      });
      var body = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) throw new Error(body.error || 'Save failed');
      markSavedDraft();
      showToast('Draft saved');
      refreshPreviewIfOpen();
    } catch (err) {
      showToast(err.message || 'Save failed', true);
    } finally {
      state.saving = false;
      saveBtn.textContent = 'Save';
      updateStatus();
    }
  });

  publishBtn.addEventListener('click', async function () {
    if (state.dirty) {
      showToast('Save your draft first', true);
      return;
    }
    var errors = validateData();
    if (errors.length) {
      showToast(errors[0], true);
      return;
    }
    if (!confirm('Publish to the test site? This will update what visitors see.')) return;

    state.publishing = true;
    updateStatus();
    publishBtn.textContent = 'Publishing…';
    state.data.updatedAt = new Date().toISOString().slice(0, 10);
    try {
      var res = await apiFetch('/directors/publish', {
        method: 'POST',
        body: JSON.stringify(state.data),
      });
      var body = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) throw new Error(body.error || 'Publish failed');
      markPublished();
      var msg = body.pushedToGitHub ? 'Published to test site' : 'Published locally';
      showToast(msg);
      refreshPreviewIfOpen();
    } catch (err) {
      showToast(err.message || 'Publish failed', true);
    } finally {
      state.publishing = false;
      publishBtn.textContent = 'Publish';
      updateStatus();
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
    initRowDrag();
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
