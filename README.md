# AIVIS-Q Abdomen CT

성인 및 소아 복부 CT 고형장기 자동화 분할 소프트웨어

## 🎯 프로젝트 개요

AIVIS-Q Abdomen CT는 복부 CT 영상에서 간(Liver)과 비장(Spleen)을 자동으로 분할하고 볼륨을 측정하는 의료용 워크스테이션 웹 애플리케이션입니다.

## 🚀 주요 기능

### 1. 로그인 시스템
- 아이디/비밀번호 기반 로그인
- 병원별 접근 제어

### 2. CT 파일 업로드 및 AI 추론
- **지원 포맷**: DICOM (.dcm), NIfTI (.nii, .nii.gz)
- **Drag & Drop** 업로드
- **3단계 추론 프로세스**:
  - 파일 전처리
  - nnU-Net 추론
  - 결과 생성

### 3. 4분할 CT 뷰어 (Niivue 기반)
- **Axial**: 축상면
- **Coronal**: 관상면
- **Sagittal**: 시상면
- **3D View**: 3차원 렌더링
- **실시간 컨트롤**:
  - Brightness (밝기)
  - Contrast (대비)
  - Mask Opacity (마스크 투명도)

### 4. 환자 정보 및 분석 결과
- 환자 기본 정보 (이름, 성별, 생년월일, 촬영일자, 나이)
- **AI 추정값**:
  - 간 볼륨 (cc)
  - 비장 볼륨 (cc)
  - 간/비장 비율 (LSVR)
- **사용자 수정값**:
  - Segmentation 수정 후 재계산된 볼륨
  - Δ값 (변화량) 표시

### 5. Segmentation 수정 기능
- **Draw 모달**: 브러시/지우개 툴로 세그멘테이션 수정
- **Comparison 모달**: 원본 vs 수정본 비교
- 수정 후 자동 볼륨 재계산

### 6. 소아 참고치 비교
- 성별, 생년월일, 키, 체중, 나이 입력
- **백분위수 비교표** (5%, 25%, 50%, 75%, 95%)
- **그래프 시각화** (체중별 정상 범위)

### 7. 결과 다운로드
- 전처리 CT 이미지 (NIfTI)
- Segmentation Mask (NIfTI)
- 분석 결과 CSV
- PDF 리포트

## 🛠️ 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **CT Viewer**: Niivue
- **Package Manager**: npm

## 📦 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

서버가 실행되면 [http://localhost:3000](http://localhost:3000)에서 접근 가능합니다.

### 3. 빌드

```bash
npm run build
```

### 4. 프로덕션 실행

```bash
npm start
```

## 📁 프로젝트 구조

```
AIVISQ/
├── app/
│   ├── login/          # 로그인 페이지
│   ├── app/            # 메인 워크스테이션
│   ├── globals.css     # 전역 스타일
│   └── layout.tsx      # 루트 레이아웃
├── components/
│   ├── layout/         # AppLayout
│   ├── upload/         # CtUploadPanel
│   ├── viewer/         # SingleCtView, MultiViewCtViewer, ViewControls
│   ├── sidepanel/      # PatientInfoCard, VolumeMetricsCard, ReferenceButton
│   ├── download/       # DownloadPanel
│   └── modals/         # DrawSegmentationModal, ComparisonModal, PediatricReferenceModal
├── lib/
│   └── ctTypes.ts      # TypeScript 타입 정의
├── store/
│   └── useCtSessionStore.ts  # Zustand 전역 상태
└── README.md
```

## 🎨 디자인 시스템

### 색상 팔레트

| 용도 | 색상 코드 | 설명 |
|------|-----------|------|
| 페이지 배경 | `#020617` | 다크 네이비 블랙 |
| 헤더 배경 | `#030712` | 살짝 밝은 다크 톤 |
| 카드 배경 | `#0B1220` | 짙은 남색 카드 |
| 포인트 색 (Primary) | `#0066CC` | 서울대병원 블루 (버튼, 슬라이더) |
| 포인트 색 (Hover) | `#004A99` | 진한 블루 (호버 상태) |
| 간 (Liver) | `#22C55E` | 초록색 |
| 비장 (Spleen) | `#EF4444` | 빨간색 |

### 레이아웃

- **상단 고정 헤더**: 56px (서비스명, 병원명, 계정)
- **좌측 메인 영역**: flex-1 (업로드 + 뷰어 + 컨트롤)
- **우측 사이드 패널**: 320px (환자정보 + 분석결과 + 다운로드)

## 🔧 TODO 및 확장 계획

### 현재 구현된 기능
- ✅ 로그인 페이지
- ✅ CT 업로드 패널 (파일 검증 포함)
- ✅ 4분할 Niivue 뷰어 (기본 구조)
- ✅ 밝기/대비/투명도 컨트롤
- ✅ 환자 정보 및 볼륨 메트릭 카드
- ✅ Segmentation 수정/비교 모달
- ✅ 소아 참고치 비교 모달
- ✅ 다운로드 패널

### 향후 구현 필요 사항
- [ ] **백엔드 API 연동**
  - 파일 업로드 API (`/api/upload`)
  - nnU-Net 추론 API (`/api/inference`)
  - 다운로드 API (`/api/download`)
- [ ] **Niivue 고도화**
  - 실제 NIfTI/DICOM 파일 로딩
  - Segmentation mask overlay
  - Draw/Erase 픽셀 단위 수정
  - Brightness/Contrast API 연동
- [ ] **소아 참고치 데이터**
  - 실제 백분위수 계산 로직
  - 그래프 라이브러리 연동 (Chart.js / Recharts)
- [ ] **인증 시스템**
  - JWT 기반 토큰 인증
  - 세션 관리
- [ ] **PDF 리포트 생성**
  - 이미지 + 수치 요약
  - 병원 로고/서명 포함

## 📝 개발 참고사항

### Mock 데이터
- 현재 메인 페이지(`/app/app/page.tsx`)에 Mock 환자 정보와 볼륨 데이터가 하드코딩되어 있습니다.
- 실제 API 연동 시 `useEffect`에서 API 호출로 대체하면 됩니다.

### Niivue 연동
- `@niivue/niivue` 패키지 사용
- TODO 주석을 참고하여 실제 볼륨 로딩 및 API 연동 필요

### 추론 프로세스
- 현재 `CtUploadPanel`에서 mock simulation으로 구현
- 실제 백엔드 API 호출로 대체 필요

## 👥 팀

- **프로젝트명**: AIVIS-Q
- **서비스**: 복부 CT 고형장기 자동화 분할
- **대상**: 성인 및 소아 환자

## 📄 라이선스

© 2024 AIVIS-Q. All rights reserved.

---

## 🌐 접속 정보

- **개발 서버**: http://localhost:3000
- **로그인 페이지**: http://localhost:3000/login
- **메인 워크스테이션**: http://localhost:3000/app

## 💡 사용 팁

1. **로그인**: 아이디/비밀번호에 아무 값이나 입력 (현재 검증 없음)
2. **파일 업로드**: DICOM 또는 NIfTI 파일 드래그 앤 드롭
3. **추론 시작**: 버튼 클릭 시 3단계 프로그레스 시뮬레이션
4. **뷰어 조작**: 밝기/대비/투명도 슬라이더로 실시간 조절 (TODO: Niivue API 연동)
5. **Segmentation 수정**: "수정하기" 버튼으로 Draw 모달 열기
6. **소아 참고치**: 우측 버튼으로 백분위수 비교 모달 열기
7. **결과 다운로드**: 각 형식별 다운로드 버튼 클릭

---

**문의**: support@aivisq.com

