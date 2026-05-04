-- Phase 2: Production Expansion
-- 1. Directors Table
CREATE TABLE IF NOT EXISTS public.directors (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_name TEXT,
    bio TEXT,
    location TEXT,
    character_briefs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for directors
ALTER TABLE public.directors ENABLE ROW LEVEL SECURITY;

-- 2. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    community_id UUID, -- For future group chats
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. Roles (Casting Calls) Table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    director_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    budget TEXT,
    location TEXT,
    tags TEXT[],
    status TEXT DEFAULT 'OPEN',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- 4. News Table
CREATE TABLE IF NOT EXISTS public.news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    category TEXT,
    image_url TEXT,
    source_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for news
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
-- Directors
DROP POLICY IF EXISTS "Public directors are viewable by everyone" ON public.directors;
CREATE POLICY "Public directors are viewable by everyone" ON public.directors FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own director profile" ON public.directors;
CREATE POLICY "Users can update own director profile" ON public.directors FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own director profile" ON public.directors;
CREATE POLICY "Users can insert own director profile" ON public.directors FOR INSERT WITH CHECK (auth.uid() = id);

-- Messages
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Roles
DROP POLICY IF EXISTS "Roles are viewable by everyone" ON public.roles;
CREATE POLICY "Roles are viewable by everyone" ON public.roles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Directors can manage their own roles" ON public.roles;
CREATE POLICY "Directors can manage their own roles" ON public.roles FOR ALL USING (auth.uid() = director_id);

-- News
DROP POLICY IF EXISTS "News is viewable by everyone" ON public.news;
CREATE POLICY "News is viewable by everyone" ON public.news FOR SELECT USING (true);

-- Functions & RPCs
-- Improved award_lumen for strictness
CREATE OR REPLACE FUNCTION public.award_lumen(
    p_user_id UUID,
    p_amount INTEGER,
    p_action TEXT,
    p_reason TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_is_vip BOOLEAN;
    v_final_amount INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Prevent double-claiming for specific actions on the same day
    IF p_action IN ('DAILY_LOGIN', 'UPLOAD_TAPE', 'PROFILE_UPDATE', 'INITIAL_GRANT') THEN
        IF EXISTS (
            SELECT 1 FROM public.lumen_log 
            WHERE user_id = p_user_id 
            AND action = p_action 
            AND (p_action = 'INITIAL_GRANT' OR created_at >= CURRENT_DATE)
        ) THEN
            -- Return current balance if already awarded
            SELECT lumen_points INTO v_new_balance FROM public.profiles WHERE id = p_user_id;
            RETURN v_new_balance;
        END IF;
    END IF;

    -- Check VIP status for 1.3x multiplier
    SELECT is_vip INTO v_is_vip FROM public.profiles WHERE id = p_user_id;
    
    IF v_is_vip THEN
        v_final_amount := CEIL(p_amount * 1.3);
    ELSE
        v_final_amount := p_amount;
    END IF;

    -- Update profile points
    UPDATE public.profiles 
    SET lumen_points = lumen_points + v_final_amount
    WHERE id = p_user_id
    RETURNING lumen_points INTO v_new_balance;

    -- Log the transaction
    INSERT INTO public.lumen_log (user_id, amount, action, reason, balance_after)
    VALUES (p_user_id, v_final_amount, p_action, p_reason, v_new_balance);

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
