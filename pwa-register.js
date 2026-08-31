(() => {
  const secure = location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!secure) return;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
        await registration.update();
      } catch (error) {
        console.warn('PWA service worker registration failed:', error);
      }
    });
  }

  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  let deferredPrompt = null;
  let installButton = null;

  function ensureInstallButton() {
    if (isStandalone()) return null;
    if (installButton && document.body.contains(installButton)) return installButton;
    installButton = document.querySelector('[data-pwa-install]');
    if (installButton) return installButton;

    installButton = document.createElement('button');
    installButton.type = 'button';
    installButton.dataset.pwaInstall = 'true';
    installButton.textContent = 'Instalar app';
    installButton.setAttribute('aria-label', 'Instalar Consultoria e Relatório como aplicativo');
    Object.assign(installButton.style, {
      position: 'fixed',
      right: '16px',
      bottom: '16px',
      zIndex: '2147483647',
      border: '1px solid rgba(255,255,255,.18)',
      borderRadius: '12px',
      padding: '11px 14px',
      background: '#111827',
      color: '#fff',
      font: '600 14px system-ui, sans-serif',
      boxShadow: '0 10px 30px rgba(0,0,0,.28)',
      cursor: 'pointer',
      display: 'none'
    });

    installButton.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      installButton.disabled = true;
      try {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } finally {
        deferredPrompt = null;
        installButton.style.display = 'none';
        installButton.disabled = false;
      }
    });

    document.body.appendChild(installButton);
    return installButton;
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    const button = ensureInstallButton();
    if (button) button.style.display = 'block';
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (installButton) installButton.remove();
    installButton = null;
  });
})();
