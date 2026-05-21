-- ============================================================================
-- CKR Nutrition OS  —  Phase B1
-- Schema · RLS · Real-time publication · Storage · Meal seed
--
-- Idempotent: safe to re-run from the top. All CREATE statements use
-- IF NOT EXISTS / ON CONFLICT, and all CREATE POLICY statements are paired
-- with a DROP POLICY IF EXISTS first.
--
-- After running this file, see ../README.md for the 2-minute admin-user
-- setup steps.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) EXTENSIONS
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";


-- ---------------------------------------------------------------------------
-- 2) ROLE HELPER  —  public.is_admin()
-- Reads auth.jwt() -> 'app_metadata' -> 'role'.
-- For the admin user, set app_metadata = { "role": "admin" } via the
-- Supabase dashboard. (app_metadata is admin-only writable — secure.)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;


-- ===========================================================================
-- 3) TABLES
-- ===========================================================================

-- Admin profile (single row, mirrors the admin auth user)
create table if not exists public.admins (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Trainer profile (mirrors each trainer auth user; id = auth.users.id)
create table if not exists public.trainers (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  mobile      text not null unique check (char_length(mobile) = 10),
  age         int  not null check (age between 12 and 100),
  gender      text not null check (gender in ('M','F','Other')),
  is_active   boolean not null default true,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_trainers_mobile on public.trainers(mobile);
create index if not exists idx_trainers_active on public.trainers(is_active);

-- Meals catalogue (static seed, read-only via RLS)
create table if not exists public.meals (
  id                 text primary key,
  name               text not null,
  slot               text not null check (slot in ('Breakfast','Lunch','Dinner','Snack')),
  recipe_ref         text,
  kcal               int  not null check (kcal > 0),
  protein            int  not null check (protein >= 0),
  carbs              int  not null check (carbs >= 0),
  fat                int  not null check (fat >= 0),
  food_pref          text not null check (food_pref in ('Veg','Non-Veg')),
  allergens          text[] not null default '{}',
  client_type_boost  text[] not null default '{}',
  base_rating        numeric(3,1) not null default 7.0
);

-- Clients (owned by trainers)
create table if not exists public.clients (
  id                       uuid primary key default uuid_generate_v4(),
  trainer_id               uuid references public.trainers(id) on delete set null,
  name                     text not null,
  age                      int  not null check (age between 12 and 100),
  gender                   text not null check (gender in ('M','F','Other')),
  weight                   numeric(5,2) not null,
  height                   numeric(5,2) not null,
  goal                     text not null check (goal in ('Fat Loss','Muscle Gain','Maintain','Recomp')),
  activity_level           text not null check (activity_level in ('Sedentary','Lightly Active','Moderate','Very Active')),
  client_types             text[] not null default '{}',
  food_pref                text not null check (food_pref in ('Veg','Non-Veg','Both')),
  allergens                text[] not null default '{}',
  status                   text not null default 'Active'
                              check (status in ('Active','Critical','On Hold','Completed')),
  notes                    text not null default '',
  phone_country_code       text,
  phone_number             text,
  calorie_target           int,
  protein_target           int,
  last_plan_date           timestamptz,
  closed_at                timestamptz,
  deletion_requested_by    uuid references public.trainers(id) on delete set null,
  deletion_requested_at    timestamptz,
  created_at               timestamptz not null default now()
);

create index if not exists idx_clients_trainer on public.clients(trainer_id);
create index if not exists idx_clients_status  on public.clients(status);

-- Plans
create table if not exists public.plans (
  id                  uuid primary key default uuid_generate_v4(),
  client_id           uuid not null references public.clients(id) on delete cascade,
  week_number         int  not null,
  calorie_range_low   int  not null,
  calorie_range_high  int  not null,
  status              text not null default 'active' check (status in ('active','past')),
  avg_rating          numeric(3,1) not null default 0,
  selected_meal_ids   text[] not null default '{}',
  ratings             jsonb,                              -- { "m_b1": 9, "m_l3": 8 }
  rated_at            timestamptz,
  rated_by            uuid references public.trainers(id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists idx_plans_client  on public.plans(client_id);
create index if not exists idx_plans_status  on public.plans(status);
create index if not exists idx_plans_created on public.plans(created_at desc);

-- Meal Plan Templates (admin library)
create table if not exists public.meal_plan_templates (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  source_plan_id      uuid references public.plans(id) on delete set null,
  source_client_name  text not null,
  saved_by_admin_id   uuid references public.admins(id) on delete set null,
  selected_meal_ids   text[] not null,
  calorie_range_low   int  not null,
  calorie_range_high  int  not null,
  tag_summary         text,
  created_at          timestamptz not null default now()
);

create index if not exists idx_templates_created on public.meal_plan_templates(created_at desc);

-- Notifications
create table if not exists public.notifications (
  id              uuid primary key default uuid_generate_v4(),
  recipient_role  text not null check (recipient_role in ('admin','trainer')),
  recipient_id    uuid not null,
  kind            text not null check (kind in (
                    'new_client','new_rating','client_critical',
                    'deletion_request','plan_change_request',
                    'admin_changed_plan','deletion_approved'
                  )),
  title           text not null,
  body            text not null,
  payload         jsonb not null default '{}'::jsonb,     -- { clientId?, planId?, trainerId? }
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists idx_notifs_recipient on public.notifications(recipient_role, recipient_id, created_at desc);
create index if not exists idx_notifs_unread    on public.notifications(recipient_id) where is_read = false;


-- ===========================================================================
-- 4) ROW LEVEL SECURITY
-- ===========================================================================

alter table public.admins              enable row level security;
alter table public.trainers            enable row level security;
alter table public.meals               enable row level security;
alter table public.clients             enable row level security;
alter table public.plans               enable row level security;
alter table public.meal_plan_templates enable row level security;
alter table public.notifications       enable row level security;


-- --- admins ----------------------------------------------------------------
drop policy if exists "admins_select_self_or_admin" on public.admins;
create policy "admins_select_self_or_admin"
  on public.admins for select to authenticated
  using (auth.uid() = id or public.is_admin());


-- --- trainers --------------------------------------------------------------
drop policy if exists "trainers_select_authenticated" on public.trainers;
create policy "trainers_select_authenticated"
  on public.trainers for select to authenticated
  using (true);

drop policy if exists "trainers_insert_admin" on public.trainers;
create policy "trainers_insert_admin"
  on public.trainers for insert to authenticated
  with check (public.is_admin());

drop policy if exists "trainers_update_self_or_admin" on public.trainers;
create policy "trainers_update_self_or_admin"
  on public.trainers for update to authenticated
  using (public.is_admin() or auth.uid() = id)
  with check (public.is_admin() or auth.uid() = id);

drop policy if exists "trainers_delete_admin" on public.trainers;
create policy "trainers_delete_admin"
  on public.trainers for delete to authenticated
  using (public.is_admin());


-- --- meals (read-only for everyone authenticated) --------------------------
drop policy if exists "meals_read_all" on public.meals;
create policy "meals_read_all"
  on public.meals for select to authenticated
  using (true);


-- --- clients ---------------------------------------------------------------
drop policy if exists "clients_select_own_or_admin" on public.clients;
create policy "clients_select_own_or_admin"
  on public.clients for select to authenticated
  using (public.is_admin() or trainer_id = auth.uid());

drop policy if exists "clients_insert_own_trainer" on public.clients;
create policy "clients_insert_own_trainer"
  on public.clients for insert to authenticated
  with check (public.is_admin() or trainer_id = auth.uid());

drop policy if exists "clients_update_own_or_admin" on public.clients;
create policy "clients_update_own_or_admin"
  on public.clients for update to authenticated
  using (public.is_admin() or trainer_id = auth.uid())
  with check (public.is_admin() or trainer_id = auth.uid());

-- per spec: trainer can't delete — only admin
drop policy if exists "clients_delete_admin_only" on public.clients;
create policy "clients_delete_admin_only"
  on public.clients for delete to authenticated
  using (public.is_admin());


-- --- plans (gated through the client's trainer_id) -------------------------
drop policy if exists "plans_select_via_client" on public.plans;
create policy "plans_select_via_client"
  on public.plans for select to authenticated
  using (
    public.is_admin()
    or client_id in (select id from public.clients where trainer_id = auth.uid())
  );

drop policy if exists "plans_insert_via_client" on public.plans;
create policy "plans_insert_via_client"
  on public.plans for insert to authenticated
  with check (
    public.is_admin()
    or client_id in (select id from public.clients where trainer_id = auth.uid())
  );

drop policy if exists "plans_update_via_client" on public.plans;
create policy "plans_update_via_client"
  on public.plans for update to authenticated
  using (
    public.is_admin()
    or client_id in (select id from public.clients where trainer_id = auth.uid())
  )
  with check (
    public.is_admin()
    or client_id in (select id from public.clients where trainer_id = auth.uid())
  );

drop policy if exists "plans_delete_admin_only" on public.plans;
create policy "plans_delete_admin_only"
  on public.plans for delete to authenticated
  using (public.is_admin());


-- --- meal_plan_templates (admin-only) --------------------------------------
drop policy if exists "templates_select_admin" on public.meal_plan_templates;
create policy "templates_select_admin"
  on public.meal_plan_templates for select to authenticated
  using (public.is_admin());

drop policy if exists "templates_insert_admin" on public.meal_plan_templates;
create policy "templates_insert_admin"
  on public.meal_plan_templates for insert to authenticated
  with check (public.is_admin());

drop policy if exists "templates_delete_admin" on public.meal_plan_templates;
create policy "templates_delete_admin"
  on public.meal_plan_templates for delete to authenticated
  using (public.is_admin());


-- --- notifications ---------------------------------------------------------
drop policy if exists "notifs_select_own" on public.notifications;
create policy "notifs_select_own"
  on public.notifications for select to authenticated
  using (
    (recipient_role = 'admin'   and public.is_admin())
    or (recipient_role = 'trainer' and recipient_id = auth.uid())
  );

-- Any authenticated user can push (trainer → admin, admin → trainer)
drop policy if exists "notifs_insert_any_authenticated" on public.notifications;
create policy "notifs_insert_any_authenticated"
  on public.notifications for insert to authenticated
  with check (true);

drop policy if exists "notifs_update_own" on public.notifications;
create policy "notifs_update_own"
  on public.notifications for update to authenticated
  using (
    (recipient_role = 'admin'   and public.is_admin())
    or (recipient_role = 'trainer' and recipient_id = auth.uid())
  )
  with check (
    (recipient_role = 'admin'   and public.is_admin())
    or (recipient_role = 'trainer' and recipient_id = auth.uid())
  );

drop policy if exists "notifs_delete_own" on public.notifications;
create policy "notifs_delete_own"
  on public.notifications for delete to authenticated
  using (
    (recipient_role = 'admin'   and public.is_admin())
    or (recipient_role = 'trainer' and recipient_id = auth.uid())
  );


-- ===========================================================================
-- 5) REAL-TIME PUBLICATION
-- Tables the client subscribes to via supabase.channel(...).
-- ===========================================================================
do $$
begin
  begin alter publication supabase_realtime add table public.notifications;       exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.clients;             exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.plans;               exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.meal_plan_templates; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.trainers;            exception when duplicate_object then null; end;
end$$;


-- ===========================================================================
-- 6) STORAGE  —  avatars bucket
-- Each user can read everything (public bucket) but only write into
-- a folder named with their own auth.uid().
-- ===========================================================================
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

drop policy if exists "avatars_public_read"  on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select to public
  using (bucket_id = 'avatars');

drop policy if exists "avatars_user_insert"  on storage.objects;
create policy "avatars_user_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_user_update"  on storage.objects;
create policy "avatars_user_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_user_delete"  on storage.objects;
create policy "avatars_user_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ===========================================================================
-- 7) MEAL SEED  —  24 meals (matches src/data/meals.ts)
-- ===========================================================================
insert into public.meals (id, name, slot, recipe_ref, kcal, protein, carbs, fat, food_pref, allergens, client_type_boost, base_rating) values
('m_b1','Moong Dal Chilla + Mint Chutney','Breakfast','Ep 23',310,22,36,7,'Veg','{}','{Vegetarian,Standard}',8.6),
('m_b2','Masala Oats Upma','Breakfast','Ep 12',340,14,52,8,'Veg','{Dairy}','{Busy Pro,Vegetarian}',8.1),
('m_b3','Paneer Bhurji + 2 Phulkas','Breakfast','Ep 47',410,28,38,16,'Veg','{Dairy,Gluten}','{Vegetarian,Standard}',9.0),
('m_b4','Egg Bhurji + Multigrain Toast','Breakfast','Ep 18',380,26,32,16,'Non-Veg','{Eggs,Gluten}','{Busy Pro,Standard}',8.8),
('m_b5','Greek Yogurt + Berries + Almonds','Breakfast','Ep 31',290,18,28,11,'Veg','{Dairy,Nuts}','{Sweet Craving,Standard}',8.4),
('m_b6','Idli + Sambar + Coconut Chutney','Breakfast','Ep 5',320,12,56,5,'Veg','{}','{Vegetarian,Standard}',8.3),
('m_l1','Roti + Mixed Dal + Bhindi Sabzi','Lunch','Ep 9',490,22,70,13,'Veg','{Gluten}','{Vegetarian,Standard}',8.5),
('m_l2','Quinoa Pulao + Curd','Lunch','Ep 22',520,20,76,14,'Veg','{Dairy}','{Standard,Vegetarian}',8.2),
('m_l3','Chicken Bhuna + Brown Rice','Lunch','Ep 14',560,42,58,16,'Non-Veg','{}','{Busy Pro,Standard}',9.1),
('m_l4','Rajma + Jeera Rice','Lunch','Ep 8',500,20,82,8,'Veg','{}','{Vegetarian,Standard}',8.7),
('m_l5','Grilled Fish Tikka + Salad','Lunch','Ep 28',460,44,22,20,'Non-Veg','{}','{Busy Pro,Standard}',8.9),
('m_l6','Paneer Tikka + Multigrain Roti','Lunch','Ep 41',530,32,48,22,'Veg','{Dairy,Gluten}','{Vegetarian}',8.6),
('m_d1','Tofu Bhurji + 1 Phulka','Dinner','Ep 35',380,26,28,16,'Veg','{Gluten}','{Vegetarian}',8.0),
('m_d2','Vegetable Soup + Grilled Sandwich','Dinner','Ep 27',420,18,52,14,'Veg','{Gluten,Dairy}','{Busy Pro,Standard}',7.9),
('m_d3','Chicken Stew + Appam','Dinner','Ep 19',440,32,38,16,'Non-Veg','{}','{Standard,Busy Pro}',8.7),
('m_d4','Khichdi + Curd','Dinner','Ep 4',410,18,58,11,'Veg','{Dairy}','{Vegetarian,Standard}',8.8),
('m_d5','Tandoori Chicken + Sautéed Veggies','Dinner',null,430,42,14,22,'Non-Veg','{}','{Busy Pro,Standard}',8.5),
('m_d6','Palak Paneer + 1 Roti','Dinner','Ep 11',460,26,32,24,'Veg','{Dairy,Gluten}','{Vegetarian}',9.0),
('m_s1','Mixed Nuts (Handful)','Snack','Ep 6',160,6,7,13,'Veg','{Nuts}','{Standard,Busy Pro}',8.2),
('m_s2','Roasted Chana','Snack','Ep 3',130,8,18,3,'Veg','{}','{Vegetarian,Standard}',8.0),
('m_s3','Apple + Peanut Butter','Snack','Ep 33',180,5,22,9,'Veg','{Nuts}','{Sweet Craving,Busy Pro}',9.0),
('m_s4','Boiled Egg + Cucumber','Snack','Ep 16',110,9,3,7,'Non-Veg','{Eggs}','{Busy Pro,Standard}',8.4),
('m_s5','Banana + Greek Yogurt','Snack','Ep 24',150,9,24,2,'Veg','{Dairy}','{Sweet Craving,Vegetarian}',8.6),
('m_s6','Dark Chocolate Square + Tea','Snack',null,130,2,14,8,'Veg','{Dairy}','{Sweet Craving}',8.3)
on conflict (id) do nothing;


-- ============================================================================
-- 8) ADMIN BOOTSTRAP
-- Auto-sets app_metadata.role='admin' and inserts the admin profile row
-- if the matching auth.users row exists.
--
-- BEFORE this works, create the auth user once via Supabase Dashboard:
--   Authentication → Users → Add user → Create new user
--     Email:    chandrakiranreddygaddam@gmail.com
--     Password: adm7780
--     (tick "Auto Confirm User" so the email is treated as verified)
--
-- Then run this whole migration (re-running is fine — it's idempotent).
-- The DO block below finds the user, stamps the role, and inserts the
-- admins row in one shot. No copy-pasting UUIDs required.
-- ============================================================================
do $$
declare
  admin_email constant text := 'chandrakiranreddygaddam@gmail.com';
  admin_id uuid;
begin
  select id into admin_id from auth.users where email = admin_email;

  if admin_id is null then
    raise notice
      'Admin auth user not found for %. Create it in Authentication → Users (Auto Confirm ON), then re-run this migration.',
      admin_email;
  else
    -- Stamp role into app_metadata (only service role / SQL can write this — secure)
    update auth.users
       set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                               || jsonb_build_object('role', 'admin')
     where id = admin_id;

    -- Insert / refresh the admin profile row
    insert into public.admins (id, name)
    values (admin_id, 'CKR Admin')
    on conflict (id) do update set name = excluded.name;

    raise notice 'Admin bootstrap complete: % (id %)', admin_email, admin_id;
  end if;
end$$;

-- ============================================================================
-- See ../README.md for the verification checklist.
-- ============================================================================
