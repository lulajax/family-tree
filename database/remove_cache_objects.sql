-- One-time cleanup for legacy cache-related database objects.

DROP MATERIALIZED VIEW IF EXISTS lineage_cache_temporal CASCADE;
DROP FUNCTION IF EXISTS refresh_lineage_cache() CASCADE;
DROP TRIGGER IF EXISTS trg_invalidate_cache_on_rel_change ON relationships;
DROP FUNCTION IF EXISTS invalidate_side_cache() CASCADE;
DROP FUNCTION IF EXISTS get_side_cached(UUID, UUID) CASCADE;
DROP TABLE IF EXISTS person_side_cache CASCADE;
