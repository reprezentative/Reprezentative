import { prisma } from "@/lib/prisma";

// Simple, admin-configurable tax rate stored in Settings under key "tax":
//   { enabled: boolean, rate: number }  where rate is a fraction (0.08 = 8%).
export async function getTaxRate(): Promise<number> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: "tax" } });
    const v = row?.value as any;
    if (!v || v.enabled === false) return 0;
    const rate = Number(v.rate);
    return Number.isFinite(rate) && rate > 0 ? rate : 0;
  } catch {
    return 0;
  }
}
