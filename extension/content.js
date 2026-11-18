const POINTER_KEY = 'daytrack_current_account';
const WHITELIST_KEY = 'daytrack_focus_whitelist';
const WEEKDAY_KEY = 'daytrack_weekday_schedules';
const CALENDAR_KEY = 'daytrack_calendar_schedules';
const SYNC_INTERVAL_MS = 5000;

const WEEKDAY_NAMES = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
const WEEKDAY_TO_JS = {
  'Thứ Hai': 1,
  'Thứ Ba': 2,
  'Thứ Tư': 3,
  'Thứ Năm': 4,
  'Thứ Sáu': 5,
  'Thứ Bảy': 6,
  'Chủ Nhật': 0,
};

const STUDY_TITLE_PATTERN = /(học|study|work|làm việc|deadline|ôn thi|tự học|nghiên cứu|đọc sách)/i;
const lastPayload = { value: '' };

function normalizeAccount(value) {
  return (value || '').trim().toLowerCase() || 'guest';
}

function readRaw(base, account) {
  try {
    return localStorage.getItem(`${base}::${account}`);
  } catch {
    return null;
  }
}

function readJson(base, account) {
  try {
    const raw = readRaw(base, account);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function parseWindow(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const start = Number(match[1]) * 60 + Number(match[2]);
  const end = Number(match[3]) * 60 + Number(match[4]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return { start, end };
}

function isStudyBlock(block) {
  if (!block || typeof block !== 'object') return false;
  if (block.type === 'study') return true;
  return typeof block.title === 'string' && STUDY_TITLE_PATTERN.test(block.title);
}

function collectAutoWindows(account) {
  const windows = [];
  const weekdayData = readJson(WEEKDAY_KEY, account);
  if (weekdayData && typeof weekdayData === 'object') {
    for (const [dayName, blocks] of Object.entries(weekdayData)) {
      const dayOfWeek = WEEKDAY_TO_JS[dayName];
      if (dayOfWeek === undefined || !Array.isArray(blocks)) continue;
      for (const block of blocks) {
        if (!isStudyBlock(block)) continue;
        const window = parseWindow(block.time);
        if (window) windows.push({ ...window, dayOfWeek });
      }
    }
  }

  const calendarData = readJson(CALENDAR_KEY, account);
  if (calendarData && typeof calendarData === 'object') {
    for (const [dateKey, blocks] of Object.entries(calendarData)) {
      if (!Array.isArray(blocks)) continue;
      for (const block of blocks) {
        if (!isStudyBlock(block)) continue;
        const window = parseWindow(block.time);
        if (window) windows.push({ ...window, dateKey });
      }
    }
  }

  return windows;
}

function buildConfig() {
  let pointer;
  try {
    pointer = localStorage.getItem(POINTER_KEY);
  } catch {
    return null;
  }
  if (!pointer) return null;

  const account = normalizeAccount(pointer);
  const parsed = readJson(WHITELIST_KEY, account);
  if (!parsed || typeof parsed !== 'object') return null;

  return {
    enabled: Boolean(parsed.enabled),
    triggerMode: parsed.triggerMode === 'auto' ? 'auto' : 'manual',
    allowedApps: Array.isArray(parsed.allowedApps)
      ? parsed.allowedApps.filter(item => typeof item === 'string')
      : [],
    allowedWebsites: Array.isArray(parsed.allowedWebsites)
      ? parsed.allowedWebsites.filter(item => typeof item === 'string')
      : [],
    autoWindows: collectAutoWindows(account),
    appOrigin: location.origin,
    appHost: location.hostname,
  };
}

function sync() {
  const config = buildConfig();
  const serialized = JSON.stringify(config);
  if (serialized === lastPayload.value) return;
  lastPayload.value = serialized;

  try {
    chrome.runtime.sendMessage(
      {
        type: 'DAYTRACK_WHITELIST_SYNC',
        config: config ? { ...config, syncedAt: Date.now() } : null,
      },
      () => void chrome.runtime.lastError,
    );
  } catch {
    // extension was reloaded or removed
  }
}

sync();
setInterval(sync, SYNC_INTERVAL_MS);
window.addEventListener('daytrack:focus-whitelist-updated', sync);
window.addEventListener('storage', sync);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') sync();
});
