export async function register() {
  // Only run in Node.js runtime (not Edge), and only in production
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;

  const { execFileSync } = await import("child_process");
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    { stdio: "inherit", env: process.env, timeout: 60_000 }
  );
  console.log("[startup] Prisma migrations applied");
}
