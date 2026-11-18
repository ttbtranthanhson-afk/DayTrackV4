import { useEffect, useState, useSyncExternalStore } from 'react';
import { getAccountItem, setAccountItem, onAccountChange } from './accountStorage';
import { useScheduleData, getScheduleSnapshot, type ScheduleMap } from './scheduleStore';
import { useCalendarData, getCalendarSnapshot, dateKey, type CalendarScheduleMap } from './calendarStore';
import { dayNameFromDate, type ScheduleBlock } from './scheduleData';

export type WhitelistTriggerMode = 'manual' | 'auto';

export interface FocusWhitelistSettings {
  enabled: boolean;
  triggerMode: WhitelistTriggerMode;
  allowedApps: string[];
  allowedWebsites: string[];
  updatedAt: number;
}

export interface StudyWindow {
  start: number;
  end: number;
  title: string;
}

export type WhitelistAddResult = 'added' | 'duplicate' | 'invalid' | 'core';

export const STORAGE_KEY = 'daytrack_focus_whitelist';
export const CORE_ALLOWED_APPS = [
  'DayTrack',
  'Google Chrome',
  'Microsoft Edge',
  'Mozilla Firefox',
  'Safari',
];

export const CORE_ALLOWED_WEBSITES = ['daytrack.app', 'localhost', '127.0.0.1'];

export const QUICK_ADD_APPS = [
  { label: 'VS Code', value: 'Code.exe' },
  { label: 'Notion', value: 'Notion' },
  { label: 'Anki', value: 'Anki' },
  { label: 'Obsidian', value: 'Obsidian.exe' },
  { label: 'Figma', value: 'Figma' },
];

export const QUICK_ADD_WEBSITES = [
  { label: 'GitHub', value: 'github.com' },
  { label: 'Google', value: 'google.com' },
  { label: 'Stack Overflow', value: 'stackoverflow.com' },
  { label: 'Google Docs', value: 'docs.google.com' },
  { label: 'Notion', value: 'notion.so' },
  { label: 'Coursera', value: 'coursera.org' },
];

const DEFAULT_SETTINGS: FocusWhitelistSettings = {
  enabled: false,
  triggerMode: 'manual',
  allowedApps: [],
  allowedWebsites: [],
  updatedAt: Date.now(),
};

const STUDY_TITLE_PATTERN = /(học|study|work|làm việc|deadline|ôn thi|tự học|nghiên cứu|đọc sách)/i;

function normalizeAppName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function appKey(value: string): string {
  return normalizeAppName(value).toLocaleLowerCase('vi');
}

function sanitizeApps(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const name = normalizeAppName(item);
    const key = appKey(name);
    if (!name || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

function sanitizeWebsite(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let input = value.trim().toLowerCase();
  if (!input) return null;
  if (!input.includes('://')) input = `https://${input}`;
  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
    if (!host) return null;
    if (host === 'localhost') return host;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host;
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) return null;
    return host;
  } catch {
    return null;
  }
}

function sanitizeWebsites(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    const host = sanitizeWebsite(item);
    if (!host || seen.has(host)) continue;
    seen.add(host);
    result.push(host);
  }
  return result;
}

function load(): FocusWhitelistSettings {
  try {
    const raw = getAccountItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FocusWhitelistSettings>;
      return {
        enabled: Boolean(parsed.enabled),
        triggerMode: parsed.triggerMode === 'auto' ? 'auto' : 'manual',
        allowedApps: sanitizeApps(parsed.allowedApps),
        allowedWebsites: sanitizeWebsites(parsed.allowedWebsites),
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
      };
    }
  } catch {
    // ignore malformed storage
  }
  return { ...DEFAULT_SETTINGS, allowedApps: [], allowedWebsites: [] };
}

let whitelistState: FocusWhitelistSettings = load();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): FocusWhitelistSettings {
  return whitelistState;
}

function emit() {
  setAccountItem(STORAGE_KEY, JSON.stringify(whitelistState));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('daytrack:focus-whitelist-updated'));
  }
  listeners.forEach(listener => listener());
}

onAccountChange(() => {
  whitelistState = load();
  listeners.forEach(listener => listener());
});

function update(patch: Partial<FocusWhitelistSettings>) {
  whitelistState = { ...whitelistState, ...patch, updatedAt: Date.now() };
  emit();
}

export function useFocusWhitelist(): FocusWhitelistSettings {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function getFocusWhitelistSnapshot(): FocusWhitelistSettings {
  return whitelistState;
}

export function setFocusWhitelistEnabled(enabled: boolean) {
  if (whitelistState.enabled === enabled) return;
  update({ enabled });
}

export function setFocusWhitelistTriggerMode(triggerMode: WhitelistTriggerMode) {
  if (whitelistState.triggerMode === triggerMode) return;
  update({ triggerMode });
}

export function addAllowedApp(value: string): WhitelistAddResult {
  const name = normalizeAppName(value);
  if (!name) return 'invalid';
  const key = appKey(name);
  if (CORE_ALLOWED_APPS.some(app => appKey(app) === key)) return 'core';
  if (whitelistState.allowedApps.some(app => appKey(app) === key)) return 'duplicate';
  update({ allowedApps: [...whitelistState.allowedApps, name] });
  return 'added';
}

export function removeAllowedApp(value: string) {
  const key = appKey(value);
  update({ allowedApps: whitelistState.allowedApps.filter(app => appKey(app) !== key) });
}

export function addAllowedWebsite(value: string): WhitelistAddResult {
  const host = sanitizeWebsite(value);
  if (!host) return 'invalid';
  if (CORE_ALLOWED_WEBSITES.includes(host)) return 'core';
  if (whitelistState.allowedWebsites.includes(host)) return 'duplicate';
  update({ allowedWebsites: [...whitelistState.allowedWebsites, host] });
  return 'added';
}

export function removeAllowedWebsite(value: string) {
  const host = sanitizeWebsite(value);
  if (!host) return;
  update({ allowedWebsites: whitelistState.allowedWebsites.filter(item => item !== host) });
}

function parseBlockWindow(value: string): { start: number; end: number } | null {
  const match = value.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const start = Number(match[1]) * 60 + Number(match[2]);
  const end = Number(match[3]) * 60 + Number(match[4]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return { start, end };
}

export function isStudyBlock(block: ScheduleBlock): boolean {
  return block.type === 'study' || STUDY_TITLE_PATTERN.test(block.title);
}

export function collectStudyWindows(
  scheduleData: ScheduleMap,
  calendarData: CalendarScheduleMap,
  now: Date = new Date(),
): StudyWindow[] {
  const weekdayBlocks = scheduleData[dayNameFromDate(now)] ?? [];
  const key = dateKey(now.getFullYear(), now.getMonth(), now.getDate());
  const dateBlocks = calendarData[key] ?? [];
  const blocks = [...weekdayBlocks, ...dateBlocks];

  return blocks
    .filter(isStudyBlock)
    .map(block => {
      const window = parseBlockWindow(block.time);
      return window ? { ...window, title: block.title } : null;
    })
    .filter((window): window is StudyWindow => window !== null);
}

function isWithinStudyWindow(now: Date, windows: StudyWindow[]): boolean {
  const minutes = now.getHours() * 60 + now.getMinutes();
  return windows.some(window => minutes >= window.start && minutes < window.end);
}

export function isFocusLockActive(
  settings: FocusWhitelistSettings,
  now: Date = new Date(),
  scheduleData: ScheduleMap = getScheduleSnapshot(),
  calendarData: CalendarScheduleMap = getCalendarSnapshot(),
): boolean {
  if (!settings.enabled) return false;
  if (settings.triggerMode === 'manual') return true;
  return isWithinStudyWindow(now, collectStudyWindows(scheduleData, calendarData, now));
}

export function useFocusLockActive(): boolean {
  const settings = useFocusWhitelist();
  const scheduleData = useScheduleData();
  const calendarData = useCalendarData();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  return isFocusLockActive(settings, now, scheduleData, calendarData);
}

export function normalizeHostname(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, '').replace(/\.$/, '');
}

function hostMatches(host: string, allowed: string): boolean {
  const cleanHost = normalizeHostname(host);
  const cleanAllowed = normalizeHostname(allowed);
  if (!cleanHost || !cleanAllowed) return false;
  return cleanHost === cleanAllowed || cleanHost.endsWith(`.${cleanAllowed}`);
}

export function isWebsiteAllowed(
  hostname: string,
  settings: FocusWhitelistSettings,
  extraHosts: string[] = [],
): boolean {
  const allowed = [...CORE_ALLOWED_WEBSITES, ...settings.allowedWebsites, ...extraHosts];
  return allowed.some(item => hostMatches(hostname, item));
}

export function isUrlAllowed(
  url: string,
  settings: FocusWhitelistSettings,
  extraHosts: string[] = [],
): boolean {
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.href : undefined);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true;
    return isWebsiteAllowed(parsed.hostname, settings, extraHosts);
  } catch {
    return true;
  }
}

export function getCurrentStudyWindow(
  scheduleData: ScheduleMap = getScheduleSnapshot(),
  calendarData: CalendarScheduleMap = getCalendarSnapshot(),
  now: Date = new Date(),
): StudyWindow | null {
  const minutes = now.getHours() * 60 + now.getMinutes();
  return (
    collectStudyWindows(scheduleData, calendarData, now).find(
      window => minutes >= window.start && minutes < window.end,
    ) ?? null
  );
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
