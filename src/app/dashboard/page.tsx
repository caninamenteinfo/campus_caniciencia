import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/session";
import { getCourseById } from "@/lib/courses";
import { CampusApp } from "@/components/CampusApp";

export default async function DashboardPage() {
  const session = await getStudentSession();
  if (!session) {
    redirect("/");
  }

  const course = await getCourseById(session.courseId);
  if (!course) {
    redirect("/");
  }

  return <CampusApp modules={course.modules} courseName={course.name} studentName={session.name} />;
}
