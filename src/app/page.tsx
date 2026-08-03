import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/session";
import { AccessForm } from "@/components/AccessForm";

export default async function HomePage() {
  const session = await getStudentSession();
  if (session) {
    redirect("/dashboard");
  }

  return <AccessForm />;
}
