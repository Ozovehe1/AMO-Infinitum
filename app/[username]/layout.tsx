import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

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
  return <>{children}</>;
}
