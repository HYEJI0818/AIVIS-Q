"""
복부 CT 간/비장 분석 API

FastAPI 기반 백엔드 서버
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from typing import Optional
from datetime import datetime

from models.schemas import CSVExportRequest, CSV_COLUMNS
from utils.csv_generator import generate_csv_bytes, create_csv_from_request

app = FastAPI(
    title="AIVISQ Abdomen CT API",
    description="복부 CT 간/비장 분석 결과 CSV 내보내기 API",
    version="1.0.0",
)

# CORS 설정 (Next.js 프론트엔드 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        # 프로덕션 도메인 추가 가능
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """API 상태 확인"""
    return {
        "status": "ok",
        "message": "AIVISQ Abdomen CT API is running",
        "version": "1.0.0",
    }


@app.get("/api/abdomen/liver-spleen/csv")
async def get_liver_spleen_csv(
    patient_id: str = Query(..., description="환자 ID"),
    study_id: Optional[str] = Query(None, description="검사/스터디 ID"),
    # 간 데이터
    liver_volume_ml: Optional[float] = Query(None, description="간 부피 (mL)"),
    liver_mean_hu: Optional[float] = Query(None, description="간 평균 HU"),
    liver_std_hu: Optional[float] = Query(None, description="간 HU 표준편차"),
    liver_min_hu: Optional[float] = Query(None, description="간 HU 최소값"),
    liver_max_hu: Optional[float] = Query(None, description="간 HU 최대값"),
    liver_p10_hu: Optional[float] = Query(None, description="간 HU 10퍼센타일"),
    liver_p90_hu: Optional[float] = Query(None, description="간 HU 90퍼센타일"),
    liver_glcm_contrast: Optional[float] = Query(None, description="간 GLCM contrast"),
    liver_glcm_homogeneity: Optional[float] = Query(None, description="간 GLCM homogeneity"),
    liver_glrlm_lre: Optional[float] = Query(None, description="간 GLRLM LRE"),
    liver_glszm_ze: Optional[float] = Query(None, description="간 GLSZM ZE"),
    # 비장 데이터
    spleen_volume_ml: Optional[float] = Query(None, description="비장 부피 (mL)"),
    spleen_mean_hu: Optional[float] = Query(None, description="비장 평균 HU"),
    spleen_std_hu: Optional[float] = Query(None, description="비장 HU 표준편차"),
    spleen_min_hu: Optional[float] = Query(None, description="비장 HU 최소값"),
    spleen_max_hu: Optional[float] = Query(None, description="비장 HU 최대값"),
    spleen_p10_hu: Optional[float] = Query(None, description="비장 HU 10퍼센타일"),
    spleen_p90_hu: Optional[float] = Query(None, description="비장 HU 90퍼센타일"),
    spleen_glcm_contrast: Optional[float] = Query(None, description="비장 GLCM contrast"),
    spleen_glcm_homogeneity: Optional[float] = Query(None, description="비장 GLCM homogeneity"),
    spleen_glrlm_lre: Optional[float] = Query(None, description="비장 GLRLM LRE"),
    spleen_glszm_ze: Optional[float] = Query(None, description="비장 GLSZM ZE"),
):
    """
    간/비장 분석 결과를 CSV 파일로 반환합니다.
    
    GET 요청으로 쿼리 파라미터를 통해 데이터를 받아 CSV를 생성합니다.
    브라우저에서 직접 다운로드할 수 있도록 파일 응답을 반환합니다.
    """
    try:
        csv_bytes = create_csv_from_request(
            patient_id=patient_id,
            study_id=study_id,
            liver_volume_ml=liver_volume_ml,
            liver_mean_hu=liver_mean_hu,
            liver_std_hu=liver_std_hu,
            liver_min_hu=liver_min_hu,
            liver_max_hu=liver_max_hu,
            liver_p10_hu=liver_p10_hu,
            liver_p90_hu=liver_p90_hu,
            liver_glcm_contrast=liver_glcm_contrast,
            liver_glcm_homogeneity=liver_glcm_homogeneity,
            liver_glrlm_lre=liver_glrlm_lre,
            liver_glszm_ze=liver_glszm_ze,
            spleen_volume_ml=spleen_volume_ml,
            spleen_mean_hu=spleen_mean_hu,
            spleen_std_hu=spleen_std_hu,
            spleen_min_hu=spleen_min_hu,
            spleen_max_hu=spleen_max_hu,
            spleen_p10_hu=spleen_p10_hu,
            spleen_p90_hu=spleen_p90_hu,
            spleen_glcm_contrast=spleen_glcm_contrast,
            spleen_glcm_homogeneity=spleen_glcm_homogeneity,
            spleen_glrlm_lre=spleen_glrlm_lre,
            spleen_glszm_ze=spleen_glszm_ze,
        )
        
        # 파일명 생성
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"liver_spleen_analysis_{patient_id}_{timestamp}.csv"
        
        return Response(
            content=csv_bytes,
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": "text/csv; charset=utf-8",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV 생성 실패: {str(e)}")


@app.post("/api/abdomen/liver-spleen/csv")
async def post_liver_spleen_csv(request: CSVExportRequest):
    """
    간/비장 분석 결과를 CSV 파일로 반환합니다.
    
    POST 요청으로 JSON 바디를 통해 데이터를 받아 CSV를 생성합니다.
    더 많은 데이터나 복잡한 요청에 적합합니다.
    """
    try:
        csv_bytes = create_csv_from_request(
            patient_id=request.patient_id,
            study_id=request.study_id,
            liver_volume_ml=request.liver_volume_ml,
            liver_mean_hu=request.liver_mean_hu,
            liver_std_hu=request.liver_std_hu,
            liver_min_hu=request.liver_min_hu,
            liver_max_hu=request.liver_max_hu,
            liver_p10_hu=request.liver_p10_hu,
            liver_p90_hu=request.liver_p90_hu,
            liver_glcm_contrast=request.liver_glcm_contrast,
            liver_glcm_homogeneity=request.liver_glcm_homogeneity,
            liver_glrlm_lre=request.liver_glrlm_lre,
            liver_glszm_ze=request.liver_glszm_ze,
            spleen_volume_ml=request.spleen_volume_ml,
            spleen_mean_hu=request.spleen_mean_hu,
            spleen_std_hu=request.spleen_std_hu,
            spleen_min_hu=request.spleen_min_hu,
            spleen_max_hu=request.spleen_max_hu,
            spleen_p10_hu=request.spleen_p10_hu,
            spleen_p90_hu=request.spleen_p90_hu,
            spleen_glcm_contrast=request.spleen_glcm_contrast,
            spleen_glcm_homogeneity=request.spleen_glcm_homogeneity,
            spleen_glrlm_lre=request.spleen_glrlm_lre,
            spleen_glszm_ze=request.spleen_glszm_ze,
        )
        
        # 파일명 생성
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"liver_spleen_analysis_{request.patient_id}_{timestamp}.csv"
        
        return Response(
            content=csv_bytes,
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": "text/csv; charset=utf-8",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV 생성 실패: {str(e)}")


@app.get("/api/abdomen/csv-columns")
async def get_csv_columns():
    """
    CSV 컬럼 목록을 반환합니다.
    
    프론트엔드에서 컬럼 정보를 동적으로 확인할 때 사용합니다.
    """
    return {
        "columns": CSV_COLUMNS,
        "count": len(CSV_COLUMNS),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

