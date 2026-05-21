import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF || "proj_swcxdotyzlkczmvecvqg",
  runtime: "node",
  logLevel: "log",
  maxDuration: 120,
  dirs: ["./trigger"],
});
