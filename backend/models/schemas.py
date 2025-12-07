"""
CSV 생성을 위한 Pydantic 스키마 정의
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class OrganType(str, Enum):
    """장기 유형"""
    LIVER = "liver"
    SPLEEN = "spleen"


class HUStatistics(BaseModel):
    """HU (Hounsfield Unit) 통계"""
    mean: Optional[float] = Field(None, description="평균 HU 값")
    std: Optional[float] = Field(None, description="HU 표준편차")
    min: Optional[float] = Field(None, description="HU 최소값")
    max: Optional[float] = Field(None, description="HU 최대값")
    p10: Optional[float] = Field(None, description="HU 10퍼센타일")
    p90: Optional[float] = Field(None, description="HU 90퍼센타일")


class RadiomicsFeatures(BaseModel):
    """라디오믹스 특징"""
    glcm_contrast: Optional[float] = Field(None, description="GLCM contrast")
    glcm_homogeneity: Optional[float] = Field(None, description="GLCM homogeneity")
    glrlm_lre: Optional[float] = Field(None, description="GLRLM Long Run Emphasis")
    glszm_ze: Optional[float] = Field(None, description="GLSZM Zone Entropy")


class OrganFeatures(BaseModel):
    """개별 장기 특징 데이터"""
    organ: OrganType
    volume_ml: Optional[float] = Field(None, description="부피 (mL)")
    hu_stats: Optional[HUStatistics] = None
    radiomics: Optional[RadiomicsFeatures] = None


class PatientData(BaseModel):
    """환자 데이터 (CSV 요청용)"""
    patient_id: str = Field(..., description="환자 ID")
    study_id: Optional[str] = Field(None, description="검사/스터디 ID")
    liver_features: Optional[OrganFeatures] = None
    spleen_features: Optional[OrganFeatures] = None


class CSVExportRequest(BaseModel):
    """CSV 내보내기 요청"""
    patient_id: str
    study_id: Optional[str] = None
    
    # 간 데이터
    liver_volume_ml: Optional[float] = None
    liver_mean_hu: Optional[float] = None
    liver_std_hu: Optional[float] = None
    liver_min_hu: Optional[float] = None
    liver_max_hu: Optional[float] = None
    liver_p10_hu: Optional[float] = None
    liver_p90_hu: Optional[float] = None
    liver_glcm_contrast: Optional[float] = None
    liver_glcm_homogeneity: Optional[float] = None
    liver_glrlm_lre: Optional[float] = None
    liver_glszm_ze: Optional[float] = None
    
    # 비장 데이터
    spleen_volume_ml: Optional[float] = None
    spleen_mean_hu: Optional[float] = None
    spleen_std_hu: Optional[float] = None
    spleen_min_hu: Optional[float] = None
    spleen_max_hu: Optional[float] = None
    spleen_p10_hu: Optional[float] = None
    spleen_p90_hu: Optional[float] = None
    spleen_glcm_contrast: Optional[float] = None
    spleen_glcm_homogeneity: Optional[float] = None
    spleen_glrlm_lre: Optional[float] = None
    spleen_glszm_ze: Optional[float] = None


# CSV 컬럼 정의 (확장 가능하도록 상수로 정리)
CSV_COLUMNS = [
    "patient_id",
    "study_id", 
    "organ",
    "volume_ml",
    "mean_HU",
    "std_HU",
    "min_HU",
    "max_HU",
    "p10_HU",
    "p90_HU",
    "GLCM_contrast",
    "GLCM_homogeneity",
    "GLRLM_LRE",
    "GLSZM_ZE",
]

# 컬럼 이름 매핑 (추후 한글 헤더 등 지원 가능)
CSV_COLUMN_DESCRIPTIONS = {
    "patient_id": "환자 ID",
    "study_id": "검사/스터디 ID",
    "organ": "장기 이름",
    "volume_ml": "부피 (mL)",
    "mean_HU": "평균 HU 값",
    "std_HU": "HU 표준편차",
    "min_HU": "HU 최소값",
    "max_HU": "HU 최대값",
    "p10_HU": "HU 10퍼센타일",
    "p90_HU": "HU 90퍼센타일",
    "GLCM_contrast": "라디오믹스 GLCM contrast",
    "GLCM_homogeneity": "라디오믹스 GLCM homogeneity",
    "GLRLM_LRE": "라디오믹스 GLRLM Long Run Emphasis",
    "GLSZM_ZE": "라디오믹스 GLSZM Zone Entropy",
}

