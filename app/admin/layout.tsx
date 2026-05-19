import AdminGuard from "@/components/AdminGuard";

export const metadata = { title: "Admin — AMO Infinitum" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}
