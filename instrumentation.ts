export async function register() {
  // Only run in Node.js runtime (not Edge), and only in production
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;

  try {
    const { execFileSync } = await import("child_process");
    execFileSync(
      process.execPath, // node
      ["node_modules/prisma/build/index.js", "migrate", "deploy"],
      { stdio: "pipe", env: process.env, timeout: 60_000 }
    );
    console.log("[startup] Prisma migrations applied");
  } catch (err) {
    // Non-fatal: log and continue. App still serves traffic.
    console.error("[startup] Prisma migrate deploy failed:", err);
  }
}
