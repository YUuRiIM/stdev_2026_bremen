import { llm } from '@livekit/agents';
import type { SharedToolDef, ToolContext } from '@mys/shared/tools';
import { affectionAtLeast } from '@mys/shared/tools';

export interface CtxRef {
  current: ToolContext;
}

// Lives in apps/agent so @livekit/agents doesn't leak into packages/shared.
// Reads ctx from the ref on every execute so affection-level upgrades
// propagate without rebuilding the catalog.
export function toLiveKitCatalog(
  defs: SharedToolDef<any, any>[],
  ctxRef: CtxRef,
): llm.ToolContext {
  const catalog: llm.ToolContext = {};
  for (const def of defs) {
    if (
      def.minAffection &&
      !affectionAtLeast(ctxRef.current.affectionLevel, def.minAffection)
    ) {
      continue;
    }
    catalog[def.name] = llm.tool({
      description: def.description,
      parameters: def.parameters,
      execute: async (args: unknown) => {
        const result = await def.execute(args as any, ctxRef.current);
        applyPostExecuteHook(def.name, result, ctxRef);
        return result;
      },
    });
  }
  return catalog;
}

// Keeps ctxRef.current in sync after specific tools mutate server-side state.
// startLecture returns { sessionId, subjectId } which downstream endLecture +
// any other tool needs to see on subsequent calls. Name-based dispatch keeps
// the hook explicit and avoids coupling every tool to ctx mutation concerns.
function applyPostExecuteHook(
  name: string,
  result: unknown,
  ctxRef: CtxRef,
): void {
  if (name === 'startLecture' && result && typeof result === 'object') {
    const r = result as {
      ok?: boolean;
      sessionId?: string;
      subjectId?: string;
    };
    if (r.ok && r.sessionId) ctxRef.current.activeLectureSessionId = r.sessionId;
    if (r.ok && r.subjectId) ctxRef.current.subjectId = r.subjectId;
  }
  if (name === 'endLecture') {
    ctxRef.current.activeLectureSessionId = null;
  }
}
