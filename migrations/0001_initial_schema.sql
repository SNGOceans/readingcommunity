-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  is_admin INTEGER DEFAULT 0, -- 0: 일반 사용자, 1: 관리자
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 미션 테이블
CREATE TABLE IF NOT EXISTS missions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active INTEGER DEFAULT 1, -- 0: 비활성, 1: 활성
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 미션 참여 테이블
CREATE TABLE IF NOT EXISTS mission_participations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  mission_id INTEGER NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE,
  UNIQUE(user_id, mission_id)
);

-- 미션 인증 테이블
CREATE TABLE IF NOT EXISTS mission_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  mission_id INTEGER NOT NULL,
  blog_url TEXT NOT NULL,
  verification_status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'needs_review'
  crawl_result TEXT, -- 크롤링 결과 저장
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  verified_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_mission_participations_user_id ON mission_participations(user_id);
CREATE INDEX IF NOT EXISTS idx_mission_participations_mission_id ON mission_participations(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_verifications_user_id ON mission_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_mission_verifications_mission_id ON mission_verifications(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_verifications_status ON mission_verifications(verification_status);