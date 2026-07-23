import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, type Permission } from "@/lib/permissions/permissions";
import type { Role } from "@/lib/permissions/roles";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  departmentId: string | null;
  isSuspended: boolean;
}

/**
 * The one place the server reads "who is calling and what's their role."
 * Always re-reads `profiles.role` from the database — never trusts a role
 * claim from the client, a cookie, or a JWT custom claim, per the spec's
 * "never trust a role supplied by the browser" requirement.
 */
export async function getServerUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, department_id, is_suspended")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role as Role,
    departmentId: profile.department_id,
    isSuspended: profile.is_suspended,
  };
}

export class UnauthorizedError extends Error {
  constructor(message = "You are not authorized to perform this action.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** For Server Actions / Route Handlers: throws instead of silently no-op-ing. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getServerUser();
  if (!user) throw new UnauthorizedError("You must be signed in.");
  if (user.isSuspended) throw new UnauthorizedError("This account has been suspended.");
  return user;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) {
    throw new UnauthorizedError(`Your role (${user.role}) does not have permission to do this.`);
  }
  return user;
}

/** For Server Components / layouts guarding a whole route: redirects instead of throwing. */
export async function requireUserOrRedirect(redirectTo = "/auth/login"): Promise<SessionUser> {
  const user = await getServerUser();
  if (!user) redirect(redirectTo);
  if (user.isSuspended) redirect("/auth/suspended");
  return user;
}

export async function requireRoleOrRedirect(roles: Role[], redirectTo = "/dashboard"): Promise<SessionUser> {
  const user = await requireUserOrRedirect();
  if (!roles.includes(user.role)) redirect(redirectTo);
  return user;
}
