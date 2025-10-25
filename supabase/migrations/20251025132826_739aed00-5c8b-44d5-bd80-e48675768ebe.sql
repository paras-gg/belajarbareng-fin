-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can insert educations" ON educations;
DROP POLICY IF EXISTS "Admins can update educations" ON educations;
DROP POLICY IF EXISTS "Admins can delete educations" ON educations;

-- Recreate policies using the existing is_admin_user function
CREATE POLICY "Admins can insert educations" ON educations
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Admins can update educations" ON educations
  FOR UPDATE
  TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete educations" ON educations
  FOR DELETE
  TO authenticated
  USING (is_admin_user(auth.uid()));