-- 미션 인증 테이블에 후기글 컬럼 추가
ALTER TABLE mission_verifications ADD COLUMN review_text TEXT;

-- 기존 데이터에 대한 기본값 설정 (선택사항)
UPDATE mission_verifications SET review_text = '' WHERE review_text IS NULL;

