import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";

export default async function PendingApprovalPage() {
  const session = await auth();

  if (!session?.user) redirect("/login");

  const roles = ((session.user as { roles?: string[] }).roles) ?? [];
  if (roles.length > 0) redirect("/"); // already approved — kick them to the dashboard

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fdfbf7] p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100">
            <svg
              className="h-7 w-7 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-display font-bold text-foreground">
            Pending Approval
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You&apos;ve signed in successfully as{" "}
            <strong className="text-foreground">{session.user.email}</strong>,
            but your account hasn&apos;t been assigned a role yet. The Owner
            needs to grant you access.
          </p>
          <p className="text-sm text-muted-foreground">
            Reach out to Brian to get approved.
          </p>
        </div>

        {/* Refresh hint */}
        <p className="text-xs text-muted-foreground">
          Once your role is assigned, refresh this page and you&apos;ll be in.
        </p>

        {/* Sign out */}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
