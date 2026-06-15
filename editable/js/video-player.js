var directorHoverSuspendState = { active: false, wasPlaying: false };
var hoverDelayActive = false;

function preloadVideo(videoSrc) {
  const tempVideo = document.createElement('video');
  tempVideo.preload = 'metadata';
  tempVideo.src = videoSrc;
  tempVideo.style.display = 'none';
  document.body.appendChild(tempVideo);
  function cleanup() {
    if (tempVideo.parentNode) document.body.removeChild(tempVideo);
  }
  tempVideo.addEventListener('loadedmetadata', cleanup);
  tempVideo.addEventListener('error', cleanup);
}

function showVideoHoverOverlay(posterSrc) {
  const overlay = document.querySelector('.video-hover-overlay');
  const img = overlay.querySelector('.video-hover-overlay-media-video');
  const mainPlayer = document.querySelector('.director-portfolio-lightbox-media-video');

  if (mainPlayer && !mainPlayer.paused) {
    mainPlayer.pause();
    mainPlayer.setAttribute('data-was-playing', 'true');
  } else if (mainPlayer) {
    mainPlayer.setAttribute('data-was-playing', 'false');
  }

  const player = document.querySelector('.director-portfolio-lightbox');
  player.setAttribute('data-active', '0');
  player.style.display = 'none';

  const playbar = document.querySelector('.director-portfolio-lightbox-media-playbar');
  const controls = document.querySelector('.director-portfolio-lightbox-video-controls');
  if (playbar) playbar.classList.remove('show');
  if (controls) controls.classList.remove('show');

  img.src = posterSrc;
  overlay.style.removeProperty('display');
  overlay.style.removeProperty('visibility');
  overlay.style.removeProperty('z-index');
  overlay.setAttribute('data-active', '1');
}

function hideVideoHoverOverlay() {
  const overlay = document.querySelector('.video-hover-overlay');
  const img = overlay.querySelector('.video-hover-overlay-media-video');
  const player = document.querySelector('.director-portfolio-lightbox');
  const mainPlayer = document.querySelector('.director-portfolio-lightbox-media-video');

  if (img) img.src = '';
  overlay.setAttribute('data-active', '0');
  overlay.style.opacity = '1';
  overlay.style.setProperty('display', 'none', 'important');
  overlay.style.setProperty('visibility', 'hidden', 'important');
  overlay.style.setProperty('z-index', '-1', 'important');

  if (mainPlayer && mainPlayer.getAttribute('data-was-playing') === 'true') {
    player.setAttribute('data-active', '1');
    player.style.display = 'flex';

    const playbar = document.querySelector('.director-portfolio-lightbox-media-playbar');
    const controls = document.querySelector('.director-portfolio-lightbox-video-controls');
    if (playbar) {
      playbar.classList.add('show');
      playbar.style.display = '';
    }
    if (controls) {
      controls.classList.add('show');
      controls.style.display = '';
    }
    mainPlayer.play();
  }
}

function openVideoPlayer(videoSrc, posterSrc) {
  const player = document.querySelector('.director-portfolio-lightbox');
  const videoSource = player.querySelector('.director-portfolio-lightbox-media-video source');
  const videoElement = player.querySelector('.director-portfolio-lightbox-media-video');

  if (posterSrc) videoElement.poster = posterSrc;

  player.setAttribute('data-active', '1');
  player.style.setProperty('display', 'flex', 'important');
  player.style.setProperty('visibility', 'visible', 'important');
  player.style.setProperty('opacity', '1', 'important');
  player.style.setProperty('z-index', '1700', 'important');

  hideVideoHoverOverlay();

  videoSource.src = videoSrc;
  videoElement.src = videoSrc;
  videoElement.preload = 'auto';
  videoElement.currentTime = 0;

  const playbar = document.querySelector('.director-portfolio-lightbox-media-playbar');
  const controls = document.querySelector('.director-portfolio-lightbox-video-controls');
  if (playbar) {
    playbar.style.display = '';
    playbar.classList.add('show');
  }
  if (controls) {
    controls.style.display = '';
    controls.classList.add('show');
  }

  videoElement.addEventListener(
    'loadeddata',
    function onVideoLoaded() {
      videoElement.poster = '';
      videoElement.play();
      updateTimeDisplay();

      const progressBar = document.querySelector('.director-portfolio-lightbox-media-playbar-meter-progress');
      if (progressBar) progressBar.style.width = '0%';

      const playBtn = document.querySelector('.director-portfolio-lightbox-controls-play');
      const pauseBtn = document.querySelector('.director-portfolio-lightbox-controls-pause');
      playBtn.setAttribute('data-active', '0');
      pauseBtn.setAttribute('data-active', '1');
    },
    { once: true }
  );

  videoElement.load();
}

function closeVideoPlayer() {
  const player = document.querySelector('.director-portfolio-lightbox');
  const video = player.querySelector('.director-portfolio-lightbox-media-video');
  const playbar = document.querySelector('.director-portfolio-lightbox-media-playbar');
  const controls = document.querySelector('.director-portfolio-lightbox-video-controls');

  if (video) {
    video.pause();
    video.currentTime = 0;
    video.src = '';
    video.load();
  }

  player.setAttribute('data-active', '0');
  player.style.setProperty('display', 'none', 'important');
  player.style.setProperty('visibility', 'hidden', 'important');
  player.style.setProperty('opacity', '0', 'important');
  player.style.setProperty('z-index', '-1', 'important');

  if (playbar) playbar.classList.remove('show');
  if (controls) controls.classList.remove('show');

  const playBtn = document.querySelector('.director-portfolio-lightbox-controls-play');
  const pauseBtn = document.querySelector('.director-portfolio-lightbox-controls-pause');
  if (playBtn) playBtn.setAttribute('data-active', '1');
  if (pauseBtn) pauseBtn.setAttribute('data-active', '0');
}

function closeVideoAndReset() {
  directorHoverSuspendState.active = false;
  closeVideoPlayer();
  hideVideoHoverOverlay();
}

function suspendVideoForDirectorHover() {
  const player = document.querySelector('.director-portfolio-lightbox');
  const video = player ? player.querySelector('.director-portfolio-lightbox-media-video') : null;
  if (!player || player.getAttribute('data-active') !== '1' || !video || !video.src) return;

  directorHoverSuspendState.wasPlaying = !video.paused;
  directorHoverSuspendState.active = true;
  video.pause();
  player.setAttribute('data-active', '0');
  player.style.setProperty('display', 'none', 'important');
  player.style.setProperty('visibility', 'hidden', 'important');
  player.style.setProperty('opacity', '0', 'important');
  player.style.setProperty('z-index', '-1', 'important');

  const playbar = document.querySelector('.director-portfolio-lightbox-media-playbar');
  const controls = document.querySelector('.director-portfolio-lightbox-video-controls');
  if (playbar) playbar.classList.remove('show');
  if (controls) controls.classList.remove('show');

  const overlay = document.querySelector('.video-hover-overlay');
  if (overlay) {
    const img = overlay.querySelector('.video-hover-overlay-media-video');
    if (img) img.src = '';
    overlay.setAttribute('data-active', '0');
  }
}

function resumeVideoAfterDirectorHover() {
  if (!directorHoverSuspendState.active) return;

  const player = document.querySelector('.director-portfolio-lightbox');
  const video = player ? player.querySelector('.director-portfolio-lightbox-media-video') : null;
  if (!player || !video) {
    directorHoverSuspendState.active = false;
    return;
  }

  player.setAttribute('data-active', '1');
  player.style.setProperty('display', 'flex', 'important');
  player.style.setProperty('visibility', 'visible', 'important');
  player.style.setProperty('opacity', '1', 'important');
  player.style.setProperty('z-index', '1700', 'important');

  const playbar = document.querySelector('.director-portfolio-lightbox-media-playbar');
  const controls = document.querySelector('.director-portfolio-lightbox-video-controls');
  if (playbar) {
    playbar.classList.add('show');
    playbar.style.display = '';
  }
  if (controls) {
    controls.classList.add('show');
    controls.style.display = '';
  }
  if (directorHoverSuspendState.wasPlaying) video.play();
  directorHoverSuspendState.active = false;
  directorHoverSuspendState.wasPlaying = false;
}

function toggleFullscreen() {
  const video = document.querySelector('.director-portfolio-lightbox-media-video');
  if (video.webkitEnterFullscreen) {
    video.webkitEnterFullscreen();
  } else if (!document.fullscreenElement) {
    if (video.requestFullscreen) video.requestFullscreen();
    else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
    else if (video.mozRequestFullScreen) video.mozRequestFullScreen();
    else if (video.msRequestFullscreen) video.msRequestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
  }
}

function toggleVideo() {
  const video = document.querySelector('.director-portfolio-lightbox-media-video');
  if (video.paused) playVideo();
  else pauseVideo();
}

function playVideo() {
  const video = document.querySelector('.director-portfolio-lightbox-media-video');
  const playBtn = document.querySelector('.director-portfolio-lightbox-controls-play');
  const pauseBtn = document.querySelector('.director-portfolio-lightbox-controls-pause');
  video.play();
  playBtn.setAttribute('data-active', '0');
  pauseBtn.setAttribute('data-active', '1');
}

function pauseVideo() {
  const video = document.querySelector('.director-portfolio-lightbox-media-video');
  const playBtn = document.querySelector('.director-portfolio-lightbox-controls-play');
  const pauseBtn = document.querySelector('.director-portfolio-lightbox-controls-pause');
  video.pause();
  playBtn.setAttribute('data-active', '1');
  pauseBtn.setAttribute('data-active', '0');
}

function setProgress(event) {
  const video = document.querySelector('.director-portfolio-lightbox-media-video');
  const rect = event.currentTarget.getBoundingClientRect();
  const percentage = (event.clientX - rect.left) / rect.width;
  video.currentTime = percentage * video.duration;
}

function updateTimeDisplay() {
  const video = document.querySelector('.director-portfolio-lightbox-media-video');
  const currentTimeEl = document.querySelector('.director-portfolio-lightbox-controls-time-current');
  const totalTimeEl = document.querySelector('.director-portfolio-lightbox-controls-time-total');
  const progressBar = document.querySelector('.director-portfolio-lightbox-media-playbar-meter-progress');

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
  }

  if (video.duration) totalTimeEl.textContent = formatTime(video.duration);

  function updateTime() {
    currentTimeEl.textContent = formatTime(video.currentTime);
    if (video.duration) {
      progressBar.style.width = (video.currentTime / video.duration) * 100 + '%';
    }
  }

  video.addEventListener('timeupdate', updateTime);
  updateTime();
}

function updateButtonStates() {
  const video = document.querySelector('.director-portfolio-lightbox-media-video');
  const playBtn = document.querySelector('.director-portfolio-lightbox-controls-play');
  const pauseBtn = document.querySelector('.director-portfolio-lightbox-controls-pause');
  if (video.paused) {
    playBtn.setAttribute('data-active', '1');
    pauseBtn.setAttribute('data-active', '0');
  } else {
    playBtn.setAttribute('data-active', '0');
    pauseBtn.setAttribute('data-active', '1');
  }
}
