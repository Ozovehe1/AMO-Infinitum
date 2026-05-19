import AdminGuard from "@/components/AdminGuard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AMO Infinitum",
  robots: { index: false, follow: false, nocache: true },
};

export default function InkwellLayout({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}
