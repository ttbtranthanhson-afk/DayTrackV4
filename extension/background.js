const CORE_ALLOWED_WEBSITES = ['daytrack.app', 'localhost', '127.0.0.1'];
const ALARM_NAME = 'daytrack-focus-recheck';

let config = null;

function normalizeHost(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/\.$/, '');
}

function hostMatches(host, allowed) {
  const cleanHost = normalizeHost(host);
  const cleanAllowed = normalizeHost(allowed);
  if (!cleanHost || !cleanAllowed) return false;
  return cleanHost === cleanAllowed || cleanHost.endsWith(`.${cleanAllowed}`);
}

function currentDateKey(now) {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function windowMatches(window, now) {
  if (!window || typeof window.start !== 'number' || typeof window.end !== 'number') return false;
  if (window.dateKey) {
    return window.dateKey === currentDateKey(now);
  }
  if (typeof window.dayOfWeek === 'number') {
    return window.dayOfWeek === now.getDay();
  }
  return false;
}

function isActiveNow(cfg, now = new Date()) {
  if (!cfg || !cfg.enabled) return false;
  if (cfg.triggerMode !== 'auto') return true;

  const minutes = now.getHours() * 60 + now.getMinutes();
  const windows = Array.isArray(cfg.autoWindows) ? cfg.autoWindows : [];
  return windows.some(
    window => windowMatches(window, now) && minutes >= window.start && minutes < window.end,
  );
}

function isAllowedUrl(url, cfg) {
  if (!/^https?:/i.test(url)) return true;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return true;
  }

  const allowed = [
    ...CORE_ALLOWED_WEBSITES,
    ...(Array.isArray(cfg?.allowedWebsites) ? cfg.allowedWebsites : []),
    cfg?.appHost,
  ].filter(Boolean);

  return allowed.some(item => hostMatches(parsed.hostname, item));
}

function blockedPageUrl(url) {
  return `${chrome.runtime.getURL('blocked.html')}?url=${encodeURIComponent(url)}`;
}

async function checkTab(tab) {
  if (!tab || typeof tab.id !== 'number' || !tab.url) return;
  if (!isActiveNow(config)) return;
  if (isAllowedUrl(tab.url, config)) return;

  try {
    await chrome.tabs.update(tab.id, { url: blockedPageUrl(tab.url) });
  } catch {
    // tab may have been closed or restricted
  }
}

async function recheckAllTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    await Promise.all(tabs.map(tab => checkTab(tab)));
  } catch {
    // tabs API may be unavailable during shutdown
  }
}

function saveConfig(nextConfig) {
  config = nextConfig && typeof nextConfig === 'object' ? nextConfig : null;
  chrome.storage.local.set({
    daytrackFocusConfig: config,
    daytrackFocusSyncedAt: config?.syncedAt || null,
  });
  void recheckAllTabs();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'DAYTRACK_WHITELIST_SYNC') {
    saveConfig(message.config);
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === 'DAYTRACK_GET_STATUS') {
    sendResponse({ config, active: isActiveNow(config) });
    return true;
  }

  return false;
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') void checkTab(tab);
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId).then(tab => checkTab(tab)).catch(() => {});
});

chrome.tabs.onCreated.addListener(tab => {
  void checkTab(tab);
});

chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_NAME) void recheckAllTabs();
});

chrome.storage.local.get(['daytrackFocusConfig']).then(result => {
  config = result.daytrackFocusConfig || null;
  void recheckAllTabs();
});

chrome.runtime.onInstalled.addListener(() => {
  void recheckAllTabs();
});
