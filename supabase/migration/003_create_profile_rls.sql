ALTER TABLE public.profiles
ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);