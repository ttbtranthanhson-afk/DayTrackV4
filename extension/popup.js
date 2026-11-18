const statusEl = document.getElementById('status');
const statusTitle = document.getElementById('status-title');
const statusSub = document.getElementById('status-sub');
const siteCount = document.getElementById('site-count');
const appCount = document.getElementById('app-count');
const triggerMode = document.getElementById('trigger-mode');
const syncedAt = document.getElementById('synced-at');
const manageLink = document.getElementById('manage');
const openAppLink = document.getElementById('open-app');

function formatTime(value) {
  if (!value) return 'Chưa đồng bộ';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    }).format(new Date(value));
  } catch {
    return 'Chưa đồng bộ';
  }
}

function setStatus(kind, title, sub) {
  statusEl.classList.remove('loading', 'active', 'idle');
  statusEl.classList.add(kind);
  statusTitle.textContent = title;
  statusSub.textContent = sub;
}

chrome.runtime.sendMessage({ type: 'DAYTRACK_GET_STATUS' }, response => {
  void chrome.runtime.lastError;
  const config = response?.config;

  if (!config) {
    setStatus('idle', 'Chưa đồng bộ', 'Mở DayTrack để gửi cấu hình Whitelist');
    siteCount.textContent = '0';
    appCount.textContent = '0';
    triggerMode.textContent = '—';
    syncedAt.textContent = 'Chưa đồng bộ';
    manageLink.href = 'https://daytrack.app/#/focus-whitelist';
    openAppLink.href = 'https://daytrack.app';
    return;
  }

  const active = Boolean(response.active);
  const auto = config.triggerMode === 'auto';

  if (!config.enabled) {
    setStatus('idle', 'Whitelist đang tắt', 'Bật trong DayTrack để bắt đầu khóa');
  } else if (active) {
    setStatus('active', 'Đang khóa theo Whitelist', 'Các trang ngoài danh sách sẽ bị chặn');
  } else {
    setStatus('idle', 'Chờ khung giờ học tập', 'Tự động khóa khi tới lịch học/làm việc');
  }

  const websites = Array.isArray(config.allowedWebsites) ? config.allowedWebsites : [];
  const apps = Array.isArray(config.allowedApps) ? config.allowedApps : [];
  siteCount.textContent = String(websites.length);
  appCount.textContent = String(apps.length);
  triggerMode.textContent = auto ? 'Tự động theo lịch' : 'Thủ công';
  syncedAt.textContent = formatTime(config.syncedAt);

  const origin = typeof config.appOrigin === 'string' ? config.appOrigin : 'https://daytrack.app';
  manageLink.href = `${origin}/#/focus-whitelist`;
  openAppLink.href = origin;
});
