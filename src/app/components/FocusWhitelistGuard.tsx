import { useEffect, useState } from 'react';
import { ArrowLeft, Globe2, Settings2, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  CORE_ALLOWED_WEBSITES,
  isUrlAllowed,
  useFocusLockActive,
  useFocusWhitelist,
} from '../hooks/focusWhitelistStore';

interface BlockedTarget {
  url: string;
  domain: string;
}

export function FocusWhitelistGuard() {
  const active = useFocusLockActive();
  const settings = useFocusWhitelist();
  const navigate = useNavigate();
  const [blocked, setBlocked] = useState<BlockedTarget | null>(null);

  useEffect(() => {
    if (!active) {
      setBlocked(null);
      return;
    }

    const extraHosts = [window.location.hostname];

    const intercept = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (isUrlAllowed(url.href, settings, extraHosts)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setBlocked({ url: url.href, domain: url.hostname });
    };

    const originalOpen = window.open;
    window.open = ((url?: string | URL, target?: string, features?: string) => {
      if (url !== undefined) {
        try {
          const parsed = new URL(String(url), window.location.href);
          if (!isUrlAllowed(parsed.href, settings, extraHosts)) {
            setBlocked({ url: parsed.href, domain: parsed.hostname });
            return null;
          }
        } catch {
          // let the browser handle malformed URLs
        }
      }
      return originalOpen.call(window, url as string, target, features);
    }) as typeof window.open;

    document.addEventListener('click', intercept, true);
    document.addEventListener('auxclick', intercept, true);
    return () => {
      document.removeEventListener('click', intercept, true);
      document.removeEventListener('auxclick', intercept, true);
      window.open = originalOpen;
    };
  }, [active, settings]);

  if (!blocked) return null;

  const allowedPreview = [...CORE_ALLOWED_WEBSITES, ...settings.allowedWebsites].slice(0, 6);

  return (
    <div className="fixed inset-0 z-[200] bg-gray-950/75 backdrop-blur-sm flex items-center justify-center p-5">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-5">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-rose-500">
          Đã chặn truy cập
        </p>
        <h2 className="text-xl font-bold text-gray-900 mt-1">Trang web ngoài Whitelist</h2>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          Miền <span className="font-bold text-gray-700">{blocked.domain}</span> không nằm trong
          danh sách được phép. Hãy quay lại công việc hiện tại, hoặc thêm miền này vào Whitelist
          nếu thật sự cần thiết.
        </p>

        <div className="mt-4 rounded-2xl bg-gray-50 border border-gray-100 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
            Đang được phép
          </p>
          <div className="flex flex-wrap gap-1.5">
            {allowedPreview.map(site => (
              <span
                key={site}
                className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg"
              >
                {site}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={() => setBlocked(null)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-900 text-white text-sm font-bold py-3 hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại công việc
          </button>
          <button
            type="button"
            onClick={() => {
              setBlocked(null);
              navigate('/focus-whitelist');
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold py-3 hover:bg-emerald-100 transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            Quản lý Whitelist
          </button>
        </div>

        <p className="mt-4 text-[11px] text-gray-400 text-center flex items-center justify-center gap-1.5">
          <Globe2 className="w-3 h-3" />
          DayTrack và các miền cốt lõi luôn được phép truy cập.
        </p>
      </div>
    </div>
  );
}
