-- ============================================================================
-- 008_allow_anon_read_profiles.sql
-- Allow anon/unauthenticated users to view profiles for public leaderboard
-- ============================================================================

CREATE POLICY "Allow anon to view profiles for leaderboard"
ON public.profiles
FOR SELECT
TO anon
USING (true);
