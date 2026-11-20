
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_adjectives TEXT[] := ARRAY[
        'Mystic', 'Lucky', 'Royal', 'Clever',
        'Golden', 'Shadow', 'Swift', 'Cosmic',
        'Mighty', 'Fearless', 'Silent', 'Noble',
        'Fierce', 'Jolly', 'Magic', 'Rapid',
        'Brave', 'Epic', 'Witty', 'Daring',
        'Silver', 'Thunder', 'Crimson', 'Frozen'
    ];

    v_nouns TEXT[] := ARRAY[
        'Dealer', 'Falcon', 'Tiger', 'Ace',
        'Rider', 'King', 'Jack', 'Wizard',
        'Knight', 'Ninja', 'Dragon', 'Eagle',
        'Ranger', 'Legend', 'Warrior', 'Fox',
        'Master', 'Blaze', 'Hunter', 'Champ'
    ];

    v_username TEXT;
    v_inserted INTEGER;
    v_attempt INTEGER := 0;
BEGIN

    LOOP
        v_attempt := v_attempt + 1;

        IF v_attempt > 100 THEN
            RAISE EXCEPTION
                'Unable to generate a unique username';
        END IF;

        v_username :=
            v_adjectives[
                floor(random() * array_length(v_adjectives, 1))::INTEGER + 1
            ]
            ||
            v_nouns[
                floor(random() * array_length(v_nouns, 1))::INTEGER + 1
            ]
            ||
            floor(random() * 9000 + 1000)::INTEGER::TEXT;

        INSERT INTO public.profiles (
            id,
            username,
            avatar_url,
            xp,
            coins,
            level,
            matches_played,
            matches_won
        )
        VALUES (
            NEW.id,
            v_username,
            NULL,
            0,
            0,
            1,
            0,
            0
        )
        ON CONFLICT DO NOTHING;

        GET DIAGNOSTICS v_inserted = ROW_COUNT;

        IF v_inserted = 1 THEN
            EXIT;
        END IF;

    END LOOP;

    RETURN NEW;

END;
$$;
