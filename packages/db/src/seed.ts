import { db } from "./client.js";
import * as schema from "./schema.js";
import { hashPassword } from "./crypto.js";
import { resolvePlanEntitlements } from "./entitlements.js";

export const BD_DISTRICTS = [
  "Dhaka", "Gazipur", "Narayanganj", "Tangail", "Narsingdi", "Faridpur", "Gopalganj",
  "Chattogram", "Cox's Bazar", "Cumilla", "Feni", "Brahmanbaria", "Noakhali", "Chandpur",
  "Sylhet", "Moulvibazar", "Habiganj", "Sunamganj",
  "Rajshahi", "Bogura", "Pabna", "Sirajganj", "Naogaon", "Natoren", "Chapai Nawabganj",
  "Khulna", "Jashore", "Kushtia", "Satkhira", "Bagerhat", "Jhenaidah",
  "Barishal", "Patuakhali", "Bhola", "Pirojpur", "Jhalokathi", "Barguna",
  "Rangpur", "Dinajpur", "Kurigram", "Gaibandha", "Nilphamari", "Thakurgaon",
  "Mymensingh", "Jamalpur", "Netrokona", "Sherpur"
];

export async function seed() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "1") {
    throw new Error(
      "Refusing to seed in production: seed data contains known demo credentials. Use `pnpm db:create-admin --email=… --password=…` instead."
    );
  }
  console.log("🌱 Starting seed for Go Commerce BD platform...");

  // 0. Seed Plans (5-package model).
  // Entitlements are RESOLVED from the cumulative chain (T-1) so the stored
  // flat array matches what resolveFeatures() computes in code. A plan must
  // never be a strict subset of the plan below it.
  await db
    .insert(schema.plans)
    .values([
      {
        id: "pilot",
        name: "Pilot Free Tier",
        pricePoisha: 0n,
        billingInterval: "monthly",
        entitlements: resolvePlanEntitlements("pilot"),
      },
      {
        id: "package_1",
        name: "Package 1: Single Landing",
        pricePoisha: 99900n, // ৳999
        billingInterval: "monthly",
        entitlements: resolvePlanEntitlements("package_1"),
      },
      {
        id: "package_2",
        name: "Package 2: Multi-Landing",
        pricePoisha: 199900n, // ৳1,999
        billingInterval: "monthly",
        entitlements: resolvePlanEntitlements("package_2"),
      },
      {
        id: "package_3",
        name: "Package 3: Full Shop",
        pricePoisha: 349900n, // ৳3,499
        billingInterval: "monthly",
        entitlements: resolvePlanEntitlements("package_3"),
      },
      {
        id: "package_4",
        name: "Package 4: Shop Pro",
        pricePoisha: 599900n, // ৳5,999
        billingInterval: "monthly",
        entitlements: resolvePlanEntitlements("package_4"),
      },
    ])
    .onConflictDoNothing();

  // 0.5 Seed Super Admin User (Better Auth schema)
  const superAdminHashedPassword = await hashPassword("123456");
  await db
    .insert(schema.user)
    .values({
      id: "usr_super_admin",
      name: "Super Admin",
      email: "admin@gocommerce.bd",
      role: "super_admin",
      emailVerified: true,
    })
    .onConflictDoNothing();

  await db
    .insert(schema.account)
    .values({
      id: "acc_super_admin",
      accountId: "admin@gocommerce.bd",
      providerId: "credential",
      userId: "usr_super_admin",
      password: superAdminHashedPassword,
    })
    .onConflictDoNothing();

  // 1. Create Demo Merchant User (Better Auth schema)
  const [demoUser] = await db
    .insert(schema.user)
    .values({
      id: "usr_demo_tanvir",
      name: "Tanvir Ahmed",
      email: "merchant@demo.com",
      role: "merchant",
      emailVerified: true,
    })
    .onConflictDoNothing()
    .returning();

  const userId = demoUser?.id || (await db.query.user.findFirst())?.id;
  if (!userId) throw new Error("Failed to create seed user");

  // 1.01 Create Demo Merchant Account (scrypt password)
  const demoHashedPassword = await hashPassword("demo12345");
  await db
    .insert(schema.account)
    .values({
      id: "acc_demo_tanvir",
      accountId: "merchant@demo.com",
      providerId: "credential",
      userId,
      password: demoHashedPassword,
    })
    .onConflictDoNothing();

  // 1.1 Create Organization for Store
  const [org] = await db
    .insert(schema.organization)
    .values({
      id: "org_grihogadget",
      name: "গৃহগ্যাজেট (Grihogadget)",
      slug: "grihogadget",
    })
    .onConflictDoNothing()
    .returning();

  const orgId = org?.id || (await db.query.organization.findFirst())?.id;
  if (!orgId) throw new Error("Failed to create seed organization");

  // 1.2 Associate user as Owner of organization
  await db
    .insert(schema.member)
    .values({
      id: "mem_demo_tanvir",
      organizationId: orgId,
      userId,
      role: "owner",
    })
    .onConflictDoNothing();

  // 2. Create Demo Store linked to organization
  const [store] = await db
    .insert(schema.stores)
    .values({
      organizationId: orgId,
      name: "গৃহগ্যাজেট (Grihogadget)",
      subdomain: "grihogadget",
      phone: "+8801711223344",
      plan: "pilot",
      status: "active",
      themeArchetype: "viral-funnel",
      settings: {
        storeName: "গৃহগ্যাজেট (Grihogadget)",
        ownerName: "Tanvir Ahmed",
        email: "merchant@demo.com",
        trialEndsAt: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
        tagline: "ঘরের সেরা স্মার্ট গ্যাজেট এখন আপনার হাতের মুঠোয়",
        deliveryChargeInsideDhaka: 6000, // ৳60
        deliveryChargeSubDhaka: 10000, // ৳100
        deliveryChargeOutsideDhaka: 12000, // ৳120
        advanceDeliveryRequiredOutsideDhaka: true,
        advanceDeliveryAmount: 12000,
        bkashPersonalNumber: "+8801711223344",
        supportPhone: "+8801711223344",
        supportWhatsapp: "+8801711223344",
      },
      themeConfig: {
        announcementBarText: "সারা দেশে ক্যাশ অন ডেলিভারি এবং ফ্রি ডেলিভারি অফার চলছে!",
        bulletPoints: [
          "১০০% অরিজিনাল ও প্রিমিয়াম কোয়ালিটি নিশ্চিত",
          "পণ্য হাতে পেয়ে চেক করে সম্পূর্ণ মূল্য পরিশোধ করুন",
          "৭ দিনের রিপ্লেসমেন্ট এবং মানি-ব্যাক গ্যারান্টি",
        ],
        stickyOrderButtonText: "অর্ডার করতে এখানে ক্লিক করুন",
        guaranteeBadgeText: "পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন",
      },
    })
    .onConflictDoNothing()
    .returning();

  const storeId = store?.id || (await db.query.stores.findFirst())?.id;
  if (!storeId) throw new Error("Failed to create seed store");

  // 2.1 Create Initial Active Subscription for Store
  await db
    .insert(schema.subscriptions)
    .values({
      storeId,
      planId: "pilot",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 86400 * 1000), // 1 year free pilot
    })
    .onConflictDoNothing();

  // 3. Create Sample Viral Products
  const [chopper] = await db
    .insert(schema.products)
    .values({
      storeId,
      title: "Wireless Electric Garlic & Meat Chopper (250ml)",
      banglaTitle: "স্মার্ট রিচার্জেবল ফুড ও মিট চপার (২৫০ মি.লি.)",
      slug: "wireless-electric-food-chopper",
      description: "High quality food-grade stainless steel blades with USB rechargeable battery.",
      banglaDescription: "কঠিন সব মসলা, পেঁয়াজ, রসুন ও মাংস কুচি করুন মাত্র ১০ সেকেন্ডে! রিচার্জেবল এবং বহনযোগ্য।",
      guaranteeText: "৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি",
      features: [
        "৩টি ধারালো স্টেইনলেস স্টিল ব্লেড",
        "ইউএসবি রিচার্জেবল (এক চার্জে ৩০ বার ব্যবহার)",
        "ফুড-গ্রেড ও ওয়াটারপ্রুফ বডি",
      ],
      isFeatured: true,
      isActive: true,
    })
    .onConflictDoNothing()
    .returning();

  if (chopper) {
    // Variants
    await db.insert(schema.productVariants).values([
      {
        storeId,
        productId: chopper.id,
        title: "Standard 250ml - Green",
        price: 105000, // ৳1,050
        compareAtPrice: 145000, // ৳1,450
        stockQuantity: 150,
        option1: "250ml",
        option2: "Green",
      },
      {
        storeId,
        productId: chopper.id,
        title: "Combo (2 Pcs) - Special Offer",
        price: 195000, // ৳1,950
        compareAtPrice: 290000, // ৳2,900
        stockQuantity: 50,
        option1: "2 Pcs",
        option2: "Green + White",
      },
    ]);

    // Images
    await db.insert(schema.productImages).values([
      {
        storeId,
        productId: chopper.id,
        url: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&auto=format&fit=crop&q=80",
        altText: "Electric Chopper Main",
        sortOrder: 1,
        isPrimary: true,
      },
      {
        storeId,
        productId: chopper.id,
        url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80",
        altText: "Chopper in Action",
        sortOrder: 2,
        isPrimary: false,
      },
    ]);
  }

  // 4. Create Sample Orders (with Tele-Sales status)
  await db.insert(schema.orders).values([
    {
      storeId,
      orderNumber: 1001,
      customerName: "Md. Rafiqul Islam",
      phone: "+8801812345678",
      deliveryZone: "inside_dhaka",
      deliveryDistrict: "Dhaka",
      deliveryThana: "Mirpur",
      deliveryAddress: "House 12, Road 4, Block D, Mirpur-2",
      subtotal: 105000,
      deliveryFee: 6000,
      totalAmount: 111000,
      callStatus: "confirmed",
      callAttempts: 1,
      callNotes: "Customer confirmed. Delivery requested before 5 PM.",
      status: "processing",
    },
    {
      storeId,
      orderNumber: 1002,
      customerName: "Sabbir Hossain",
      phone: "+8801911998877",
      deliveryZone: "outside_dhaka",
      deliveryDistrict: "Chattogram",
      deliveryThana: "Agrabad",
      deliveryAddress: "Chowdhury Bari, CDA R/A",
      subtotal: 195000,
      deliveryFee: 12000,
      totalAmount: 207000,
      callStatus: "no_answer_1",
      callAttempts: 1,
      callNotes: "Ringing, no answer at 2:30 PM",
      status: "pending",
      advanceRequired: true,
      advanceAmount: 12000,
    },
  ]);

  // 5. Create Sample Incomplete Order (Abandoned Lead)
  await db.insert(schema.incompleteOrders).values({
    storeId,
    phone: "+8801755667788",
    customerName: "Farzana Akter",
    deliveryDistrict: "Gazipur",
    estimatedAmount: 105000,
    lastStep: "phone_entered",
    status: "abandoned",
    notes: "Abandoned on checkout form at 11:20 AM",
  });

  // =========================================================================
  // 6. PILOT MERCHANTS (Milestone A — Private Pilot on Subdomains)
  // =========================================================================

  // Pilot Merchant 2: Fashion Store Archetype
  const [fashionOrg] = await db
    .insert(schema.organization)
    .values({
      id: "org_aarongfashion",
      name: "আড়ং ফ্যাশন (Aarong Fashion)",
      slug: "aarongfashion",
    })
    .onConflictDoNothing()
    .returning();

  if (fashionOrg) {
    const [fashionStore] = await db
      .insert(schema.stores)
      .values({
        organizationId: fashionOrg.id,
        name: "আড়ং ফ্যাশন (Aarong Fashion)",
        subdomain: "aarongfashion",
        phone: "+8801811223344",
        plan: "pilot",
        status: "active",
        themeArchetype: "fashion-store",
        settings: {
          tagline: "ঐতিহ্য ও আধুনিকতার অনন্য ফ্যাশন কালেকশন",
          supportPhone: "+8801811223344",
        },
        themeConfig: {
          presetId: "royal-fashion",
          announcementBarText: "নতুন কালেকশনে চলছে আকর্ষণীয় ২০% ফ্ল্যাট ছাড়!",
          heroHeadline: "অভিজাত জামদানি ও পাঞ্জাবি কালেকশন ২০২৬",
        },
      })
      .onConflictDoNothing()
      .returning();

    if (fashionStore) {
      const [saree] = await db
        .insert(schema.products)
        .values({
          storeId: fashionStore.id,
          title: "Exclusive Handloom Dhakai Jamdani Silk Saree",
          banglaTitle: "এক্সক্লুসিভ হ্যান্ডলুম ঢাকাই জামদানি সিল্ক শাড়ি",
          slug: "dhakai-jamdani-saree",
          banglaDescription: "শতভাগ খাঁটি রেশম সুতায় হাতে বোনা প্রিমিয়াম ঢাকাই জামদানি শাড়ি। আভিজাত্য ও ঐতিহ্যের সেরা পছন্দ।",
          features: ["১০০% নিখুঁত হ্যান্ডলুম বুনন", "ম্যাচিং ব্লাউজ পিস অন্তর্ভুক্ত", "উৎসব ও পার্টিওয়্যারের জন্য সেরা"],
          isActive: true,
          isFeatured: true,
        })
        .onConflictDoNothing()
        .returning();

      if (saree) {
        await db.insert(schema.productVariants).values([
          {
            storeId: fashionStore.id,
            productId: saree.id,
            title: "Black & Golden Zari",
            price: 350000, // ৳3,500
            compareAtPrice: 450000,
            stockQuantity: 40,
          },
        ]);
        await db.insert(schema.productImages).values([
          {
            storeId: fashionStore.id,
            productId: saree.id,
            url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800",
            isPrimary: true,
            sortOrder: 1,
          },
        ]);
      }
    }
  }

  // Pilot Merchant 3: Tech Gadget Archetype
  const [techOrg] = await db
    .insert(schema.organization)
    .values({
      id: "org_techzonebd",
      name: "টেক জোন বিডি (Tech Zone BD)",
      slug: "techzonebd",
    })
    .onConflictDoNothing()
    .returning();

  if (techOrg) {
    const [techStore] = await db
      .insert(schema.stores)
      .values({
        organizationId: techOrg.id,
        name: "টেক জোন বিডি (Tech Zone BD)",
        subdomain: "techzonebd",
        phone: "+8801911334455",
        plan: "pilot",
        status: "active",
        themeArchetype: "tech-gadget",
        settings: {
          tagline: "অফিসিয়াল গ্যাজেট ও ১ বছরের অফিসিয়াল ব্র্যান্ড ওয়ারেন্টি",
          supportPhone: "+8801911334455",
        },
        themeConfig: {
          presetId: "midnight-tech",
          announcementBarText: "সারা দেশে অফিসিয়াল গ্যাজেটে ইনস্ট্যান্ট ক্যাশ অন ডেলিভারি!",
          warrantyPeriod: "১ বছরের অফিশিয়াল ব্র্যান্ড ওয়ারেন্টি",
          replacementPeriod: "৭ দিনের ইনস্ট্যান্ট রিপ্লেসমেন্ট গ্যারান্টি",
        },
      })
      .onConflictDoNothing()
      .returning();

    if (techStore) {
      const [watch] = await db
        .insert(schema.products)
        .values({
          storeId: techStore.id,
          title: "AMOLED Waterproof Bluetooth Calling Smartwatch",
          banglaTitle: "স্মার্ট অ্যামোলেড ওয়াটারপ্রুফ কলিং স্মার্টওয়াচ (Pro Edition)",
          slug: "amoled-calling-smartwatch",
          banglaDescription: "১.৯৬ ইঞ্চি এইচডি অ্যামোলেড ডিসপ্লে, ব্লুটুথ কলিং, হেলথ ট্র্যাকিং এবং আইপি৬৮ ওয়াটারপ্রুফ সার্টিফিকেশন।",
          features: ["১.৯৬\" আল্ট্রা-ব্রাইট AMOLED ডিসপ্লে", "ব্লুটুথ কলিং ও লাউড স্পিকার", "এক চার্জে ৭-১০ দিন ব্যাটারি লাইফ"],
          isActive: true,
          isFeatured: true,
        })
        .onConflictDoNothing()
        .returning();

      if (watch) {
        await db.insert(schema.productVariants).values([
          {
            storeId: techStore.id,
            productId: watch.id,
            title: "Midnight Black",
            price: 295000, // ৳2,950
            compareAtPrice: 380000,
            stockQuantity: 65,
          },
        ]);
        await db.insert(schema.productImages).values([
          {
            storeId: techStore.id,
            productId: watch.id,
            url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800",
            isPrimary: true,
            sortOrder: 1,
          },
        ]);
      }
    }
  }

  // Pilot Merchant 4: Organic Food Archetype
  const [organicOrg] = await db
    .insert(schema.organization)
    .values({
      id: "org_shundorbonorganic",
      name: "সুন্দরবন অর্গানিক (Sundarban Organic)",
      slug: "shundorbonorganic",
    })
    .onConflictDoNothing()
    .returning();

  if (organicOrg) {
    const [organicStore] = await db
      .insert(schema.stores)
      .values({
        organizationId: organicOrg.id,
        name: "সুন্দরবন অর্গানিক (Sundarban Organic)",
        subdomain: "shundorbonorganic",
        phone: "+8801711998811",
        plan: "pilot",
        status: "active",
        themeArchetype: "organic-food",
        settings: {
          tagline: "সুন্দরবনের শতভাগ প্রাকৃতিক ও খাঁটি উপাদানের নিশ্চয়তা",
          supportPhone: "+8801711998811",
        },
        themeConfig: {
          presetId: "emerald-organic",
          announcementBarText: "শতভাগ খাঁটি সুন্দরবনের মধু সরাসরি আপনার ঘরে!",
          originLocation: "সুন্দরবনের গহিন অরণ্য ও খাঁটি মৌয়াল সংগ্রহ",
          freshnessGuarantee: "ল্যাব টেস্টে শতভাগ খাঁটি ও চিনিমুক্ত প্রমাণিত",
        },
      })
      .onConflictDoNothing()
      .returning();

    if (organicStore) {
      const [honey] = await db
        .insert(schema.products)
        .values({
          storeId: organicStore.id,
          title: "Pure Raw Natural Sundarban Honey (1kg)",
          banglaTitle: "সুন্দরবনের খাঁটি প্রাকৃতিক খলিসা ফুলের মধু (১ কেজি)",
          slug: "pure-sundarban-honey-1kg",
          banglaDescription: "সরাসরি সুন্দরবনের মৌয়ালদের দ্বারা সংগৃহীত অপ্রক্রিয়াজাত কাঁচা মধু। প্রাকৃতিক পুষ্টিগুণ ও মিষ্টি সুবাসে ভরপুর।",
          features: ["শতভাগ প্রাকৃতিক ও চিনিমুক্ত", "সুন্দরবনের খাঁটি খলিসা ফুলের মধু", "প্রাকৃতিক অ্যান্টিঅক্সিডেন্ট সমৃদ্ধ"],
          isActive: true,
          isFeatured: true,
        })
        .onConflictDoNothing()
        .returning();

      if (honey) {
        await db.insert(schema.productVariants).values([
          {
            storeId: organicStore.id,
            productId: honey.id,
            title: "Glass Jar 1000g",
            price: 120000, // ৳1,200
            compareAtPrice: 150000,
            stockQuantity: 100,
          },
        ]);
        await db.insert(schema.productImages).values([
          {
            storeId: organicStore.id,
            productId: honey.id,
            url: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800",
            isPrimary: true,
            sortOrder: 1,
          },
        ]);
      }
    }
  }

  console.log("✅ Seed completed successfully with 4 pilot merchant stores!");
}

// Allow direct execution
const isMain =
  Boolean(process.argv[1] &&
  (process.argv[1].endsWith("seed.ts") ||
   process.argv[1].endsWith("seed.js") ||
   process.argv[1].includes("seed.ts") ||
   process.argv[1].includes("seed.js")));

if (isMain) {
  seed()
    .then(() => {
      console.log("🚀 Database seeded with 64 Bangladesh districts & demo store!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Seed error:", err);
      process.exit(1);
    });
}
