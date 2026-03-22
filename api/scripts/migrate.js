/**
 * Simplified database migration bootstrap for V1.
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'genealogy_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

const migrations = [
  'CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
  `
    CREATE TABLE IF NOT EXISTS families (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      root_person_id UUID,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      created_by VARCHAR(100) DEFAULT 'system'
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS persons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      gender VARCHAR(10) NOT NULL DEFAULT 'unknown' CHECK (gender IN ('male', 'female', 'unknown')),
      birth_date DATE,
      death_date DATE,
      bio TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      created_by VARCHAR(100) DEFAULT 'system'
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS person_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      name VARCHAR(100) NOT NULL,
      gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female', 'unknown')),
      birth_date DATE,
      death_date DATE,
      bio TEXT,
      valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
      valid_to TIMESTAMP WITH TIME ZONE,
      changed_by VARCHAR(100) DEFAULT 'system',
      change_reason VARCHAR(255),
      UNIQUE (person_id, version)
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS relationships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
      to_person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL CHECK (type IN ('parent_child', 'spouse', 'sibling')),
      subtype VARCHAR(50),
      start_date DATE,
      end_date DATE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      created_by VARCHAR(100) DEFAULT 'system'
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS relationship_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      from_person_id UUID NOT NULL,
      to_person_id UUID NOT NULL,
      type VARCHAR(20) NOT NULL CHECK (type IN ('parent_child', 'spouse', 'sibling')),
      subtype VARCHAR(50),
      start_date DATE,
      end_date DATE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
      valid_to TIMESTAMP WITH TIME ZONE,
      changed_by VARCHAR(100) DEFAULT 'system',
      UNIQUE (relationship_id, version)
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS life_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      date DATE,
      location VARCHAR(200),
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `,
  'CREATE INDEX IF NOT EXISTS idx_persons_family_id ON persons(family_id);',
  'CREATE INDEX IF NOT EXISTS idx_persons_name ON persons(name);',
  'CREATE INDEX IF NOT EXISTS idx_relationships_from_person_id ON relationships(from_person_id);',
  'CREATE INDEX IF NOT EXISTS idx_relationships_to_person_id ON relationships(to_person_id);',
  'CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships(type);',
  `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `,
  `
    DROP TRIGGER IF EXISTS update_families_updated_at ON families;
    CREATE TRIGGER update_families_updated_at
    BEFORE UPDATE ON families
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `,
  `
    DROP TRIGGER IF EXISTS update_persons_updated_at ON persons;
    CREATE TRIGGER update_persons_updated_at
    BEFORE UPDATE ON persons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `,
  `
    DROP TRIGGER IF EXISTS update_relationships_updated_at ON relationships;
    CREATE TRIGGER update_relationships_updated_at
    BEFORE UPDATE ON relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `,
];

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('开始执行数据库迁移...');

    for (const [index, migration] of migrations.entries()) {
      await client.query(migration);
      console.log(`迁移 ${index + 1}/${migrations.length} 执行成功`);
    }

    console.log('数据库迁移完成');
  } catch (error) {
    console.error('迁移失败:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((error) => {
  console.error('迁移失败:', error);
  process.exit(1);
});
