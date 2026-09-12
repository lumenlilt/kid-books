import type { Narrator } from '../app/narrator';
import type { BookDef, PageDef } from '../content/schema';
import type { ClockStage } from '../scene/popup/clock-stage';
import type { ClockSvg } from '../ui/clock-svg';

/**
 * 活動元件只透過 ctx 拿資源，不 import 引擎內部（DECISIONS D16）。
 * 卸載靠 signal：元件把計時器與監聽掛在 signal 上，controller abort 就全收。
 */
export interface ActivityContext {
  book: BookDef;
  page: PageDef;
  /** 清空過的控制區（書旁邊最方正的那塊） */
  deck: HTMLElement;
  deckSize: number;
  stage: ClockStage;
  narrator: Narrator;
  /** 建一個接好 3D 鏡射的 SVG 時鐘並掛進 deck；abort 時自動銷毀 */
  mountClock(opts?: { frac?: number; interactive?: boolean; into?: HTMLElement }): ClockSvg;
  /** 把時間鏡射到 3D 鐘面與天色 */
  mirror(total: number): void;
  /** 這一頁完成：星星、下一頁鍵由 controller 接手 */
  complete(): void;
  /** 整本書結束（頒獎頁用）：闔書回書架 */
  finish(): void;
  totalStars(): number;
  /** 答錯／要示範：記進家長報告的重試次數 */
  recordAttempt(): void;
  signal: AbortSignal;
}

export interface Activity {
  /** 先掛（toy-first：旁白還在講，小孩就能戳） */
  mount(ctx: ActivityContext): void | Promise<void>;
  /** 旁白講完才發任務 */
  start(): void | Promise<void>;
}

export const aborted = (signal: AbortSignal): Promise<never> => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));

/** 等某事，或 abort 就丟——活動裡所有 await 都包這個，卸載不會留下殭屍流程 */
export const untilAbort = <T>(p: Promise<T>, signal: AbortSignal): Promise<T> => (signal.aborted ? Promise.reject(new Error('aborted')) : Promise.race([p, aborted(signal)]));
