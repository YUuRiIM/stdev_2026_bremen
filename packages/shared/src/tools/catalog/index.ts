import { startLecture, endLecture } from './lecture';
import { playCutscene, setEmotion } from './scene';
import { recordFact } from './memory';
import type { SharedToolDef } from '../types';

export const T0_TOOL_DEFS: SharedToolDef<any, any>[] = [
  startLecture, endLecture, playCutscene, setEmotion, recordFact,
];

export function buildAllToolDefs(): SharedToolDef<any, any>[] {
  return T0_TOOL_DEFS;
}

export { startLecture, endLecture, playCutscene, setEmotion, recordFact };
