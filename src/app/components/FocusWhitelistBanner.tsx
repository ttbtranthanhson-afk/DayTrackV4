import { ChevronRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useFocusLockActive, useFocusWhitelist } from '../hooks/focusWhitelistStore';

export function FocusWhitelistBanner() {
  const active = useFocusLockActive();
  const settings = useFocusWhitelist();
  const navigate = useNavigate();

  if (!active) return null;

  return (
    <div className="sticky top-0 z-40 w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-md">
      <div className="mx-auto w-full max-w-[1700px] px-4 py-2.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">
            Chế độ Whitelist đang bật
          </p>
          <p className="text-xs text-white/90 truncate">
            Chỉ các app/web trong danh sách mới được phép truy cập ·{' '}
            {settings.triggerMode === 'auto' ? 'Tự động theo lịch' : 'Khóa thủ công'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/focus-whitelist')}
          className="flex items-center gap-1 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-bold hover:bg-white/25 transition-colors flex-shrink-0"
        >
          Quản lý
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
