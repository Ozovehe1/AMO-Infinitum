import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { getTheme } from "@/lib/theme";

export default async function UserLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) notFound();

  const theme = await getTheme(user.id);
  const primary = theme.colorPrimary || "#0d1f3c";
  const accent = theme.colorAccent || "#c8a97e";
  const bg = theme.colorBg || "#f5f0e8";

  return (
    <div
      style={{
        ["--blog-primary" as string]: primary,
        ["--blog-accent" as string]: accent,
        ["--blog-bg" as string]: bg,
        background: bg,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
}
