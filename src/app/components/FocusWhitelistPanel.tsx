import { useEffect, useState } from 'react';
import {
  Check,
  ChevronRight,
  Globe2,
  Hand,
  Lock,
  Plus,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  addAllowedApp,
  addAllowedWebsite,
  CORE_ALLOWED_APPS,
  CORE_ALLOWED_WEBSITES,
  QUICK_ADD_APPS,
  QUICK_ADD_WEBSITES,
  removeAllowedApp,
  removeAllowedWebsite,
  setFocusWhitelistEnabled,
  setFocusWhitelistTriggerMode,
  useFocusLockActive,
  useFocusWhitelist,
  type WhitelistAddResult,
} from '../hooks/focusWhitelistStore';

const ADD_MESSAGES: Record<WhitelistAddResult, string> = {
  added: 'Đã thêm vào danh sách cho phép.',
  duplicate: 'Mục này đã có trong danh sách.',
  invalid: 'Giá trị không hợp lệ. Vui lòng kiểm tra lại.',
  core: 'Mục này luôn được phép vì là thành phần cốt lõi.',
};

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
        enabled ? 'bg-emerald-500' : 'bg-gray-200'
      }`}
    >
      <motion.div
        animate={{ x: enabled ? 18 : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
      />
    </button>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof ShieldCheck; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-gray-900 text-white flex items-center justify-center flex-shrink-0">
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-800">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{subtitle}</p>}
      </div>
    </div>
  );
}

export function FocusWhitelistPanel() {
  const settings = useFocusWhitelist();
  const active = useFocusLockActive();
  const [appInput, setAppInput] = useState('');
  const [webInput, setWebInput] = useState('');
  const [appFeedback, setAppFeedback] = useState('');
  const [webFeedback, setWebFeedback] = useState('');
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!confirmDisable) return;
    const endAt = Date.now() + 10_000;
    setCountdown(10);
    const id = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining === 0) window.clearInterval(id);
    }, 250);
    return () => window.clearInterval(id);
  }, [confirmDisable]);

  const handleToggle = () => {
    if (settings.enabled && active) {
      setConfirmDisable(true);
      return;
    }
    setFocusWhitelistEnabled(!settings.enabled);
  };

  const confirmEmergencyDisable = () => {
    if (countdown > 0) return;
    setFocusWhitelistEnabled(false);
    setConfirmDisable(false);
  };

  const handleAddApp = (value: string) => {
    const result = addAllowedApp(value);
    setAppFeedback(result === 'added' ? '' : ADD_MESSAGES[result]);
    if (result === 'added') setAppInput('');
  };

  const handleAddWebsite = (value: string) => {
    const result = addAllowedWebsite(value);
    setWebFeedback(result === 'added' ? '' : ADD_MESSAGES[result]);
    if (result === 'added') setWebInput('');
  };

  const appAllowed = (value: string) =>
    CORE_ALLOWED_APPS.some(item => item.toLowerCase() === value.toLowerCase()) ||
    settings.allowedApps.some(item => item.toLowerCase() === value.toLowerCase());

  const websiteAllowed = (value: string) =>
    CORE_ALLOWED_WEBSITES.includes(value) || settings.allowedWebsites.includes(value);

  return (
    <div className="space-y-4">
      {/* Status + master toggle */}
      <div
        className={`rounded-3xl p-5 text-white relative overflow-hidden ${
          active
            ? 'bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600'
            : 'bg-gradient-to-br from-gray-700 to-gray-900'
        }`}
      >
        <div className="absolute -top-10 -right-8 w-36 h-36 bg-white/10 rounded-full" />
        <div className="absolute -bottom-12 -left-8 w-32 h-32 bg-white/5 rounded-full" />
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            {active ? <ShieldCheck className="w-6 h-6" /> : <ShieldOff className="w-6 h-6" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">
              Chế độ Tập trung & Whitelist
            </p>
            <h2 className="text-lg font-bold mt-0.5">
              {active ? 'Đang khóa toàn bộ ngoài Whitelist' : settings.enabled ? 'Đã bật, chờ lịch học' : 'Đang tắt'}
            </h2>
            <p className="text-xs text-white/75 mt-1 leading-relaxed">
              {settings.triggerMode === 'auto'
                ? 'Tự động khóa khi lịch có sự kiện Học tập/Làm việc.'
                : 'Khóa ngay khi bạn bật công tắc bên dưới.'}
            </p>
          </div>
          <Toggle enabled={settings.enabled} onToggle={handleToggle} />
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-2 mt-4">
          <div className="rounded-xl bg-white/10 px-2.5 py-2">
            <p className="text-[10px] text-white/60 font-semibold uppercase">Apps</p>
            <p className="text-sm font-bold">{settings.allowedApps.length + CORE_ALLOWED_APPS.length}</p>
          </div>
          <div className="rounded-xl bg-white/10 px-2.5 py-2">
            <p className="text-[10px] text-white/60 font-semibold uppercase">Websites</p>
            <p className="text-sm font-bold">{settings.allowedWebsites.length + CORE_ALLOWED_WEBSITES.length}</p>
          </div>
          <div className="rounded-xl bg-white/10 px-2.5 py-2">
            <p className="text-[10px] text-white/60 font-semibold uppercase">Trạng thái</p>
            <p className="text-sm font-bold">{active ? 'Đang khóa' : 'Mở'}</p>
          </div>
        </div>
      </div>

      {/* Trigger mode */}
      <div className="bg-white rounded-2xl p-4 space-y-3">
        <SectionTitle
          icon={Timer}
          title="Cơ chế kích hoạt"
          subtitle="Chọn cách DayTrack bật chế độ khóa."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setFocusWhitelistTriggerMode('manual')}
            className={`text-left rounded-2xl border-2 p-3 transition-all ${
              settings.triggerMode === 'manual'
                ? 'border-emerald-500 bg-emerald-50/70'
                : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Hand className="w-4 h-4 text-emerald-600" />
              <p className="text-sm font-bold text-gray-800">Khóa thủ công</p>
            </div>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              Khóa ngay khi bạn bật công tắc và chỉ mở khi bạn xác nhận tắt.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setFocusWhitelistTriggerMode('auto')}
            className={`text-left rounded-2xl border-2 p-3 transition-all ${
              settings.triggerMode === 'auto'
                ? 'border-emerald-500 bg-emerald-50/70'
                : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <p className="text-sm font-bold text-gray-800">Tự động theo lịch</p>
            </div>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              Tự khóa khi đến sự kiện Học tập/Làm việc trong lịch hôm nay.
            </p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Allowed apps */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <SectionTitle
            icon={Lock}
            title="App được phép"
            subtitle="Thêm tên app/tiến trình được chạy khi khóa. Ví dụ: Code.exe, Notion."
          />

          <div className="flex gap-2">
            <input
              value={appInput}
              onChange={event => setAppInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAddApp(appInput);
                }
              }}
              placeholder="Code.exe, Notion, Anki..."
              className="flex-1 min-w-0 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <button
              type="button"
              onClick={() => handleAddApp(appInput)}
              className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors"
              aria-label="Thêm app"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {appFeedback && <p className="text-xs text-orange-500 font-medium">{appFeedback}</p>}

          <div className="flex flex-wrap gap-1.5">
            {QUICK_ADD_APPS.map(item => {
              const added = appAllowed(item.value);
              return (
                <button
                  key={item.value}
                  type="button"
                  disabled={added}
                  onClick={() => handleAddApp(item.value)}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                    added
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                      : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {added ? <Check className="w-3 h-3 inline mr-1" /> : <Plus className="w-3 h-3 inline mr-1" />}
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5">
            {settings.allowedApps.length === 0 && (
              <p className="text-xs text-gray-400 py-2">Chưa có app tùy chỉnh nào.</p>
            )}
            {settings.allowedApps.map(app => (
              <div
                key={app}
                className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="flex-1 text-sm font-medium text-gray-700 truncate">{app}</span>
                <button
                  type="button"
                  onClick={() => removeAllowedApp(app)}
                  className="w-7 h-7 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors"
                  aria-label={`Xóa ${app}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
              Luôn được phép
            </p>
            <p className="text-xs text-emerald-700/80 leading-relaxed">
              {CORE_ALLOWED_APPS.join(' · ')}
            </p>
          </div>
        </div>

        {/* Allowed websites */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <SectionTitle
            icon={Globe2}
            title="Web được phép"
            subtitle="Tên miền được truy cập khi khóa. Tên miền con cũng được phép."
          />

          <div className="flex gap-2">
            <input
              value={webInput}
              onChange={event => setWebInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAddWebsite(webInput);
                }
              }}
              placeholder="github.com, docs.google.com..."
              className="flex-1 min-w-0 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <button
              type="button"
              onClick={() => handleAddWebsite(webInput)}
              className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors"
              aria-label="Thêm website"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {webFeedback && <p className="text-xs text-orange-500 font-medium">{webFeedback}</p>}

          <div className="flex flex-wrap gap-1.5">
            {QUICK_ADD_WEBSITES.map(item => {
              const added = websiteAllowed(item.value);
              return (
                <button
                  key={item.value}
                  type="button"
                  disabled={added}
                  onClick={() => handleAddWebsite(item.value)}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                    added
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                      : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {added ? <Check className="w-3 h-3 inline mr-1" /> : <Plus className="w-3 h-3 inline mr-1" />}
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5">
            {settings.allowedWebsites.length === 0 && (
              <p className="text-xs text-gray-400 py-2">Chưa có website tùy chỉnh nào.</p>
            )}
            {settings.allowedWebsites.map(site => (
              <div
                key={site}
                className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="flex-1 text-sm font-medium text-gray-700 truncate">{site}</span>
                <button
                  type="button"
                  onClick={() => removeAllowedWebsite(site)}
                  className="w-7 h-7 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors"
                  aria-label={`Xóa ${site}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
              Luôn được phép
            </p>
            <p className="text-xs text-emerald-700/80 leading-relaxed">
              {CORE_ALLOWED_WEBSITES.join(' · ')} · tên miền đang chạy DayTrack
            </p>
          </div>
        </div>
      </div>

      {/* Extension note */}
      <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center flex-shrink-0">
            <Globe2 className="w-[18px] h-[18px]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-blue-900">Đồng bộ với Chrome Extension</p>
            <p className="text-xs text-blue-700/80 mt-1 leading-relaxed">
              Mở <span className="font-semibold">chrome://extensions</span>, bật Developer mode,
              chọn <span className="font-semibold">Load unpacked</span> và trỏ tới thư mục{' '}
              <span className="font-mono bg-blue-100 px-1 rounded">extension/</span> trong dự án.
              Giữ tab DayTrack mở để extension nhận danh sách whitelist mới nhất.
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-blue-300 flex-shrink-0" />
        </div>
      </div>

      {/* Emergency disable modal */}
      {confirmDisable && (
        <div className="fixed inset-0 z-[220] bg-gray-950/70 backdrop-blur-sm flex items-center justify-center p-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Tắt khóa khẩn cấp?</h3>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
              Whitelist đang bảo vệ sự tập trung của bạn. Hãy chờ hết đếm ngược để chắc chắn
              bạn thực sự muốn tắt.
            </p>
            <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Có thể tắt sau
                </span>
                <span className="text-lg font-bold text-rose-500 tabular-nums">{countdown}s</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-200 mt-2 overflow-hidden">
                <div
                  className="h-full bg-rose-500 transition-all duration-300"
                  style={{ width: `${((10 - countdown) / 10) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setConfirmDisable(false)}
                className="flex-1 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold py-2.5 hover:bg-gray-200 transition-colors"
              >
                Ở lại tập trung
              </button>
              <button
                type="button"
                onClick={confirmEmergencyDisable}
                disabled={countdown > 0}
                className="flex-1 rounded-xl bg-rose-500 text-white text-sm font-bold py-2.5 hover:bg-rose-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" />
                Tắt khóa
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
