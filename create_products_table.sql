-- =====================================================================
-- SQL SCRIPT TO CREATE THE PRODUCTS TABLE IN SUPABASE WITH RLS POLICIES
-- =====================================================================
-- Copy and execute this complete script in the SQL Editor of your Supabase dashboard.

-- 1. Create the products table if it does not exist
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 3. Create Public Read Access Policy (Everyone can view products)
CREATE POLICY "Allow public read access to products" ON public.products
    FOR SELECT TO public USING (true);

-- 4. Create Own Authenticated Insert Policy (Professionals can add their own products)
CREATE POLICY "Allow authenticated insert access to own products" ON public.products
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = professional_id);

-- 5. Create Own Authenticated Update Policy (Professionals can edit their own products)
CREATE POLICY "Allow authenticated update access to own products" ON public.products
    FOR UPDATE TO authenticated USING (auth.uid() = professional_id);

-- 6. Create Own Authenticated Delete Policy (Professionals can remove their own products)
CREATE POLICY "Allow authenticated delete access to own products" ON public.products
    FOR DELETE TO authenticated USING (auth.uid() = professional_id);

-- =====================================================================
-- End of SQL Script
-- =====================================================================
