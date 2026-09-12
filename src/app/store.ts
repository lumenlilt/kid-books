// 進度儲存：localStorage 一把 key、版本化、最多四位小孩。storage 注入（測試用 Map），
// 「書讀完」「裝飾解鎖」一律從頁面資料推導，不另存旗標（兩份會漂移）。
export const STORE_KEY = 'kidbooks.v1';
export const MAX_PROFILES = 4;
export const AVATAR_IDS = ['sunny', 'river', 'mochi', 'pepper'] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];

export interface PageProgress {
  stars: number;
  attempts: number;
  completedAt: number;
}
export interface BookProgress {
  pages: Record<string, PageProgress>;
  opens: number;
  completedAt?: number;
}
export interface Profile {
  id: AvatarId;
  createdAt: number;
  books: Record<string, BookProgress>;
}
export interface StoreV1 {
  v: 1;
  activeProfileId: AvatarId | null;
  profiles: Profile[];
  settings: { sound: boolean };
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ProgressStore {
  readonly data: StoreV1;
  profiles(): Profile[];
  active(): Profile | null;
  /** 選一位（沒有就建）；超過四位回 null */
  select(id: AvatarId): Profile | null;
  setActive(id: AvatarId | null): void;
  bookOpened(bookId: string): void;
  recordAttempt(bookId: string, pageId: string): void;
  /** 頁面完成：第一次才給星（回傳是否第一次） */
  recordPage(bookId: string, pageId: string): boolean;
  /** 所有計分頁都有星＝讀完；第一次讀完回 true 並記時間 */
  markBookComplete(bookId: string, countingPageIds: readonly string[]): boolean;
  isBookComplete(bookId: string, countingPageIds: readonly string[]): boolean;
  bookStars(bookId: string): number;
  totalStars(): number;
  setSound(on: boolean): void;
  subscribe(fn: (data: StoreV1) => void): () => void;
}

export function isAvatarId(v: unknown): v is AvatarId {
  return typeof v === 'string' && (AVATAR_IDS as readonly string[]).includes(v);
}

function fresh(): StoreV1 {
  return { v: 1, activeProfileId: null, profiles: [], settings: { sound: true } };
}

/** 任何看不懂的東西都回全新——舊資料壞掉不能讓 App 打不開。 */
export function migrate(raw: unknown): StoreV1 {
  if (!raw || typeof raw !== 'object') return fresh();
  const r = raw as Partial<StoreV1>;
  if (r.v !== 1 || !Array.isArray(r.profiles)) return fresh();
  const profiles: Profile[] = [];
  for (const p of r.profiles) {
    if (!p || typeof p !== 'object' || !isAvatarId((p as Profile).id)) continue;
    const pp = p as Profile;
    if (profiles.some((x) => x.id === pp.id)) continue;
    const books: Record<string, BookProgress> = {};
    for (const [bookId, b] of Object.entries(pp.books ?? {})) {
      if (!b || typeof b !== 'object') continue;
      const pages: Record<string, PageProgress> = {};
      for (const [pageId, pg] of Object.entries((b as BookProgress).pages ?? {})) {
        if (!pg || typeof pg !== 'object') continue;
        const g = pg as Partial<PageProgress>;
        pages[pageId] = { stars: Math.max(0, Number(g.stars) || 0), attempts: Math.max(0, Number(g.attempts) || 0), completedAt: Number(g.completedAt) || 0 };
      }
      const entry: BookProgress = { pages, opens: Math.max(0, Number((b as BookProgress).opens) || 0) };
      const done = Number((b as BookProgress).completedAt);
      if (done) entry.completedAt = done;
      books[bookId] = entry;
    }
    profiles.push({ id: pp.id, createdAt: Number(pp.createdAt) || 0, books });
    if (profiles.length >= MAX_PROFILES) break;
  }
  const active = isAvatarId(r.activeProfileId) && profiles.some((p) => p.id === r.activeProfileId) ? r.activeProfileId : null;
  return { v: 1, activeProfileId: active, profiles, settings: { sound: r.settings?.sound !== false } };
}

export function createProgressStore(storage: StorageLike, now: () => number = Date.now): ProgressStore {
  let data: StoreV1;
  try {
    data = migrate(JSON.parse(storage.getItem(STORE_KEY) ?? 'null'));
  } catch {
    data = fresh();
  }
  const listeners = new Set<(d: StoreV1) => void>();
  const save = () => {
    try {
      storage.setItem(STORE_KEY, JSON.stringify(data));
    } catch {
      // 私密模式或配額滿：進度只活在記憶體，App 照常
    }
    for (const fn of listeners) fn(data);
  };
  const book = (p: Profile, bookId: string): BookProgress => (p.books[bookId] ??= { pages: {}, opens: 0 });
  const need = (): Profile | null => data.profiles.find((p) => p.id === data.activeProfileId) ?? null;

  return {
    get data() {
      return data;
    },
    profiles: () => data.profiles,
    active: need,
    select(id) {
      let p = data.profiles.find((x) => x.id === id);
      if (!p) {
        if (data.profiles.length >= MAX_PROFILES) return null;
        p = { id, createdAt: now(), books: {} };
        data.profiles.push(p);
      }
      data.activeProfileId = id;
      save();
      return p;
    },
    setActive(id) {
      data.activeProfileId = id;
      save();
    },
    bookOpened(bookId) {
      const p = need();
      if (!p) return;
      book(p, bookId).opens += 1;
      save();
    },
    recordAttempt(bookId, pageId) {
      const p = need();
      if (!p) return;
      const pages = book(p, bookId).pages;
      const pg = (pages[pageId] ??= { stars: 0, attempts: 0, completedAt: 0 });
      pg.attempts += 1;
      save();
    },
    recordPage(bookId, pageId) {
      const p = need();
      if (!p) return false;
      const pages = book(p, bookId).pages;
      const pg = (pages[pageId] ??= { stars: 0, attempts: 0, completedAt: 0 });
      const first = pg.stars === 0;
      if (first) {
        pg.stars = 1;
        pg.completedAt = now();
      }
      save();
      return first;
    },
    isBookComplete(bookId, ids) {
      const p = need();
      if (!p) return false;
      const pages = p.books[bookId]?.pages ?? {};
      return ids.every((id) => (pages[id]?.stars ?? 0) > 0);
    },
    markBookComplete(bookId, ids) {
      const p = need();
      if (!p || !this.isBookComplete(bookId, ids)) return false;
      const b = book(p, bookId);
      if (b.completedAt) return false;
      b.completedAt = now();
      save();
      return true;
    },
    bookStars(bookId) {
      const p = need();
      if (!p) return 0;
      return Object.values(p.books[bookId]?.pages ?? {}).reduce((s, pg) => s + pg.stars, 0);
    },
    totalStars() {
      const p = need();
      if (!p) return 0;
      return Object.values(p.books).reduce((s, b) => s + Object.values(b.pages).reduce((t, pg) => t + pg.stars, 0), 0);
    },
    setSound(on) {
      data.settings.sound = on;
      save();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
