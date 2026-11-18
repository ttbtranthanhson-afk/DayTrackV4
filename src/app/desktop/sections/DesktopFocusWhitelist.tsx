import { FocusWhitelistPanel } from '../../components/FocusWhitelistPanel';
import { DesktopPageHeader } from '../DesktopUI';

export function DesktopFocusWhitelist() {
  return (
    <div>
      <DesktopPageHeader
        title="Tập trung & Whitelist"
        subtitle="Chỉ cho phép app và web bạn thực sự cần"
      />
      <FocusWhitelistPanel />
    </div>
  );
}
