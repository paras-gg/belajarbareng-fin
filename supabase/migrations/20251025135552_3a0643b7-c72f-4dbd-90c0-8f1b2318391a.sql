-- Step 1: Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'premium', 'biasa');

-- Step 2: Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Step 3: Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 4: Migrate existing roles from profiles to user_roles (without direct casting)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 
  CASE 
    WHEN role::text = 'admin' THEN 'admin'::app_role
    WHEN role::text = 'premium' THEN 'premium'::app_role
    ELSE 'biasa'::app_role
  END
FROM public.profiles
WHERE role IS NOT NULL;

-- Step 5: Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 6: Create RLS policy for user_roles (users can view their own roles)
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Step 7: Create RLS policy for admin access to all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 8: Create RLS policy for admin to manage roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Step 9: Update educations table RLS policies to use new has_role function
DROP POLICY IF EXISTS "Admins can insert educations" ON public.educations;
DROP POLICY IF EXISTS "Admins can update educations" ON public.educations;
DROP POLICY IF EXISTS "Admins can delete educations" ON public.educations;

CREATE POLICY "Admins can insert educations"
ON public.educations
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update educations"
ON public.educations
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete educations"
ON public.educations
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 10: Update premium content access policy
DROP POLICY IF EXISTS "Premium users can view all content" ON public.educations;

CREATE POLICY "Premium users can view all content"
ON public.educations
FOR SELECT
TO authenticated
USING (
  (is_premium = false) OR 
  (public.has_role(auth.uid(), 'premium')) OR
  (public.has_role(auth.uid(), 'admin')) OR
  ((SELECT premium_until FROM profiles WHERE id = auth.uid()) > now())
);

-- Step 11: Update categories RLS policies
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;

CREATE POLICY "Admins can insert categories"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update categories"
ON public.categories
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete categories"
ON public.categories
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 12: Update premium_packages RLS policies
DROP POLICY IF EXISTS "Admins can manage packages" ON public.premium_packages;

CREATE POLICY "Admins can manage packages"
ON public.premium_packages
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Step 13: Update profiles RLS policies for admin access
DROP POLICY IF EXISTS "admins_can_view_all_users" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_update_all_users" ON public.profiles;

CREATE POLICY "admins_can_view_all_users"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_can_update_all_users"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));