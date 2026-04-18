import { startLecture, checkObjective, endLecture } from './lecture';
import { playCutscene } from './scene';
import { recordFact } from './memory';
import type { SharedToolDef } from '../types';

export const T0_TOOL_DEFS: SharedToolDef<any, any>[] = [
  startLecture, checkObjective, endLecture, playCutscene, recordFact,
];

export function buildAllToolDefs(): SharedToolDef<any, any>[] {
  return T0_TOOL_DEFS;
}

export {
  startLecture,
  checkObjective,
  endLecture,
  playCutscene,
  recordFact,
};
