import fs from "node:fs/promises";
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

async function run() {
  const file = process.argv[2];
  if (!file) {
    console.error("Please provide migration file path");
    process.exit(1);
  }
  const sql = await fs.readFile(file, "utf-8");
  console.log(`Connecting to Postgres and applying migration: ${file}...`);
  await client.connect();
  await client.query(sql);
  console.log("Migration executed successfully!");
  await client.end();
}

run().catch((err) => {
  console.error("Migration execution failed:", err);
  process.exit(1);
});
