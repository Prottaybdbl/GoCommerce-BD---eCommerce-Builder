import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization, admin, bearer } from "better-auth/plugins";
import { db } from "@gocom/db";
import * as schema from "@gocom/db";
import { config } from "./config.js";

const productionOrigins = [
  `https://${config.PLATFORM_ROOT_DOMAIN}`,
  `https://www.${config.PLATFORM_ROOT_DOMAIN}`,
  `https://app.${config.PLATFORM_ROOT_DOMAIN}`,
  `https://admin.${config.PLATFORM_ROOT_DOMAIN}`,
];

const devOrigins = [
  `http://localhost:3000`,
  `http://127.0.0.1:3000`,
  `http://localhost:5173`,
  `http://localhost:5174`,
  `http://localhost:4321`,
  `http://127.0.0.1:5173`,
  `http://127.0.0.1:5174`,
  `http://127.0.0.1:4321`,
];

const trustedOrigins =
  config.NODE_ENV === "production"
    ? productionOrigins
    : [...productionOrigins, ...devOrigins];

const defaultBaseURL =
  config.NODE_ENV === "production"
    ? `https://app.${config.PLATFORM_ROOT_DOMAIN}`
    : `http://localhost:${config.PORT}`;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      organization: schema.organization,
      member: schema.member,
      invitation: schema.invitation,
    },
  }),
  secret: config.SESSION_SECRET,
  baseURL: config.BETTER_AUTH_URL || defaultBaseURL,
  emailAndPassword: {
    enabled: true,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
  },
  socialProviders: {
    ...(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: config.GOOGLE_CLIENT_ID,
            clientSecret: config.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
    }),
    admin({
      defaultRole: "user",
      adminRole: "super_admin",
    }),
    bearer(),
  ],
  advanced: {
    useSecureCookies: config.NODE_ENV === "production",
    crossSubDomainCookies: {
      enabled: config.NODE_ENV === "production",
      domain: `.${config.PLATFORM_ROOT_DOMAIN}`,
    },
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: config.NODE_ENV === "production",
    },
  },
  trustedOrigins,
});
