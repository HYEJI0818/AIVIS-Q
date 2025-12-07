# AIVISQ 복부 CT 백엔드 API

간/비장 분석 결과 CSV 내보내기를 위한 FastAPI 백엔드 서버입니다.

## 설치

```bash
cd backend
pip install -r requirements.txt
```

## 실행

```bash
# 개발 서버 실행 (기본 포트: 8000)
uvicorn main:app --reload

# 또는 특정 포트로 실행
uvicorn main:app --reload --port 8000
```

## API 엔드포인트

### 1. 상태 확인

```
GET /
```

API 서버 상태를 확인합니다.

### 2. 간/비장 CSV 다운로드 (GET)

```
GET /api/abdomen/liver-spleen/csv?patient_id=P001&liver_volume_ml=1450.3&...
```

쿼리 파라미터로 데이터를 전달하여 CSV 파일을 다운로드합니다.

**필수 파라미터:**
- `patient_id`: 환자 ID

**선택 파라미터:**
- `study_id`: 검사/스터디 ID
- 간 데이터: `liver_volume_ml`, `liver_mean_hu`, `liver_std_hu`, 등
- 비장 데이터: `spleen_volume_ml`, `spleen_mean_hu`, `spleen_std_hu`, 등

### 3. 간/비장 CSV 다운로드 (POST)

```
POST /api/abdomen/liver-spleen/csv
Content-Type: application/json

{
  "patient_id": "P001",
  "study_id": "STUDY001",
  "liver_volume_ml": 1450.3,
  ...
}
```

JSON 바디로 데이터를 전달하여 CSV 파일을 다운로드합니다.

### 4. CSV 컬럼 정보

```
GET /api/abdomen/csv-columns
```

CSV 파일에 포함되는 컬럼 목록을 반환합니다.

## CSV 파일 구조

| 컬럼 | 설명 |
|------|------|
| patient_id | 환자 ID |
| study_id | 검사/스터디 ID |
| organ | 장기 이름 (liver/spleen) |
| volume_ml | 부피 (mL) |
| mean_HU | 평균 HU 값 |
| std_HU | HU 표준편차 |
| min_HU | HU 최소값 |
| max_HU | HU 최대값 |
| p10_HU | HU 10퍼센타일 |
| p90_HU | HU 90퍼센타일 |
| GLCM_contrast | 라디오믹스 GLCM contrast |
| GLCM_homogeneity | 라디오믹스 GLCM homogeneity |
| GLRLM_LRE | 라디오믹스 GLRLM Long Run Emphasis |
| GLSZM_ZE | 라디오믹스 GLSZM Zone Entropy |

## 환경 변수

프론트엔드에서 백엔드 API URL을 설정하려면 `.env.local` 파일에 다음을 추가하세요:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 라디오믹스 특징 계산

`utils/feature_calculator.py` 모듈에서 CT 이미지와 마스크로부터 직접 특징을 계산할 수 있습니다:

```python
from utils.feature_calculator import compute_liver_spleen_features

results = compute_liver_spleen_features(
    ct_volume=ct_array,
    liver_mask=liver_mask_array,
    spleen_mask=spleen_mask_array,
    voxel_spacing=(1.0, 1.0, 1.0),
    patient_id="P001",
    study_id="STUDY001"
)
```

## 프론트엔드 연동

프론트엔드에서는 백엔드 API 호출이 실패하면 자동으로 클라이언트 사이드에서 CSV를 생성합니다.
따라서 백엔드 서버가 실행되지 않아도 기본 기능은 동작합니다.

