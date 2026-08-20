import type { UserRole } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

// Augment NextAuth's types with the fields we attach in lib/auth.ts callbacks
// so `session.user.id` / `session.user.role` are strongly typed everywhere.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    role?: UserRole;
  }
}
