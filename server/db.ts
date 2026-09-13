import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
let client: PrismaClient | undefined;
export function db() {
  if (!process.env.DATABASE_URL)
    throw Object.assign(
      new Error(
        "Database is not configured yet. You can still use Local preview.",
      ),
      { status: 503 },
    );
  return (client ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  }));
}
