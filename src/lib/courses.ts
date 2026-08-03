import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DEFAULT_COURSE_NAME, DEFAULT_MATERIAL, parseModules } from "@/lib/modules";
import type { Course, CourseEdition } from "@/types";

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
    .select("id, course_id, label, access_code, start_date, end_date, max_students, created_at")
    .eq("course_id", courseId)
    .order("start_date", { ascending: false });

  if (error) throw new Error(error.message);
  if (!editions || editions.length === 0) return [];

  const { data: counts } = await admin
    .from("edition_students")
    .select("edition_id")
    .in(
      "edition_id",
      editions.map((e) => e.id)
    );

  const countMap = new Map<string, number>();
  for (const row of counts || []) {
    countMap.set(row.edition_id, (countMap.get(row.edition_id) || 0) + 1);
  }

  return editions.map((e) => ({ ...e, student_count: countMap.get(e.id) || 0 }));
}

export async function getEditionByCode(code: string): Promise<CourseEdition | null> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("course_editions")
    .select("id, course_id, label, access_code, start_date, end_date, max_students, created_at")
    .eq("access_code", code)
    .maybeSingle();
  return (data as CourseEdition) || null;
}

export async function getEditionById(id: string): Promise<CourseEdition | null> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("course_editions")
    .select("id, course_id, label, access_code, start_date, end_date, max_students, created_at")
    .eq("id", id)
    .maybeSingle();
  return (data as CourseEdition) || null;
}

export async function countEditionStudents(editionId: string): Promise<number> {
  const admin = supabaseAdmin();
  const { count } = await admin
    .from("edition_students")
    .select("id", { count: "exact", head: true })
    .eq("edition_id", editionId);
  return count || 0;
}

export async function findEditionStudent(editionId: string, identifier: string) {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("edition_students")
    .select("id")
    .eq("edition_id", editionId)
    .eq("identifier", identifier)
    .maybeSingle();
  return data;
}

export async function registerEditionStudent(
  editionId: string,
  identifier: string,
  displayName: string
) {
  const admin = supabaseAdmin();
  const { error } = await admin
    .from("edition_students")
    .upsert(
      { edition_id: editionId, identifier, display_name: displayName },
      { onConflict: "edition_id,identifier", ignoreDuplicates: true }
    );
  if (error) throw new Error(error.message);
}

export async function createEdition(fields: {
  courseId: string;
  label: string;
  accessCode: string;
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
      access_code: fields.accessCode,
      start_date: fields.startDate,
      end_date: fields.endDate,
      max_students: fields.maxStudents,
    })
    .select("id, course_id, label, access_code, start_date, end_date, max_students, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "No se ha podido crear la edición.");
  }
  return data as CourseEdition;
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
