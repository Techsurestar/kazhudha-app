-- ============================================================================
-- 1. ENABLE ROW LEVEL SECURITY ON ALL GAME TABLES
-- ============================================================================
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_hands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_hand_scores ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 2. HELPER FUNCTIONS (SECURITY DEFINER)
-- Optimized with SET search_path = '' and STABLE to avoid repetitive joins
-- ============================================================================
-- Check if current authenticated user participated in a match
CREATE OR REPLACE FUNCTION public.is_match_participant(_match_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.match_participants
        WHERE match_id = _match_id
          AND user_id = (SELECT auth.uid())
    );
$$;
-- Check if current authenticated user created/hosted the match
CREATE OR REPLACE FUNCTION public.is_match_creator(_match_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.matches
        WHERE id = _match_id
          AND created_by = (SELECT auth.uid())
    );
$$;

-- ============================================================================
-- 3. POLICIES FOR: public.matches
-- ============================================================================
-- SELECT: Users can view completed matches (for leaderboards/public history),
-- or any active match they created or participate in.
CREATE POLICY "View matches"
ON public.matches
FOR SELECT
TO authenticated, anon
USING (
    status = 'COMPLETED' 
    OR created_by = (SELECT auth.uid()) 
    OR public.is_match_participant(id)
);
-- INSERT: Authenticated users can only create matches where they are the creator.
CREATE POLICY "Create matches"
ON public.matches
FOR INSERT
TO authenticated
WITH CHECK (
    created_by = (SELECT auth.uid())
);
-- UPDATE: Only the creator can update a match, and ONLY while it is IN_PROGRESS.
-- Completed/abandoned matches become immutable.
CREATE POLICY "Update active matches"
ON public.matches
FOR UPDATE
TO authenticated
USING (
    created_by = (SELECT auth.uid()) 
    AND status = 'IN_PROGRESS'
)
WITH CHECK (
    created_by = (SELECT auth.uid())
);
-- DELETE: Disallow client-side match deletion (preserves audit/tournament history).
-- Deletions should be handled by admin or cascade on user delete.
-- ============================================================================
-- 4. POLICIES FOR: public.match_participants
-- ============================================================================
-- SELECT: Anyone who can view the match can view its participants.
CREATE POLICY "View match participants"
ON public.match_participants
FOR SELECT
TO authenticated, anon
USING (
    EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.id = match_participants.match_id
          AND (
              m.status = 'COMPLETED' 
              OR m.created_by = (SELECT auth.uid()) 
              OR public.is_match_participant(m.id)
          )
    )
);
-- INSERT: Match creator can add participants.
-- Anti-spoofing rule: user_id must be NULL (for Bots/Guests) OR equal to auth.uid().
-- (Prevents a user from attaching other users' accounts to fake matches).
CREATE POLICY "Insert match participants"
ON public.match_participants
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_match_creator(match_id)
    AND (user_id IS NULL OR user_id = (SELECT auth.uid()))
);
-- UPDATE: Only creator can update participant stats during the active match.
CREATE POLICY "Update match participants"
ON public.match_participants
FOR UPDATE
TO authenticated
USING (
    public.is_match_creator(match_id)
    AND EXISTS (
        SELECT 1 FROM public.matches m 
        WHERE m.id = match_participants.match_id AND m.status = 'IN_PROGRESS'
    )
);
-- ============================================================================
-- 5. POLICIES FOR: public.match_hands
-- ============================================================================
-- SELECT: Accessible if parent match is viewable.
CREATE POLICY "View match hands"
ON public.match_hands
FOR SELECT
TO authenticated, anon
USING (
    EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.id = match_hands.match_id
          AND (
              m.status = 'COMPLETED' 
              OR m.created_by = (SELECT auth.uid()) 
              OR public.is_match_participant(m.id)
          )
    )
);
-- INSERT: Only the match creator can record hands while match is IN_PROGRESS.
CREATE POLICY "Insert match hands"
ON public.match_hands
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_match_creator(match_id)
    AND EXISTS (
        SELECT 1 FROM public.matches m 
        WHERE m.id = match_hands.match_id AND m.status = 'IN_PROGRESS'
    )
);
-- ============================================================================
-- 6. POLICIES FOR: public.match_hand_scores
-- ============================================================================
-- SELECT: Accessible if parent hand/match is viewable.
CREATE POLICY "View hand scores"
ON public.match_hand_scores
FOR SELECT
TO authenticated, anon
USING (
    EXISTS (
        SELECT 1 FROM public.match_hands h
        JOIN public.matches m ON m.id = h.match_id
        WHERE h.id = match_hand_scores.hand_id
          AND (
              m.status = 'COMPLETED' 
              OR m.created_by = (SELECT auth.uid()) 
              OR public.is_match_participant(m.id)
          )
    )
);
-- INSERT: Only the match creator can insert hand scores.
CREATE POLICY "Insert hand scores"
ON public.match_hand_scores
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.match_hands h
        WHERE h.id = match_hand_scores.hand_id
          AND public.is_match_creator(h.match_id)
    )
);