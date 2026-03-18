import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome back, {session.user.email}
      </p>
      <p className="text-sm text-muted-foreground">
        Lead overview and metrics will appear here.
      </p>
    </div>
  );
}
