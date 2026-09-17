import { afterEach, expect, it, vi } from "vitest";
import { analyzeResume } from "../server/ai";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("rejects a missing Gemini key before making a request", async () => {
 vi.stubEnv("GEMINI_API_KEY", "");
 await expect(analyzeResume("resume", "job")).rejects.toThrow("GEMINI_API_KEY");
});
it("validates Gemini output and computes score locally", async () => {
 vi.stubEnv("GEMINI_API_KEY", "test-only");
 const extraction = {skills:[{skill:"React",matched:true,evidence:"React"}],experience:[],education:[],keywords:[],suggestions:[],summary:"A match."};
 const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify(extraction)}]}}]})));
 vi.stubGlobal("fetch",mock);
 expect((await analyzeResume("resume", "job")).score).toBe(100);
 expect(mock.mock.calls[0][0]).toContain("generativelanguage.googleapis.com");
 expect(JSON.parse(mock.mock.calls[0][1].body).generationConfig.responseJsonSchema).toBeDefined();
});
it("explains quota failures without leaking upstream data", async () => {
 vi.stubEnv("GEMINI_API_KEY", "test-only");
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response("private upstream body",{status:429})));
 await expect(analyzeResume("resume","job")).rejects.toThrow("quota");
});
it("retries a transient Gemini service failure", async () => {
 vi.useFakeTimers();
 vi.stubEnv("GEMINI_API_KEY", "test-only");
 const extraction = {skills:[],experience:[],education:[],keywords:[],suggestions:[],summary:"A match."};
 const mock = vi.fn()
  .mockResolvedValueOnce(new Response("temporarily unavailable", {status:503}))
  .mockResolvedValueOnce(new Response(JSON.stringify({candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify(extraction)}]}}]})));
 vi.stubGlobal("fetch", mock);
 const analysis = analyzeResume("resume", "job");
 await vi.runAllTimersAsync();
 await expect(analysis).resolves.toMatchObject({score: 0});
 expect(mock).toHaveBeenCalledTimes(2);
 vi.useRealTimers();
});
it("rejects truncated or malformed output", async () => {
 vi.stubEnv("GEMINI_API_KEY", "test-only");
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({candidates:[{finishReason:"MAX_TOKENS",content:{parts:[{text:"{}"}]}}]}))));
 await expect(analyzeResume("resume","job")).rejects.toThrow("valid report");
});
