CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Application accounts controlled by the Java server (not Supabase Auth).
CREATE TABLE IF NOT EXISTS public.users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL DEFAULT 'Budget Buddy User',
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Upgrade an existing Supabase-Auth-linked users table without deleting data.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_user_id_fkey;
ALTER TABLE public.users ALTER COLUMN user_id SET DEFAULT gen_random_uuid();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE TABLE IF NOT EXISTS public.sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.categories (
    category_id BIGSERIAL PRIMARY KEY,
    category_name VARCHAR(80) NOT NULL UNIQUE,
    icon VARCHAR(80)
);

CREATE TABLE IF NOT EXISTS public.family_groups (
    family_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_name VARCHAR(120) NOT NULL,
    created_by UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.goals (
    goal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    family_id UUID REFERENCES public.family_groups(family_id) ON DELETE SET NULL,
    goal_name VARCHAR(160) NOT NULL,
    target_amount NUMERIC(14, 2) NOT NULL CHECK (target_amount > 0),
    saved_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (saved_amount >= 0),
    deadline DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.transactions (
    transaction_id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    category_id BIGINT REFERENCES public.categories(category_id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    description VARCHAR(255),
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.savings (
    saving_id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    goal_id UUID REFERENCES public.goals(goal_id) ON DELETE SET NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    saved_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.family_members (
    member_id BIGSERIAL PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES public.family_groups(family_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    contribution NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (contribution >= 0),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (family_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_savings_user_date ON public.savings(user_id, saved_date DESC);
CREATE INDEX IF NOT EXISTS idx_goals_user ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON public.notifications(user_id, status);

INSERT INTO public.categories (category_name, icon) VALUES
    ('Food', 'utensils'), ('Shopping', 'shopping-bag'), ('Transport', 'bus'),
    ('Bills', 'receipt'), ('Entertainment', 'film'), ('Other', 'circle')
ON CONFLICT (category_name) DO NOTHING;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DROP POLICY IF EXISTS users_own_profile ON public.users;
DROP POLICY IF EXISTS categories_authenticated_read ON public.categories;
DROP POLICY IF EXISTS transactions_own_rows ON public.transactions;
DROP POLICY IF EXISTS savings_own_rows ON public.savings;
DROP POLICY IF EXISTS goals_own_rows ON public.goals;
DROP POLICY IF EXISTS notifications_own_rows ON public.notifications;
DROP POLICY IF EXISTS family_groups_visible_to_members ON public.family_groups;
DROP POLICY IF EXISTS family_groups_creator_write ON public.family_groups;
DROP POLICY IF EXISTS family_members_visible_rows ON public.family_members;
DROP POLICY IF EXISTS family_members_managed_rows ON public.family_members;

-- The Java server accesses these tables with a server-only Supabase secret key.
-- RLS remains enabled so public browser keys cannot read or modify financial data.
