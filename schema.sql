-- Every signed-in user has one isolated CRM document. No anonymous access.
begin;
create table public.crm_documents (
  user_id uuid primary key references auth.users(id),
  revision bigint not null default 1 check (revision > 0),
  document jsonb not null check (
    jsonb_typeof(document) = 'object'
    and document->>'version' = '1'
    and jsonb_typeof(document->'leads') = 'array'
    and octet_length(document::text) <= 5000000
  )
);
alter table public.crm_documents enable row level security;
alter table public.crm_documents force row level security;
revoke all on public.crm_documents from public, anon, authenticated;
grant select, insert, update on public.crm_documents to authenticated;
create policy crm_select_own on public.crm_documents for select to authenticated
  using ((select auth.uid()) = user_id);
create policy crm_insert_own on public.crm_documents for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy crm_update_own on public.crm_documents for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
commit;
