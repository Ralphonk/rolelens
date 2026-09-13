import { test, expect } from "@playwright/test";
test("private data requires a session", async ({ request }) => {
  for (const route of ["/api/resumes", "/api/analyses", "/api/auth/me"]) {
    const response = await request.get(route);
    expect(response.status()).toBe(401);
  }
});
test("cross-origin mutations are rejected", async ({ request }) => {
  const response = await request.post("/api/resumes", {
    headers: { Origin: "https://untrusted.example" },
    data: { name: "test", text: "test" },
  });
  expect(response.status()).toBe(403);
});
test("invalid PDF uploads get a readable error", async ({ request }) => {
  const response = await request.post("/api/parse", {
    headers: { Origin: "http://127.0.0.1:3002" },
    multipart: {
      file: {
        name: "fake.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("not a PDF"),
      },
    },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).error).toContain("valid PDF");
});
test("extracts text from an actual PDF", async ({ request }) => {
  const text =
    "Frontend developer with React TypeScript JavaScript and Next.js. Built accessible applications and REST APIs.";
  const stream = "BT /F1 12 Tf 40 700 Td (" + text + ") Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += i + 1 + " 0 obj\n" + object + "\nendobj\n";
  });
  const xref = Buffer.byteLength(pdf);
  pdf +=
    "xref\n0 6\n0000000000 65535 f \n" +
    offsets.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("") +
    "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" +
    xref +
    "\n%%EOF";
  const response = await request.post("/api/parse", {
    headers: { Origin: "http://127.0.0.1:3002" },
    multipart: {
      file: {
        name: "resume.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from(pdf),
      },
    },
  });
  expect(response.status()).toBe(200);
  expect((await response.json()).text).toContain("Frontend developer");
});
