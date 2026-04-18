import { voice, type llm } from '@livekit/agents';

export interface MiyeonshiAgentOpts {
  instructions: string;
  tools: llm.ToolContext;
}

export class MiyeonshiAgent extends voice.Agent {
  constructor(opts: MiyeonshiAgentOpts) {
    super({ instructions: opts.instructions, tools: opts.tools });
  }
}
