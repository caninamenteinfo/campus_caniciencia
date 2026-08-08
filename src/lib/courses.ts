import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DEFAULT_COURSE_NAME, DEFAULT_MATERIAL, parseModules } from "@/lib/modules";
import { generateAccessCode } from "@/lib/access-code";
import type { Course, CourseEdition, EditionStudent } from "@/types";

const EDITION_COLUMNS = "id, course_id, label, start_date, end_date, max_students, created_at";
const STUDENT_COLUMNS = "id, edition_id, display_name, access_code, joined_at, last_login_at";

/**
 * MVP de un solo curso activo a la vez: el instructor puede reemplazar su
 * nombre y material por los de cualquier curso (no está fijado en código).
 * Si no existe todavía ninguna fila, se siembra con el curso piloto por defecto.
 */
export async function getOrCreateCourse(): Promise<Course> {
  const admin = supabaseAdmin();

  const { data: existing } = await admin
    .from("courses")
    .select("id, name, material_text, modules")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) return existing as Course;

  const modules = parseModules(DEFAULT_MATERIAL);
  const { data: created, error } = await admin
    .from("courses")
    .insert({
      name: DEFAULT_COURSE_NAME,
      material_text: DEFAULT_MATERIAL,
      modules,
    })
    .select("id, name, material_text, modules")
    .single();

  if (error || !created) {
    throw new Error(error?.message || "No se ha podido inicializar el curso.");
  }
  return created as Course;
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("courses")
    .select("id, name, material_text, modules")
    .eq("id", courseId)
    .maybeSingle();
  return (data as Course) || null;
}

export async function updateCourse(
  courseId: string,
  fields: { name?: string; material_text?: string }
): Promise<Course> {
  const admin = supabaseAdmin();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.material_text !== undefined) {
    patch.material_text = fields.material_text;
    patch.modules = parseModules(fields.material_text);
  }

  const { data, error } = await admin
    .from("courses")
    .update(patch)
    .eq("id", courseId)
    .select("id, name, material_text, modules")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "No se ha podido guardar el curso.");
  }
  return data as Course;
}

export async function listEditions(courseId: string): Promise<CourseEdition[]> {
  const admin = supabaseAdmin();
  const { data: editions, error } = await admin
    .from("course_editions")
    .select(EDITION_COLUMNS)
    .eq("course_id", courseId)
    .order("start_date", { ascending: false });

  if (error) throw new Error(error.message);
  if (!editions || editions.length === 0) return [];

  const { data: students } = await admin
    .from("edition_students")
    .select(STUDENT_COLUMNS)
    .in(
      "edition_id",
      editions.map((e) => e.id)
    )
    .order("display_name", { ascending: true });

  const studentsByEdition = new Map<string, EditionStudent[]>();
  for (const s of (students as EditionStudent[]) || []) {
    const list = studentsByEdition.get(s.edition_id) || [];
    list.push(s);
    studentsByEdition.set(s.edition_id, list);
  }

  return editions.map((e) => ({ ...e, students: studentsByEdition.get(e.id) || [] }));
}

export async function getEditionById(id: string): Promise<CourseEdition | null> {
  const admin = supabaseAdmin();
  const { data } = await admin.from("course_editions").select(EDITION_COLUMNS).eq("id", id).maybeSingle();
  if (!data) return null;
  const { data: students } = await admin
    .from("edition_students")
    .select(STUDENT_COLUMNS)
    .eq("edition_id", id)
    .order("display_name", { ascending: true });
  return { ...data, students: (students as EditionStudent[]) || [] } as CourseEdition;
}

export async function createEdition(fields: {
  courseId: string;
  label: string;
  startDate: string;
  endDate: string;
  maxStudents: number;
}): Promise<CourseEdition> {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("course_editions")
    .insert({
      course_id: fields.courseId,
      label: fields.label,
      start_date: fields.startDate,
      end_date: fields.endDate,
      max_students: fields.maxStudents,
    })
    .select(EDITION_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "No se ha podido crear la sesión.");
  }
  return { ...data, students: [] } as CourseEdition;
}

export async function updateEditionDates(
  editionId: string,
  fields: { startDate?: string; endDate?: string; maxStudents?: number; label?: string }
): Promise<void> {
  const admin = supabaseAdmin();
  const patch: Record<string, unknown> = {};
  if (fields.startDate !== undefined) patch.start_date = fields.startDate;
  if (fields.endDate !== undefined) patch.end_date = fields.endDate;
  if (fields.maxStudents !== undefined) patch.max_students = fields.maxStudents;
  if (fields.label !== undefined) patch.label = fields.label;

  const { error } = await admin.from("course_editions").update(patch).eq("id", editionId);
  if (error) throw new Error(error.message);
}

export async function deleteEdition(editionId: string): Promise<void> {
  const admin = supabaseAdmin();
  const { error } = await admin.from("course_editions").delete().eq("id", editionId);
  if (error) throw new Error(error.message);
}

const UNIQUE_VIOLATION = "23505";
const MAX_CODE_ATTEMPTS = 6;

export class CapacityError extends Error {}

/** Da de alta a un alumno en una sesión y le asigna un código de acceso propio. */
export async function addStudent(editionId: string, displayName: string): Promise<EditionStudent> {
  const admin = supabaseAdmin();

  const edition = await getEditionById(editionId);
  if (!edition) throw new Error("La sesión no existe.");
  if (edition.students.length >= edition.max_students) {
    throw new CapacityError("Se ha alcanzado el aforo máximo de esta sesión.");
  }

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const { data, error } = await admin
      .from("edition_students")
      .insert({ edition_id: editionId, display_name: displayName, access_code: generateAccessCode() })
      .select(STUDENT_COLUMNS)
      .single();

    if (!error) return data as EditionStudent;
    if (error.code !== UNIQUE_VIOLATION) throw new Error(error.message);
  }
  throw new Error("No se ha podido generar un código único, inténtalo de nuevo.");
}

/** Da de baja a un alumno: pierde el acceso al instante. */
export async function removeStudent(studentId: string): Promise<void> {
  const admin = supabaseAdmin();
  const { error } = await admin.from("edition_students").delete().eq("id", studentId);
  if (error) throw new Error(error.message);
}

/** Genera un código nuevo para un alumno (p. ej. si ha perdido el suyo). */
export async function regenerateStudentCode(studentId: string): Promise<EditionStudent> {
  const admin = supabaseAdmin();
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const { data, error } = await admin
      .from("edition_students")
      .update({ access_code: generateAccessCode() })
      .eq("id", studentId)
      .select(STUDENT_COLUMNS)
      .single();

    if (!error) return data as EditionStudent;
    if (error.code !== UNIQUE_VIOLATION) throw new Error(error.message);
  }
  throw new Error("No se ha podido generar un código único, inténtalo de nuevo.");
}

export async function touchStudentLogin(studentId: string): Promise<void> {
  const admin = supabaseAdmin();
  await admin.from("edition_students").update({ last_login_at: new Date().toISOString() }).eq("id", studentId);
}

export interface StudentAccessLookup {
  studentId: string;
  displayName: string;
  editionId: string;
  courseId: string;
  startDate: string;
  endDate: string;
}

/** Busca un alumno por su código de acceso individual, con los datos de su sesión. */
export async function getStudentByAccessCode(code: string): Promise<StudentAccessLookup | null> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("edition_students")
    .select(
      "id, display_name, edition_id, course_editions!inner(id, course_id, start_date, end_date)"
    )
    .eq("access_code", code)
    .maybeSingle();

  if (!data) return null;
  const edition = Array.isArray(data.course_editions) ? data.course_editions[0] : data.course_editions;
  if (!edition) return null;

  return {
    studentId: data.id,
    displayName: data.display_name,
    editionId: data.edition_id,
    courseId: edition.course_id,
    startDate: edition.start_date,
    endDate: edition.end_date,
  };
}
