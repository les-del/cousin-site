(function initSiteLoader() {
  const siteLoaderOverlay = document.getElementById('site-loader');
  const hasVisited = localStorage.getItem('cousinSiteVisited');
  const speedMultiplier = hasVisited ? 0.5 : 1;
  const targetPercentage = 100;
  const loaderElement = document.getElementById('loader');
  const availablePercentages = [0, 6, 13, 20, 27, 35, 42, 49, 56, 63, 71, 78, 85, 93, 100];
  let currentIndex = 0;

  function displayPercentage(percentage) {
    loaderElement.innerHTML = '';
    const img = document.createElement('img');
    const alt2Path = assetUrl('assets/loader/alt_2/' + percentage + '.png');
    const fallbackPath = assetUrl('assets/loader/alt_2/0.png');
    img.src = alt2Path;
    img.alt = percentage + '%';
    img.className = 'loader-digit';
    img.onerror = function () {
      this.src = fallbackPath;
    };
    loaderElement.appendChild(img);
  }

  function finishLoader() {
    const finalDelay = hasVisited ? 400 : 800;
    setTimeout(function () {
      siteLoaderOverlay.classList.add('hidden');
      localStorage.setItem('cousinSiteVisited', 'true');
      const customCursor = document.querySelector('.custom-cursor');
      if (customCursor) customCursor.classList.add('visible');
    }, finalDelay);
  }

  function animateLoader() {
    if (currentIndex >= availablePercentages.length) return;

    const currentPercentage = availablePercentages[currentIndex];
    displayPercentage(currentPercentage);
    currentIndex++;

    if (currentPercentage >= targetPercentage) {
      finishLoader();
      return;
    }

    let minDelay;
    let maxDelay;
    if (currentPercentage < 20) {
      minDelay = 300;
      maxDelay = 700;
    } else if (currentPercentage >= 28 && currentPercentage < 98) {
      minDelay = 50;
      maxDelay = 150;
    } else {
      minDelay = 100;
      maxDelay = 300;
    }

    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay) * speedMultiplier;
    setTimeout(animateLoader, delay);
  }

  const imagesToPreload = availablePercentages.map(function (p) {
    return assetUrl('assets/loader/alt_2/' + p + '.png');
  });
  let loadedCount = 0;

  function startWhenReady() {
    const initialDelay = hasVisited ? 250 : 500;
    setTimeout(animateLoader, initialDelay);
  }

  imagesToPreload.forEach(function (src) {
    const img = new Image();
    img.onload = img.onerror = function () {
      loadedCount++;
      if (loadedCount === imagesToPreload.length) startWhenReady();
    };
    img.src = src;
  });
})();
