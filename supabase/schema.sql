-- ==========================================================================
-- SIM-TAS-SD: SUPABASE RBAC AUTHENTICATION SCHEMA
-- Database Login & Hak Akses Berbasis Peran
-- ==========================================================================

-- 1. Buat Tabel `profiles` yang terhubung dengan `auth.users`
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    nama text not null,
    role text not null check (role in ('admin', 'kepsek', 'tu', 'guru', )) default 'tu',
    aktif boolean not null default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Komentar tabel
comment on table public.profiles is 'Profil pengguna dan hak akses peran SIM-TAS-SD';

-- 2. Aktifkan Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Fungsi helper untuk cek admin tanpa memicu rekursi RLS
create or replace function public.is_admin()
returns boolean as $$
begin
    return exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin' and aktif = true
    );
end;
$$ language plpgsql security definer set search_path = public;

-- 3. Kebijakan RLS (Security Policies)
-- Pengguna dapat membaca profil milik sendiri
drop policy if exists "Pengguna dapat membaca profil sendiri" on public.profiles;
create policy "Pengguna dapat membaca profil sendiri"
    on public.profiles for select
    using (auth.uid() = id);

-- Admin dapat membaca semua profil
drop policy if exists "Admin dapat membaca semua profil" on public.profiles;
create policy "Admin dapat membaca semua profil"
    on public.profiles for select
    using (public.is_admin());

-- Pengguna dapat memperbarui nama sendiri
drop policy if exists "Pengguna dapat memperbarui nama sendiri" on public.profiles;
create policy "Pengguna dapat memperbarui nama sendiri"
    on public.profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- Admin dapat mengelola (insert/update/delete) semua profil
drop policy if exists "Admin dapat mengelola semua profil" on public.profiles;
create policy "Admin dapat mengelola semua profil"
    on public.profiles for all
    using (public.is_admin());

-- Izin akses tabel untuk peran Supabase
grant usage on schema public to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.profiles to anon;

-- 4. Fungsi dan Trigger Otomatis: Buat Profil saat User Baru Terdaftar
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, nama, role, aktif)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'nama', split_part(new.email, '@', 1)),
        coalesce(new.raw_user_meta_data->>'role', 'tu'),
        true
    )
    on conflict (id) do nothing;
    return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Pasang trigger ke auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ==========================================================================
-- CARA MEMBUAT AKUN PENGGUNA PERTAMA KALI (ADMIN SEED):
-- 1. Buka Supabase Dashboard > Authentication > Users > Add User
--    Contoh:
--    Email    : admin@sekolah.sch.id
--    Password : PasswordAman123!
--    Auto Confirm User: Centang (YES)
-- 
-- 2. Jalankan query berikut di SQL Editor untuk mengangkat akun menjadi Admin:
--    update public.profiles
--    set role = 'admin', nama = 'Administrator Sekolah'
--    where id = (select id from auth.users where email = 'admin@sekolah.sch.id');
-- ==========================================================================
