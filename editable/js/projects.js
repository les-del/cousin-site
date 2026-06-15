function createProjectElement(project, index) {
  const li = document.createElement('li');
  li.className = 'project-item';
  li.textContent = project.client + " '" + project.title + "'";
  li.dataset.poster = assetUrl(project.poster);
  li.dataset.video = assetUrl(project.video);
  li.dataset.index = String(index);

  li.addEventListener('mouseenter', function (e) {
    e.stopPropagation();
    if (hoverDelayActive) return;
    const videoSrc = li.dataset.video;
    const posterSrc = li.dataset.poster;
    if (videoSrc) {
      preloadVideo(videoSrc);
      showVideoHoverOverlay(posterSrc);
    }
  });

  li.addEventListener('mouseleave', function (e) {
    e.stopPropagation();
    hideVideoHoverOverlay();
  });

  li.addEventListener('click', function (e) {
    e.stopPropagation();
    const videoSrc = li.dataset.video;
    const posterSrc = li.dataset.poster;
    if (videoSrc) {
      openVideoPlayer(videoSrc, posterSrc);
      hoverDelayActive = true;
    }
  });

  return li;
}

function renderDirectorProjects(director, projects) {
  const container = document.getElementById(director.projectsContainerId);
  if (!container) return;

  container.innerHTML = '';
  projects.forEach(function (project, index) {
    container.appendChild(createProjectElement(project, index));
  });

  container.addEventListener('mouseleave', function () {
    if (hoverDelayActive) hoverDelayActive = false;
  });
}

function renderDirectorData(data) {
  data.directors.forEach(function (entry) {
    const director = window.COUSIN_DIRECTORS.find(function (d) {
      return d.id === entry.id;
    });
    if (!director) return;
    renderDirectorProjects(director, entry.projects || []);
  });
}

function isDraftPreview() {
  return new URLSearchParams(window.location.search).get('preview') === 'draft';
}

function loadDraftFromSession() {
  const raw = sessionStorage.getItem('cousinPreviewDraft');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function fetchPublishedData() {
  return fetch('data/directors.json?t=' + Date.now()).then(function (res) {
    if (!res.ok) throw new Error('Failed to load directors.json');
    return res.json();
  });
}

function fetchSavedDraftData() {
  return fetch('data/directors.draft.json?t=' + Date.now())
    .then(function (res) {
      if (res.ok) return res.json();
      const token = sessionStorage.getItem('cousinPreviewToken');
      const apiBase = window.COUSIN_API_BASE;
      if (!token || !apiBase) return null;
      return fetch(apiBase + '/directors/draft', {
        headers: { Authorization: 'Bearer ' + token },
      }).then(function (apiRes) {
        if (!apiRes.ok) return null;
        return apiRes.json();
      });
    });
}

function showDraftPreviewBanner() {
  if (document.getElementById('cousin-draft-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'cousin-draft-banner';
  banner.className = 'cousin-draft-banner';
  banner.textContent = 'Draft preview — not published yet';
  document.body.appendChild(banner);
}

function loadDirectorData() {
  if (!isDraftPreview()) {
    return fetchPublishedData().then(renderDirectorData);
  }

  showDraftPreviewBanner();

  const sessionData = loadDraftFromSession();
  if (sessionData) {
    return Promise.resolve(sessionData).then(renderDirectorData);
  }

  return fetchSavedDraftData()
    .then(function (draft) {
      if (draft) return draft;
      return fetchPublishedData();
    })
    .then(renderDirectorData);
}
