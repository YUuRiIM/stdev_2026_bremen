import type { SupabaseClient } from '@supabase/supabase-js';
import type { AffectionLevel } from './schema';
import type {
  SubjectPublic,
  SubjectForJudge,
  Objective,
} from '../seed/subjects';
import { stripRubricsForStudent } from '../seed/subjects';

export interface LoadedCharacter {
  id: string;
  slug: string;
  displayName: string;
  tagline: string | null;
  basePersonaPrompt: string;
  personaRevision: number;
  affectionOverlays: Record<AffectionLevel, string>;
  fewShotExamples: Array<{ user: string; assistant: string }>;
  guardrailAdditions: string | null;
  voiceId: string;
  ttsModel: string;
  language: string;
  isDemoReady: boolean;
}

const CHARACTER_COLUMNS =
  'id, slug, display_name, tagline, base_persona_prompt, persona_revision, affection_overlays, few_shot_examples, guardrail_additions, voice_id, tts_model, language, is_demo_ready';

interface RawCharacterRow {
  id: string;
  slug: string;
  display_name: string;
  tagline: string | null;
  base_persona_prompt: string;
  persona_revision: number;
  affection_overlays: unknown;
  few_shot_examples: unknown;
  guardrail_additions: string | null;
  voice_id: string;
  tts_model: string;
  language: string;
  is_demo_ready: boolean;
}

function mapCharacterRow(data: RawCharacterRow): LoadedCharacter {
  return {
    id: data.id,
    slug: data.slug,
    displayName: data.display_name,
    tagline: data.tagline,
    basePersonaPrompt: data.base_persona_prompt,
    personaRevision: data.persona_revision,
    affectionOverlays: data.affection_overlays as Record<AffectionLevel, string>,
    fewShotExamples:
      (data.few_shot_examples as LoadedCharacter['fewShotExamples']) ?? [],
    guardrailAdditions: data.guardrail_additions,
    voiceId: data.voice_id,
    ttsModel: data.tts_model,
    language: data.language,
    isDemoReady: data.is_demo_ready,
  };
}

async function loadCharacterBy(
  supabase: SupabaseClient,
  column: 'id' | 'slug',
  value: string,
  fnName: string,
): Promise<LoadedCharacter | null> {
  const { data, error } = await supabase
    .from('characters')
    .select(CHARACTER_COLUMNS)
    .eq(column, value)
    .maybeSingle();
  if (error) throw new Error(`${fnName} failed: ${error.message}`);
  if (!data) return null;
  return mapCharacterRow(data as RawCharacterRow);
}

export function loadCharacter(
  supabase: SupabaseClient,
  characterId: string,
): Promise<LoadedCharacter | null> {
  return loadCharacterBy(supabase, 'id', characterId, 'loadCharacter');
}

export function loadCharacterBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<LoadedCharacter | null> {
  return loadCharacterBy(supabase, 'slug', slug, 'loadCharacterBySlug');
}

export interface LoadedSubjectRaw {
  id: string;
  topic: string;
  keyterms: string[];
  objectives: Objective[];
  prerequisites: string[];
  difficulty: number;
  characterId: string | null;
}

async function loadSubjectRaw(
  supabase: SupabaseClient,
  subjectId: string,
): Promise<LoadedSubjectRaw | null> {
  const { data, error } = await supabase
    .from('subjects')
    .select('id, topic, keyterms, objectives, prerequisites, difficulty, character_id')
    .eq('id', subjectId)
    .maybeSingle();
  if (error) throw new Error(`loadSubject failed: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    topic: data.topic,
    keyterms: (data.keyterms as string[]) ?? [],
    objectives: (data.objectives as Objective[]) ?? [],
    prerequisites: (data.prerequisites as string[]) ?? [],
    difficulty: data.difficulty,
    characterId: data.character_id,
  };
}

/**
 * Lookup a subject by its human-readable topic (case-insensitive `contains`
 * match; same semantic startLecture uses when the LLM provides a `topic` arg).
 * Preference order when multiple rows match:
 *   1. exact (case-insensitive) match
 *   2. row whose character_id matches `characterId` (if provided)
 *   3. first candidate
 */
async function loadSubjectRawByTopic(
  supabase: SupabaseClient,
  topic: string,
  characterId: string | null,
): Promise<LoadedSubjectRaw | null> {
  const normalized = topic.trim().toLowerCase();
  if (!normalized) return null;

  const filter = characterId
    ? `character_id.eq.${characterId},character_id.is.null`
    : 'character_id.is.null';
  const { data, error } = await supabase
    .from('subjects')
    .select('id, topic, keyterms, objectives, prerequisites, difficulty, character_id')
    .or(filter);
  if (error) throw new Error(`loadSubjectByTopic failed: ${error.message}`);
  if (!data || data.length === 0) return null;

  const matches = data.filter((row) =>
    (row.topic as string).toLowerCase().includes(normalized),
  );
  if (matches.length === 0) return null;

  const exact = matches.find(
    (row) => (row.topic as string).toLowerCase() === normalized,
  );
  const characterMatch = matches.find((row) => row.character_id === characterId);
  const picked = exact ?? characterMatch ?? matches[0]!;
  return {
    id: picked.id,
    topic: picked.topic,
    keyterms: (picked.keyterms as string[]) ?? [],
    objectives: (picked.objectives as Objective[]) ?? [],
    prerequisites: (picked.prerequisites as string[]) ?? [],
    difficulty: picked.difficulty,
    characterId: picked.character_id,
  };
}

// SubjectSeed.characterId is typed as null | 'fermat' literal (Demo MVP);
// coerce any non-null character_id to 'fermat' until the union broadens.
function narrowCharacterId(raw: string | null): null | 'fermat' {
  return raw ? 'fermat' : null;
}

// Rubric-stripped variant. Safe for student agent prompt composition.
export async function loadSubjectForStudent(
  supabase: SupabaseClient,
  subjectId: string,
): Promise<SubjectPublic | null> {
  const raw = await loadSubjectRaw(supabase, subjectId);
  if (!raw) return null;
  return stripRubricsForStudent({
    characterId: narrowCharacterId(raw.characterId),
    topic: raw.topic,
    keyterms: raw.keyterms,
    objectives: raw.objectives,
    prerequisites: raw.prerequisites,
    difficulty: raw.difficulty,
  });
}

/**
 * Topic-keyed variant of {@link loadSubjectForStudent}. Used when the client
 * pre-selects a subject (via /lecture?subject=<slug>) and the agent wants to
 * seed its system prompt with that subject at session start.
 *
 * Returns null if no DB row matches the topic — caller should fall back to the
 * "no active subject, ask the user" path.
 */
export async function loadSubjectForStudentByTopic(
  supabase: SupabaseClient,
  topic: string,
  characterId: string | null,
): Promise<(SubjectPublic & { id: string }) | null> {
  const raw = await loadSubjectRawByTopic(supabase, topic, characterId);
  if (!raw) return null;
  const stripped = stripRubricsForStudent({
    characterId: narrowCharacterId(raw.characterId),
    topic: raw.topic,
    keyterms: raw.keyterms,
    objectives: raw.objectives,
    prerequisites: raw.prerequisites,
    difficulty: raw.difficulty,
  });
  return { ...stripped, id: raw.id };
}

// Includes rubric. ONLY call from the isolated judge LLM module.
// Importing this from agent/web student paths is a security defect.
export async function loadSubjectForJudge(
  supabase: SupabaseClient,
  subjectId: string,
): Promise<SubjectForJudge | null> {
  const raw = await loadSubjectRaw(supabase, subjectId);
  if (!raw) return null;
  return {
    characterId: narrowCharacterId(raw.characterId),
    topic: raw.topic,
    keyterms: raw.keyterms,
    objectives: raw.objectives,
    prerequisites: raw.prerequisites,
    difficulty: raw.difficulty,
  };
}
