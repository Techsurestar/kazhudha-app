-- 1. Tournament matches
CREATE TABLE public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_mode VARCHAR(30) NOT NULL DEFAULT 'SINGLE_PLAYER',
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS' 
        CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED')),
    target_score INTEGER NOT NULL DEFAULT 100 CHECK (target_score >= 0),
    total_hands INTEGER NOT NULL DEFAULT 0 CHECK (total_hands >= 0),
    winner_participant_id UUID,
    kazhudha_participant_id UUID,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);


-- 2. Tournament participants
CREATE TABLE public.match_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    player_type VARCHAR(20) NOT NULL CHECK (player_type IN ('HUMAN', 'BOT', 'GUEST')),
    seat_index SMALLINT NOT NULL CHECK (seat_index BETWEEN 0 AND 3),
    display_name VARCHAR(50) NOT NULL,
    final_score INTEGER NOT NULL DEFAULT 0 CHECK (final_score >= 0),
    final_rank SMALLINT CHECK (final_rank BETWEEN 1 AND 4),
    is_winner BOOLEAN NOT NULL DEFAULT false,
    is_kazhudha BOOLEAN NOT NULL DEFAULT false,
    hands_won INTEGER NOT NULL DEFAULT 0,
    hands_kazhudha INTEGER NOT NULL DEFAULT 0,
    xp_earned INTEGER NOT NULL DEFAULT 0,
    coins_earned INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_match_participant_seat UNIQUE (match_id, seat_index)
);

-- Add foreign key constraints back to matches
ALTER TABLE public.matches
    ADD CONSTRAINT fk_matches_winner_participant 
    FOREIGN KEY (winner_participant_id) REFERENCES public.match_participants(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_matches_kazhudha_participant 
    FOREIGN KEY (kazhudha_participant_id) REFERENCES public.match_participants(id) ON DELETE SET NULL;

-- 3. Hands / rounds
CREATE TABLE public.match_hands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    hand_number INTEGER NOT NULL CHECK (hand_number >= 1),
    lead_participant_id UUID REFERENCES public.match_participants(id) ON DELETE SET NULL,
    first_escape_participant_id UUID REFERENCES public.match_participants(id) ON DELETE SET NULL,
    kazhudha_participant_id UUID REFERENCES public.match_participants(id) ON DELETE SET NULL,
    vettu_count INTEGER NOT NULL DEFAULT 0 CHECK (vettu_count >= 0),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    CONSTRAINT uq_match_hand_number UNIQUE (match_id, hand_number)
);

-- 4. Hand scores per player
CREATE TABLE public.match_hand_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hand_id UUID NOT NULL REFERENCES public.match_hands(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES public.match_participants(id) ON DELETE CASCADE,
    escape_rank SMALLINT CHECK (escape_rank BETWEEN 1 AND 4),
    score_awarded INTEGER NOT NULL CHECK (score_awarded IN (20, 15, 10, 0)),
    cards_remaining INTEGER NOT NULL DEFAULT 0 CHECK (cards_remaining >= 0),
    vettus_performed INTEGER NOT NULL DEFAULT 0 CHECK (vettus_performed >= 0),
    vettus_received INTEGER NOT NULL DEFAULT 0 CHECK (vettus_received >= 0),
    is_kazhudha BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT uq_hand_participant_score UNIQUE (hand_id, participant_id)
);

-- Indexes for performance
CREATE INDEX idx_match_participants_user_id ON public.match_participants (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_match_participants_match_id ON public.match_participants (match_id);
CREATE INDEX idx_match_hands_match_id ON public.match_hands (match_id);
CREATE INDEX idx_match_hand_scores_hand_id ON public.match_hand_scores (hand_id);
CREATE INDEX idx_matches_status_completed ON public.matches (status, completed_at DESC);