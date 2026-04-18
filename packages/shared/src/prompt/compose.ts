import type { LoadedCharacter } from '../db/loaders';
import type { SubjectPublic } from '../seed/subjects';
import type { AffectionLevel } from '../db/schema';
import { BASE_GUARDRAILS_EN } from '../seed/characters';

export interface ComposeContext {
  character: LoadedCharacter;
  affectionLevel: AffectionLevel;
  subject?: SubjectPublic | null;
  channel: 'voice' | 'text';
}

const CHANNEL_HINTS: Record<'voice' | 'text', string> = {
  voice: `## 채널 힌트
음성 채널이다. 답변은 짧고 명확하게 — 자연스러운 구어체로 2~3 문장 이내. 마크다운, 목록, 코드 블록은 쓰지 않는다.`,
  text: `## 채널 힌트
텍스트 채널이다. 필요하면 더 상세하게 설명해도 되고 마크다운도 허용된다.`,
};

function renderAffectionOverlay(character: LoadedCharacter, level: AffectionLevel): string {
  const overlay = character.affectionOverlays?.[level];
  if (!overlay) return '';
  return `## 현재 관계 톤 (${level})\n${overlay}`;
}

function renderSubjectBlock(subject: SubjectPublic): string {
  const lines: string[] = ['## 오늘의 주제', `주제: ${subject.topic}`];
  if (subject.objectives.length > 0) {
    lines.push('', '강의 목표 (너는 이 목표들의 존재만 안다; 채점 기준은 알 수 없다):');
    for (const obj of subject.objectives) {
      lines.push(`- ${obj.statement}`);
    }
  }
  return lines.join('\n');
}

export function composeSystemPrompt(opts: ComposeContext): string {
  const parts: string[] = [];
  parts.push(BASE_GUARDRAILS_EN);
  parts.push(`## 너의 설정\n${opts.character.basePersonaPrompt}`);

  const overlay = renderAffectionOverlay(opts.character, opts.affectionLevel);
  if (overlay) parts.push(overlay);

  if (opts.character.guardrailAdditions) {
    parts.push(`## 추가 가드레일\n${opts.character.guardrailAdditions}`);
  }

  if (opts.subject) {
    parts.push(renderSubjectBlock(opts.subject));
  }

  if (opts.character.fewShotExamples?.length) {
    const shots = opts.character.fewShotExamples
      .map((ex) => `- 유저: ${ex.user}\n  너: ${ex.assistant}`)
      .join('\n');
    parts.push(`## 예시 대화 (톤 참고)\n${shots}`);
  }

  parts.push(CHANNEL_HINTS[opts.channel]);

  return parts.join('\n\n');
}
