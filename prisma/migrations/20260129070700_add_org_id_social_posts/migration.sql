DO $$
 DECLARE
   has_table boolean;
   has_col boolean;
   has_clients boolean;
   has_client_clients boolean;
   null_count int;
 BEGIN
   SELECT to_regclass('public.social_posts') IS NOT NULL INTO has_table;
   IF NOT has_table THEN
     RETURN;
   END IF;

   SELECT EXISTS(
     SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'social_posts'
       AND column_name = 'organization_id'
   ) INTO has_col;

   IF has_col THEN
     RETURN;
   END IF;

   ALTER TABLE public.social_posts ADD COLUMN organization_id uuid;

   SELECT to_regclass('public.clients') IS NOT NULL INTO has_clients;
   SELECT to_regclass('public.client_clients') IS NOT NULL INTO has_client_clients;

   IF has_clients THEN
     EXECUTE
       'UPDATE public.social_posts sp ' ||
       'SET organization_id = c.organization_id ' ||
       'FROM public.clients c ' ||
       'WHERE c.id = sp.client_id AND sp.organization_id IS NULL';
   END IF;

   IF has_client_clients THEN
     EXECUTE
       'UPDATE public.social_posts sp ' ||
       'SET organization_id = cc.organization_id ' ||
       'FROM public.client_clients cc ' ||
       'WHERE cc.id = sp.client_id AND sp.organization_id IS NULL';
   END IF;

   EXECUTE 'CREATE INDEX IF NOT EXISTS idx_social_posts_organization_id ON public.social_posts(organization_id)';

   SELECT COUNT(*)::int FROM public.social_posts WHERE organization_id IS NULL INTO null_count;
   IF null_count = 0 THEN
     ALTER TABLE public.social_posts ALTER COLUMN organization_id SET NOT NULL;
   END IF;
 END
 $$;
