/**
 * Hotfix: re-merge the SLC neighborhood list with the prior 16-city list that
 * was clobbered by update-target-cities-slc.ts (which replaced rather than merged).
 *
 * Restores: Helper, Ferron, Green River, Orangeville, Elmo, Cleveland, Emery,
 * Clawson, Kanosh, Meadow (all the small Utah towns from prior milestones).
 *
 * The full target list is the union of:
 *   - Original 16 rural cities (from before Path A)
 *   - 27 SLC neighborhoods (from Path A)
 */
import pg from "pg";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

const RURAL_PRIOR = [
  "Price", "Helper", "Castle Dale", "Huntington", "Ferron", "Green River",
  "Orangeville", "Elmo", "Cleveland", "Emery", "Clawson", "Nephi", "Delta",
  "Kanosh", "Meadow", "Rose Park",
  // Also include phase-1 expansion cities that may have been added at any point
  "Richfield", "Ephraim", "Manti", "Fillmore",
];

const SLC_PATH_A = [
  "Salt Lake City", "Sugar House", "Midvale", "Sandy", "Murray", "Holladay",
  "Kearns", "West Valley City", "Cottonwood Heights", "Taylorsville",
  "West Jordan", "South Jordan", "Riverton", "Herriman", "Draper",
  "South Salt Lake", "Salt Lake County (other)",
];

const merged = Array.from(new Set([...RURAL_PRIOR, ...SLC_PATH_A]));
console.log(`Merged target_cities (${merged.length}):`);
console.log("  Rural:", merged.filter((m) => RURAL_PRIOR.includes(m)).join(", "));
console.log("  SLC:  ", merged.filter((m) => SLC_PATH_A.includes(m)).join(", "));

const value = JSON.stringify(merged);
const result = await c.query(`
  UPDATE scraper_config SET value = $1, updated_at = NOW() WHERE key = 'target_cities'
`, [value]);
console.log(`\nUpdated: ${result.rowCount} row(s).`);

const verify = await c.query(`SELECT value FROM scraper_config WHERE key = 'target_cities'`);
const back = JSON.parse(verify.rows[0].value);
console.log(`\nVerified ${back.length} cities in DB:`);
console.log(back.join(", "));

await c.end();
