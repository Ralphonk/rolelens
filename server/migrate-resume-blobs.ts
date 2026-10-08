import "dotenv/config";
import { put } from "@vercel/blob";
import { db } from "./db.js";

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    throw new Error("Set BLOB_READ_WRITE_TOKEN before migrating resume PDFs.");
  }
  const database = db();

  let migrated = 0;
  while (true) {
    const resumes = await database.resume.findMany({
      where: { pdfBytes: { not: null }, blobPathname: null },
      select: { id: true, userId: true, pdfBytes: true },
      orderBy: { id: "asc" },
      take: 10,
    });
    if (resumes.length === 0) break;
    for (const resume of resumes) {
      if (!resume.pdfBytes) continue;
      const pathname = `resumes/${resume.userId}/${resume.id}.pdf`;
      const blob = await put(pathname, Buffer.from(resume.pdfBytes), {
        access: "private",
        token,
        contentType: "application/pdf",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      await database.resume.update({
        where: { id: resume.id },
        data: { blobPathname: blob.pathname, hasPdf: true },
      });
      migrated += 1;
      console.log(`Migrated ${migrated} resume PDF(s).`);
    }
  }

  console.log(`Resume PDF migration complete. Migrated ${migrated} file(s).`);
}

main()
  .catch((error) => {
    console.error("Resume PDF migration failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await db().$disconnect();
    } catch {
      // If configuration failed before Prisma initialized, there is nothing to disconnect.
    }
  });
