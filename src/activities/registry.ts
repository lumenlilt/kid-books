import type { ActivityDef, ActivityType } from '../content/schema';
import { createBridge } from './bridge';
import { createCeremony } from './ceremony';
import { createClockChoose } from './clock-choose';
import { createClockFree } from './clock-free';
import { createClockSet } from './clock-set';
import { createMatchTimeScene } from './match-time-scene';
import type { Activity } from './types';

type DefOf<T extends ActivityType> = Extract<ActivityDef, { type: T }>;

/** 活動元件註冊表：type → 建構子。新書要新元件就在這裡加一行（DECISIONS D16）。 */
export const activities: { [T in ActivityType]: (def: DefOf<T>) => Activity } = {
  'clock-free': createClockFree,
  'clock-set': createClockSet,
  'clock-choose': createClockChoose,
  'match-time-scene': createMatchTimeScene,
  bridge: createBridge,
  ceremony: createCeremony,
};

export const ACTIVITY_TYPES: readonly ActivityType[] = Object.keys(activities) as ActivityType[];

export function createActivity(def: ActivityDef): Activity {
  const factory = activities[def.type] as (d: ActivityDef) => Activity;
  return factory(def);
}
