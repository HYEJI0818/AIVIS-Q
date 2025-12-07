"""
간/비장 특징 계산 유틸리티 함수

CT 이미지와 segmentation mask에서 HU 통계 및 라디오믹스 특징을 계산합니다.
"""
import numpy as np
from typing import Optional, Dict, Tuple, Any
from scipy import ndimage
from skimage.feature import graycomatrix, graycoprops


def compute_hu_statistics(
    ct_volume: np.ndarray,
    mask: np.ndarray
) -> Dict[str, Optional[float]]:
    """
    마스크 영역 내의 HU 통계를 계산합니다.
    
    Args:
        ct_volume: CT 이미지 볼륨 (HU 값)
        mask: segmentation mask (0=배경, >0=관심영역)
    
    Returns:
        HU 통계 딕셔너리 (mean, std, min, max, p10, p90)
    """
    # 마스크 영역의 복셀 값 추출
    masked_values = ct_volume[mask > 0]
    
    if len(masked_values) == 0:
        return {
            "mean": None,
            "std": None,
            "min": None,
            "max": None,
            "p10": None,
            "p90": None,
        }
    
    return {
        "mean": float(np.mean(masked_values)),
        "std": float(np.std(masked_values)),
        "min": float(np.min(masked_values)),
        "max": float(np.max(masked_values)),
        "p10": float(np.percentile(masked_values, 10)),
        "p90": float(np.percentile(masked_values, 90)),
    }


def compute_volume_ml(
    mask: np.ndarray,
    voxel_spacing: Tuple[float, float, float] = (1.0, 1.0, 1.0)
) -> float:
    """
    마스크 영역의 부피를 mL(cc) 단위로 계산합니다.
    
    Args:
        mask: segmentation mask
        voxel_spacing: (x, y, z) 복셀 간격 (mm 단위)
    
    Returns:
        부피 (mL)
    """
    voxel_count = np.sum(mask > 0)
    voxel_volume_mm3 = voxel_spacing[0] * voxel_spacing[1] * voxel_spacing[2]
    volume_mm3 = voxel_count * voxel_volume_mm3
    volume_ml = volume_mm3 / 1000.0  # mm³ → mL (cc)
    return float(volume_ml)


def _normalize_for_glcm(image: np.ndarray, levels: int = 64) -> np.ndarray:
    """
    GLCM 계산을 위해 이미지를 정규화합니다.
    
    Args:
        image: 입력 이미지
        levels: 양자화 레벨 수
    
    Returns:
        정규화된 이미지 (0 ~ levels-1 범위의 정수)
    """
    # HU 값 범위를 일반적인 복부 CT 범위로 클리핑
    img_clipped = np.clip(image, -100, 300)
    
    # 0~1로 정규화
    img_min, img_max = img_clipped.min(), img_clipped.max()
    if img_max - img_min > 0:
        img_normalized = (img_clipped - img_min) / (img_max - img_min)
    else:
        img_normalized = np.zeros_like(img_clipped)
    
    # 양자화
    img_quantized = (img_normalized * (levels - 1)).astype(np.uint8)
    return img_quantized


def compute_glcm_features(
    ct_volume: np.ndarray,
    mask: np.ndarray,
    sample_slices: int = 5
) -> Dict[str, Optional[float]]:
    """
    GLCM (Gray-Level Co-occurrence Matrix) 기반 특징을 계산합니다.
    
    3D 볼륨에서 대표 슬라이스를 선택하여 2D GLCM 특징을 평균합니다.
    
    Args:
        ct_volume: CT 이미지 볼륨
        mask: segmentation mask
        sample_slices: 샘플링할 슬라이스 수
    
    Returns:
        GLCM 특징 딕셔너리 (contrast, homogeneity)
    """
    # 마스크가 존재하는 슬라이스 찾기
    z_indices = np.where(np.any(mask > 0, axis=(0, 1)))[0]
    
    if len(z_indices) == 0:
        return {"contrast": None, "homogeneity": None}
    
    # 대표 슬라이스 선택 (균등 분포)
    if len(z_indices) <= sample_slices:
        selected_indices = z_indices
    else:
        step = len(z_indices) // sample_slices
        selected_indices = z_indices[::step][:sample_slices]
    
    contrasts = []
    homogeneities = []
    
    for z in selected_indices:
        slice_img = ct_volume[:, :, z]
        slice_mask = mask[:, :, z]
        
        # 마스크 영역만 추출 (바운딩 박스)
        rows = np.any(slice_mask > 0, axis=1)
        cols = np.any(slice_mask > 0, axis=0)
        
        if not np.any(rows) or not np.any(cols):
            continue
            
        rmin, rmax = np.where(rows)[0][[0, -1]]
        cmin, cmax = np.where(cols)[0][[0, -1]]
        
        roi = slice_img[rmin:rmax+1, cmin:cmax+1]
        roi_mask = slice_mask[rmin:rmax+1, cmin:cmax+1]
        
        # 마스크 영역 외부를 0으로 설정
        roi_masked = np.where(roi_mask > 0, roi, 0)
        
        if roi_masked.shape[0] < 2 or roi_masked.shape[1] < 2:
            continue
        
        # GLCM 계산을 위한 정규화
        roi_normalized = _normalize_for_glcm(roi_masked, levels=64)
        
        try:
            # GLCM 계산 (여러 방향 평균)
            glcm = graycomatrix(
                roi_normalized,
                distances=[1],
                angles=[0, np.pi/4, np.pi/2, 3*np.pi/4],
                levels=64,
                symmetric=True,
                normed=True
            )
            
            contrast = graycoprops(glcm, 'contrast').mean()
            homogeneity = graycoprops(glcm, 'homogeneity').mean()
            
            contrasts.append(contrast)
            homogeneities.append(homogeneity)
        except Exception:
            continue
    
    if not contrasts:
        return {"contrast": None, "homogeneity": None}
    
    return {
        "contrast": float(np.mean(contrasts)),
        "homogeneity": float(np.mean(homogeneities)),
    }


def compute_glrlm_features(
    ct_volume: np.ndarray,
    mask: np.ndarray
) -> Dict[str, Optional[float]]:
    """
    GLRLM (Gray-Level Run-Length Matrix) 기반 특징을 계산합니다.
    
    간략한 구현: Long Run Emphasis (LRE)
    
    Args:
        ct_volume: CT 이미지 볼륨
        mask: segmentation mask
    
    Returns:
        GLRLM 특징 딕셔너리 (lre)
    """
    # 마스크 영역의 값 추출
    masked_values = ct_volume[mask > 0]
    
    if len(masked_values) == 0:
        return {"lre": None}
    
    # 정규화
    values_clipped = np.clip(masked_values, -100, 300)
    values_min, values_max = values_clipped.min(), values_clipped.max()
    
    if values_max - values_min > 0:
        values_normalized = ((values_clipped - values_min) / (values_max - values_min) * 63).astype(int)
    else:
        return {"lre": None}
    
    # 간단한 LRE 근사 계산 (run-length 기반)
    # 실제 GLRLM은 더 복잡하지만, 여기서는 간소화된 버전 사용
    try:
        # 1D 런 길이 분석
        runs = []
        current_val = values_normalized[0]
        current_run = 1
        
        for val in values_normalized[1:]:
            if val == current_val:
                current_run += 1
            else:
                runs.append(current_run)
                current_val = val
                current_run = 1
        runs.append(current_run)
        
        runs = np.array(runs)
        # Long Run Emphasis: sum(j^2 * r(i,j)) / sum(r(i,j))
        lre = np.sum(runs ** 2) / len(runs) if len(runs) > 0 else None
        
        return {"lre": float(lre) if lre is not None else None}
    except Exception:
        return {"lre": None}


def compute_glszm_features(
    ct_volume: np.ndarray,
    mask: np.ndarray
) -> Dict[str, Optional[float]]:
    """
    GLSZM (Gray-Level Size Zone Matrix) 기반 특징을 계산합니다.
    
    간략한 구현: Zone Entropy (ZE)
    
    Args:
        ct_volume: CT 이미지 볼륨
        mask: segmentation mask
    
    Returns:
        GLSZM 특징 딕셔너리 (ze)
    """
    # 마스크 영역의 값 추출
    masked_volume = np.where(mask > 0, ct_volume, np.nan)
    
    if np.all(np.isnan(masked_volume)):
        return {"ze": None}
    
    # 정규화 및 양자화
    valid_values = masked_volume[~np.isnan(masked_volume)]
    values_clipped = np.clip(valid_values, -100, 300)
    values_min, values_max = values_clipped.min(), values_clipped.max()
    
    if values_max - values_min <= 0:
        return {"ze": None}
    
    try:
        # 양자화된 값의 히스토그램 기반 엔트로피 계산
        values_quantized = ((values_clipped - values_min) / (values_max - values_min) * 31).astype(int)
        
        # 각 값의 빈도 계산
        unique, counts = np.unique(values_quantized, return_counts=True)
        probabilities = counts / counts.sum()
        
        # Shannon 엔트로피
        entropy = -np.sum(probabilities * np.log2(probabilities + 1e-10))
        
        return {"ze": float(entropy)}
    except Exception:
        return {"ze": None}


def compute_liver_spleen_features(
    ct_volume: np.ndarray,
    liver_mask: np.ndarray,
    spleen_mask: np.ndarray,
    voxel_spacing: Tuple[float, float, float] = (1.0, 1.0, 1.0),
    patient_id: str = "",
    study_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    간과 비장의 모든 특징을 계산하는 통합 함수.
    
    Args:
        ct_volume: CT 이미지 볼륨 (HU 값)
        liver_mask: 간 segmentation mask
        spleen_mask: 비장 segmentation mask
        voxel_spacing: 복셀 간격 (mm)
        patient_id: 환자 ID
        study_id: 검사/스터디 ID
    
    Returns:
        간/비장 특징 데이터 딕셔너리
    """
    results = {
        "patient_id": patient_id,
        "study_id": study_id,
        "liver": {},
        "spleen": {},
    }
    
    # 간 특징 계산
    if liver_mask is not None and np.any(liver_mask > 0):
        liver_hu = compute_hu_statistics(ct_volume, liver_mask)
        liver_glcm = compute_glcm_features(ct_volume, liver_mask)
        liver_glrlm = compute_glrlm_features(ct_volume, liver_mask)
        liver_glszm = compute_glszm_features(ct_volume, liver_mask)
        
        results["liver"] = {
            "volume_ml": compute_volume_ml(liver_mask, voxel_spacing),
            "mean_HU": liver_hu["mean"],
            "std_HU": liver_hu["std"],
            "min_HU": liver_hu["min"],
            "max_HU": liver_hu["max"],
            "p10_HU": liver_hu["p10"],
            "p90_HU": liver_hu["p90"],
            "GLCM_contrast": liver_glcm["contrast"],
            "GLCM_homogeneity": liver_glcm["homogeneity"],
            "GLRLM_LRE": liver_glrlm["lre"],
            "GLSZM_ZE": liver_glszm["ze"],
        }
    
    # 비장 특징 계산
    if spleen_mask is not None and np.any(spleen_mask > 0):
        spleen_hu = compute_hu_statistics(ct_volume, spleen_mask)
        spleen_glcm = compute_glcm_features(ct_volume, spleen_mask)
        spleen_glrlm = compute_glrlm_features(ct_volume, spleen_mask)
        spleen_glszm = compute_glszm_features(ct_volume, spleen_mask)
        
        results["spleen"] = {
            "volume_ml": compute_volume_ml(spleen_mask, voxel_spacing),
            "mean_HU": spleen_hu["mean"],
            "std_HU": spleen_hu["std"],
            "min_HU": spleen_hu["min"],
            "max_HU": spleen_hu["max"],
            "p10_HU": spleen_hu["p10"],
            "p90_HU": spleen_hu["p90"],
            "GLCM_contrast": spleen_glcm["contrast"],
            "GLCM_homogeneity": spleen_glcm["homogeneity"],
            "GLRLM_LRE": spleen_glrlm["lre"],
            "GLSZM_ZE": spleen_glszm["ze"],
        }
    
    return results

