import type {
  ReminderKind,
  ReminderPersonalityId,
  ReminderResult,
} from '../../../shared/ai';
import { generatePersonalityReminder as generateWithAi } from '../services/gemini';
import { getAccountItem, setAccountItem } from './accountStorage';
import { notify } from './notificationService';
import type { NotificationSettings } from './notificationSettings';

const HISTORY_KEY = 'daytrack_personality_reminder_history';
const HISTORY_LIMIT = 16;
const AI_TIMEOUT_MS = 5000;

type HistoryMap = Partial<Record<ReminderPersonalityId, string[]>>;

interface FallbackPack {
  titles: string[];
  openers: string[];
  mentions: string[];
  nudges: string[];
}

const FALLBACK_PACKS: Record<ReminderPersonalityId, FallbackPack> = {
  friendly: {
    titles: ['Đến giờ rồi đó bạn ơi', 'Một lời nhắc nhẹ nhàng', 'Mình nhắc bạn chút nhé', 'Sắp đến giờ rồi nè'],
    openers: [
      'Chào bạn, {time} sắp đến rồi nè!',
      'Một chút nhắc nhẹ nhàng cho bạn đây:',
      'Mình ở đây để nhắc bạn một việc quan trọng nha!',
      'Bạn ơi, đừng quên nhé:',
      'Cùng chuẩn bị thật tốt cho {title} nào!',
      'Mình tin bạn sẽ sắp xếp ổn thỏa, nhưng vẫn nhắc một chút:',
    ],
    mentions: [
      'Sự kiện "{title}" sẽ bắt đầu lúc {time}.',
      '"{title}" đang chờ bạn vào lúc {time}.',
      'Lịch "{title}" diễn ra lúc {time} đó nha.',
      'Bạn có hẹn với "{title}" vào {time}.',
      'Đừng bỏ lỡ "{title}" lúc {time} nhé.',
      '"{title}" đã được xếp vào {time}.',
    ],
    nudges: [
      'Bạn chuẩn bị một chút là sẽ sẵn sàng ngay thôi!',
      'Mình tin bạn làm được, cố lên nhé!',
      'Hít một hơi thật sâu và bắt đầu thật tốt nha!',
      'Nếu cần nghỉ một phút thì cứ nghỉ, rồi mình tiếp tục nhé.',
      'Bạn đang làm rất tốt, đừng tự tạo áp lực quá nhé.',
      'Nhớ mang theo nước và tinh thần thoải mái nha!',
      'Mình luôn ở đây cổ vũ bạn đó!',
      'Từng bước một thôi, bạn sẽ hoàn thành ổn thỏa.',
      'Bạn xứng đáng có một buổi thật suôn sẻ!',
      'Sẵn sàng rồi thì mình bắt đầu thôi nào!',
    ],
  },
  strict: {
    titles: ['Tập trung!', 'Đến giờ hành động', 'Mệnh lệnh nhắc nhở', 'Không được trễ'],
    openers: [
      'Chú ý!',
      'Mệnh lệnh nhắc nhở:',
      'Đã đến lúc tập trung!',
      'Không được lơ là!',
      'Điểm danh nhiệm vụ:',
      'Nghe rõ đây:',
    ],
    mentions: [
      '"{title}" bắt đầu lúc {time}.',
      'Nhiệm vụ "{title}" có thời hạn vào {time}.',
      'Lịch "{title}" sẽ khóa sổ lúc {time}.',
      'Bạn có đúng đến {time} để xử lý "{title}".',
      '"{title}" đang đợi bạn vào {time}, không có ngoại lệ.',
      'Mốc {time} dành cho "{title}" đã cận kề.',
    ],
    nudges: [
      'Có mặt đúng giờ, hoàn thành đúng hạn!',
      'Tập trung 100%, không trì hoãn!',
      'Làm ngay bây giờ, đừng chờ đến phút cuối!',
      'Kỷ luật là sức mạnh. Bắt đầu!',
      'Hoàn thành rồi mới được nghỉ!',
      'Không có lý do, không có ngoại lệ. Tiến lên!',
      'Mỗi phút trôi qua là một phút không lấy lại được!',
      'Mục tiêu rõ ràng, hành động dứt khoát!',
      'Đứng dậy, chuẩn bị và thực hiện!',
      'Tôi muốn thấy kết quả, không phải lời hứa!',
    ],
  },
  witty: {
    titles: ['Ting ting, có biến!', 'Deadline gọi kìa', 'Vào việc thôi idol', 'Nhắc nhẹ cái nha'],
    openers: [
      'Ơ kìa, deadline đang gọi tên bạn kìa!',
      'Cảnh báo: năng lượng "nằm lười" đang tăng cao!',
      'Nghe nè, có biến nha!',
      'Chuyện nhỏ nhưng không thể bỏ qua đâu nha!',
      'Có một cuộc hẹn đang chờ bạn "onl" đó!',
      'Ting ting! Thông báo từ vũ trụ gửi tới bạn:',
    ],
    mentions: [
      '"{title}" lên sóng lúc {time} đó.',
      '"{title}" hẹn bạn lúc {time}, nhớ đừng "bơ" nha.',
      'Lịch "{title}" chuẩn bị khai màn vào {time}.',
      'Bạn có kèo "{title}" vào {time} nha.',
      '"{title}" đang đợi bạn check-in lúc {time}.',
      'Mốc {time} là sân khấu chính của "{title}" đó.',
    ],
    nudges: [
      'Chuẩn bị đi không lại "toang" cả kế hoạch!',
      'Cố lên, xong việc rồi mình chill sau nha!',
      'Đừng để deadline "bắt bài" bạn nha!',
      'Bật chế độ tập trung lên nào, idol!',
      'Làm một phát gọn gàng rồi quay lại lướt tiếp nha.',
      'Bạn làm được mà, đừng để "não cá vàng" quên nữa!',
      'Nhanh nhanh còn kịp, không thì lại "hic hic" đó.',
      'Sẵn sàng "flex" thành quả chưa? Bắt đầu thôi!',
      'Uống ngụm nước rồi chiến thôi nào!',
      'Hết giờ chill rồi, vào việc thôi bạn ơi!',
    ],
  },
  tsundere: {
    titles: ['Hừm, nhắc chút thôi', 'Đừng có quên đấy', 'Mình không lo đâu nhưng...', 'Này, nhớ giờ'],
    openers: [
      'Hừm, mình chỉ nhắc vì tiện thôi, không phải lo cho bạn đâu.',
      'Không phải mình để ý đâu, nhưng mà...',
      'Này, đừng có mà quên đấy.',
      'Mình không quan tâm lắm, nhưng lỡ bạn trễ thì phiền lắm.',
      'Chậc, lại phải nhắc nữa rồi.',
      'Đừng hiểu lầm, mình chỉ nói cho biết thôi.',
    ],
    mentions: [
      '"{title}" diễn ra lúc {time} đấy.',
      'Bạn có "{title}" vào {time}, nhớ chưa?',
      'Lịch "{title}" bắt đầu lúc {time} đó.',
      'Mốc {time} là "{title}", đừng có mà quên.',
      '"{title}" đang chờ bạn lúc {time} kìa.',
      'Đến {time} là "{title}" đấy, tự lo đi.',
    ],
    nudges: [
      'Mình chỉ nhắc thôi, trễ thì đừng có mà than.',
      'Làm đi, đừng để mình phải nhắc lần nữa.',
      'Không phải mình lo đâu, nhưng cố đúng giờ đi.',
      'Bạn mà trễ thì... mình cũng chẳng nói gì đâu. Hừm.',
      'Chuẩn bị đi, đừng có lơ ngơ nữa.',
      'Mình biết bạn làm được, nhưng đừng khoe nhé.',
      'Lỡ trễ rồi đừng bảo mình không nhắc.',
      'Tự sắp xếp đi, mình không quản nổi đâu.',
      'Hừm, cố lên, đừng làm mình thất vọng.',
      'Mình chỉ nói một lần thôi đấy, nhớ làm đi.',
    ],
  },
  professional: {
    titles: ['Thông báo lịch trình', 'Nhắc nhở công việc', 'Lịch hẹn sắp tới', 'Thông báo từ trợ lý'],
    openers: [
      'Kính thông báo:',
      'Nhắc nhở lịch trình:',
      'Thông báo từ trợ lý:',
      'Xin lưu ý:',
      'Theo lịch đã đặt:',
      'Kính gửi bạn,',
    ],
    mentions: [
      'Sự kiện "{title}" sẽ bắt đầu lúc {time}.',
      'Lịch "{title}" được lên lúc {time}.',
      'Bạn có lịch "{title}" vào lúc {time}.',
      '"{title}" sẽ diễn ra theo kế hoạch vào {time}.',
      'Mốc thời gian {time} dành cho "{title}".',
      'Sự kiện "{title}" đã được xác nhận vào {time}.',
    ],
    nudges: [
      'Vui lòng chuẩn bị đầy đủ trước khi bắt đầu.',
      'Đề nghị sắp xếp thời gian và có mặt đúng hẹn.',
      'Trân trọng nhắc bạn hoàn thành đúng tiến độ.',
      'Vui lòng kiểm tra lại tài liệu cần thiết.',
      'Cảm ơn bạn đã phối hợp.',
      'Chúc bạn có một buổi làm việc hiệu quả.',
      'Mọi thay đổi vui lòng cập nhật trước giờ bắt đầu.',
      'Rất mong bạn duy trì đúng lịch trình.',
      'Trân trọng.',
      'Vui lòng xác nhận khi đã sẵn sàng.',
    ],
  },
};

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase('vi')
    .normalize('NFC')
    .replace(/[“”"'`]/g, '')
    .replace(/[.,!?;:…]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readHistory(): HistoryMap {
  try {
    const raw = getAccountItem(HISTORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const result: HistoryMap = {};
    for (const id of Object.keys(parsed) as ReminderPersonalityId[]) {
      const list = (parsed as Record<string, unknown>)[id];
      if (Array.isArray(list)) {
        result[id] = list.filter((item): item is string => typeof item === 'string').slice(-HISTORY_LIMIT);
      }
    }
    return result;
  } catch {
    return {};
  }
}

function recentFor(personality: ReminderPersonalityId): string[] {
  return readHistory()[personality] ?? [];
}

function remember(personality: ReminderPersonalityId, body: string) {
  const history = readHistory();
  const list = [...(history[personality] ?? []), body].slice(-HISTORY_LIMIT);
  history[personality] = list;
  setAccountItem(HISTORY_KEY, JSON.stringify(history));
}

function isDuplicate(body: string, recent: string[]): boolean {
  const key = normalizeText(body);
  if (!key) return true;
  return recent.some(item => normalizeText(item) === key);
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function fill(template: string, eventTitle: string, time: string): string {
  return template.replace(/\{title\}/g, eventTitle).replace(/\{time\}/g, time);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('AI reminder timeout')), ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export interface PersonalityReminderRequest {
  personality: ReminderPersonalityId;
  eventTitle: string;
  time: string;
  kind: ReminderKind;
  details?: string;
}

function buildFallback(request: PersonalityReminderRequest, recent: string[]): ReminderResult {
  const pack = FALLBACK_PACKS[request.personality];
  const eventTitle = request.eventTitle || 'lịch trình sắp tới';
  const time = request.time || 'thời gian đã hẹn';
  const detail = request.details ? ` ${request.details}` : '';
  let fallback: ReminderResult | null = null;

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const title = pick(pack.titles);
    const opener = fill(pick(pack.openers), eventTitle, time);
    const mention = fill(pick(pack.mentions), eventTitle, time);
    const nudge = fill(pick(pack.nudges), eventTitle, time);
    const body = `${opener} ${mention}${detail} ${nudge}`.replace(/\s+/g, ' ').trim().slice(0, 320);
    const candidate = { title, body };
    fallback = candidate;
    if (!isDuplicate(body, recent)) return candidate;
  }

  return fallback ?? { title: 'Nhắc nhở lịch trình', body: `${eventTitle} lúc ${time}.` };
}

export async function generatePersonalityReminder(
  request: PersonalityReminderRequest,
): Promise<ReminderResult> {
  const recent = recentFor(request.personality);
  const blocked = [...recent];
  const seed = Math.floor(Math.random() * 1_000_000_000);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await withTimeout(
        generateWithAi({
          ...request,
          recent: blocked.slice(-10),
          seed: seed + attempt,
        }),
        AI_TIMEOUT_MS,
      );

      if (result.body && !isDuplicate(result.body, blocked)) {
        const title = result.title || pick(FALLBACK_PACKS[request.personality].titles);
        const clean: ReminderResult = { title, body: result.body };
        remember(request.personality, clean.body);
        return clean;
      }

      if (result.body) blocked.push(result.body);
    } catch {
      break;
    }
  }

  const fallback = buildFallback(request, blocked);
  remember(request.personality, fallback.body);
  return fallback;
}

export interface SendReminderParams extends PersonalityReminderRequest {
  settings: NotificationSettings;
  fallbackTitle: string;
  fallbackBody: string;
  onClick?: () => void;
}

export function sendPersonalityReminder(params: SendReminderParams) {
  const { settings, fallbackTitle, fallbackBody, onClick, ...request } = params;

  if (!settings.personality.enabled) {
    notify(fallbackTitle, fallbackBody, settings, onClick);
    return;
  }

  void generatePersonalityReminder({ ...request, personality: settings.personality.id })
    .then(result => notify(result.title, result.body, settings, onClick))
    .catch(() => notify(fallbackTitle, fallbackBody, settings, onClick));
}
