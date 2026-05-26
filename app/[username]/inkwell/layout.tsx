import AdminGuard from "@/components/AdminGuard";
import { getThemeByUsername } from "@/lib/theme";
import { subtleColor } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

type Props = { children: React.ReactNode; params: Promise<{ username: string }> };

export default async function InkwellLayout({ children, params }: Props) {
  const { username } = await params;
  const theme = await getThemeByUsername(username);

  const primary = theme?.colorPrimary || "#0d1f3c";
  const accent = theme?.colorAccent || "#c8a97e";
  const bg = theme?.colorBg || "#f5f0e8";
  const sidebarMuted = subtleColor(primary);

  return (
    <div
      style={
        {
          "--admin-primary": primary,
          "--admin-accent": accent,
          "--admin-bg": bg,
          "--admin-sidebar-muted": sidebarMuted,
          "--admin-accent-faint": `${accent}18`,
          "--admin-primary-border": "rgba(0,0,0,0.08)",
          "--admin-muted": `${primary}80`,
          "--admin-bg-card": "#fffef9",
        } as React.CSSProperties
      }
    >
      <AdminGuard username={username}>{children}</AdminGuard>
    </div>
  );
}
