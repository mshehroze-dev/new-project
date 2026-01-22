-- Migration: users
-- Timestamp: 20260122080145
-- This migration creates the users table with proper schema,
-- Row Level Security policies, indexes, and triggers.

-- DEPENDENCY VALIDATION:
-- This migration assumes the following functions exist in earlier migrations:
-- - update_updated_at_column() (created in initial schema migration)
-- If these functions are missing, the migration will fail.

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  username TEXT UNIQUE,
  full_name TEXT
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Policy: Authenticated users can view users
CREATE POLICY "Authenticated users can view users"
  ON users FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can insert users
CREATE POLICY "Authenticated users can insert users"
  ON users FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can update own record
CREATE POLICY "Users can update own record"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- INDEXES
-- ============================================================================


DO $$
BEGIN
IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
    WHERE c.relname = 'users' AND a.attname IN ('created_at')
) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS users_created_at_idx ON users(created_at);';
END IF;
END$$;
        

DO $$
BEGIN
IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
    WHERE c.relname = 'users' AND a.attname IN ('updated_at')
) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS users_updated_at_idx ON users(updated_at);';
END IF;
END$$;
        

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to automatically update the updated_at timestamp
-- NOTE: This trigger assumes the update_updated_at_column() function exists
-- The function should be created in the initial schema migration (20240101000000_initial_schema.sql)
DO $$
BEGIN
IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_table = 'users'
      AND trigger_name = 'update_users_updated_at'
) THEN
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
END IF;
END$$;
