-- Migration to add visitors_count, followers_count, and services columns to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS visitors_count INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followers_count INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]'::jsonb;
