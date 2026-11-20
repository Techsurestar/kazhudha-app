ALTER TABLE public.profiles
ADD CONSTRAINT pk_profiles
PRIMARY KEY (id);

ALTER TABLE public.profiles
ADD CONSTRAINT fk_profiles_auth_users
FOREIGN KEY (id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

ALTER TABLE public.profiles
ALTER COLUMN username SET NOT NULL,
ALTER COLUMN xp SET NOT NULL,
ALTER COLUMN coins SET NOT NULL,
ALTER COLUMN level SET NOT NULL,
ALTER COLUMN matches_played SET NOT NULL,
ALTER COLUMN matches_won SET NOT NULL,
ALTER COLUMN created_at SET NOT NULL,
ALTER COLUMN updated_at SET NOT NULL;

CREATE UNIQUE INDEX uq_profiles_username_ci
ON public.profiles (LOWER(BTRIM(username)));

ALTER TABLE public.profiles
ADD CONSTRAINT chk_profiles_xp
CHECK (xp >= 0);

ALTER TABLE public.profiles
ADD CONSTRAINT chk_profiles_coins
CHECK (coins >= 0);

ALTER TABLE public.profiles
ADD CONSTRAINT chk_profiles_level
CHECK (level >= 1);

ALTER TABLE public.profiles
ADD CONSTRAINT chk_profiles_matches_played
CHECK (matches_played >= 0);

ALTER TABLE public.profiles
ADD CONSTRAINT chk_profiles_matches_won
CHECK (
    matches_won >= 0
    AND matches_won <= matches_played
);

ALTER TABLE public.profiles
ADD CONSTRAINT chk_profiles_username_length
CHECK (
    char_length(username) BETWEEN 3 AND 20
);

ALTER TABLE public.profiles
ALTER COLUMN xp SET DEFAULT 0,
ALTER COLUMN coins SET DEFAULT 0,
ALTER COLUMN level SET DEFAULT 1,
ALTER COLUMN avatar_url SET DEFAULT 'guest_avatar',
ALTER COLUMN matches_played SET DEFAULT 0,
ALTER COLUMN matches_won SET DEFAULT 0,
ALTER COLUMN created_at SET DEFAULT NOW(),
ALTER COLUMN updated_at SET DEFAULT NOW();


SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
ORDER BY contype, conname;