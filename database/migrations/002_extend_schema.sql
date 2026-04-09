-- =====================================================
-- 双系族谱系统 Schema 扩展迁移 (V2)
-- =====================================================

-- ── persons 表扩展 ──
ALTER TABLE persons ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);
ALTER TABLE persons ADD COLUMN IF NOT EXISTS birth_order INTEGER;
ALTER TABLE persons ADD COLUMN IF NOT EXISTS native_place VARCHAR(200);  -- 籍贯

-- ── person_versions 同步扩展 ──
ALTER TABLE person_versions ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);
ALTER TABLE person_versions ADD COLUMN IF NOT EXISTS birth_order INTEGER;
ALTER TABLE person_versions ADD COLUMN IF NOT EXISTS native_place VARCHAR(200);

-- ── families 表扩展 ──
ALTER TABLE families ADD COLUMN IF NOT EXISTS generation_name TEXT;    -- 字辈序列（逗号分隔）
ALTER TABLE families ADD COLUMN IF NOT EXISTS hall_name VARCHAR(100);  -- 堂号

-- ── 用户表 ──
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'editor', 'member', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ── 导入任务持久化（替换内存 Map） ──
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  file_name VARCHAR(255),
  total INTEGER NOT NULL DEFAULT 0,
  processed INTEGER NOT NULL DEFAULT 0,
  succeeded INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  options JSONB DEFAULT '{}'::jsonb,
  created_by VARCHAR(100) DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_family_id ON import_jobs(family_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);

DROP TRIGGER IF EXISTS update_import_jobs_updated_at ON import_jobs;
CREATE TRIGGER update_import_jobs_updated_at
BEFORE UPDATE ON import_jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ── 排行索引 ──
CREATE INDEX IF NOT EXISTS idx_persons_birth_order ON persons(family_id, birth_order) WHERE birth_order IS NOT NULL;
