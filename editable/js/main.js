document.addEventListener('DOMContentLoaded', function () {
  initNavigation();
  loadDirectorData().catch(function (err) {
    console.error('Could not load director projects:', err);
  });

  updateLogo();

  const video = document.querySelector('.director-portfolio-lightbox-media-video');
  video.addEventListener('play', updateButtonStates);
  video.addEventListener('pause', updateButtonStates);
  video.addEventListener('ended', function () {
    updateButtonStates();
    closeVideoPlayer();
  });

  document.addEventListener('dragstart', function (e) {
    if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
      e.preventDefault();
    }
  });

  document.addEventListener('selectstart', function (e) {
    e.preventDefault();
  });

  window.addEventListener('resize', updateLogo);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'g' || e.key === 'G') {
      document.getElementById('column-guides').classList.toggle('hidden');
    }
  });
});
