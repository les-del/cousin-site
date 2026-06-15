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

function loadDirectorData() {
  return fetch('data/directors.json?t=' + Date.now())
    .then(function (res) {
      if (!res.ok) throw new Error('Failed to load directors.json');
      return res.json();
    })
    .then(function (data) {
      data.directors.forEach(function (entry) {
        const director = window.COUSIN_DIRECTORS.find(function (d) {
          return d.id === entry.id;
        });
        if (!director) return;
        renderDirectorProjects(director, entry.projects || []);
      });
    });
}
