import { z } from 'zod';

// 書本內容的形狀。活動是 type 判別的 union；每種活動只收自己的 def。
// 跨參照（say 必須是 lines 的鍵、activity.type 必須有註冊的元件）在 validateBook() 與 vitest 裡查。
export const TimeSchema = z.object({ h: z.number().int().min(0).max(23), m: z.union([z.literal(0), z.literal(30)]) });
export type Time = z.infer<typeof TimeSchema>;

const LineId = z.string().min(1);
const HintStep = z.string().regex(/^(repeat|highlight|demonstrate|say:.+)$/);
const Hints = z.object({ afterMs: z.number().int().min(1000), ladder: z.array(HintStep).min(1) });

export const ActivitySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('clock-free'), interactionsToStar: z.number().int().min(1), startTime: TimeSchema }),
  z.object({
    type: z.literal('clock-set'),
    hands: z.enum(['hour', 'both']),
    snap: z.union([z.literal(60), z.literal(30)]),
    startTime: TimeSchema,
    demo: z.object({ say: LineId, to: TimeSchema }).optional(),
    tasks: z.array(z.object({ target: TimeSchema, say: LineId })).min(1),
    hints: Hints,
  }),
  z.object({
    type: z.literal('clock-choose'),
    wrongSay: LineId,
    rightSay: LineId,
    maxWrongBeforeShow: z.number().int().min(1),
    rounds: z.array(z.object({ say: LineId, options: z.array(TimeSchema).min(2).max(4), answer: z.number().int().min(0) })).min(1),
  }),
  z.object({
    type: z.literal('match-time-scene'),
    wrongSay: LineId,
    maxWrongBeforeShow: z.number().int().min(1),
    cards: z.array(z.object({ id: z.string(), icon: z.string(), label: z.string() })).min(2),
    pairs: z.array(z.object({ time: TimeSchema, card: z.string(), say: LineId })).min(1),
  }),
  z.object({ type: z.literal('bridge') }),
  z.object({ type: z.literal('ceremony') }),
]);
export type ActivityDef = z.infer<typeof ActivitySchema>;
export type ActivityType = ActivityDef['type'];

export const PageSchema = z.object({
  id: z.string().min(1),
  say: z.array(LineId),
  doneSay: LineId.optional(),
  countsForCompletion: z.boolean().default(true),
  activity: ActivitySchema,
});
export type PageDef = z.infer<typeof PageSchema>;

export const BookSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  curriculum: z.string().min(1),
  stage: z.literal('clock'),
  reward: z.object({ decoration: z.string(), slot: z.string() }),
  lines: z.record(z.string(), z.string().min(1)),
  pages: z.array(PageSchema).min(1),
});
export type BookDef = z.infer<typeof BookSchema>;

/** 結構 ＋ 跨參照。回傳錯誤訊息陣列，空陣列＝通過。 */
export function validateBook(raw: unknown, knownActivityTypes: readonly string[]): { book: BookDef | null; errors: string[] } {
  const parsed = BookSchema.safeParse(raw);
  if (!parsed.success) return { book: null, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
  const book = parsed.data;
  const errors: string[] = [];
  const line = (id: string, where: string) => {
    if (!(id in book.lines)) errors.push(`${where}: line "${id}" is not in lines`);
  };
  const ids = new Set<string>();
  for (const [pi, page] of book.pages.entries()) {
    const where = `pages[${pi}] ${page.id}`;
    if (ids.has(page.id)) errors.push(`${where}: duplicate page id`);
    ids.add(page.id);
    page.say.forEach((s) => line(s, `${where}.say`));
    if (page.doneSay) line(page.doneSay, `${where}.doneSay`);
    const a = page.activity;
    if (!knownActivityTypes.includes(a.type)) errors.push(`${where}: no activity component registered for "${a.type}"`);
    switch (a.type) {
      case 'clock-set':
        a.tasks.forEach((t, i) => {
          line(t.say, `${where}.tasks[${i}]`);
          if (a.snap === 60 && t.target.m !== 0) errors.push(`${where}.tasks[${i}]: snap 60 cannot target a half hour`);
        });
        a.hints.ladder.forEach((h) => {
          if (h.startsWith('say:')) line(h.slice(4), `${where}.hints`);
        });
        if (a.demo) line(a.demo.say, `${where}.demo`);
        break;
      case 'clock-choose':
        line(a.wrongSay, `${where}.wrongSay`);
        line(a.rightSay, `${where}.rightSay`);
        a.rounds.forEach((r, i) => {
          line(r.say, `${where}.rounds[${i}]`);
          if (r.answer >= r.options.length) errors.push(`${where}.rounds[${i}]: answer index out of options`);
        });
        break;
      case 'match-time-scene': {
        line(a.wrongSay, `${where}.wrongSay`);
        const cardIds = new Set(a.cards.map((c) => c.id));
        a.pairs.forEach((p, i) => {
          line(p.say, `${where}.pairs[${i}]`);
          if (!cardIds.has(p.card)) errors.push(`${where}.pairs[${i}]: card "${p.card}" does not exist`);
        });
        break;
      }
      default:
        break;
    }
  }
  return { book: errors.length ? null : book, errors };
}
