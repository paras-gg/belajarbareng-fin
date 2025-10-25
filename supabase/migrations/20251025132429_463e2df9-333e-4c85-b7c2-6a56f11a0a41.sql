-- Drop conflicting policies on educations table
DROP POLICY IF EXISTS "Anyone logged in can insert educations" ON educations;
DROP POLICY IF EXISTS "Anyone logged in can update educations" ON educations;

-- Recreate admin policies as permissive (default behavior)
DROP POLICY IF EXISTS "Admins can insert educations" ON educations;
DROP POLICY IF EXISTS "Admins can update educations" ON educations;
DROP POLICY IF EXISTS "Admins can delete educations" ON educations;

-- Create permissive admin policies
CREATE POLICY "Admins can insert educations" ON educations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can update educations" ON educations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can delete educations" ON educations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'::user_role
    )
  );