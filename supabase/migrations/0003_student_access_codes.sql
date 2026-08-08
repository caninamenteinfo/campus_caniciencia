-- Sustituye el código compartido por edición por un código individual por
-- alumno: el instructor da de alta a cada alumno por su nombre y la app le
-- asigna su propio código. Ya no hace falta que el alumno escriba su nombre
-- al entrar, ni existe un código único compartido por toda la sesión.

alter table public.edition_students
  add column if not exists access_code text,
  add column if not exists last_login_at timestamptz;

alter table public.edition_students
  drop column if exists identifier;

create unique index if not exists edition_students_access_code_idx
  on public.edition_students (access_code);

alter table public.course_editions
  drop column if exists access_code;
