// PWA install prompt and service worker update detection

let deferredPrompt = null;

export function initPWA() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    const visits = parseInt(localStorage.getItem('uno_visits') || '0', 10);
    if (visits >= 3) return;
    localStorage.setItem('uno_visits', String(visits + 1));

    showInstallBanner();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner();
          }
        });
      });
    });
  }
}

function showInstallBanner() {
  if (document.querySelector('.install-banner')) return;

  const banner = document.createElement('div');
  banner.classList.add('install-banner');

  const label = document.createElement('span');
  label.textContent = 'התקן כאפליקציה';
  banner.appendChild(label);

  const installBtn = document.createElement('button');
  installBtn.classList.add('install-btn');
  installBtn.textContent = 'התקן';
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    banner.remove();
  });
  banner.appendChild(installBtn);

  const dismissBtn = document.createElement('button');
  dismissBtn.classList.add('install-dismiss');
  dismissBtn.textContent = '\u2715';
  dismissBtn.setAttribute('aria-label', 'סגור');
  dismissBtn.addEventListener('click', () => {
    banner.remove();
    localStorage.setItem('uno_visits', '3');
  });
  banner.appendChild(dismissBtn);

  document.body.appendChild(banner);
}

function showUpdateBanner() {
  if (document.querySelector('.update-banner')) return;

  const banner = document.createElement('div');
  banner.classList.add('update-banner');

  const label = document.createElement('span');
  label.textContent = 'גרסה חדשה זמינה';
  banner.appendChild(label);

  const updateBtn = document.createElement('button');
  updateBtn.classList.add('update-btn');
  updateBtn.textContent = 'רענן';
  updateBtn.addEventListener('click', () => {
    window.location.reload();
  });
  banner.appendChild(updateBtn);

  document.body.appendChild(banner);
}
