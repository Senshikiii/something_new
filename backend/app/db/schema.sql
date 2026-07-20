-- Run this in Supabase SQL Editor after creating your project

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    credits INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS credits_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credits_transactions_user ON credits_transactions(user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, credits)
    VALUES (NEW.id, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to atomically add credits and log the transaction
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id UUID, p_amount INTEGER, p_reason TEXT)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles SET credits = credits + p_amount WHERE id = p_user_id;
    INSERT INTO public.credits_transactions (user_id, amount, reason)
    VALUES (p_user_id, p_amount, p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to atomically deduct credits (returns false if insufficient)
CREATE OR REPLACE FUNCTION public.use_credit(p_user_id UUID)
RETURNS boolean AS $$
DECLARE
    current_credits INTEGER;
BEGIN
    SELECT credits INTO current_credits FROM public.profiles WHERE id = p_user_id;
    IF current_credits IS NULL OR current_credits < 1 THEN
        RETURN false;
    END IF;
    UPDATE public.profiles SET credits = credits - 1 WHERE id = p_user_id;
    INSERT INTO public.credits_transactions (user_id, amount, reason)
    VALUES (p_user_id, -1, 'chat_message');
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can view own transactions"
    ON credits_transactions FOR SELECT
    USING (auth.uid() = user_id);
