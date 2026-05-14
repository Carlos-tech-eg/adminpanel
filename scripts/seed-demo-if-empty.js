/**
 * Inserts sample news / visas / registrations / appointments only when all those collections are empty.
 * Safe to run multiple times.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { resolveMongoUri } = require("../lib/resolveMongoUri");
const { seedDemoContentIfEmpty } = require("../lib/seedDemoContent");

async function main() {
  const uri = resolveMongoUri();
  if (!uri) {
    // eslint-disable-next-line no-console
    console.error("Set MONGODB_URI or all MONGODB_ATLAS_* variables (see .env.example).");
    process.exit(1);
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30_000 });
  const r = await seedDemoContentIfEmpty();
  // eslint-disable-next-line no-console
  console.log("[seed-demo]", r);
  await mongoose.disconnect();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
