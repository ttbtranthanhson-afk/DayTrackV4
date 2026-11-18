import { useState } from 'react';
import { Check, Loader2, Play, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { personalityOptions, getPersonalityOption } from '../data/personalities';
import {
  loadSettings,
  saveSettings,
  type NotificationSettings,
} from '../hooks/notificationSettings';
import { requestPermission, notify } from '../hooks/notificationService';
import { generatePersonalityReminder } from '../hooks/personalityReminder';
import type { ReminderResult } from '../../../shared/ai';

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
        enabled ? 'bg-purple-500' : 'bg-gray-200'
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

export function PersonalityReminderSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(loadSettings);
  const [preview, setPreview] = useState<ReminderResult | null>(null);
  const [testing, setTesting] = useState(false);

  const apply = (next: NotificationSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  const toggleEnabled = () => {
    const next = {
      ...settings,
      personality: { ...settings.personality, enabled: !settings.personality.enabled },
    };
    if (next.personality.enabled) requestPermission();
    apply(next);
  };

  const choosePersonality = (id: NotificationSettings['personality']['id']) => {
    apply({ ...settings, personality: { ...settings.personality, id } });
    setPreview(null);
  };

  const handleTest = async () => {
    if (testing) return;
    requestPermission();
    setTesting(true);
    try {
      const result = await generatePersonalityReminder({
        personality: settings.personality.id,
        eventTitle: 'Họp nhóm dự án',
        time: '09:00',
        kind: 'test',
        details: 'Đây là thông báo xem thử từ DayTrack.',
      });
      setPreview(result);
      notify(result.title, result.body, settings);
    } finally {
      setTesting(false);
    }
  };

  const activeOption = getPersonalityOption(settings.personality.id);

  return (
    <div className="bg-white rounded-2xl overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-[18px] h-[18px] text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800">AI nhắc nhở theo cá tính</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Mỗi thông báo là một câu mới, đúng cá tính bạn chọn
          </p>
        </div>
        <Toggle enabled={settings.personality.enabled} onToggle={toggleEnabled} />
      </div>

      {settings.personality.enabled && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-4 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Chọn cá tính AI
          </p>

          <div role="radiogroup" aria-label="Cá tính AI" className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {personalityOptions.map(option => {
              const Icon = option.icon;
              const active = option.id === settings.personality.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => choosePersonality(option.id)}
                  className={`relative text-left rounded-2xl border-2 p-3 transition-all ${
                    active
                      ? `${option.softColor} shadow-sm`
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/60'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg ${option.color} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0 pr-5">
                      <p className="text-sm font-bold text-gray-800 leading-tight">{option.label}</p>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">
                        {option.englishLabel}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">{option.description}</p>
                  <span
                    className={`absolute top-3 right-3 w-4 h-4 rounded-full border flex items-center justify-center ${
                      active ? 'bg-purple-500 border-purple-500' : 'border-gray-200 bg-white'
                    }`}
                  >
                    {active && <Check className="w-3 h-3 text-white" />}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white text-sm font-bold rounded-xl py-3 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-60"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {testing ? 'Đang tạo thông báo thử...' : 'Nghe/Xem thử thông báo'}
          </button>

          {preview && (
            <div className="rounded-2xl bg-gray-900 text-white p-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${activeOption.color}`} />
                <p className="text-xs font-bold uppercase tracking-wider text-white/60">Xem trước</p>
              </div>
              <p className="text-sm font-bold">{preview.title}</p>
              <p className="text-sm text-white/80 leading-relaxed">{preview.body}</p>
              <p className="text-[11px] text-white/40 pt-1">
                Cá tính: {activeOption.label} · Mỗi lần thử sẽ tạo một câu khác
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
