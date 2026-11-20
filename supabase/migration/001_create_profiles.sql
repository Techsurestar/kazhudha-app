CREATE TABLE public.profiles (
    id UUID,
    username VARCHAR(20),
    avatar_url TEXT,
    xp BIGINT DEFAULT 0,
    coins BIGINT DEFAULT 0,
    level INTEGER DEFAULT 1,
    matches_played INTEGER DEFAULT 0,
    matches_won INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);