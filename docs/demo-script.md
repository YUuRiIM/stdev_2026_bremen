# Demo Script — 3분 시연 시나리오

**대상**: 해커톤 데모
**주인공 캐릭터**: 페르마 (fermat)
**주제**: 페르마 소정리

---

## 준비 (시연 시작 전, 5분 마진)

- [ ] 새 Incognito 브라우저 창 열기
- [ ] 테스트 계정 매직링크 미리 발송 → 수신함 열어 두기 (마진 없음)
- [ ] LiveKit Cloud agent "warm" 상태 확인 (paid plan)
- [ ] 개발자 도구 Console 열어서 `audit_log` 마지막 에러 없는지 체크
- [ ] (선택) 두 번째 창: Google Meet 방 미리 열기 (Scene 5용)
- [ ] 볼륨·마이크 체크

---

## Scene 1 — 로그인 & 캐릭터 선택 (30초)

**화면 전환**: 랜딩 → 매직링크 로그인 → 캐릭터 선택

**발표자 멘트**:
> "미연시 게임인데요, 전통적인 미연시와 다른 건 — 유저인 교수님이
> 미소녀 대학원생에게 강의를 하는 reverse tutoring 구조입니다."

**조작**:
1. 이메일 입력 → "매직링크 받기"
2. (미리 받은) 수신함에서 링크 클릭 → 로그인
3. 캐릭터 선택창: 페르마 4명 타일 — 1명 활성 + 3명 "Coming soon" disabled
4. **페르마** 타일 클릭

**기대 UI**:
- 페르마 sprite `neutral`
- "대학원 신입생 · 정수론" 같은 tagline
- "Talk" 버튼

---

## Scene 2 — 첫 인사 (30초)

**조작**: "Talk" 클릭 → LiveKit 연결 (1~2초)

**AI 첫 발화** (stranger level, base_persona 기반):
> "……안녕하세요, 교수님. 저, 페르마입니다.
> 오늘 랩미팅…… 처음이라 조금 떨리는데요."

**유저 발화**:
> "응, 페르마 씨. 반가워요. 오늘은 페르마 소정리 가볍게 같이 볼까?"

**AI 반응** (여전히 stranger~acquaintance 언저리):
> "아, 네! 교수님 편하신 대로요. ……저는, 준비됐어요."

**발표자 멘트 (옵션)**:
> "STT는 Deepgram 한국어 nova-3, LLM은 Gemini 3 Flash Preview,
> TTS는 ElevenLabs Flash v2.5로 종단 latency 1.5초 이내를 목표로 잡았어요."

---

## Scene 3 — LECTURE 진행 (약 90초)

**조작**: 유저가 강의 시작 버튼 (혹은 대화에서 자연스럽게 트리거되어
`startLecture` tool 호출 → `lecture.state` = `lecturing` 브로드캐스트).

### 3-A: Objective 1 — 정리 선언문

**유저**:
> "p가 소수일 때, a랑 p가 서로소면 a의 p-1 제곱이 p로 나눈 나머지가 1이 돼.
> 이걸 페르마 소정리라고 해."

**AI 반응**:
> "……아, 그러니까 p가 소수인 게 핵심 조건이네요.
> 서로소 조건은 왜 필요한 거죠? 혹시 0 예외 때문인가요?"

*(agent가 대화 중에 자연스럽게 질문 생성 — `expressUnderstanding` 간접 호출)*

### 3-B: Objective 2 — 수치 예시

**유저**:
> "예를 들어 a=2, p=5면 2의 4제곱이 16이지?
> 16을 5로 나누면 나머지가 1. 확인되지?"

**AI 반응**:
> "네! 16 나누기 5, 나머지 1. ……
> 아, 그러니까 이게 아까 제가 풀어본 퀴즈에서 2⁴ mod 5 문제랑 같은 원리였네요."

*(페르마가 PREP 모드에서 본 퀴즈를 기억하는 듯한 자연스러운 반응
— 사실은 LLM이 prompt의 `LEARNING_STATE`를 읽고 지어냄)*

### 3-C: Objective 3 — 활용

**유저**:
> "이거 덕분에 RSA 암호도 가능한 거야.
> 소수 판정에서도 밀러-라빈 같은 알고리즘에 쓰이고."

**AI 반응**:
> "밀러-라빈…… 들어본 적은 있어요.
> 오일러 정리까지 가면 더 강한 판정이 된다던 그 이야기, 맞죠?"

*(페르마가 심화 지식을 slight하게 드러내는 순간 — stranger → acquaintance
전이 조건 충족)*

---

## Scene 4 — Cutscene + 호감도 승격 (30초)

**조작**: 유저가 `endLecture` (또는 자연스러운 "이 정도면 충분해" 발화에서
트리거) → agent가 judge LLM 호출 → verdict 산출 → `applyVerdict`:
- `understoodConcepts`에 `flt_statement`, `flt_example`, `flt_applications` upsert
- `affectionDelta = +12`
- stranger(0) → acquaintance(12) 승격
- `events.approved_smile` 조건 충족 → `playCutscene({eventKey: 'approved_smile'})`

**화면**:
- `cutscene.play` 데이터 채널 수신 → FE가 `<video>` 풀스크린 재생 (2~3초)
  - 페르마가 작게 웃으며 노트에 뭔가 적는 컷 (스토리 2막 말미 "마지막 줄 +1" 장면)
- `emotion.change { emotion: 'happy' }` → 스프라이트 교체
- `cutscene.end` → TTS 재개

**AI 응답** (acquaintance tone으로 톤 전환):
> "교수님…… 오늘 설명이요.
> 교과서에서 봤을 때랑, 느낌이 좀 달랐어요. 진짜로 누가 발견한 정리처럼요.
> ……감사합니다."

**발표자 멘트**:
> "방금 LLM-as-judge가 rubric에 대해 평가하고, 유저에게는 보이지 않는
> `__bump_affection` 사이드채널로 호감도가 상승했습니다.
> 중요한 건 — 페르마 캐릭터 자신은 rubric이나 점수 같은 건 절대 모릅니다.
> double-blind 구조라서 roleplay 일관성이 유지됩니다."

---

## Scene 5 — Meet 브리지 (옵션, 30초)

**사전 준비**: 두 번째 창에서 Google Meet 방 1개 생성 (테스트 계정).

**조작**:
1. 첫 창에서 "Invite Fermat to Meet" 버튼
2. Recall.ai bot이 Meet 방에 합류 (봇 이름: "페르마 (AI)")
3. Meet에서 유저가 한 번 더 발화: "페르마 씨, 여기선 짧게 인사만 할게요."
4. AI가 Meet 오디오로 응답:
   > "네 교수님. 장소가 바뀌어도 저는 똑같아요.
   > ……혹시 다른 분들도 계세요?"

**발표자 멘트 (핵심 메시지)**:
> "주목하실 건 — Meet에서 대화 로직이 바뀐 게 아닙니다.
> Transport 어댑터 한 파일만 추가했을 뿐, `MiyeonshiAgent`·tool catalog·
> context composition·judge 전부 0줄 수정입니다.
> 이게 저희가 초반부터 고집한 **homomorphic core + adapter** 설계의 실증입니다."

---

## 마무리 (10초)

**발표자 멘트**:
> "3분 안에 보여드린 건 1 캐릭터·1 주제지만, 스키마와 어댑터 구조가
> 그대로 n명·n개·n transport로 확장됩니다. 감사합니다."

---

## 리허설 체크리스트

- [ ] 골든 패스 끝까지 한 번
- [ ] Scene 3에서 agent가 objective 하나 놓치면 어떻게 될지 에러 시나리오
- [ ] LiveKit 연결 끊김 시 "다시 연결" 대응
- [ ] Recall.ai 봇이 Meet 입장 실패 시 fallback 멘트
- [ ] 전체 3회 실행 성공 후에만 데모 진입

---

## 실패 대응 (현장 응급처치)

| 상황 | 대응 |
|---|---|
| 매직링크 메일 지연 | 미리 로그인해둔 탭으로 전환 |
| LiveKit cold start | "warm 상태 아니면 paid plan 확인" — 재접속 1회 |
| Gemini 3 preview 에러 | 환경변수 `VOICE_LLM_MODEL=gemini-2.5-flash` 즉시 적용 후 agent 재배포 |
| ElevenLabs 음성 어색 | preset Korean voice `XXX`로 fallback |
| Judge verdict JSON 깨짐 | 데모 중엔 "시간 관계상 채점 건너뛰기" 멘트 후 수동 `affection +10` |
| Recall.ai bot 입장 실패 | Scene 5 스킵. "Meet 통합은 아키텍처 슬라이드로 대체" |
