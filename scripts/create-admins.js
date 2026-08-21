// Creates/updates admin accounts (idempotent by email). Runs against whatever
// DATABASE_URL points to (currently Supabase / production).
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

const ADMINS = [
  { email: "info@donkeyideas.com", password: "Seminole!1", name: "Info" },
  { email: "beltranalexander@yahoo.com", password: "LSU!12345", name: "Beltran Alexander" },
];

async function main() {
  for (const a of ADMINS) {
    const email = a.email.trim().toLowerCase();
    const hash = await bcrypt.hash(a.password, 10);
    const user = await prisma.user.upsert({
      where: { email },
      update: { password: hash, role: "ADMIN", name: a.name },
      create: { email, password: hash, role: "ADMIN", name: a.name },
    });
    console.log("Admin ready:", user.email, "(role:", user.role + ")");
  }

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { email: true },
    orderBy: { createdAt: "asc" },
  });
  console.log("\nAll ADMIN accounts now:", admins.map((u) => u.email).join(", "));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
