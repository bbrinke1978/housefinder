import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { sessionCan } from "@/lib/permissions";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { desc } from "drizzle-orm";
import { UsersTable } from "@/components/admin/users-table";
import { NewUserForm } from "@/components/admin/new-user-form";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  // URL-gate: non-owners get 404 (per Brian's locked decision, 2026-04-28)
  const session = await auth();
  if (!sessionCan(session, "user.manage")) {
    notFound();
  }

  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      roles: users.roles,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <ShieldCheck className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold md:text-2xl">User Management</h1>
          <p className="text-sm text-muted-foreground">
            {allUsers.length} user{allUsers.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <NewUserForm />

      <UsersTable users={allUsers} />
    </div>
  );
}
