-- AIVIS-Q Abdomen CT 데이터베이스 스키마
-- Supabase SQL Editor에서 실행하세요

-- 1. 환자 정보 테이블
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  sex VARCHAR(1) CHECK (sex IN ('M', 'F')),
  birth_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. CT 검사 세션 테이블
CREATE TABLE IF NOT EXISTS ct_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  study_date DATE NOT NULL,
  age_years INTEGER,
  
  -- 파일 정보
  original_filename VARCHAR(255),
  file_format VARCHAR(20) CHECK (file_format IN ('DICOM', 'NIfTI')),
  file_path TEXT, -- Supabase Storage 경로
  
  -- 추론 상태
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'preprocessing', 'inferencing', 'completed', 'failed')),
  progress_preprocessing INTEGER DEFAULT 0,
  progress_inference INTEGER DEFAULT 0,
  progress_postprocessing INTEGER DEFAULT 0,
  
  -- 결과 파일 경로
  preprocessed_file_path TEXT,
  liver_mask_path TEXT,
  spleen_mask_path TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. 볼륨 분석 결과 테이블
CREATE TABLE IF NOT EXISTS volume_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES ct_sessions(id) ON DELETE CASCADE,
  
  -- AI 추정값
  liver_volume_estimated NUMERIC(10, 2),
  spleen_volume_estimated NUMERIC(10, 2),
  lsvr_estimated NUMERIC(10, 4), -- Liver/Spleen Volume Ratio
  
  -- 사용자 수정값
  liver_volume_edited NUMERIC(10, 2),
  spleen_volume_edited NUMERIC(10, 2),
  lsvr_edited NUMERIC(10, 4),
  
  -- 수정 이력
  edited_at TIMESTAMP WITH TIME ZONE,
  edited_by UUID, -- 사용자 ID (추후 auth 연동)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 4. 소아 참고치 데이터 테이블
CREATE TABLE IF NOT EXISTS pediatric_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sex VARCHAR(1) CHECK (sex IN ('M', 'F')),
  age_years INTEGER NOT NULL,
  weight_kg NUMERIC(5, 2) NOT NULL,
  height_cm NUMERIC(5, 2),
  
  -- 백분위수 데이터
  liver_volume_p5 NUMERIC(10, 2),
  liver_volume_p25 NUMERIC(10, 2),
  liver_volume_p50 NUMERIC(10, 2),
  liver_volume_p75 NUMERIC(10, 2),
  liver_volume_p95 NUMERIC(10, 2),
  
  spleen_volume_p5 NUMERIC(10, 2),
  spleen_volume_p25 NUMERIC(10, 2),
  spleen_volume_p50 NUMERIC(10, 2),
  spleen_volume_p75 NUMERIC(10, 2),
  spleen_volume_p95 NUMERIC(10, 2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 5. 사용자 테이블 (인증용)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'doctor' CHECK (role IN ('admin', 'doctor', 'technician')),
  hospital_name VARCHAR(100),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 인덱스 생성
CREATE INDEX idx_patients_name ON patients(name);
CREATE INDEX idx_ct_sessions_patient_id ON ct_sessions(patient_id);
CREATE INDEX idx_ct_sessions_status ON ct_sessions(status);
CREATE INDEX idx_ct_sessions_study_date ON ct_sessions(study_date);
CREATE INDEX idx_volume_analysis_session_id ON volume_analysis(session_id);
CREATE INDEX idx_pediatric_references_age_sex ON pediatric_references(age_years, sex);
CREATE INDEX idx_users_username ON users(username);

-- Row Level Security (RLS) 활성화
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE volume_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE pediatric_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS 정책 (일단 모든 사용자가 읽기/쓰기 가능하도록 설정, 추후 세밀하게 조정)
CREATE POLICY "Enable read access for all users" ON patients FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON patients FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON patients FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON patients FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON ct_sessions FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON ct_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON ct_sessions FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON ct_sessions FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON volume_analysis FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON volume_analysis FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON volume_analysis FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON volume_analysis FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON pediatric_references FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON pediatric_references FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON users FOR UPDATE USING (true);

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ct_sessions_updated_at BEFORE UPDATE ON ct_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_volume_analysis_updated_at BEFORE UPDATE ON volume_analysis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Supabase Storage 버킷 생성 (Supabase 대시보드에서 수동으로 생성 필요)
-- Bucket 이름: 'ct-files'
-- Public access: false (보안을 위해)

-- 샘플 소아 참고치 데이터 삽입 (Mock)
INSERT INTO pediatric_references (sex, age_years, weight_kg, height_cm, 
  liver_volume_p5, liver_volume_p25, liver_volume_p50, liver_volume_p75, liver_volume_p95,
  spleen_volume_p5, spleen_volume_p25, spleen_volume_p50, spleen_volume_p75, spleen_volume_p95)
VALUES
  ('M', 10, 30, 140, 800, 950, 1100, 1250, 1400, 80, 100, 120, 140, 160),
  ('M', 14, 50, 160, 1000, 1150, 1300, 1450, 1600, 100, 120, 140, 160, 180),
  ('F', 10, 28, 138, 750, 900, 1050, 1200, 1350, 75, 95, 115, 135, 155),
  ('F', 14, 48, 158, 950, 1100, 1250, 1400, 1550, 95, 115, 135, 155, 175);

-- 테스트용 사용자 추가 (비밀번호: admin123, bcrypt 해시)
-- 실제 프로덕션에서는 bcrypt로 해싱된 비밀번호 사용 필요
INSERT INTO users (username, password_hash, role, hospital_name)
VALUES 
  ('admin', '$2a$10$YourHashedPasswordHere', 'admin', '서울대학교병원'),
  ('doctor1', '$2a$10$YourHashedPasswordHere', 'doctor', '서울대학교병원');

COMMENT ON TABLE patients IS '환자 기본 정보';
COMMENT ON TABLE ct_sessions IS 'CT 검사 세션 및 추론 진행 상태';
COMMENT ON TABLE volume_analysis IS '간/비장 볼륨 분석 결과';
COMMENT ON TABLE pediatric_references IS '소아 참고치 백분위수 데이터';
COMMENT ON TABLE users IS '시스템 사용자 (의사, 기사, 관리자)';

