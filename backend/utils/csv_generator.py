"""
CSV 파일 생성 유틸리티

간/비장 분석 결과를 CSV 형식으로 생성합니다.
"""
import io
import csv
from typing import Dict, Any, Optional, List
from ..models.schemas import CSV_COLUMNS


def generate_csv_content(
    patient_id: str,
    study_id: Optional[str],
    liver_data: Dict[str, Any],
    spleen_data: Dict[str, Any],
) -> str:
    """
    간/비장 분석 결과를 CSV 문자열로 생성합니다.
    
    Args:
        patient_id: 환자 ID
        study_id: 검사/스터디 ID
        liver_data: 간 분석 데이터
        spleen_data: 비장 분석 데이터
    
    Returns:
        CSV 형식 문자열 (UTF-8 BOM 포함)
    """
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    
    # 헤더 작성
    writer.writerow(CSV_COLUMNS)
    
    # 간 데이터 행 작성
    if liver_data:
        liver_row = _create_row(patient_id, study_id, "liver", liver_data)
        writer.writerow(liver_row)
    
    # 비장 데이터 행 작성
    if spleen_data:
        spleen_row = _create_row(patient_id, study_id, "spleen", spleen_data)
        writer.writerow(spleen_row)
    
    return output.getvalue()


def _create_row(
    patient_id: str,
    study_id: Optional[str],
    organ: str,
    data: Dict[str, Any]
) -> List[Any]:
    """
    단일 장기의 CSV 행을 생성합니다.
    
    Args:
        patient_id: 환자 ID
        study_id: 검사/스터디 ID
        organ: 장기 이름 (liver/spleen)
        data: 장기 분석 데이터
    
    Returns:
        CSV 행 데이터 리스트
    """
    def format_value(value: Any) -> str:
        """값을 CSV 형식으로 포맷합니다."""
        if value is None:
            return ""
        if isinstance(value, float):
            return f"{value:.4f}"
        return str(value)
    
    return [
        patient_id,
        study_id or "",
        organ,
        format_value(data.get("volume_ml")),
        format_value(data.get("mean_HU")),
        format_value(data.get("std_HU")),
        format_value(data.get("min_HU")),
        format_value(data.get("max_HU")),
        format_value(data.get("p10_HU")),
        format_value(data.get("p90_HU")),
        format_value(data.get("GLCM_contrast")),
        format_value(data.get("GLCM_homogeneity")),
        format_value(data.get("GLRLM_LRE")),
        format_value(data.get("GLSZM_ZE")),
    ]


def generate_csv_bytes(
    patient_id: str,
    study_id: Optional[str],
    liver_data: Dict[str, Any],
    spleen_data: Dict[str, Any],
) -> bytes:
    """
    CSV 내용을 바이트로 생성합니다 (UTF-8 BOM 포함).
    
    엑셀에서 한글/영문이 깨지지 않도록 BOM을 추가합니다.
    
    Args:
        patient_id: 환자 ID
        study_id: 검사/스터디 ID
        liver_data: 간 분석 데이터
        spleen_data: 비장 분석 데이터
    
    Returns:
        UTF-8 BOM이 포함된 CSV 바이트
    """
    csv_content = generate_csv_content(patient_id, study_id, liver_data, spleen_data)
    
    # UTF-8 BOM (0xEF, 0xBB, 0xBF) 추가
    bom = b'\xef\xbb\xbf'
    return bom + csv_content.encode('utf-8')


def create_csv_from_request(
    patient_id: str,
    study_id: Optional[str] = None,
    liver_volume_ml: Optional[float] = None,
    liver_mean_hu: Optional[float] = None,
    liver_std_hu: Optional[float] = None,
    liver_min_hu: Optional[float] = None,
    liver_max_hu: Optional[float] = None,
    liver_p10_hu: Optional[float] = None,
    liver_p90_hu: Optional[float] = None,
    liver_glcm_contrast: Optional[float] = None,
    liver_glcm_homogeneity: Optional[float] = None,
    liver_glrlm_lre: Optional[float] = None,
    liver_glszm_ze: Optional[float] = None,
    spleen_volume_ml: Optional[float] = None,
    spleen_mean_hu: Optional[float] = None,
    spleen_std_hu: Optional[float] = None,
    spleen_min_hu: Optional[float] = None,
    spleen_max_hu: Optional[float] = None,
    spleen_p10_hu: Optional[float] = None,
    spleen_p90_hu: Optional[float] = None,
    spleen_glcm_contrast: Optional[float] = None,
    spleen_glcm_homogeneity: Optional[float] = None,
    spleen_glrlm_lre: Optional[float] = None,
    spleen_glszm_ze: Optional[float] = None,
) -> bytes:
    """
    개별 파라미터로부터 CSV 바이트를 생성합니다.
    
    프론트엔드에서 전달된 데이터로 CSV를 생성할 때 사용합니다.
    """
    liver_data = {}
    if liver_volume_ml is not None:
        liver_data = {
            "volume_ml": liver_volume_ml,
            "mean_HU": liver_mean_hu,
            "std_HU": liver_std_hu,
            "min_HU": liver_min_hu,
            "max_HU": liver_max_hu,
            "p10_HU": liver_p10_hu,
            "p90_HU": liver_p90_hu,
            "GLCM_contrast": liver_glcm_contrast,
            "GLCM_homogeneity": liver_glcm_homogeneity,
            "GLRLM_LRE": liver_glrlm_lre,
            "GLSZM_ZE": liver_glszm_ze,
        }
    
    spleen_data = {}
    if spleen_volume_ml is not None:
        spleen_data = {
            "volume_ml": spleen_volume_ml,
            "mean_HU": spleen_mean_hu,
            "std_HU": spleen_std_hu,
            "min_HU": spleen_min_hu,
            "max_HU": spleen_max_hu,
            "p10_HU": spleen_p10_hu,
            "p90_HU": spleen_p90_hu,
            "GLCM_contrast": spleen_glcm_contrast,
            "GLCM_homogeneity": spleen_glcm_homogeneity,
            "GLRLM_LRE": spleen_glrlm_lre,
            "GLSZM_ZE": spleen_glszm_ze,
        }
    
    return generate_csv_bytes(patient_id, study_id, liver_data, spleen_data)

