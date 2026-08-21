import { prisma } from "@/lib/prisma";

type AuditInput = {
  action: string;
  entity?: string;
  entityId?: string;
  userId?: string | null;
  userEmail?: string | null;
  meta?: Record<string, unknown>;
};

// Best-effort audit trail. Never throws — logging must not break the mutation.
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        userId: input.userId ?? null,
        userEmail: input.userEmail ?? null,
        meta: (input.meta as any) ?? undefined,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Audit log error:", error);
    }
  }
}
