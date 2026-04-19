/**
 * Inner-monologue stream filter.
 *
 * LLM 은 평소 말투와 함께 `(속마음: ...)` 패턴으로 속마음을 흘린다. 이 패턴은
 * TTS 로 발화되면 안 되고, 별도로 data-channel `agent.inner_monologue` 토픽
 * 으로만 내보내야 한다.
 *
 * LLM 이 텍스트를 chunk 단위로 스트리밍하기 때문에 `(속마음: hi)` 한 덩어리가
 * 여러 chunk 에 걸쳐 쪼개질 수 있다. 이 필터는 상태 기반으로 buffer 를 끌어가며
 *   - speech: 일반 텍스트는 그대로 downstream
 *   - monologue: 여는 `(속마음` 부터 닫는 `)` 까지 모아 emit 콜백으로만 전달
 * 처럼 동작한다. `)` 가 안 보이고 턴이 끝나면 close-paren 없이도 flush.
 */

const OPEN_MARKERS = ['(속마음', '（속마음'];
const CLOSE_CHARS = new Set([')', '）']);

/** Returns the earliest index at which any open marker starts, or -1. */
function findOpenStart(s: string): { index: number; marker: string } | null {
  let best: { index: number; marker: string } | null = null;
  for (const m of OPEN_MARKERS) {
    const i = s.indexOf(m);
    if (i === -1) continue;
    if (!best || i < best.index) best = { index: i, marker: m };
  }
  return best;
}

/**
 * Longest suffix of `s` that could still be the prefix of any open marker.
 * e.g. trailing `(속` should be held back until we see the next char.
 */
function maxPartialPrefixLength(s: string): number {
  let max = 0;
  for (const m of OPEN_MARKERS) {
    const limit = Math.min(m.length - 1, s.length);
    for (let n = limit; n > 0; n--) {
      if (m.startsWith(s.slice(s.length - n))) {
        if (n > max) max = n;
        break;
      }
    }
  }
  return max;
}

function findClose(s: string): number {
  for (let i = 0; i < s.length; i++) {
    if (CLOSE_CHARS.has(s[i]!)) return i;
  }
  return -1;
}

export interface InnerMonologueFilterOpts {
  /** Fired for each completed monologue block, with the body only (markers stripped). */
  onMonologue: (text: string) => void;
}

/**
 * Wrap a ReadableStream<string> so that `(속마음: ...)` blocks are stripped
 * from the output stream and instead emitted via `opts.onMonologue`.
 */
export function filterInnerMonologue(
  upstream: ReadableStream<string>,
  opts: InnerMonologueFilterOpts,
): ReadableStream<string> {
  return new ReadableStream<string>({
    async start(controller) {
      const reader = upstream.getReader();
      let buffer = '';
      let mode: 'speech' | 'monologue' = 'speech';
      let monologueBuf = '';

      const flushMonologue = () => {
        const body = stripOpenMarkerAndPrefix(monologueBuf);
        if (body) opts.onMonologue(body);
        monologueBuf = '';
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;
          buffer += value;

          // Drain as much as possible from the buffer without waiting for more.
          // eslint-disable-next-line no-constant-condition
          while (true) {
            if (mode === 'speech') {
              const hit = findOpenStart(buffer);
              if (hit) {
                if (hit.index > 0) controller.enqueue(buffer.slice(0, hit.index));
                monologueBuf = buffer.slice(hit.index);
                buffer = '';
                mode = 'monologue';
                continue;
              }
              const hold = maxPartialPrefixLength(buffer);
              if (buffer.length > hold) {
                controller.enqueue(buffer.slice(0, buffer.length - hold));
                buffer = buffer.slice(buffer.length - hold);
              }
              break;
            }
            // mode === 'monologue'
            monologueBuf += buffer;
            buffer = '';
            const closeAt = findClose(monologueBuf);
            if (closeAt === -1) break;
            const head = monologueBuf.slice(0, closeAt);
            const tail = monologueBuf.slice(closeAt + 1);
            monologueBuf = head;
            flushMonologue();
            buffer = tail;
            mode = 'speech';
          }
        }

        // Upstream closed. Flush remainder.
        if (mode === 'monologue') {
          monologueBuf += buffer;
          flushMonologue();
        } else if (buffer) {
          controller.enqueue(buffer);
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

/**
 * Given an accumulated monologue buffer like `(속마음: 교수님의 눈물`,
 * strip the open marker + optional `:` + leading whitespace.
 */
function stripOpenMarkerAndPrefix(raw: string): string {
  let s = raw;
  for (const m of OPEN_MARKERS) {
    if (s.startsWith(m)) {
      s = s.slice(m.length);
      break;
    }
  }
  // optional `:` or full-width `：` then whitespace
  s = s.replace(/^[:：]\s*/, '').trim();
  return s;
}

/**
 * Strip inline XML-ish self-closing tool-call markup that Gemini occasionally
 * hallucinates into prose, e.g. `<showFormula(latex="…", speakAs="…") />`.
 * Tool calls must travel as structured function_call parts — never as voiced
 * prose. Works chunk-by-chunk via a tiny state machine so markup split across
 * stream frames is dropped cleanly before ever reaching TTS.
 */
export function filterInlineToolMarkup(
  upstream: ReadableStream<string>,
): ReadableStream<string> {
  return new ReadableStream<string>({
    async start(controller) {
      const reader = upstream.getReader();
      let buffer = '';
      let mode: 'speech' | 'maybe' | 'inside' = 'speech';
      let tagDepth = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;
          buffer += value;

          // eslint-disable-next-line no-constant-condition
          while (true) {
            if (mode === 'speech') {
              const lt = buffer.indexOf('<');
              if (lt === -1) {
                controller.enqueue(buffer);
                buffer = '';
                break;
              }
              if (lt > 0) controller.enqueue(buffer.slice(0, lt));
              buffer = buffer.slice(lt);
              mode = 'maybe';
              continue;
            }
            if (mode === 'maybe') {
              // Need at least 2 chars to decide: `<` + next.
              if (buffer.length < 2) break;
              const c = buffer.charCodeAt(1);
              const isLetter =
                (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
              if (!isLetter) {
                // Not a tag — emit the `<` and resume normal speech.
                controller.enqueue('<');
                buffer = buffer.slice(1);
                mode = 'speech';
                continue;
              }
              mode = 'inside';
              tagDepth = 1;
              continue;
            }
            // mode === 'inside' — consume until the top-level tag closes.
            const gt = buffer.indexOf('>');
            if (gt === -1) break;
            const head = buffer.slice(0, gt + 1);
            buffer = buffer.slice(gt + 1);
            // Handle rudimentary nesting (LLM rarely emits it, but be safe).
            const opens = (head.match(/<[A-Za-z]/g) ?? []).length;
            const closes = (head.match(/\/>/g) ?? []).length + (head.endsWith('>') ? 0 : 0);
            tagDepth += opens - 1; // the `<` that put us in inside-mode was already counted
            tagDepth -= closes;
            if (tagDepth <= 0) {
              mode = 'speech';
              tagDepth = 0;
            }
          }
        }

        // Upstream closed. Flush only speech residue; any unfinished tag is
        // discarded (it was never going to voice cleanly anyway).
        if (mode === 'speech' && buffer) controller.enqueue(buffer);
        controller.close();
      } catch (err) {
        controller.error(err);
      } finally {
        reader.releaseLock();
      }
    },
  });
}
