-- ============================================================================
-- 009_seed_dummy_profiles.sql
-- Seed 10 dummy players for testing leaderboard and profile features
-- ============================================================================

-- NOTE: public.profiles has a foreign key constraint (fk_profiles_auth_users)
-- referencing auth.users(id). We first create corresponding mock users in auth.users
-- so that foreign key validation passes, and then upsert their profiles in public.profiles.

BEGIN;

-- 1. Insert 10 mock auth accounts into auth.users (idempotent)
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
)
VALUES
    ('11111111-1111-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'royaldonkey47@kazhudha.test', null, NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"RoyalDonkey47"}', NOW(), NOW()),
    ('11111111-1111-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'luckyace98@kazhudha.test',null , NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"LuckyAce98"}', NOW(), NOW()),
    ('11111111-1111-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cardmaster21@kazhudha.test', null, NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"CardMaster21"}', NOW(), NOW()),
    ('11111111-1111-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cleverkazhudha19@kazhudha.test',null , NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"CleverKazhudha19"}', NOW(), NOW()),
    ('11111111-1111-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jollyjack56@kazhudha.test', null, NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"JollyJack56"}', NOW(), NOW()),
    ('11111111-1111-4000-8000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mightydealer88@kazhudha.test', null, NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"MightyDealer88"}', NOW(), NOW()),
    ('11111111-1111-4000-8000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'goldencard73@kazhudha.test', null, NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"GoldenCard73"}', NOW(), NOW()),
    ('11111111-1111-4000-8000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sneakydonkey33@kazhudha.test', null, NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"SneakyDonkey33"}', NOW(), NOW()),
    ('11111111-1111-4000-8000-000000000009', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'aceblaster55@kazhudha.test', null, NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"AceBlaster55"}', NOW(), NOW()),
    ('11111111-1111-4000-8000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'turbodonkey11@kazhudha.test', null, NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"TurboDonkey11"}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Upsert 10 test player profiles into public.profiles
INSERT INTO public.profiles (
    id,
    username,
    avatar_url,
    xp,
    coins,
    level,
    matches_played,
    matches_won,
    created_at,
    updated_at
)
VALUES
    ('11111111-1111-4000-8000-000000000001', 'RoyalDonkey47', 'guest_avatar', 1240, 620, 12, 45, 30, NOW() - INTERVAL '30 days', NOW()),
    ('11111111-1111-4000-8000-000000000002', 'LuckyAce98', 'guest_avatar', 1080, 540, 10, 38, 25, NOW() - INTERVAL '25 days', NOW()),
    ('11111111-1111-4000-8000-000000000003', 'CardMaster21', 'guest_avatar', 940, 470, 9, 35, 22, NOW() - INTERVAL '20 days', NOW()),
    ('11111111-1111-4000-8000-000000000004', 'CleverKazhudha19', 'guest_avatar', 810, 400, 8, 30, 18, NOW() - INTERVAL '18 days', NOW()),
    ('11111111-1111-4000-8000-000000000005', 'JollyJack56', 'guest_avatar', 770, 380, 7, 28, 16, NOW() - INTERVAL '15 days', NOW()),
    ('11111111-1111-4000-8000-000000000006', 'MightyDealer88', 'guest_avatar', 730, 360, 7, 26, 15, NOW() - INTERVAL '12 days', NOW()),
    ('11111111-1111-4000-8000-000000000007', 'GoldenCard73', 'guest_avatar', 690, 340, 6, 24, 14, NOW() - INTERVAL '10 days', NOW()),
    ('11111111-1111-4000-8000-000000000008', 'SneakyDonkey33', 'guest_avatar', 650, 320, 6, 22, 12, NOW() - INTERVAL '8 days', NOW()),
    ('11111111-1111-4000-8000-000000000009', 'AceBlaster55', 'guest_avatar', 610, 300, 5, 20, 11, NOW() - INTERVAL '5 days', NOW()),
    ('11111111-1111-4000-8000-000000000010', 'TurboDonkey11', 'guest_avatar', 580, 280, 5, 18, 10, NOW() - INTERVAL '3 days', NOW())
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url,
    xp = EXCLUDED.xp,
    coins = EXCLUDED.coins,
    level = EXCLUDED.level,
    matches_played = EXCLUDED.matches_played,
    matches_won = EXCLUDED.matches_won,
    updated_at = NOW();

COMMIT;

-- ============================================================================
-- Verification query:
-- SELECT id, username, xp, coins, level, matches_played, matches_won FROM public.profiles ORDER BY xp DESC;
--
-- Cleanup query (if you ever need to remove all 10 dummy players):
-- DELETE FROM auth.users WHERE email LIKE '%@kazhudha.test';
-- (Deleting from auth.users automatically cascades and deletes from public.profiles)
-- ============================================================================
