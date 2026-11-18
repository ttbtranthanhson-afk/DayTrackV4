const CORE_ALLOWED_WEBSITES = ['daytrack.app', 'localhost', '127.0.0.1'];
const params = new URLSearchParams(location.search);
const blockedUrl = params.get('url') || '';

const domainEl = document.getElementById('domain');
const allowedList = document.getElementById('allowed-list');
const backButton = document.getElementById('back');
const appLink = document.getElementById('open-app');

try {
  if (blockedUrl && domainEl) {
    domainEl.textContent = new URL(blockedUrl).hostname;
  }
} catch {
  if (domainEl) domainEl.textContent = 'này';
}

backButton?.addEventListener('click', () => {
  if (history.length > 1) {
    history.back();
  } else {
    window.close();
  }
});

chrome.storage.local.get(['daytrackFocusConfig']).then(result => {
  const config = result.daytrackFocusConfig || {};
  const appOrigin = typeof config.appOrigin === 'string' ? config.appOrigin : 'https://daytrack.app';

  if (appLink) {
    appLink.href = appOrigin;
  }

  const allowed = [
    ...CORE_ALLOWED_WEBSITES,
    ...(Array.isArray(config.allowedWebsites) ? config.allowedWebsites : []),
    config.appHost,
  ].filter(Boolean);

  const unique = [...new Set(allowed.map(item => String(item).toLowerCase()))].slice(0, 10);

  if (allowedList) {
    allowedList.replaceChildren();
    for (const site of unique) {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = site;
      allowedList.appendChild(chip);
    }
    if (unique.length === 0) {
      const chip = document.createElement('span');
      chip.className = 'chip muted';
      chip.textContent = 'Chưa có miền nào';
      allowedList.appendChild(chip);
    }
  }
});
