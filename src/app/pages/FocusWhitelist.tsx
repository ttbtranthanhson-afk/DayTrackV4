import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { FocusWhitelistPanel } from '../components/FocusWhitelistPanel';

export function FocusWhitelist() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="max-w-md mx-auto">
        <div className="px-5 pt-14 pb-4 bg-gray-50">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Cài đặt
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Tập trung & Whitelist</h1>
          <p className="text-sm text-gray-400 mt-0.5 font-medium">
            Chỉ cho phép app và web bạn thực sự cần
          </p>
        </div>

        <div className="px-5">
          <FocusWhitelistPanel />
        </div>
      </div>
    </div>
  );
}
