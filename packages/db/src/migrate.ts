import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, closeDatabase } from "./client.js";
import { createOrUpdateSuperAdmin } from "./create-super-admin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "../drizzle");

async function run(): Promise<void> {
  console.log("[Database Migration] Connecting to PostgreSQL database...");
  console.log(`[Database Migration] Applying migrations from: ${migrationsFolder}`);

  try {
    await migrate(db, { migrationsFolder });
    console.log("[Database Migration] All migrations applied successfully!");
  } catch (error) {
    console.error("[Database Migration] Schema migration failed:", error);
    await closeDatabase();
    process.exit(1);
  }

  // Super admin bootstrap (optional - never abort migration container if this encounters an error)
  try {
    const adminEmail = process.env.SUPERADMIN_EMAIL?.trim();
    const adminPass = process.env.SUPERADMIN_PASSWORD?.trim();
    if (adminEmail && adminPass) {
      console.log(`[Database Migration] Configuring Super Admin for: ${adminEmail}`);
      const res = await createOrUpdateSuperAdmin(
        {
          email: adminEmail,
          password: adminPass,
          name: process.env.SUPERADMIN_NAME || "Super Admin",
        },
        false // Do not close DB connection yet
      );
      if (res.success) {
        console.log(`[Database Migration] Super admin configured successfully!`);
      } else {
        console.warn(`[Database Migration] ⚠️ Super admin setup note:`, res.error);
      }
    }
  } catch (adminErr: any) {
    console.warn(`[Database Migration] ⚠️ Non-fatal error configuring super admin:`, adminErr.message);
  } finally {
    await closeDatabase();
  }

  process.exit(0);
}

void run();
