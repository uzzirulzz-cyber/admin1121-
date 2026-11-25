/**
 * Generates D1/SQLite seed SQL for production (admin user, settings, demo beats+orders).
 * Run with: bun scripts/gen_seed_sql.ts > /tmp/seed.sql
 */
import { generateSalt, hashPassword } from "../src/lib/password";

const ADMIN_EMAIL = "admin@playbeat.digital";
const ADMIN_PASSWORD = "PlayBeat2026!";

function q(value: string | null): string {
  if (value === null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

const BEATS = [
  { slug: "midnight-drive", title: "Midnight Drive", genre: "Trap", bpm: 140, key: "F Minor", tags: "dark,808,night,hard", desc: "Dark rolling 808s with a cinematic lead. Built for late-night verses — verse and hook sections ready for chopping.", lease: 2999, exclusive: 14900, featured: true },
  { slug: "paper-planes", title: "Paper Planes", genre: "Drill", bpm: 145, key: "G Minor", tags: "uk drill,slides,gritty", desc: "Sliding 808 pattern with icy bell melody. UK drill energy with room for a hook.", lease: 2999, exclusive: 14900, featured: true },
  { slug: "neon-skyline", title: "Neon Skyline", genre: "Synthwave", bpm: 110, key: "A Minor", tags: "retro,80s,gated,drive", desc: "Retro gated snares and analog pads. Perfect for melodic rap or R&B crossover.", lease: 3499, exclusive: 17900, featured: false },
  { slug: "gravity", title: "Gravity", genre: "R&B", bpm: 92, key: "C Major", tags: "smooth,love,keys", desc: "Warm Rhodes chords with laid-back drums. A smooth canvas for vocal-led tracks.", lease: 2499, exclusive: 12900, featured: false },
  { slug: "cold-cash", title: "Cold Cash", genre: "Boom Bap", bpm: 88, key: "E Minor", tags: "golden era,vintage,soul", desc: "Dusty vinyl drums with a soul sample flip. Classic boom bap head-nod energy.", lease: 2499, exclusive: 12900, featured: false },
  { slug: "overdrive", title: "Overdrive", genre: "EDM", bpm: 128, key: "D Minor", tags: "festival,big room,energetic", desc: "Festival-sized drop with punchy plucks. Also works for hype rap collaborations.", lease: 3999, exclusive: 19900, featured: true },
];

const DEMO_ORDERS = [
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

function id(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

async function main() {
  const now = new Date().toISOString();
  const salt = generateSalt();
  const hash = await hashPassword(ADMIN_PASSWORD, salt);

  const lines: string[] = [];
  lines.push("-- PlayBeat production seed (generated)");
  lines.push(
    `INSERT INTO AdminUser (id, email, name, passwordHash, salt, createdAt) VALUES ('${id()}', ${q(ADMIN_EMAIL)}, 'Store Admin', ${q(hash)}, ${q(salt)}, '${now}');`
  );

  const settings: Record<string, string> = {
    store_name: "PlayBeat",
    currency: "USD",
    payment_instructions:
      "Transfer the total amount to:\n\nBank: PlayBeat Digital (Routing 021000021, Account 1029384756)\nOr e-wallet: pay@playbeat.digital\n\nInclude your order number as the payment reference. Your files unlock as soon as an admin confirms the payment (usually within a few hours).",
    contact_email: "sales@playbeat.digital",
  };
  for (const [key, value] of Object.entries(settings)) {
    lines.push(
      `INSERT INTO Setting (key, value) VALUES (${q(key)}, ${q(value)});`
    );
  }

  const productIds: string[] = [];
  BEATS.forEach((b, i) => {
    const pid = id();
    productIds.push(pid);
    lines.push(
      `INSERT INTO Product (id, slug, title, producer, description, genre, bpm, musicalKey, tags, coverUrl, audioUrl, priceLeaseCents, priceExclusiveCents, published, featured, createdAt, updatedAt) VALUES ('${pid}', ${q(b.slug)}, ${q(b.title)}, 'PlayBeat', ${q(b.desc)}, ${q(b.genre)}, ${b.bpm}, ${q(b.key)}, ${q(b.tags)}, ${q(`/covers/beat-${i + 1}.png`)}, ${q(`/audio/beat-${i + 1}.wav`)}, ${b.lease}, ${b.exclusive}, 1, ${b.featured ? 1 : 0}, '${now}', '${now}');`
    );
  });

  DEMO_ORDERS.forEach((o, idx) => {
    const items = o.items.map(([idx2, license]) => {
      const b = BEATS[idx2];
      return {
        productId: productIds[idx2],
        title: b.title,
        licenseType: license,
        priceCents: license === "lease" ? b.lease : b.exclusive,
      };
    });
    const total = items.reduce((s, it) => s + it.priceCents, 0);
    const createdAt = new Date(Date.now() - o.day * 86400_000).toISOString();
    lines.push(
      `INSERT INTO "Order" (id, orderNumber, customerName, customerEmail, itemsJson, totalCents, status, paymentRef, notes, createdAt, updatedAt) VALUES ('${id()}', ${q(`PB-DEMO${String(idx + 1).padStart(3, "0")}`)}, ${q(o.name)}, ${q(o.email)}, ${q(JSON.stringify(items))}, ${total}, ${q(o.status)}, ${o.status === "pending" ? "NULL" : q(`REF-${1000 + idx + 1}`)}, 'Demo order created by seed script - safe to delete', '${createdAt}', '${createdAt}');`
    );
  });

  console.log(lines.join("\n"));
}

main();
