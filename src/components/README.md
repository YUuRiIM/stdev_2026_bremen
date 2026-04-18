# Fermat Character — Integration Guide

반응형 캐릭터 에셋 통합 가이드 (YUuRiIM/stdev_2026_bremen 레포 전용). CRA + React 19 + JSX 환경에 맞춰 준비됐습니다.

## 이 패키지에 담긴 것

```
fermat-react-kit/
├── public/
│   └── assets/
│       └── fermat/
│           ├── manifest.json         # 레이어 메타데이터
│           └── layers/
│               ├── 00_back_hair.png ~ 16_front_hair.png  (17 PSD 레이어)
│               └── chest_l_r1_*.png ~ chest_r_r4_*.png   (16 가슴 모핑 조각)
└── src/
    └── components/
        └── Character.jsx             # 드롭인 React 컴포넌트
```

총 33개 PNG + 1개 manifest + 1개 `.jsx` 컴포넌트.

## 3분 통합 (my-app/ 기준)

### 1. 파일 복사

이 zip의 내용을 `my-app/` 아래에 그대로 머지합니다.

```bash
# zip을 my-app/ 안에서 풀면 자동으로 올바른 위치로 들어갑니다
cd my-app/
unzip fermat-react-kit.zip
# 결과:
#   my-app/public/assets/fermat/...         ← 정적 에셋
#   my-app/src/components/Character.jsx     ← 컴포넌트
```

### 2. 의존성 설치

```bash
cd my-app/
npm install framer-motion@^11
```

> ⚠️ 현재 `package.json`에 `framer-motion` 없습니다. 꼭 설치해야 합니다.
> React 19와 framer-motion 11은 호환됩니다 (공식 지원).

### 3. 사용 예시

예: `my-app/src/screens/CharacterDetailScreen.jsx`에서 쓰고 싶다면

```jsx
import { Character, useManifest } from "../components/Character";

export default function CharacterDetailScreen() {
  const manifest = useManifest("/assets/fermat/manifest.json");

  if (!manifest) return <div>Loading character...</div>;

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
      <Character
        manifest={manifest}
        assetBase="/assets/fermat"
        width={400}
        onReact={() => console.log("touched!")}
      />
    </div>
  );
}
```

### 4. dev 서버 실행

```bash
cd my-app/
npm start
```

브라우저에서:
- 캐릭터 렌더링 확인
- 마우스 움직이면 눈만 따라감
- 클릭/탭하면 전체 반응 + 가슴 바운스

## 동작 명세

`<Character>`가 자동으로 하는 것:

| 행동 | 트리거 | 세부 |
|---|---|---|
| 눈 추적 | `pointermove` | irides 레이어만 ±5.5/1.5px translate, head/body 고정 |
| 깜빡임 | 2.4~6s 랜덤 | 눈 전체 `scaleY(0.08)` 블링크 |
| 고개 젓기/끄덕 | 2.4~6s 랜덤 | 소폭 회전 (±1.8°) |
| 호흡 | 상시 | 몸 전체 `y: [0, -4.5, 0]` 4.4s 루프 |
| 터치 반응 | `pointerdown` | 작은 몸 바운스 + 고개 끄덕 + **16조각 가슴 모핑 임펄스** |

## Props

| prop | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `manifest` | `object` | **필수** | `useManifest(url)` 반환값 |
| `assetBase` | `string` | **필수** | layer PNG들이 서빙되는 경로 (끝에 `/` 없이) |
| `width` | `number \| string` | `360` | CSS 길이, 비율 유지됨 |
| `eyeTrackRadius` | `{x,y}` | `{x:5.5, y:1.5}` | 눈동자 최대 이동 px |
| `idleEnabled` | `boolean` | `true` | 랜덤 idle 애니 끄기 |
| `onReact` | `() => void` | — | 터치 시 콜백 (SFX·점수 등 훅) |
| `style`, `className` | — | — | 컨테이너 CSS |

## 가슴 모핑 상세 (16조각 시스템)

`assets/fermat/layers/chest_*.png` 16개는 PSD topwear에서 자동 추출된 feathered ellipse 조각들입니다.

- 가슴마다 **2열 × 4행 = 8조각** (inner/outer × r1:상단경계 / r2:상부피크 / r3:하부피크 / r4:언더버스트)
- 각 조각은 `useVelocity(bodyY) → useSpring`으로 독립 물리 구동
- 위상 지연 lattice: outer가 먼저, inner 나중. 좌측이 우측보다 40ms 빠르게 → 자연스러운 웨이브
- 터치 시 `touchY` 임펄스로 직접 낙하/튕김 주입
- topwear는 가슴 영역이 alpha 파내져 있어서(`scripts/extract_psd.py`가 처리함) overlay 움직임이 시각적으로 보임

**즉, 통합 측 코드에선 따로 처리할 게 없습니다.** 그냥 manifest 로드해서 `<Character>`에 넘기면 끝.

## 흔한 통합 이슈

- **404 /assets/fermat/manifest.json**
  - CRA는 `public/`의 내용을 루트(`/`)로 서빙합니다. 그러니 `my-app/public/assets/fermat/` 위치가 맞는지 확인.
  - `process.env.PUBLIC_URL`을 쓰는 경우: `` `${process.env.PUBLIC_URL}/assets/fermat/manifest.json` ``

- **화면에 이미지가 안 뜸, 콘솔에 useManifest 에러**
  - 브라우저 네트워크 탭에서 `manifest.json` 200 반환 확인
  - CORS 문제는 CRA dev 서버(동일 오리진)에서 발생하지 않아야 정상

- **framer-motion 설치 안 됐다는 에러**
  - `npm install framer-motion@^11` 재확인. `node_modules/framer-motion/package.json`의 version이 11.x인지.

- **TypeScript로 마이그레이션 계획이라면**
  - 현재 `.jsx`로 제공. TS 버전이 필요하면 별도 요청 주세요 — 내부에 원본 `.tsx`가 있습니다.

## Route에 넣는 예시 (react-router-dom)

```jsx
// App.js 안 <Routes>에 추가
import CharacterScreen from "./screens/CharacterScreen";

<Route path="/character/fermat" element={<CharacterScreen />} />
```

```jsx
// src/screens/CharacterScreen.jsx
import { Character, useManifest } from "../components/Character";
import { useNavigate } from "react-router-dom";

export default function CharacterScreen() {
  const manifest = useManifest("/assets/fermat/manifest.json");
  const navigate = useNavigate();
  if (!manifest) return null;
  return (
    <Character
      manifest={manifest}
      assetBase="/assets/fermat"
      width="min(80vw, 480px)"
      onReact={() => { /* play sfx, trigger dialog, etc. */ }}
    />
  );
}
```

## 커스터마이징 포인트

- **가슴 모핑 세기 조절**: `Character.jsx` 상단의 `PIECE_CFG` 값들
  - `touch`: 터치 시 scale 진폭 (클수록 큰 바운스; mid row 0.26 기본)
  - `touchY`: 터치 시 세로 이동 (px; mid row 3.5 기본)
  - `spring.stiffness/damping/mass`: 스프링 물성
- **호흡 주기**: `runBreathing`의 `duration: 4.4`
- **눈 추적 범위**: `eyeTrackRadius` prop
- **idle 애니 빈도**: Character.jsx 내 `sleep(2400 + Math.random() * 3600)` 값

## 라이선스 / 크레딧

- 아트웍: 별도 제공 (PSD 원본 소유자 권리 유지)
- 컴포넌트 코드: 해커톤 프로젝트 내부 사용

## 문의

통합 이슈 / 추가 캐릭터 / 모핑 튜닝 등은 원 개발자에게 연락 주세요.
