import { Briefcase, Heart, HeartHandshake, Laugh, Shield, type LucideIcon } from 'lucide-react';
import type { ReminderPersonalityId } from '../../../shared/ai';

export interface PersonalityOption {
  id: ReminderPersonalityId;
  label: string;
  englishLabel: string;
  description: string;
  icon: LucideIcon;
  color: string;
  softColor: string;
}

export const personalityOptions: PersonalityOption[] = [
  {
    id: 'friendly',
    label: 'Thân thiện & Động viên',
    englishLabel: 'Friendly & Supportive',
    description: 'Ấm áp, tích cực, luôn khích lệ người dùng.',
    icon: HeartHandshake,
    color: 'bg-rose-500',
    softColor: 'bg-rose-50 text-rose-600 border-rose-200',
  },
  {
    id: 'strict',
    label: 'Nghiêm khắc & Kỷ luật',
    englishLabel: 'Strict & Disciplined',
    description: 'Ngắn gọn, đanh thép, thúc giục hoàn thành đúng hạn như huấn luyện viên quân đội.',
    icon: Shield,
    color: 'bg-slate-700',
    softColor: 'bg-slate-100 text-slate-700 border-slate-300',
  },
  {
    id: 'witty',
    label: 'Hài hước & Lầy lội',
    englishLabel: 'Witty & Playful',
    description: 'Vui nhộn, dùng ngôn ngữ Gen Z/bắt trend nhẹ nhàng, pha trò để giảm căng thẳng.',
    icon: Laugh,
    color: 'bg-amber-500',
    softColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    id: 'tsundere',
    label: 'Tsundere',
    englishLabel: 'Ngoài lạnh trong nóng',
    description: 'Hơi cằn nhằn, tỏ ra không quan tâm nhưng thực chất rất lo lắng cho tiến độ của người dùng.',
    icon: Heart,
    color: 'bg-pink-500',
    softColor: 'bg-pink-50 text-pink-600 border-pink-200',
  },
  {
    id: 'professional',
    label: 'Trợ lý Chuyên nghiệp',
    englishLabel: 'Professional Executive',
    description: 'Lịch sự, trang trọng, súc tích như thư ký cấp cao.',
    icon: Briefcase,
    color: 'bg-indigo-600',
    softColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
];

export function getPersonalityOption(id: ReminderPersonalityId): PersonalityOption {
  return personalityOptions.find(option => option.id === id) ?? personalityOptions[0];
}
