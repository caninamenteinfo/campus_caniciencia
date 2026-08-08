export interface CourseModule {
  id: number;
  title: string;
  content: string;
}

export interface Course {
  id: string;
  name: string;
  material_text: string;
  modules: CourseModule[];
}

export interface CourseEdition {
  id: string;
  course_id: string;
  label: string;
  start_date: string;
  end_date: string;
  max_students: number;
  created_at: string;
  students: EditionStudent[];
}

export interface EditionStudent {
  id: string;
  edition_id: string;
  display_name: string;
  access_code: string;
  joined_at: string;
  last_login_at: string | null;
}

export interface StudentSessionPayload {
  editionId: string;
  courseId: string;
  studentId: string;
  name: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}
