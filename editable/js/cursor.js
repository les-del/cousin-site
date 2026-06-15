(function initCustomCursor() {
  const customCursor = document.querySelector('.custom-cursor');
  if (!customCursor) return;

  const interactiveSelectors =
    '.nav-toggle, .project-item, a, .director-portfolio-lightbox-media-playbar, .director-portfolio-lightbox-controls-play, .director-portfolio-lightbox-controls-pause, .director-portfolio-lightbox-video-controls-right';

  document.addEventListener('mousemove', function (e) {
    customCursor.style.left = e.clientX + 'px';
    customCursor.style.top = e.clientY + 'px';
  });

  document.addEventListener('mouseover', function (e) {
    if (e.target.matches(interactiveSelectors) || e.target.closest(interactiveSelectors)) {
      customCursor.classList.add('active');
    }
  });

  document.addEventListener('mouseout', function (e) {
    if (e.target.matches(interactiveSelectors) || e.target.closest(interactiveSelectors)) {
      customCursor.classList.remove('active');
    }
  });

  document.addEventListener('mouseleave', function () {
    customCursor.classList.remove('visible');
  });

  document.addEventListener('mouseenter', function () {
    if (!document.getElementById('site-loader').classList.contains('hidden')) return;
    customCursor.classList.add('visible');
  });
})();
