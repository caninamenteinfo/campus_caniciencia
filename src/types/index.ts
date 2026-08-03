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
  access_code: string;
  start_date: string;
  end_date: string;
  max_students: number;
  created_at: string;
  student_count?: number;
}

export interface StudentSessionPayload {
  editionId: string;
  courseId: string;
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
