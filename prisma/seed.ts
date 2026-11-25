/**
 * Seed script for the PlayBeat store.
 * Run with: bun prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import { generateSalt, hashPassword } from "../src/lib/password";

const db = new PrismaClient();

const ADMIN_EMAIL = "admin@playbeat.digital";
const ADMIN_PASSWORD = "PlayBeat2026!";

const BEATS = [
  {
    slug: "midnight-drive",
    title: "Midnight Drive",
    genre: "Trap",
    bpm: 140,
    musicalKey: "F Minor",
    tags: "dark,808,night,hard",
    description:
      "Dark rolling 808s with a cinematic lead. Built for late-night verses — verse and hook sections ready for chopping.",
    priceLeaseCents: 2999,
    priceExclusiveCents: 14900,
    featured: true,
  },
  {
    slug: "paper-planes",
    title: "Paper Planes",
    genre: "Drill",
    bpm: 145,
    musicalKey: "G Minor",
    tags: "uk drill,slides,gritty",
    description:
      "Sliding 808 pattern with icy bell melody. UK drill energy with room for a hook.",
    priceLeaseCents: 2999,
    priceExclusiveCents: 14900,
    featured: true,
  },
  {
    slug: "neon-skyline",
    title: "Neon Skyline",
    genre: "Synthwave",
    bpm: 110,
    musicalKey: "A Minor",
    tags: "retro,80s,gated,drive",
    description:
      "Retro gated snares and analog pads. Perfect for melodic rap or R&B crossover.",
    priceLeaseCents: 3499,
    priceExclusiveCents: 17900,
    featured: false,
  },
  {
    slug: "gravity",
    title: "Gravity",
    genre: "R&B",
    bpm: 92,
    musicalKey: "C Major",
    tags: "smooth,love,keys",
    description:
      "Warm Rhodes chords with laid-back drums. A smooth canvas for vocal-led tracks.",
    priceLeaseCents: 2499,
    priceExclusiveCents: 12900,
    featured: false,
  },
  {
    slug: "cold-cash",
    title: "Cold Cash",
    genre: "Boom Bap",
    bpm: 88,
    musicalKey: "E Minor",
    tags: "golden era,vintage,soul",
    description:
      "Dusty vinyl drums with a soul sample flip. Classic boom bap head-nod energy.",
    priceLeaseCents: 2499,
    priceExclusiveCents: 12900,
    featured: false,
  },
  {
    slug: "overdrive",
    title: "Overdrive",
    genre: "EDM",
    bpm: 128,
    musicalKey: "D Minor",
    tags: "festival,big room,energetic",
    description:
      "Festival-sized drop with punchy plucks. Also works for hype rap collaborations.",
    priceLeaseCents: 3999,
    priceExclusiveCents: 19900,
    featured: true,
  },
];

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log("Seeding PlayBeat database...");

  // Admin user
  const existingAdmin = await db.adminUser.findUnique({
    where: { email: ADMIN_EMAIL },
  });
  if (!existingAdmin) {
    const salt = generateSalt();
    const passwordHash = await hashPassword(ADMIN_PASSWORD, salt);
    await db.adminUser.create({
      data: { email: ADMIN_EMAIL, name: "Store Admin", passwordHash, salt },
    });
    console.log("Created admin user:", ADMIN_EMAIL);
  } else {
    console.log("Admin user already exists");
  }

  // Settings
  const settings: Record<string, string> = {
    store_name: "PlayBeat",
    currency: "USD",
    payment_instructions:
      "Transfer the total amount to:\n\nBank: PlayBeat Digital (Routing 021000021, Account 1029384756)\nOr e-wallet: pay@playbeat.digital\n\nInclude your order number as the payment reference. Your files unlock as soon as an admin confirms the payment (usually within a few hours).",
    contact_email: "sales@playbeat.digital",
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.setting.upsert({
      where: { key },
      create: { key, value },
      update: {},
    });
  }
  console.log("Settings seeded");

  // Products
  const products: { id: string; title: string; priceLeaseCents: number; priceExclusiveCents: number }[] = [];
  for (let i = 0; i < BEATS.length; i++) {
    const beat = BEATS[i];
    const data = {
      ...beat,
      producer: "PlayBeat",
      coverUrl: `/covers/beat-${i + 1}.png`,
      audioUrl: `/audio/beat-${i + 1}.wav`,
      published: true,
    };
    const product = await db.product.upsert({
      where: { slug: beat.slug },
      create: data,
      update: data,
    });
    products.push({
      id: product.id,
      title: product.title,
      priceLeaseCents: product.priceLeaseCents,
      priceExclusiveCents: product.priceExclusiveCents,
    });
  }
  console.log(`Seeded ${products.length} products`);

  // Demo orders (clearly marked in notes so the owner can remove them)
  const existingOrders = await db.order.count();
  if (existingOrders === 0) {
    const demoOrders = [
      { name: "Marcus Reed", email: "marcus.reed@example.com", day: 13, status: "fulfilled", items: [[0, "lease"], [3, "lease"]] },
      { name: "Alicia Gomez", email: "alicia.g@example.com", day: 12, status: "fulfilled", items: [[1, "exclusive"]] },
      { name: "Tyrone Blake", email: "tyblake@example.com", day: 11, status: "paid", items: [[4, "lease"]] },
      { name: "Nina Patel", email: "nina.patel@example.com", day: 9, status: "paid", items: [[5, "lease"], [2, "lease"]] },
      { name: "Jordan Smith", email: "jordan.s@example.com", day: 8, status: "paid", items: [[0, "exclusive"]] },
      { name: "Kayla Wong", email: "kayla.wong@example.com", day: 6, status: "fulfilled", items: [[2, "lease"]] },
      { name: "Dee Armstrong", email: "dee.arm@example.com", day: 5, status: "pending", items: [[3, "exclusive"]] },
      { name: "Ryan Ortiz", email: "ryan.ortiz@example.com", day: 4, status: "paid", items: [[1, "lease"]] },
      { name: "Simone Carter", email: "simone.c@example.com", day: 2, status: "pending", items: [[4, "lease"], [5, "lease"]] },
      { name: "Leo Fontaine", email: "leo.f@example.com", day: 1, status: "pending", items: [[0, "lease"]] },
    ] as const;

    let counter = 0;
    for (const order of demoOrders) {
      const items = order.items.map(([idx, license]) => {
        const p = products[idx];
        return {
          productId: p.id,
          title: p.title,
          licenseType: license,
          priceCents: license === "lease" ? p.priceLeaseCents : p.priceExclusiveCents,
        };
      });
      const totalCents = items.reduce((sum, it) => sum + it.priceCents, 0);
      counter += 1;
      await db.order.create({
        data: {
          orderNumber: `PB-DEMO${String(counter).padStart(3, "0")}`,
          customerName: order.name,
          customerEmail: order.email,
          itemsJson: JSON.stringify(items),
          totalCents,
          status: order.status,
          paymentRef: order.status === "pending" ? null : `REF-${1000 + counter}`,
          notes: "Demo order created by seed script - safe to delete",
          createdAt: daysAgo(order.day),
        },
      });
    }
    console.log(`Seeded ${demoOrders.length} demo orders`);
  } else {
    console.log("Orders already exist, skipping demo orders");
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
