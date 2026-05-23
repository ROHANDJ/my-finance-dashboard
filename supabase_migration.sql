-- Stock Analyzer - Supabase Migration
-- Run this in Supabase Dashboard → SQL Editor → New query → Run

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  pan_card TEXT DEFAULT '',
  preferences JSONB DEFAULT '{"defaultMarket":"indian","currency":"INR","timezone":"Asia/Kolkata","notifications":{"email":true,"sms":false,"push":true},"riskProfile":"moderate"}',
  subscription JSONB DEFAULT '{"plan":"free","features":[]}',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brokerage_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('us','indian')),
  broker TEXT,
  api_key TEXT,
  api_secret TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_type TEXT CHECK (account_type IN ('us','indian')) NOT NULL,
  holdings JSONB DEFAULT '[]',
  transactions JSONB DEFAULT '[]',
  performance JSONB DEFAULT '{"totalInvested":0,"currentValue":0,"totalReturns":0,"totalReturnsPercentage":0,"dayChange":0,"dayChangePercentage":0}',
  risk JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  category TEXT CHECK (category IN ('food','transport','shopping','entertainment','utilities','health','education','other')) NOT NULL,
  description TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_method TEXT CHECK (payment_method IN ('cash','card','upi','netbanking')) DEFAULT 'card',
  tags JSONB DEFAULT '[]',
  is_recurring BOOLEAN DEFAULT false,
  recurring_type TEXT CHECK (recurring_type IN ('daily','weekly','monthly')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  card_name TEXT NOT NULL,
  last_4_digits TEXT NOT NULL,
  card_type TEXT CHECK (card_type IN ('visa','mastercard','rupay','amex')) NOT NULL,
  credit_limit NUMERIC(12,2) NOT NULL,
  available_credit NUMERIC(12,2) NOT NULL,
  billing_cycle_date INTEGER,
  due_date TIMESTAMPTZ,
  minimum_payment NUMERIC(12,2) DEFAULT 0,
  current_balance NUMERIC(12,2) DEFAULT 0,
  total_spent NUMERIC(12,2) DEFAULT 0,
  color TEXT DEFAULT '#1976d2',
  is_active BOOLEAN DEFAULT true,
  transactions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id_date ON expenses(user_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id_category ON expenses(user_id, category);
CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON credit_cards(user_id);

-- Disable RLS (server uses service_role key which bypasses it anyway)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE brokerage_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards DISABLE ROW LEVEL SECURITY;
