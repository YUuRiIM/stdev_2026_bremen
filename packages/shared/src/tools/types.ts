import type { z, ZodObject, ZodRawShape } from 'zod';
import type { ToolContext } from '../types';
import type { AffectionLevel } from '../db/schema';

export type { ToolContext };

export interface SharedToolDef<TShape extends ZodRawShape = ZodRawShape, TResult = unknown> {
  name: string;
  description: string;
  parameters: ZodObject<TShape>;
  execute: (args: z.infer<ZodObject<TShape>>, ctx: ToolContext) => Promise<TResult>;
  /** Optional affection gating; defaults to 'stranger' (always visible). */
  minAffection?: AffectionLevel;
}

const LEVEL_RANK: Record<AffectionLevel, number> = {
  stranger: 0,
  acquaintance: 1,
  friend: 2,
  close: 3,
  lover: 4,
};

export function affectionAtLeast(current: AffectionLevel, needed: AffectionLevel): boolean {
  return LEVEL_RANK[current] >= LEVEL_RANK[needed];
}
