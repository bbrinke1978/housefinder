/**
 * Seed script: Insert two preloaded deals into the deals table.
 * Run once: npx tsx src/db/seed-deals.ts
 * Idempotent: uses onConflictDoNothing on address.
 */

import "dotenv/config";
import { db } from "./client.js";
import { deals } from "./schema.js";
import { sql } from "drizzle-orm";

const preloadedDeals = [
  {
    address: "Sullivan Rd",
    city: "Ogden",
    state: "UT",
    sellerName: null,
    sellerPhone: null,
    condition: "medium" as const,
    timeline: "flexible" as const,
    motivation: null,
    askingPrice: null,
    arv: 400000,
    repairEstimate: 45000,
    wholesaleFee: 15000,
    // MAO = 400000 * 0.70 - 45000 - 15000 = 220000
    mao: 220000,
    offerPrice: 272000,
    status: "analyzed" as const,
    assignedBuyerId: null,
    assignmentFee: null,
    closingDate: null,
    contractStatus: null,
    earnestMoney: 100,
    inspectionDeadline: null,
    earnestMoneyRefundable: true,
  },
  {
    address: "496 W 300 N",
    city: "Delta",
    state: "UT",
    sellerName: null,
    sellerPhone: null,
    condition: "medium" as const,
    timeline: "flexible" as const,
    motivation: null,
    askingPrice: null,
    arv: 330000,
    repairEstimate: 35000,
    wholesaleFee: 15000,
    // MAO = 330000 * 0.70 - 35000 - 15000 = 181000
    mao: 181000,
    offerPrice: 205000,
    status: "analyzed" as const,
    assignedBuyerId: null,
    assignmentFee: null,
    closingDate: null,
    contractStatus: null,
    earnestMoney: 100,
    inspectionDeadline: null,
    earnestMoneyRefundable: true,
  },
];

async function seedDeals() {
  console.log("Seeding preloaded deals...");

  for (const deal of preloadedDeals) {
    const result = await db
      .insert(deals)
      .values(deal)
      .onConflictDoNothing({ target: sql`(address)` })
      .returning({ id: deals.id, address: deals.address, city: deals.city });

    if (result.length > 0) {
      console.log(`  Inserted: ${result[0].address}, ${result[0].city} (id: ${result[0].id})`);
    } else {
      console.log(`  Skipped (already exists): ${deal.address}, ${deal.city}`);
    }
  }

  console.log("Done.");
  process.exit(0);
}

seedDeals().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
