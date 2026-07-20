-- Run this in Supabase SQL Editor after creating your project

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0)
);

CREATE TABLE IF NOT EXISTS credits_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credits_transactions_user ON credits_transactions(user_id);

-- Auto-create profile on signup (trigger only, not callable by users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, credits)
    VALUES (NEW.id, 0)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Grant credits and log transaction (backend-only, via service_role)
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id UUID, p_amount INTEGER, p_reason TEXT)
RETURNS void
SET search_path = ''
AS $$
BEGIN
    UPDATE public.profiles SET credits = credits + p_amount WHERE id = p_user_id;
    INSERT INTO public.credits_transactions (user_id, amount, reason)
    VALUES (p_user_id, p_amount, p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deduct one credit atomically (backend-only, via service_role)
-- Uses UPDATE ... WHERE credits > 0 RETURNING to avoid race conditions
CREATE OR REPLACE FUNCTION public.use_credit(p_user_id UUID)
RETURNS boolean
SET search_path = ''
AS $$
DECLARE
    current_credits INTEGER;
BEGIN
    UPDATE public.profiles
    SET credits = credits - 1
    WHERE id = p_user_id AND credits > 0
    RETURNING credits INTO current_credits;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    INSERT INTO public.credits_transactions (user_id, amount, reason)
    VALUES (p_user_id, -1, 'chat_message');
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Block direct calls from anon/authenticated (frontend users)
REVOKE EXECUTE ON FUNCTION public.add_credits FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.use_credit FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user FROM PUBLIC, anon, authenticated;

-- Allow calls via the service_role key (our backend)
GRANT EXECUTE ON FUNCTION public.add_credits TO service_role;
GRANT EXECUTE ON FUNCTION public.use_credit TO service_role;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own transactions" ON credits_transactions;
CREATE POLICY "Users can view own transactions"
    ON credits_transactions FOR SELECT
    USING (auth.uid() = user_id);
