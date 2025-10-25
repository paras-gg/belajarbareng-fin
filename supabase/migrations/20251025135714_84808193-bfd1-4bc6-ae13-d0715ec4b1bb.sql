-- Update the handle_new_user function to also insert into user_roles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, nama, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'nama', split_part(new.email, '@', 1)),
    'biasa'
  );
  
  -- Insert into user_roles table with default 'biasa' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'biasa'::app_role);
  
  RETURN new;
END;
$function$;