import { tool } from 'ai';
import type { SharedToolDef, ToolContext } from './types';
import { affectionAtLeast } from './types';

// AI SDK v6 uses `inputSchema` (not `parameters`). minAffection gates visibility.
export function toAiSdkCatalog(
  defs: SharedToolDef<any, any>[],
  ctx: ToolContext,
): Record<string, any> {
  const catalog: Record<string, any> = {};
  for (const def of defs) {
    if (def.minAffection && !affectionAtLeast(ctx.affectionLevel, def.minAffection)) continue;
    catalog[def.name] = tool({
      description: def.description,
      inputSchema: def.parameters,
      execute: async (args: any) => def.execute(args, ctx),
    });
  }
  return catalog;
}
