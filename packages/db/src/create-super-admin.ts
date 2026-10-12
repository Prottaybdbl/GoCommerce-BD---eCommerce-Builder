import "dotenv/config";
import crypto from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db, closeDatabase } from "./client.js";
import { user, account } from "./schema.js";
import { hashPassword } from "./crypto.js";

export interface SuperAdminOptions {
  email?: string;
  password?: string;
  name?: string;
}

export async function createOrUpdateSuperAdmin(
  options: SuperAdminOptions = {},
  autoClose: boolean = true
) {
  const isProd = process.env.NODE_ENV === "production";
  const email = (
    options.email ||
    process.env.SUPERADMIN_EMAIL ||
    (isProd ? "" : "admin@gocommerce.bd")
  )
    .toLowerCase()
    .trim();
  const password =
    options.password ||
    process.env.SUPERADMIN_PASSWORD ||
    (isProd ? "" : "123456");
  const name =
    options.name || process.env.SUPERADMIN_NAME || "Super Admin";

  if (!email || password.length < 8) {
    const errorMsg = `Super admin requires valid email and password of at least 8 characters (got ${password.length} chars).`;
    console.error(`\n❌ ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  console.log(`\n🛡️  Creating / Updating Super Admin for Go Commerce BD...`);
  console.log(`   Email: ${email}`);
  console.log(`   Name:  ${name}`);

  try {
    const hashedPassword = await hashPassword(password);

    // 1. Check if user already exists
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, email),
    });

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      await db
        .update(user)
        .set({
          name,
          role: "super_admin",
          emailVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(user.id, userId));
      console.log(`   ✅ Existing user found (${userId}), promoted to 'super_admin' role.`);
    } else {
      userId = `usr_super_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      await db.insert(user).values({
        id: userId,
        name,
        email,
        role: "super_admin",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`   ✅ Created new user record (${userId}) with 'super_admin' role.`);
    }

    // 2. Insert or update credential account
    const existingAccount = await db.query.account.findFirst({
      where: and(
        eq(account.userId, userId),
        eq(account.providerId, "credential")
      ),
    });

    if (existingAccount) {
      await db
        .update(account)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(account.id, existingAccount.id));
      console.log(`   ✅ Updated credentials in 'account' table.`);
    } else {
      const accountId = `acc_super_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      await db.insert(account).values({
        id: accountId,
        accountId: email,
        providerId: "credential",
        userId,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`   ✅ Created credential account for ${email}.`);
    }

    console.log(`\n🎉 Super Admin successfully configured!`);
    console.log(`   ------------------------------------------`);
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${isProd ? "[hidden]" : password}`);
    console.log(`   Role:     super_admin`);
    console.log(`   Dashboard URL: http://localhost:5173/`);
    console.log(`   ------------------------------------------\n`);

    return { success: true, userId, email, role: "super_admin" };
  } catch (error: any) {
    console.error(`\n❌ Database connection or query failed:`, error.message);
    if (error.code === "ECONNREFUSED") {
      console.log(`\n💡 Note: PostgreSQL is not currently running on 127.0.0.1:5432.`);
      console.log(`   The in-memory fallback in apps/api will allow logging in with:`);
      console.log(`   Email: ${email} | Password: ${isProd ? "[hidden]" : password}`);
      console.log(`   Once PostgreSQL is started, re-run 'pnpm db:create-admin' to persist.`);
    }
    return { success: false, error: error.message };
  } finally {
    if (autoClose) {
      await closeDatabase();
    }
  }
}

// Parse CLI flags if executed directly
function parseArgs(): SuperAdminOptions {
  const args = process.argv.slice(2);
  const options: SuperAdminOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--email=")) {
      options.email = arg.split("=")[1];
    } else if (arg === "-e" && args[i + 1]) {
      options.email = args[++i];
    } else if (arg.startsWith("--password=")) {
      options.password = arg.split("=")[1];
    } else if (arg === "-p" && args[i + 1]) {
      options.password = args[++i];
    } else if (arg.startsWith("--name=")) {
      options.name = arg.split("=")[1];
    } else if (arg === "-n" && args[i + 1]) {
      options.name = args[++i];
    }
  }

  return options;
}

// Run CLI only when directly executed
const isDirectCli =
  process.argv[1] &&
  (process.argv[1].endsWith("create-super-admin.ts") ||
    process.argv[1].endsWith("create-super-admin.js"));

if (isDirectCli) {
  createOrUpdateSuperAdmin(parseArgs())
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
}

