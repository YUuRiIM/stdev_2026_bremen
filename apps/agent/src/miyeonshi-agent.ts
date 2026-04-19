import { voice, type llm } from '@livekit/agents';

import {
  filterInlineToolMarkup,
  filterInnerMonologue,
} from './inner-monologue-filter';

type TtsNodeReturn = ReturnType<voice.Agent['ttsNode']>;
type TtsNodeModelSettings = Parameters<voice.Agent['ttsNode']>[1];

export interface MiyeonshiAgentOpts {
  instructions: string;
  tools: llm.ToolContext;
  /**
   * Called whenever the character speaks a `(속마음: ...)` block. The caller
   * is expected to publish the text on the `agent.inner_monologue` data-channel
   * topic. Kept as a plain callback so this class stays LiveKit-agnostic.
   */
  onInnerMonologue: (text: string) => void;
}

export class MiyeonshiAgent extends voice.Agent {
  private readonly onInnerMonologue: (text: string) => void;

  constructor(opts: MiyeonshiAgentOpts) {
    super({ instructions: opts.instructions, tools: opts.tools });
    this.onInnerMonologue = opts.onInnerMonologue;
  }

  // Strip `(속마음: ...)` blocks from the text stream before it reaches the
  // TTS engine. Stripped blocks are forwarded to `onInnerMonologue` so the
  // entrypoint can fan them out over the data channel. `useTtsAlignedTranscript`
  // is on by default, so agent transcript events will also reflect the filtered
  // text — the inner monologue never shows up in the assistant bubble.
  override ttsNode(
    text: ReadableStream<string>,
    modelSettings: TtsNodeModelSettings,
  ): TtsNodeReturn {
    const monologueStripped = filterInnerMonologue(text, {
      onMonologue: (t) => this.onInnerMonologue(t),
    });
    const markupStripped = filterInlineToolMarkup(monologueStripped);
    return voice.Agent.default.ttsNode(this, markupStripped, modelSettings);
  }
}
