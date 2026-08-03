import { redirect } from "next/navigation";
import { getInstructorUser } from "@/lib/auth";
import { getOrCreateCourse, listEditions } from "@/lib/courses";
import { InstructorPanel } from "@/components/InstructorPanel";

export default async function InstructorPage() {
  const user = await getInstructorUser();
  if (!user) {
    redirect("/instructor/login");
  }

  const course = await getOrCreateCourse();
  const editions = await listEditions(course.id);

  return <InstructorPanel course={course} editions={editions} instructorEmail={user.email ?? ""} />;
}
