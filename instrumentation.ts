export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;

  const { prisma } = await import("@/lib/db");
  const { hash } = await import("bcryptjs");

  const ownerPassword = process.env.OWNER_PASSWORD || "Omajade.com12345";
  const managerPassword = process.env.MANAGER_PASSWORD || "Manager0666";

  const ownerHash = await hash(ownerPassword, 12);
  await prisma.user.upsert({
    where: { email: "abdulcosman01@gmail.com" },
    create: {
      email: "abdulcosman01@gmail.com",
      username: "abdul",
      passwordHash: ownerHash,
      role: "owner",
      onboarded: true,
      emailVerified: true,
    },
    update: { passwordHash: ownerHash, emailVerified: true },
  });

  const managerHash = await hash(managerPassword, 12);
  const mgr = await prisma.managerAuth.findFirst();
  if (mgr) {
    await prisma.managerAuth.update({ where: { id: mgr.id }, data: { passwordHash: managerHash } });
  } else {
    await prisma.managerAuth.create({ data: { passwordHash: managerHash } });
  }

  const ownerSettings: { key: string; value: string }[] = [
    { key: "site_name", value: "AMO" },
    { key: "site_tagline", value: "On the Infinitudes of Life" },
    { key: "site_description", value: "A space that holds everything — every question, every silence, every thought that refuses to be filed neatly away." },
    { key: "site_hero_quote", value: "We stretch our hands toward the end, only to find that every horizon is another dawn." },
    { key: "color_primary", value: "#0d1f3c" },
    { key: "color_accent", value: "#c8a97e" },
    { key: "color_bg", value: "#f5f0e8" },
    { key: "twitter_handle", value: "@Cryptnate" },
    { key: "footer_tagline", value: "On the infinitudes of life." },
    { key: "footer_copy", value: "All words, all mine." },
    { key: "cover_image", value: "/cover.jpg" },
    { key: "about_hero_subtitle", value: "A space that holds everything — every question, every silence, every thought that refuses to be filed neatly away." },
    { key: "about_body", value: "<p><em>Amo</em> means love. <em>Infinitum</em> means without end. This blog is exactly that — a love that keeps going, for ideas, for language, for the texture of living.</p>" },
  ];

  for (const s of ownerSettings) {
    await prisma.siteSettings.upsert({
      where: { userId_key: { userId: 1, key: s.key } },
      create: { userId: 1, key: s.key, value: s.value },
      update: {},
    });
  }

  console.log("[startup] Seed complete");
}
