-- ==========================================================================
-- SIM-TAS-SD: SUPABASE RBAC AUTHENTICATION SCHEMA
-- Database Login & Hak Akses Berbasis Peran
-- ==========================================================================

-- 1. Buat Tabel `profiles` yang terhubung dengan `auth.users`
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    nama text not null,
    role text not null check (role in ('admin', 'kepsek', 'perpustakaan', 'penjaga', 'guru', 'guru_kelas', 'guru_pjok', 'guru_pai', 'guru_inggris', 'guru_seni', 'guru_mapel')) default 'admin',
    aktif boolean not null default true,
    tipe_guru text default 'kelas',
    kelas_guru text default '1',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- =========================================================================
-- MIGRASI WAJIB (v2.8.0): Update Constraint Check Role & Hapus tu/kiosk
-- Jalankan 3 baris di bawah ini di Supabase SQL Editor jika database lama error:
-- =========================================================================
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check 
    check (role in ('admin', 'kepsek', 'perpustakaan', 'penjaga', 'guru', 'guru_kelas', 'guru_pjok', 'guru_pai', 'guru_inggris', 'guru_seni', 'guru_mapel'));
alter table public.profiles alter column role set default 'admin';

-- Migrasi aman (menambahkan kolom jika tabel sudah terlanjur dibuat di Supabase)
alter table public.profiles add column if not exists tipe_guru text default 'kelas';
alter table public.profiles add column if not exists kelas_guru text default '1';

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
    insert into public.profiles (id, nama, role, aktif, tipe_guru, kelas_guru)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'nama', split_part(new.email, '@', 1)),
        coalesce(new.raw_user_meta_data->>'role', 'admin'),
        true,
        coalesce(new.raw_user_meta_data->>'tipe_guru', 'kelas'),
        coalesce(new.raw_user_meta_data->>'kelas_guru', '1')
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

-- 5. Fungsi Ganti Kata Sandi Pengguna oleh Admin (RPC)
create or replace function public.admin_change_password(target_user_id uuid, new_password text)
returns json as $$
begin
    -- Validasi hak akses pemanggil: hanya peran admin yang boleh mereset kata sandi
    if not (public.is_admin()) then
        raise exception 'Akses ditolak: Hanya Administrator yang berwenang mengganti kata sandi pengguna lain.';
    end if;

    -- Validasi panjang kata sandi
    if length(new_password) < 6 then
        raise exception 'Kata sandi minimal 6 karakter.';
    end if;

    -- Update kata sandi pengguna di tabel auth.users
    update auth.users
    set encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = now()
    where id = target_user_id;

    if not found then
        raise exception 'Pengguna dengan ID % tidak ditemukan.', target_user_id;
    end if;

    return json_build_object('success', true, 'message', 'Kata sandi berhasil diperbarui.');
end;
$$ language plpgsql security definer set search_path = public, extensions, auth;

-- Beri izin eksekusi ke pengguna authenticated
grant execute on function public.admin_change_password(uuid, text) to authenticated;

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

