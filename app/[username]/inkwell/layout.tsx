import AdminGuard from "@/components/AdminGuard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

type Props = { children: React.ReactNode; params: Promise<{ username: string }> };

export default async function InkwellLayout({ children, params }: Props) {
  const { username } = await params;
  return <AdminGuard username={username}>{children}</AdminGuard>;
}
