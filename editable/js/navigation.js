function getDirectorByNavId(navId) {
  return window.COUSIN_DIRECTORS.find(function (d) {
    return d.navId === navId;
  });
}

function getAllProjectContainers() {
  return window.COUSIN_DIRECTORS.map(function (d) {
    return document.getElementById(d.projectsContainerId);
  });
}

function closeAllDirectorProjects() {
  getAllProjectContainers().forEach(function (el) {
    if (el) el.classList.remove('open');
  });
}

function getOpenDirector() {
  return window.COUSIN_DIRECTORS.find(function (d) {
    const el = document.getElementById(d.projectsContainerId);
    return el && el.classList.contains('open');
  });
}

function setDirectorTogglePointerEvents(enabled) {
  window.COUSIN_DIRECTORS.forEach(function (d) {
    const toggle = document.getElementById(d.toggleId);
    if (toggle) toggle.style.pointerEvents = enabled ? 'auto' : 'none';
  });
}

function updateLogo() {
  const logo = document.querySelector('.logo');
  const contactContent = document.getElementById('contact-content');
  const isMobile = window.innerWidth <= 768;
  const openDirector = getOpenDirector();

  if (contactContent.classList.contains('open')) {
    logo.src = isMobile
      ? assetUrl('assets/images/logos/CousinMed.png')
      : assetUrl('assets/images/logos/cousin_logo_HiRes_2.png');
    logo.classList.add('hidden');
    logo.style.setProperty('visibility', 'hidden', 'important');
    logo.style.setProperty('opacity', '0', 'important');
  } else if (openDirector) {
    logo.src = assetUrl(openDirector.logo);
    logo.classList.remove('hidden');
    logo.style.removeProperty('visibility');
    logo.style.removeProperty('opacity');
  } else {
    logo.src = isMobile
      ? assetUrl('assets/images/logos/CousinMed.png')
      : assetUrl('assets/images/logos/cousin_logo_HiRes_2.png');
    logo.classList.remove('hidden');
    logo.style.removeProperty('visibility');
    logo.style.removeProperty('opacity');
  }
}

function closeMainSectionsExcept(keepId) {
  const sectionIds = ['about-content', 'directors-content', 'contact-content'];
  sectionIds.forEach(function (id) {
    if (id !== keepId) document.getElementById(id).classList.remove('open');
  });
}

function initNavigation() {
  const aboutToggle = document.getElementById('about-toggle');
  const directorsToggle = document.getElementById('directors-toggle');
  const contactToggle = document.getElementById('contact-toggle');
  const contactImageOverlay = document.getElementById('contact-image-overlay');

  aboutToggle.addEventListener('click', function () {
    closeVideoAndReset();
    closeMainSectionsExcept('about-content');
    closeAllDirectorProjects();
    contactImageOverlay.classList.remove('show');
    document.getElementById('about-content').classList.toggle('open');
    setTimeout(updateLogo, 10);
  });

  directorsToggle.addEventListener('click', function () {
    const content = document.getElementById('directors-content');
    closeVideoAndReset();
    closeMainSectionsExcept('directors-content');
    contactImageOverlay.classList.remove('show');
    content.classList.toggle('open');

    if (content.classList.contains('open')) {
      hoverDelayActive = true;
      setDirectorTogglePointerEvents(false);
      setTimeout(function () {
        hoverDelayActive = false;
        setDirectorTogglePointerEvents(true);
      }, 500);
    } else {
      closeAllDirectorProjects();
    }

    setTimeout(updateLogo, 10);
  });

  contactToggle.addEventListener('click', function () {
    const content = document.getElementById('contact-content');
    closeVideoAndReset();
    closeMainSectionsExcept('contact-content');
    closeAllDirectorProjects();
    content.classList.toggle('open');

    if (content.classList.contains('open')) contactImageOverlay.classList.add('show');
    else contactImageOverlay.classList.remove('show');

    updateLogo();
    setTimeout(updateLogo, 10);
  });

  window.COUSIN_DIRECTORS.forEach(function (director) {
    const toggle = document.getElementById(director.toggleId);
    const container = document.getElementById(director.projectsContainerId);
    const otherContainers = window.COUSIN_DIRECTORS.filter(function (d) {
      return d.id !== director.id;
    }).map(function (d) {
      return document.getElementById(d.projectsContainerId);
    });

    toggle.addEventListener('click', function () {
      closeVideoAndReset();
      if (!container.classList.contains('open')) {
        otherContainers.forEach(function (el) {
          if (el) el.classList.remove('open');
        });
      }
      container.classList.toggle('open');
      updateLogo();
      if (container.classList.contains('open')) {
        setDirectorTogglePointerEvents(false);
        setTimeout(function () {
          setDirectorTogglePointerEvents(true);
        }, 500);
      }
    });

    toggle.addEventListener('mouseenter', function (e) {
      const directorsContent = document.getElementById('directors-content');
      const logo = document.querySelector('.logo');
      if (!directorsContent.classList.contains('open')) return;
      if (director.navId !== 'ariel') e.stopPropagation();
      suspendVideoForDirectorHover();
      if (!container.classList.contains('open') && logo) {
        logo.src = assetUrl(director.logo);
        logo.classList.remove('hidden');
        logo.style.opacity = '1';
      }
    });

    toggle.addEventListener('mouseleave', function (e) {
      if (director.navId !== 'ariel') e.stopPropagation();
      resumeVideoAfterDirectorHover();
      if (!container.classList.contains('open')) updateLogo();
    });
  });
}
