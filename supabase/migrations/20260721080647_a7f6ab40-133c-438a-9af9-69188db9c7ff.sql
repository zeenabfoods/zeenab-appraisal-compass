CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  requested_role text;
  safe_role public.user_role;
BEGIN
  requested_role := COALESCE(new.raw_user_meta_data->>'role', 'staff');
  -- SECURITY: Never allow self-assignment of privileged roles at signup.
  IF requested_role IN ('manager') THEN
    safe_role := 'manager'::public.user_role;
  ELSE
    safe_role := 'staff'::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    safe_role
  );
  RETURN new;
END;
$function$;