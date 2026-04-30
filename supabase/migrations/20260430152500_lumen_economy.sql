-- ============================================================
-- LUMEN (LMN) Point Economy — Core Infrastructure
-- ============================================================

-- 1. Add LUMEN columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS lumen_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lumen_tier TEXT DEFAULT 'NEW TALENT',
ADD COLUMN IF NOT EXISTS peak_lumen INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lumen_granted BOOLEAN DEFAULT false;

-- 2. Create LUMEN audit log table
CREATE TABLE IF NOT EXISTS public.lumen_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT,
  balance_after INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lumen_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lumen log" ON public.lumen_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage lumen log" ON public.lumen_log
  FOR ALL USING (true) WITH CHECK (true);

-- 3. Tier calculation function
CREATE OR REPLACE FUNCTION public.calculate_lumen_tier(points INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF points >= 40000 THEN RETURN 'ELITE';
  ELSIF points >= 15000 THEN RETURN 'PRO TALENT';
  ELSIF points >= 6000 THEN RETURN 'ACTIVE';
  ELSIF points >= 2000 THEN RETURN 'RISING';
  ELSE RETURN 'NEW TALENT';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Trigger: Auto-update tier and peak when lumen_points changes
CREATE OR REPLACE FUNCTION public.on_lumen_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update tier
  NEW.lumen_tier := public.calculate_lumen_tier(NEW.lumen_points);
  
  -- Update peak
  IF NEW.lumen_points > COALESCE(NEW.peak_lumen, 0) THEN
    NEW.peak_lumen := NEW.lumen_points;
  END IF;
  
  -- Floor protection: never drop below 70% of peak
  IF NEW.peak_lumen > 0 AND NEW.lumen_points < (NEW.peak_lumen * 0.7)::INTEGER THEN
    NEW.lumen_points := (NEW.peak_lumen * 0.7)::INTEGER;
    NEW.lumen_tier := public.calculate_lumen_tier(NEW.lumen_points);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_lumen_update ON public.profiles;
CREATE TRIGGER trigger_lumen_update
  BEFORE UPDATE OF lumen_points ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.on_lumen_update();

-- 5. Helper function to award LMN with logging
CREATE OR REPLACE FUNCTION public.award_lumen(
  p_user_id UUID,
  p_amount INTEGER,
  p_action TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_is_vip BOOLEAN;
  v_final_amount INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Check VIP status for 1.3x multiplier
  SELECT is_vip INTO v_is_vip FROM public.profiles WHERE id = p_user_id;
  
  -- Apply Early User Boost (VIP = first 1000 users)
  IF v_is_vip THEN
    v_final_amount := CEIL(p_amount * 1.3);
  ELSE
    v_final_amount := p_amount;
  END IF;
  
  -- Update balance
  UPDATE public.profiles 
  SET lumen_points = lumen_points + v_final_amount
  WHERE id = p_user_id
  RETURNING lumen_points INTO v_new_balance;
  
  -- Log the transaction
  INSERT INTO public.lumen_log (user_id, action, amount, reason, balance_after)
  VALUES (p_user_id, p_action, v_final_amount, p_reason, v_new_balance);
  
  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Helper function to deduct LMN with floor protection
CREATE OR REPLACE FUNCTION public.deduct_lumen(
  p_user_id UUID,
  p_amount INTEGER,
  p_action TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_current INTEGER;
  v_peak INTEGER;
  v_floor INTEGER;
  v_new_balance INTEGER;
BEGIN
  SELECT lumen_points, peak_lumen INTO v_current, v_peak 
  FROM public.profiles WHERE id = p_user_id;
  
  v_floor := GREATEST((v_peak * 0.7)::INTEGER, 0);
  v_new_balance := GREATEST(v_current - p_amount, v_floor);
  
  UPDATE public.profiles SET lumen_points = v_new_balance WHERE id = p_user_id;
  
  INSERT INTO public.lumen_log (user_id, action, amount, reason, balance_after)
  VALUES (p_user_id, p_action, -(v_current - v_new_balance), p_reason, v_new_balance);
  
  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Leaderboard view for efficient querying
CREATE OR REPLACE VIEW public.lumen_leaderboard AS
SELECT 
  p.id,
  p.mm8_id,
  p.full_name,
  p.username,
  p.avatar_url_proxy,
  p.lumen_points,
  p.lumen_tier,
  p.is_vip,
  p.streak_days,
  ROW_NUMBER() OVER (ORDER BY p.lumen_points DESC, p.mm8_id ASC) as rank
FROM public.profiles p
WHERE p.lumen_points > 0
ORDER BY p.lumen_points DESC;
