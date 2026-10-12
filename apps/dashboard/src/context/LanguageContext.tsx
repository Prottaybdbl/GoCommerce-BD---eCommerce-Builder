import React, { createContext, useContext, useState } from "react";

export type Language = "en" | "bn";

export interface Translations {
  // Navigation & General
  menu: string;
  superAdminMenu: string;
  dashboards: string;
  analytics: string;
  orders: string;
  crm: string;
  products: string;
  ecommerce: string;
  courier: string;
  logistics: string;
  incomplete: string;
  leads: string;
  theme: string;
  themeEditor: string;
  settings: string;
  apps: string;
  pages: string;
  liveStore: string;
  landingPages: string;
  steadfastLogistics: string;
  dialer: string;
  fileMedia: string;
  serverActive: string;
  overview: string;
  superAdminConsole: string;

  // Navbar
  searchPlaceholder: string;
  notifications: string;
  realtimeNotifications: string;
  newOrdersNotice: string;
  callCustomerNotice: string;
  incompleteNotice: string;
  recoverNotice: string;
  mediaEngineNotice: string;
  zeroServerNotice: string;
  viewAllNotifications: string;
  fullscreen: string;
  signOut: string;
  liveStorefront: string;
  storeOwner: string;
  platformMaster: string;

  // Settings
  settingsTitle: string;
  settingsSubtitle: string;
  languageSection: string;
  languageDesc: string;
  english: string;
  bangla: string;
  englishDesc: string;
  banglaDesc: string;
  defaultBadge: string;
  activeBadge: string;
  storeSettingsSection: string;
  storeSettingsDesc: string;
  storeNameLabel: string;
  subdomainLabel: string;
  accountRoleLabel: string;
  currencyLabel: string;
  currencyDesc: string;
  saveSettings: string;
  savingSettings: string;
  savedSuccess: string;
  systemPreferences: string;
  systemPreferencesDesc: string;
  soundAlerts: string;
  soundAlertsDesc: string;

  // Common UI words
  search: string;
  all: string;
  active: string;
  filter: string;
  exportCsv: string;
  addNew: string;
  status: string;
  actions: string;
  total: string;
  date: string;
  phone: string;
  customer: string;
  amount: string;
  price: string;
  quantity: string;
  notes: string;
  save: string;
  cancel: string;
  refresh: string;
  back: string;
  justNow: string;
  today: string;
  details: string;
  confirmed: string;
  pendingCall: string;

  // Analytics View
  analyticsTitle: string;
  analyticsSubtitle: string;
  totalSales: string;
  confirmedOrders: string;
  potentialLeads: string;
  deliverySuccess: string;
  revenueChartTitle: string;
  recentOrdersTitle: string;
  recentOrdersSubtitle: string;
  viewAllOrders: string;
  downloadReport: string;
  dateRangeLabel: string;
  callConfirmationRate: string;
  teleSalesLogBtn: string;
  dropOffLeadRecovery: string;
  leadsCountSuffix: string;
  sendWhatsappBtn: string;
  courierDeliveryRate: string;
  remittanceSlipBtn: string;
  salesTrendsTitle: string;
  salesTrendsSubtitle: string;
  totalRevenueLabel: string;
  orderCountLabel: string;
  avgBasketSizeLabel: string;
  orderStatusDistribution: string;
  liveTracking: string;
  deliveredAndCompleted: string;
  inTransitCourier: string;
  callPendingConfirm: string;
  cancelledReturned: string;
  manageDetailedStatus: string;
  topSellingProducts: string;
  allProductsBtn: string;
  productCol: string;
  priceCol: string;
  salesCol: string;
  stockStatusCol: string;
  remainingSuffix: string;
  recentTeleSalesActivity: string;
  liveFeed: string;
  teleSalesPanelBtn: string;

  // Orders View
  ordersTitle: string;
  ordersSubtitle: string;
  downloadSteadfastCsv: string;
  allOrdersTab: string;
  pendingCallTab: string;
  confirmedTab: string;
  noAnswerTab: string;
  advancePendingTab: string;
  orderSearchPlaceholder: string;
  orderNumberCol: string;
  customerAndMobileCol: string;
  addressAndDistrictCol: string;
  priceCodCol: string;
  teleSalesCallStatusCol: string;
  courierBookingCol: string;
  noOrdersFound: string;
  advanceVerifiedBadge: string;
  verifyAdvanceBtn: string;
  callPendingOption: string;
  confirmedOption: string;
  noAnswer1Option: string;
  noAnswer2Option: string;
  noAnswer3Option: string;
  wrongNumberOption: string;
  cancelledOption: string;
  callAttemptsPrefix: string;
  sendSteadfastBtn: string;
  advanceModalTitle: string;
  customerPhoneModalLabel: string;
  advanceDeliveryFeeModalLabel: string;
  bkashTrxIdLabel: string;
  confirmAndVerifyBtn: string;
  verifyingText: string;

  // Incomplete View
  incompleteTitle: string;
  incompleteSubtitle: string;
  recoveryPotential: string;
  operationsBreadcrumb: string;
  incompleteBreadcrumb: string;
  dropOffListTitle: string;
  leadSearchPlaceholder: string;
  phoneCol: string;
  customerNameDistrictCol: string;
  estimatedPriceCol: string;
  dropOffStepCol: string;
  timeCol: string;
  recoveryActionCol: string;
  noLeadsFound: string;
  unknownCustomer: string;
  districtNotSpecified: string;
  phoneEnteredStep: string;
  addressEnteredStep: string;
  whatsappMessageBtn: string;

  // Products View
  productsTitle: string;
  productsSubtitle: string;
  addProductBtn: string;
  catalogBreadcrumb: string;
  productsBreadcrumb: string;
  allProductsListTitle: string;
  productSearchPlaceholder: string;
  productAndImageCol: string;
  priceBdtCol: string;
  compareAtCol: string;
  stockQuantityCol: string;
  productStatusCol: string;
  noProductsFound: string;
  inStockBadge: string;
  liveAndActiveBadge: string;
  modalAddProductTitle: string;
  productTitleEnLabel: string;
  productTitleBnLabel: string;
  priceBdtLabel: string;
  comparePriceBdtLabel: string;
  stockQtyLabel: string;
  descriptionLabel: string;
  productImageLabel: string;
  imageOptimizationNotice: string;
  savingProductBtn: string;
  saveProductBtn: string;

  // Courier View
  courierTitle: string;
  courierSubtitle: string;
  logisticsBreadcrumb: string;
  courierBreadcrumb: string;
  steadfastCsvBannerTitle: string;
  steadfastCsvBannerDesc: string;
  downloadCsvBtn: string;
  totalCodCollectionTitle: string;
  totalCodCollectionSub: string;
  courierFeeTitle: string;
  courierFeeSub: string;
  netPayoutExpectedTitle: string;
  netPayoutExpectedSub: string;
  courierTrackingTableTitle: string;
  totalRecordsSuffix: string;
  consignmentIdCol: string;
  courierProviderCol: string;
  collectedFromCustomerCol: string;
  courierChargeCol: string;
  netPayableCol: string;
  paymentStatusCol: string;
  noCourierRecordsFound: string;
  paidBadge: string;
  processingBadge: string;

  // Theme View
  themePageTitle: string;
  themePageSubtitle: string;
  currentTheme: string;
  themeArchetypes: string;
  saveThemeBtn: string;
  designBreadcrumb: string;
  themeBreadcrumb: string;
  themeSelectionTitle: string;
  themeSelectionDesc: string;
  presetColorSelection: string;
  presetColorDesc: string;
  storeContentConfig: string;
  storeContentDesc: string;
  announcementTextLabel: string;
  whatsappSupportNumber: string;
  savingThemeBtn: string;
  themeSavedSuccess: string;

  // Super Admin View
  superAdminTitle: string;
  superAdminSubtitle: string;
  totalGmvLabel: string;
  activeStoresCount: string;
  monthlyOrdersLabel: string;
  platformMrrLabel: string;
  tenantsDirectoryTitle: string;
  tenantsDirectorySubtitle: string;
  storeAndBrand: string;
  ownerContact: string;
  subscriptionPlan: string;
  monthlySales: string;
  dataSecurity: string;
  viewStore: string;
  allPlans: string;
  searchTenantsPlaceholder: string;
  noTenantsFound: string;
  postgresRlsBadge: string;
  aesVaultBadge: string;

  // Packages Management
  packagesTitle: string;
  packagesSubtitle: string;
  packagesMenu: string;
  createPackageBtn: string;
  editPackageBtn: string;
  deletePackageBtn: string;
  viewLivePricing: string;
  packageName: string;
  packagePrice: string;
  packageBadge: string;
  packageDescription: string;
  packageFeatures: string;
  packageLimits: string;
  packageFees: string;
  packageStatus: string;
  popularBadge: string;
  resetDefaults: string;

  // Super Admin: Trial & Paid Users
  superTrialsMenu: string;
  superPaidMenu: string;
  trialUsersTitle: string;
  trialUsersSubtitle: string;
  paidUsersTitle: string;
  paidUsersSubtitle: string;
  activeTrialsCount: string;
  avgDaysLeft: string;
  expiringSoonCount: string;
  trialOrdersGmv: string;
  totalPaidStores: string;
  mrrLabel: string;
  arrLabel: string;
  tierBreakdown: string;
  searchTrialsPlaceholder: string;
  searchPaidPlaceholder: string;
  allStatuses: string;
  activeTrialStatus: string;
  expiringSoonStatus: string;
  expiredStatus: string;
  daysLeft: string;
  expiredLabel: string;
  extendTrialBtn: string;
  upgradeToPaidBtn: string;
  changePlanBtn: string;
  extendTrialModalTitle: string;
  extendDaysLabel: string;
  confirmExtend: string;
  upgradeModalTitle: string;
  selectPlanLabel: string;
  billingIntervalLabel: string;
  monthlyCycle: string;
  yearlyCycle: string;
  confirmUpgrade: string;
  noTrialsFound: string;
  noPaidFound: string;
  trialProgress: string;
  cancelBtn: string;
  savingText: string;
}

const enTranslations: Translations = {
  menu: "MENU",
  superAdminMenu: "SUPER ADMIN",
  dashboards: "Dashboards",
  analytics: "Analytics",
  orders: "Orders & CRM",
  crm: "CRM & Calls",
  products: "Products & Stock",
  ecommerce: "Ecommerce",
  courier: "Courier Logistics",
  logistics: "Steadfast Courier",
  incomplete: "Abandoned Leads",
  leads: "Leads",
  theme: "Theme Editor",
  themeEditor: "Store Design",
  settings: "Settings",
  apps: "Apps & Tools",
  pages: "Pages",
  liveStore: "Live Storefront",
  landingPages: "Landing Pages",
  steadfastLogistics: "Steadfast Logistics",
  dialer: "Tele-Sales Dialer",
  fileMedia: "File & Media Manager",
  serverActive: "Cloud VPS Active",
  overview: "Platform Overview",
  superAdminConsole: "Super Admin Platform Console",

  searchPlaceholder: "Search orders, customer phone or products... (Ctrl + K)",
  notifications: "Notifications",
  realtimeNotifications: "Realtime Notifications",
  newOrdersNotice: "new cash on delivery orders received!",
  callCustomerNotice: "Call customer to confirm order",
  incompleteNotice: "shoppers entered phone at checkout",
  recoverNotice: "Recover this order via WhatsApp or Phone call",
  mediaEngineNotice: "Cloudflare R2 & Media Pipeline Active",
  zeroServerNotice: "Zero-server 3-width WebP image engine",
  viewAllNotifications: "View all notifications →",
  fullscreen: "Toggle Fullscreen",
  signOut: "Sign Out",
  liveStorefront: "View Live Store",
  storeOwner: "Store Owner",
  platformMaster: "Platform Master",

  settingsTitle: "Dashboard & Store Settings",
  settingsSubtitle: "Manage your language preference, store configuration and system settings",
  languageSection: "Language Preference",
  languageDesc: "Choose your preferred language for the dashboard interface. Changes apply immediately across all menus and views.",
  english: "English (US)",
  bangla: "বাংলা (Bangla)",
  englishDesc: "Default platform language — view all dashboard features in English",
  banglaDesc: "বাংলা ভাষায় সমস্ত মেনু, অর্ডার ও ড্যাশবোর্ড অপশন দেখুন",
  defaultBadge: "Default",
  activeBadge: "Active",
  storeSettingsSection: "Store Profile & Identity",
  storeSettingsDesc: "Current tenant store identity, subdomain, and isolation parameters.",
  storeNameLabel: "Store Name",
  subdomainLabel: "Subdomain / Website",
  accountRoleLabel: "Account Role",
  currencyLabel: "Currency & Financials",
  currencyDesc: "Bangladeshi Taka (BDT ৳) — strict integer poisha invariant enforced",
  saveSettings: "Save Preferences",
  savingSettings: "Saving...",
  savedSuccess: "Settings saved successfully!",
  systemPreferences: "System & Environment",
  systemPreferencesDesc: "Realtime sync, PostgreSQL RLS tenancy scoping and notification preferences.",
  soundAlerts: "Cash Register Sound (Cha-Ching)",
  soundAlertsDesc: "Play audio alert when new order is received via realtime stream.",

  search: "Search",
  all: "All",
  active: "Active",
  filter: "Filter",
  exportCsv: "Export CSV",
  addNew: "Add New",
  status: "Status",
  actions: "Actions",
  total: "Total",
  date: "Date",
  phone: "Phone",
  customer: "Customer",
  amount: "Amount",
  price: "Price",
  quantity: "Quantity",
  notes: "Notes",
  save: "Save",
  cancel: "Cancel",
  refresh: "Refresh",
  back: "Back",
  justNow: "Just now",
  today: "Today",
  details: "Details",
  confirmed: "Confirmed",
  pendingCall: "Pending Call",

  // Analytics View
  analyticsTitle: "Store Analytics & Live Performance",
  analyticsSubtitle: "Real-time metrics, gross merchandise volume (GMV) and revenue insights",
  totalSales: "Total Sales (GMV)",
  confirmedOrders: "Confirmed Orders",
  potentialLeads: "Abandoned Leads Recovery",
  deliverySuccess: "Delivery Success Rate",
  revenueChartTitle: "Revenue & Orders Trend (Last 7 Days)",
  recentOrdersTitle: "Recent Customer Orders",
  recentOrdersSubtitle: "Latest orders placed via live checkout funnel",
  viewAllOrders: "View All Orders",
  downloadReport: "Download Report",
  dateRangeLabel: "Oct 01, 2026 — Nov 01, 2026",
  callConfirmationRate: "Call Confirmation Rate",
  teleSalesLogBtn: "Tele-Sales Log",
  dropOffLeadRecovery: "Drop-off Lead Recovery",
  leadsCountSuffix: "Leads",
  sendWhatsappBtn: "Send WhatsApp",
  courierDeliveryRate: "Courier Delivery Rate",
  remittanceSlipBtn: "Remittance Slips",
  salesTrendsTitle: "Sales & Order Trends",
  salesTrendsSubtitle: "Daily gross revenue and delivery metrics curve",
  totalRevenueLabel: "Total Revenue",
  orderCountLabel: "Orders Count",
  avgBasketSizeLabel: "Average Basket Size (AOV)",
  orderStatusDistribution: "Order Status Distribution",
  liveTracking: "Live Tracking",
  deliveredAndCompleted: "Delivered & Completed",
  inTransitCourier: "In-Transit (Courier)",
  callPendingConfirm: "Call Confirmation Pending",
  cancelledReturned: "Cancelled / Returned",
  manageDetailedStatus: "Manage Detailed Status →",
  topSellingProducts: "Top Selling Products",
  allProductsBtn: "All Products →",
  productCol: "Product",
  priceCol: "Price",
  salesCol: "Sales",
  stockStatusCol: "Stock Status",
  remainingSuffix: "left",
  recentTeleSalesActivity: "Recent Tele-Sales Activity",
  liveFeed: "Live Feed",
  teleSalesPanelBtn: "Go to Tele-Sales Panel →",

  // Orders View
  ordersTitle: "Orders & Tele-Sales Call Center",
  ordersSubtitle: "Confirm incoming orders with customers and dispatch to couriers",
  downloadSteadfastCsv: "Steadfast CSV Export",
  allOrdersTab: "All Orders",
  pendingCallTab: "Pending Call",
  confirmedTab: "Confirmed",
  noAnswerTab: "No Answer",
  advancePendingTab: "Advance Pending",
  orderSearchPlaceholder: "Search order #, customer name or phone...",
  orderNumberCol: "Order Number",
  customerAndMobileCol: "Customer & Phone",
  addressAndDistrictCol: "Address & District",
  priceCodCol: "Price (COD)",
  teleSalesCallStatusCol: "Tele-Sales Call Status",
  courierBookingCol: "Courier Booking",
  noOrdersFound: "No orders found matching filters",
  advanceVerifiedBadge: "Advance Verified",
  verifyAdvanceBtn: "Verify Advance ৳120",
  callPendingOption: "⏳ Pending Call",
  confirmedOption: "✅ Confirmed",
  noAnswer1Option: "📞 No Answer 1",
  noAnswer2Option: "📞 No Answer 2",
  noAnswer3Option: "📞 No Answer 3",
  wrongNumberOption: "❌ Wrong Number",
  cancelledOption: "🚫 Cancelled",
  callAttemptsPrefix: "Call Attempts:",
  sendSteadfastBtn: "Send to Steadfast",
  advanceModalTitle: "Verify Advance bKash Delivery Charge",
  customerPhoneModalLabel: "Customer Phone:",
  advanceDeliveryFeeModalLabel: "Advance Delivery Fee:",
  bkashTrxIdLabel: "bKash Transaction ID (TrxID)",
  confirmAndVerifyBtn: "Confirm & Verify Advance",
  verifyingText: "Verifying...",

  // Incomplete View
  incompleteTitle: "Incomplete Orders & Lead Recovery",
  incompleteSubtitle: "Contact shoppers who abandoned checkout and turn them into paying customers",
  recoveryPotential: "Potential Recovery",
  operationsBreadcrumb: "Operations",
  incompleteBreadcrumb: "Abandoned Leads",
  dropOffListTitle: "Abandoned Checkout Leads",
  leadSearchPlaceholder: "Search phone number or customer name...",
  phoneCol: "Phone Number",
  customerNameDistrictCol: "Customer & District",
  estimatedPriceCol: "Estimated Cart",
  dropOffStepCol: "Drop-off Step",
  timeCol: "Time",
  recoveryActionCol: "Recovery Action",
  noLeadsFound: "No abandoned leads at this time",
  unknownCustomer: "Anonymous Shopper",
  districtNotSpecified: "District not specified",
  phoneEnteredStep: "Phone Entered",
  addressEnteredStep: "Address Entered",
  whatsappMessageBtn: "WhatsApp Message",

  // Products View
  productsTitle: "Product Catalog & Stock Inventory",
  productsSubtitle: "Manage your store's catalog, variants, pricing, and stock levels",
  addProductBtn: "Add New Product",
  catalogBreadcrumb: "Catalog",
  productsBreadcrumb: "Product Inventory",
  allProductsListTitle: "All Products",
  productSearchPlaceholder: "Search product name or SKU...",
  productAndImageCol: "Product & Photo",
  priceBdtCol: "Price (BDT)",
  compareAtCol: "Original Price",
  stockQuantityCol: "In-Stock Qty",
  productStatusCol: "Status",
  noProductsFound: "No products added yet",
  inStockBadge: "In Stock",
  liveAndActiveBadge: "Live & Active",
  modalAddProductTitle: "Add New Product to Store",
  productTitleEnLabel: "Product Name (English)",
  productTitleBnLabel: "Product Name (Bangla)",
  priceBdtLabel: "Selling Price (BDT ৳)",
  comparePriceBdtLabel: "Original Strike-through Price (BDT ৳)",
  stockQtyLabel: "Available Stock Quantity",
  descriptionLabel: "Product Description",
  productImageLabel: "Product Image (Direct R2 Upload)",
  imageOptimizationNotice: "Images are automatically resized to 3 widths (360px, 720px, 1080px WebP) client-side",
  savingProductBtn: "Saving Product...",
  saveProductBtn: "Save Product",

  // Courier View
  courierTitle: "Courier Logistics & Remittance Reconciliation",
  courierSubtitle: "Steadfast & Pathao bulk upload CSVs and automated payout reconciliation",
  logisticsBreadcrumb: "Logistics",
  courierBreadcrumb: "Courier & Remittance",
  steadfastCsvBannerTitle: "Steadfast Bulk Order Upload CSV",
  steadfastCsvBannerDesc: "Even if courier API is unreachable, download pre-formatted CSV and upload directly to merchant portal",
  downloadCsvBtn: "Download CSV File",
  totalCodCollectionTitle: "Total Courier COD Collected",
  totalCodCollectionSub: "Gross cash collected from customers",
  courierFeeTitle: "Courier Delivery & 1% COD Fee",
  courierFeeSub: "Deductions for delivery services",
  netPayoutExpectedTitle: "Net Payout Receivable",
  netPayoutExpectedSub: "Withdrawable to Bank or bKash",
  courierTrackingTableTitle: "Courier Tracking & Remittances",
  totalRecordsSuffix: "records",
  consignmentIdCol: "Consignment ID",
  courierProviderCol: "Courier",
  collectedFromCustomerCol: "Collected COD",
  courierChargeCol: "Courier Charge",
  netPayableCol: "Net Payout",
  paymentStatusCol: "Payout Status",
  noCourierRecordsFound: "No courier consignments recorded yet",
  paidBadge: "Paid",
  processingBadge: "Processing",

  // Theme View
  themePageTitle: "Theme Editor & Storefront Archetypes",
  themePageSubtitle: "Choose from 5 conversion-optimized archetypes with instant live preview",
  currentTheme: "Active Theme Archetype",
  themeArchetypes: "Archetype Selection",
  saveThemeBtn: "Publish & Save Theme",
  designBreadcrumb: "Store Design",
  themeBreadcrumb: "Theme Editor",
  themeSelectionTitle: "Select Storefront Archetype",
  themeSelectionDesc: "Each archetype is tailored for specific product types and conversion workflows",
  presetColorSelection: "Color Palette & Styling Preset",
  presetColorDesc: "Brand palette applied across buttons, hero badges, and price highlights",
  storeContentConfig: "Storefront Copy & Support",
  storeContentDesc: "Announcement bar text and customer service channels",
  announcementTextLabel: "Top Announcement Bar Text",
  whatsappSupportNumber: "Support WhatsApp Number",
  savingThemeBtn: "Saving Theme...",
  themeSavedSuccess: "Theme updated successfully!",

  // Super Admin View
  superAdminTitle: "Go Commerce BD — Multi-Tenant Ecosystem",
  superAdminSubtitle: "Platform Master Console — PostgreSQL RLS Isolated Tenancy",
  totalGmvLabel: "Platform Gross GMV",
  activeStoresCount: "Active Merchant Stores",
  monthlyOrdersLabel: "Monthly Processed Orders",
  platformMrrLabel: "Platform MRR (SaaS)",
  tenantsDirectoryTitle: "Merchants & Store Directory (Tenants)",
  tenantsDirectorySubtitle: "Access store dashboards or monitor per-store metrics in one click",
  storeAndBrand: "Store & Brand",
  ownerContact: "Owner & Contact",
  subscriptionPlan: "Subscription Plan",
  monthlySales: "Monthly Sales (GMV)",
  dataSecurity: "Data & Encryption Security",
  viewStore: "Visit Store",
  allPlans: "All Plans",
  searchTenantsPlaceholder: "Search store name, subdomain or owner...",
  noTenantsFound: "No merchant stores found",
  postgresRlsBadge: "PostgreSQL 18 RLS Isolated",
  aesVaultBadge: "AES-256 Per-Store Vault",

  // Packages Management
  packagesTitle: "Platform Packages & Pricing",
  packagesSubtitle: "Create and update dynamic packages, pricing, and features served to the storefront home page in real-time.",
  packagesMenu: "Packages & Pricing",
  createPackageBtn: "Create New Package",
  editPackageBtn: "Edit Package",
  deletePackageBtn: "Delete Package",
  viewLivePricing: "View Live Home Page",
  packageName: "Package Name",
  packagePrice: "Monthly Price (BDT)",
  packageBadge: "Badge / Tag",
  packageDescription: "Description",
  packageFeatures: "Features List",
  packageLimits: "Resource Limits",
  packageFees: "Order Fees",
  packageStatus: "Active Status",
  popularBadge: "Highlighted / Most Popular",
  resetDefaults: "Reset to Default Plans",

  // Super Admin: Trial & Paid Users
  superTrialsMenu: "Trial Stores",
  superPaidMenu: "Paid Subscribers",
  trialUsersTitle: "15-Day Free Trial Stores",
  trialUsersSubtitle: "Monitor active trial merchants, track store onboarding and conversions, extend trial periods, or upgrade directly to paid tiers.",
  paidUsersTitle: "Paid Merchant Subscribers",
  paidUsersSubtitle: "Manage active subscriptions, recurring billing (MRR/ARR), plan tier assignments, and growth analytics across all paid stores.",
  activeTrialsCount: "Active Trials",
  avgDaysLeft: "Avg. Days Remaining",
  expiringSoonCount: "Expiring Soon (≤3 Days)",
  trialOrdersGmv: "Trial GMV & Orders",
  totalPaidStores: "Paid Subscribers",
  mrrLabel: "Monthly Recurring Revenue",
  arrLabel: "Annual Run Rate (ARR)",
  tierBreakdown: "Growth & Pro Tiers",
  searchTrialsPlaceholder: "Search trial store, subdomain, owner or phone...",
  searchPaidPlaceholder: "Search paid subscriber, domain, owner...",
  allStatuses: "All Statuses",
  activeTrialStatus: "Active Trial",
  expiringSoonStatus: "Expiring Soon",
  expiredStatus: "Expired",
  daysLeft: "days left",
  expiredLabel: "Expired",
  extendTrialBtn: "Extend Trial",
  upgradeToPaidBtn: "Upgrade to Paid",
  changePlanBtn: "Change Plan",
  extendTrialModalTitle: "Extend Store Trial Period",
  extendDaysLabel: "Additional Trial Days",
  confirmExtend: "Confirm Extension",
  upgradeModalTitle: "Upgrade Store to Paid Plan",
  selectPlanLabel: "Select Plan Tier",
  billingIntervalLabel: "Billing Interval",
  monthlyCycle: "Monthly",
  yearlyCycle: "Yearly (10% Discount)",
  confirmUpgrade: "Save & Activate Plan",
  noTrialsFound: "No trial stores currently found.",
  noPaidFound: "No paid subscribers found yet.",
  trialProgress: "15-Day Trial Timeline",
  cancelBtn: "Cancel",
  savingText: "Saving...",
};

const bnTranslations: Translations = {
  menu: "মেনু",
  superAdminMenu: "সুপার অ্যাডমিন",
  dashboards: "ড্যাশবোর্ড",
  analytics: "অ্যানালিটিক্স",
  orders: "অর্ডার ও সিআরএম",
  crm: "সিআরএম ও কল",
  products: "প্রোডাক্ট ও স্টক",
  ecommerce: "ই-কমার্স",
  courier: "কুরিয়ার লজিস্টিকস",
  logistics: "স্টেডফাস্ট কুরিয়ার",
  incomplete: "অসম্পূর্ণ লিড",
  leads: "লিড সমূহ",
  theme: "থিম এডিটর",
  themeEditor: "স্টোর ডিজাইন",
  settings: "সেটিংস",
  apps: "অ্যাপস ও শর্টকাট",
  pages: "পেইজ সমূহ",
  liveStore: "লাইভ স্টোরফ্রন্ট",
  landingPages: "ল্যান্ডিং পেইজ সমূহ",
  steadfastLogistics: "Steadfast Logistics",
  dialer: "টেলি-সেলস ডায়ালার",
  fileMedia: "ফাইল ও মিডিয়া ম্যানেজার",
  serverActive: "ক্লাউড ভিপিএস সক্রিয়",
  overview: "প্ল্যাটফর্ম ওভারভিউ",
  superAdminConsole: "সুপার অ্যাডমিন প্ল্যাটফর্ম কনসোল",

  searchPlaceholder: "অর্ডার, কাস্টমার ফোন বা প্রোডাক্ট খুঁজুন... (Ctrl + K)",
  notifications: "নোটিফিকেশন",
  realtimeNotifications: "রিয়েলটাইম নোটিফিকেশন",
  newOrdersNotice: "টি নতুন ক্যাশ অন ডেলিভারি অর্ডার প্রাপ্ত!",
  callCustomerNotice: "গ্রাহককে কল দিয়ে অর্ডার নিশ্চিত করুন",
  incompleteNotice: "জন ক্রেতা চেকআউটে ফোন নম্বর দিয়েছেন",
  recoverNotice: "WhatsApp বা ফোনে অর্ডারটি রিকভার করুন",
  mediaEngineNotice: "Cloudflare R2 ও মিডিয়া পাইপলাইন সক্রিয়",
  zeroServerNotice: "জিরো-সার্ভার ৩-উইডথ ওয়েবপি ইমেজ ইঞ্জিন",
  viewAllNotifications: "সকল নোটিফিকেশন দেখুন →",
  fullscreen: "ফুলস্ক্রিন টগল",
  signOut: "লগ আউট (Sign Out)",
  liveStorefront: "লাইভ স্টোর দেখুন",
  storeOwner: "স্টোর ওনার",
  platformMaster: "প্ল্যাটফর্ম মাস্টার",

  settingsTitle: "ড্যাশবোর্ড ও স্টোর সেটিংস",
  settingsSubtitle: "ভাষা নির্বাচন, স্টোর কনফিগারেশন এবং সিস্টেম প্রেফারেন্স পরিচালনা করুন",
  languageSection: "ভাষা পছন্দ (Language Preference)",
  languageDesc: "ড্যাশবোর্ডের জন্য আপনার পছন্দের ভাষা নির্বাচন করুন। মেনু ও অপশন তৎক্ষণাৎ পরিবর্তিত হবে।",
  english: "English (US)",
  bangla: "বাংলা (Bangla)",
  englishDesc: "ডিফল্ট প্ল্যাটফর্ম ভাষা — সমস্ত ফিচার ইংরেজিতে দেখুন",
  banglaDesc: "বাংলা ভাষায় সমস্ত মেনু, অর্ডার ও ড্যাশবোর্ড অপশন দেখুন",
  defaultBadge: "ডিফল্ট",
  activeBadge: "সক্রিয়",
  storeSettingsSection: "স্টোর প্রোফাইল ও তথ্য",
  storeSettingsDesc: "বর্তমান টেন্যান্ট স্টোরের পরিচিতি, সাবডোমেন ও সিকিউরিটি প্যারামিটার।",
  storeNameLabel: "দোকানের নাম",
  subdomainLabel: "সাবডোমেন / ওয়েবসাইট",
  accountRoleLabel: "অ্যাকাউন্ট রোল",
  currencyLabel: "কারেন্সি ও ফাইন্যান্সিয়ালস",
  currencyDesc: "বাংলাদেশী টাকা (BDT ৳) — নির্ভুল ইন্টিজার পয়সা ভিত্তিক হিসাব",
  saveSettings: "পরিবর্তন সংরক্ষণ করুন",
  savingSettings: "সংরক্ষণ হচ্ছে...",
  savedSuccess: "সেটিংস সফলভাবে সংরক্ষিত হয়েছে!",
  systemPreferences: "সিস্টেম প্রেফারেন্স",
  systemPreferencesDesc: "রিয়েলটাইম ডাটা সিঙ্ক ও নোটিফিকেশন সেটিংস।",
  soundAlerts: "ক্যাশ রেজিস্টার সাউন্ড (Cha-Ching)",
  soundAlertsDesc: "নতুন অর্ডার এলে চ্যা-চিং সাউন্ড অ্যালার্ট বাজান।",

  search: "অনুসন্ধান",
  all: "সকল",
  active: "সক্রিয়",
  filter: "ফিল্টার",
  exportCsv: "CSV এক্সপোর্ট",
  addNew: "নতুন যোগ করুন",
  status: "স্ট্যাটাস",
  actions: "একশন",
  total: "মোট",
  date: "তারিখ",
  phone: "ফোন",
  customer: "গ্রাহক",
  amount: "পরিমাণ",
  price: "মূল্য",
  quantity: "পরিমাণ",
  notes: "নোট",
  save: "সংরক্ষণ",
  cancel: "বাতিল",
  refresh: "রিফ্রেশ",
  back: "ফিরে যান",
  justNow: "এইমাত্র",
  today: "আজ",
  details: "বিস্তারিত",
  confirmed: "কনফার্মড",
  pendingCall: "কল বাকি",

  // Analytics View
  analyticsTitle: "স্টোর অ্যানালিটিক্স ও লাইভ পারফরম্যান্স",
  analyticsSubtitle: "রিয়েল-টাইম মেট্রিক্স, মোট বিক্রয় (GMV) এবং রেভিনিউ হিসাব",
  totalSales: "মোট বিক্রয় (GMV)",
  confirmedOrders: "কনফার্মড অর্ডার",
  potentialLeads: "ড্রপ-অফ লিড রিকভারি",
  deliverySuccess: "ডেলিভারি সফলতার হার",
  revenueChartTitle: "বিক্রয় ও অর্ডার অ্যানালিটিক্স (Sales Trends)",
  recentOrdersTitle: "সাম্প্রতিক কাস্টমার অর্ডার",
  recentOrdersSubtitle: "লাইভ চেকআউট ফানেল থেকে প্রাপ্ত সর্বশেষ অর্ডার সমূহ",
  viewAllOrders: "সকল অর্ডার দেখুন",
  downloadReport: "রিপোর্ট ডাউনলোড",
  dateRangeLabel: "০১ অক্টো, ২০২৬ — ০১ নভে, ২০২৬",
  callConfirmationRate: "কল কনফার্মেশন রেট",
  teleSalesLogBtn: "টেলি-সেলস লগ",
  dropOffLeadRecovery: "ড্রপ-অফ লিড রিকভারি",
  leadsCountSuffix: "টি লিড",
  sendWhatsappBtn: "WhatsApp পাঠান",
  courierDeliveryRate: "কুরিয়ার ডেলিভারি রেট",
  remittanceSlipBtn: "রেমিট্যান্স চালান",
  salesTrendsTitle: "বিক্রয় ও অর্ডার অ্যানালিটিক্স",
  salesTrendsSubtitle: "দৈনিক রাজস্ব ও ডেলিভারি পারফরম্যান্স গ্রাফ",
  totalRevenueLabel: "মোট রাজস্ব",
  orderCountLabel: "অর্ডার সংখ্যা",
  avgBasketSizeLabel: "গড় বাস্কেট সাইজ (AOV)",
  orderStatusDistribution: "অর্ডার স্ট্যাটাস বিতরণ",
  liveTracking: "লাইভ ট্র্যাকিং",
  deliveredAndCompleted: "ডেলিভার্ড ও সম্পন্ন",
  inTransitCourier: "ইন-ট্রানজিট (কুরিয়ার)",
  callPendingConfirm: "কল ও কনফার্ম বাকি",
  cancelledReturned: "বাতিল / রিটার্ন",
  manageDetailedStatus: "বিস্তারিত স্ট্যাটাস ম্যানেজ করুন →",
  topSellingProducts: "শীর্ষ বিক্রীত পণ্য",
  allProductsBtn: "সকল পণ্য →",
  productCol: "পণ্য",
  priceCol: "মূল্য",
  salesCol: "বিক্রয়",
  stockStatusCol: "স্টক স্ট্যাটাস",
  remainingSuffix: "বাকি",
  recentTeleSalesActivity: "সাম্প্রতিক টেলি-সেলস অ্যাক্টিভিটি",
  liveFeed: "লাইভ ফিড",
  teleSalesPanelBtn: "টেলি-সেলস প্যানেলে যান →",

  // Orders View
  ordersTitle: "অর্ডার ও টেলি-সেলস কল সেন্টার",
  ordersSubtitle: "গ্রাহকের সাথে কথা বলে কনফার্ম করুন এবং কুরিয়ারে বুকিং দিন",
  downloadSteadfastCsv: "Steadfast CSV ডাউনলোড",
  allOrdersTab: "সব অর্ডার",
  pendingCallTab: "কল বাকি",
  confirmedTab: "কনফার্মড",
  noAnswerTab: "নো-অ্যানসার",
  advancePendingTab: "অগ্রিম চার্জ বাকি",
  orderSearchPlaceholder: "অর্ডার #, নাম বা মোবাইল খুঁজুন...",
  orderNumberCol: "অর্ডার নম্বর",
  customerAndMobileCol: "গ্রাহক ও মোবাইল",
  addressAndDistrictCol: "ঠিকানা ও জেলা",
  priceCodCol: "মূল্য (COD)",
  teleSalesCallStatusCol: "টেলি-সেলস কল স্ট্যাটাস",
  courierBookingCol: "কুরিয়ার বুকিং",
  noOrdersFound: "কোনো অর্ডার পাওয়া যায়নি",
  advanceVerifiedBadge: "অগ্রিম ভেরিফাইড",
  verifyAdvanceBtn: "অগ্রিম ১২০ ৳ ভেরিফাই",
  callPendingOption: "⏳ কল বাকি (Pending)",
  confirmedOption: "✅ কনফার্মড (Confirmed)",
  noAnswer1Option: "📞 নো-অ্যানসার ১ (Retry 1)",
  noAnswer2Option: "📞 নো-অ্যানসার ২ (Retry 2)",
  noAnswer3Option: "📞 নো-অ্যানসার ৩ (Retry 3)",
  wrongNumberOption: "❌ ভুল নম্বর (Wrong Num)",
  cancelledOption: "🚫 বাতিল (Cancelled)",
  callAttemptsPrefix: "কল চেষ্টা:",
  sendSteadfastBtn: "Steadfast পাঠান",
  advanceModalTitle: "অগ্রিম bKash চার্জ ভেরিফিকেশন",
  customerPhoneModalLabel: "গ্রাহকের ফোন:",
  advanceDeliveryFeeModalLabel: "অগ্রিম ডেলিভারি চার্জ:",
  bkashTrxIdLabel: "bKash TrxID (ট্রানজেকশন আইডি)",
  confirmAndVerifyBtn: "কনফার্ম ও ভেরিফাই করুন",
  verifyingText: "ভেরিফাই হচ্ছে...",

  // Incomplete View
  incompleteTitle: "ইনকমপ্লিট অর্ডার ও ড্রপ-অফ লিড রিকভারি",
  incompleteSubtitle: "যেসব ক্রেতা চেকআউট ফর্মে মোবাইল নম্বর দিয়েও অর্ডার সম্পূর্ণ করেননি, তাদের সাথে যোগাযোগ করুন",
  recoveryPotential: "সম্ভাব্য রিকভারি",
  operationsBreadcrumb: "অপারেশনস",
  incompleteBreadcrumb: "ইনকমপ্লিট অর্ডার (লিড)",
  dropOffListTitle: "ড্রপ-অফ লিড তালিকা",
  leadSearchPlaceholder: "মোবাইল বা নাম খুঁজুন...",
  phoneCol: "মোবাইল নম্বর",
  customerNameDistrictCol: "ক্রেতার নাম ও জেলা",
  estimatedPriceCol: "সম্ভাব্য মূল্য",
  dropOffStepCol: "ড্রপ-অফ ধাপ",
  timeCol: "সময়",
  recoveryActionCol: "রিকভারি একশন",
  noLeadsFound: "বর্তমানে কোনো ড্রপ-অফ লিড নেই",
  unknownCustomer: "অজ্ঞাত ক্রেতা",
  districtNotSpecified: "জেলা উল্লেখ নেই",
  phoneEnteredStep: "মোবাইল নম্বর প্রবেশ",
  addressEnteredStep: "ঠিকানা প্রবেশ",
  whatsappMessageBtn: "WhatsApp বার্তা",

  // Products View
  productsTitle: "পণ্য তালিকা ও ইনভেন্টরি স্টক",
  productsSubtitle: "স্টোরের সকল প্রোডাক্ট, ভ্যারিয়েন্ট মূল্য এবং স্টক ম্যানেজ করুন",
  addProductBtn: "নতুন পণ্য যুক্ত করুন",
  catalogBreadcrumb: "ক্যাটালগ",
  productsBreadcrumb: "পণ্য তালিকা",
  allProductsListTitle: "সকল প্রোডাক্ট",
  productSearchPlaceholder: "নাম বা কোড খুঁজুন...",
  productAndImageCol: "পণ্য ও ছবি",
  priceBdtCol: "মূল্য (BDT)",
  compareAtCol: "কাট প্রাইস",
  stockQuantityCol: "মজুদ স্টক",
  productStatusCol: "স্ট্যাটাস",
  noProductsFound: "কোনো পণ্য যুক্ত করা হয়নি",
  inStockBadge: "মজুদ আছে",
  liveAndActiveBadge: "লাইভ ও সক্রিয়",
  modalAddProductTitle: "নতুন পণ্য যুক্ত করুন",
  productTitleEnLabel: "পণ্যের নাম (ইংরেজি)",
  productTitleBnLabel: "পণ্যের নাম (বাংলা)",
  priceBdtLabel: "বিক্রয় মূল্য (BDT ৳)",
  comparePriceBdtLabel: "পূর্বের মূল্য / ডিসকাউন্ট (BDT ৳)",
  stockQtyLabel: "মজুদ পরিমাণ",
  descriptionLabel: "পণ্যের বিবরণ",
  productImageLabel: "পণ্যের ছবি (সরাসরি R2 আপলোড)",
  imageOptimizationNotice: "ছবিটি ব্রাউজারে ৩টি সাইজে (360px, 720px, 1080px WebP) অপ্টিমাইজড হবে",
  savingProductBtn: "সংরক্ষণ হচ্ছে...",
  saveProductBtn: "সংরক্ষণ করুন",

  // Courier View
  courierTitle: "কুরিয়ার লজিস্টিকস ও রেমিট্যান্স রিকনসিলিয়েশন",
  courierSubtitle: "Steadfast এবং Pathao বাল্ক আপলোড CSV এবং কুরিয়ার থেকে প্রাপ্য টাকার হিসাব",
  logisticsBreadcrumb: "লজিস্টিকস",
  courierBreadcrumb: "কুরিয়ার ও রেমিট্যান্স",
  steadfastCsvBannerTitle: "Steadfast বাল্ক অর্ডার আপলোড CSV",
  steadfastCsvBannerDesc: "API ডাউন থাকলেও কনফার্মড অর্ডারগুলোর রেডিমেড CSV ফাইল ডাউনলোড করে কুরিয়ার পোর্টালে সরাসরি আপলোড করুন",
  downloadCsvBtn: "CSV ফাইল ডাউনলোড করুন",
  totalCodCollectionTitle: "কুরিয়ারে মোট কালেকশন (COD)",
  totalCodCollectionSub: "গ্রাহকের কাছ থেকে সংগৃহীত টাকা",
  courierFeeTitle: "কুরিয়ার চার্জ ও ১% COD ফি",
  courierFeeSub: "ডেলিভারি ফি বাবদ কর্তন",
  netPayoutExpectedTitle: "প্রাপ্য নেট পরিশোধ (Net Payout)",
  netPayoutExpectedSub: "ব্যাংক বা বিকাশে ছাড়যোগ্য",
  courierTrackingTableTitle: "কুরিয়ার ট্র্যাকিং ও রেমিট্যান্স তালিকা",
  totalRecordsSuffix: "টি রেকর্ড",
  consignmentIdCol: "Consignment ID",
  courierProviderCol: "কুরিয়ার",
  collectedFromCustomerCol: "গ্রাহকের থেকে সংগৃহীত",
  courierChargeCol: "কুরিয়ার চার্জ",
  netPayableCol: "নেট পাওনা",
  paymentStatusCol: "পেমেন্ট স্ট্যাটাস",
  noCourierRecordsFound: "বর্তমানে কোনো কুরিয়ার চালান নেই",
  paidBadge: "পরিশোধিত",
  processingBadge: "প্রসেসিং",

  // Theme View
  themePageTitle: "থিম এডিটর ও ভিজ্যুয়াল কাস্টমাইজার",
  themePageSubtitle: "৫টি হাই-কনভার্টিং থিম আর্কিটাইপ থেকে বেছে নিন",
  currentTheme: "বর্তমান সক্রিয় থিম",
  themeArchetypes: "আর্কিটাইপ নির্বাচন",
  saveThemeBtn: "থিম সংরক্ষণ করুন",
  designBreadcrumb: "স্টোর ডিজাইন",
  themeBreadcrumb: "থিম এডিটর",
  themeSelectionTitle: "স্টোরফ্রন্ট আর্কিটাইপ নির্বাচন",
  themeSelectionDesc: "নির্দিষ্ট পণ্য এবং বিক্রয় ফানেলের জন্য অপ্টিমাইজড আর্কিটাইপ বেছে নিন",
  presetColorSelection: "কালার প্যালেট ও প্রিসেট নির্বাচন",
  presetColorDesc: "ব্র্যান্ডের সাথে মানানসই কালার থিম সেট করুন",
  storeContentConfig: "স্টোরফ্রন্ট কনটেন্ট ও সাপোর্ট",
  storeContentDesc: "ঘোষণা বার এবং কাস্টমার কেয়ার হটলাইন কনফিগার করুন",
  announcementTextLabel: "টপ অ্যানাউন্সমেন্ট বার টেক্সট",
  whatsappSupportNumber: "সাপোর্ট WhatsApp নম্বর",
  savingThemeBtn: "সংরক্ষণ হচ্ছে...",
  themeSavedSuccess: "থিম সফলভাবে আপডেট হয়েছে!",

  // Super Admin View
  superAdminTitle: "Go Commerce BD — মাল্টি-টেন্যান্ট ইকোসিস্টেম",
  superAdminSubtitle: "সুপার অ্যাডমিন প্ল্যাটফর্ম কনসোল — PostgreSQL 18 RLS Isolated",
  totalGmvLabel: "প্ল্যাটফর্ম মোট বিক্রয় (GMV)",
  activeStoresCount: "সক্রিয় মার্চেন্ট স্টোর",
  monthlyOrdersLabel: "মাসিক মোট অর্ডার প্রসেসড",
  platformMrrLabel: "প্ল্যাটফর্ম MRR (সাবস্ক্রিপশন)",
  tenantsDirectoryTitle: "মার্চেন্ট ও স্টোর ডিরেক্টরি (Tenants Management)",
  tenantsDirectorySubtitle: "যেকোনো স্টোরের ড্যাশবোর্ডে সরাসরি এক ক্লিকে প্রবেশ বা নজরদারি করুন",
  storeAndBrand: "স্টোর ও ব্র্যান্ড",
  ownerContact: "মালিক ও যোগাযোগ",
  subscriptionPlan: "সাবস্ক্রিপশন প্ল্যান",
  monthlySales: "মাসিক বিক্রয় (GMV)",
  dataSecurity: "ডাটা ও কুরিয়ার সিকিউরিটি",
  viewStore: "স্টোর দেখুন",
  allPlans: "সকল প্ল্যান",
  searchTenantsPlaceholder: "স্টোরের নাম, সাবডোমেন বা ওনার খুঁজুন...",
  noTenantsFound: "কোনো মার্চেন্ট স্টোর পাওয়া যায়নি",
  postgresRlsBadge: "PostgreSQL 18 RLS Isolated",
  aesVaultBadge: "AES-256 Per-Store Vault",

  // Packages Management
  packagesTitle: "প্ল্যাটফর্ম প্যাকেজ ও মূল্য নির্ধারণ",
  packagesSubtitle: "ডায়নামিক প্যাকেজ তৈরি, মূল্য ও ফিচার পরিবর্তন করুন যা সরাসরি ওয়েবসাইটের হোম পেজে আপডেট হবে।",
  packagesMenu: "প্যাকেজ ও প্রাইসিং",
  createPackageBtn: "নতুন প্যাকেজ যুক্ত করুন",
  editPackageBtn: "প্যাকেজ এডিট করুন",
  deletePackageBtn: "প্যাকেজ মুছুন",
  viewLivePricing: "লাইভ হোম পেজ দেখুন",
  packageName: "প্যাকেজের নাম",
  packagePrice: "মাসিক মূল্য (টাকা)",
  packageBadge: "ব্যাজ / ট্যাগ",
  packageDescription: "বিবরণ",
  packageFeatures: "ফিচার তালিকা",
  packageLimits: "রিসোর্স লিমিট",
  packageFees: "অর্ডার ফি",
  packageStatus: "সক্রিয় অবস্থা",
  popularBadge: "হাইলাইটেড / সর্বাধিক জনপ্রিয়",
  resetDefaults: "ডিফল্ট প্ল্যান ফিরিয়ে আনুন",

  // Super Admin: Trial & Paid Users
  superTrialsMenu: "ট্রায়াল স্টোর",
  superPaidMenu: "পেইড সাবস্ক্রাইবার",
  trialUsersTitle: "১৫ দিনের ফ্রি ট্রায়াল স্টোরসমূহ",
  trialUsersSubtitle: "সক্রিয় ট্রায়াল মার্চেন্টদের অগ্রগতি মনিটর করুন, ট্রায়াল মেয়াদ বৃদ্ধি করুন এবং সরাসরি পেইড প্ল্যানে রূপান্তর করুন।",
  paidUsersTitle: "পেইড মার্চেন্ট সাবস্ক্রাইবার",
  paidUsersSubtitle: "সক্রিয় সাবস্ক্রিপশন, মাসিক রিকারিং রেভিনিউ (MRR), বার্ষিক রান রেট (ARR) এবং প্ল্যান টায়ার ম্যানেজমেন্ট।",
  activeTrialsCount: "সক্রিয় ট্রায়াল স্টোর",
  avgDaysLeft: "গড় অবশিষ্ট দিন",
  expiringSoonCount: "মেয়াদ শেষের পথে (≤৩ দিন)",
  trialOrdersGmv: "ট্রায়াল বিক্রয় ও অর্ডার",
  totalPaidStores: "পেইড সাবস্ক্রাইবার",
  mrrLabel: "মাসিক রিকারিং রেভিনিউ (MRR)",
  arrLabel: "বার্ষিক রান রেট (ARR)",
  tierBreakdown: "গ্রোথ ও প্রো টায়ার",
  searchTrialsPlaceholder: "ট্রায়াল স্টোর, সাবডোমেন, ওনার বা ফোন দিয়ে খুঁজুন...",
  searchPaidPlaceholder: "পেইড স্টোর, ডোমেন, ওনার বা ফোন দিয়ে খুঁজুন...",
  allStatuses: "সকল অবস্থা",
  activeTrialStatus: "সক্রিয় ট্রায়াল",
  expiringSoonStatus: "মেয়াদ শেষের পথে",
  expiredStatus: "মেয়াদ শেষ",
  daysLeft: "দিন বাকি",
  expiredLabel: "মেয়াদ উত্তীর্ণ",
  extendTrialBtn: "মেয়াদ বাড়ান",
  upgradeToPaidBtn: "পেইডে আপগ্রেড করুন",
  changePlanBtn: "প্ল্যান পরিবর্তন",
  extendTrialModalTitle: "স্টোরের ট্রায়াল মেয়াদ বৃদ্ধি",
  extendDaysLabel: "অতিরিক্ত ট্রায়াল দিন সংখ্যা",
  confirmExtend: "মেয়াদ বৃদ্ধি নিশ্চিত করুন",
  upgradeModalTitle: "স্টোরটি পেইড প্ল্যানে আপগ্রেড করুন",
  selectPlanLabel: "প্ল্যান টায়ার নির্বাচন করুন",
  billingIntervalLabel: "বিলিং সাইকেল",
  monthlyCycle: "মাসিক",
  yearlyCycle: "বার্ষিক (১০% ছাড়)",
  confirmUpgrade: "সংরক্ষণ ও সক্রিয় করুন",
  noTrialsFound: "বর্তমানে কোনো ট্রায়াল স্টোর নেই।",
  noPaidFound: "বর্তমানে কোনো পেইড সাবস্ক্রাইবার পাওয়া যায়নি।",
  trialProgress: "১৫ দিনের ট্রায়াল অগ্রগতি",
  cancelBtn: "বাতিল",
  savingText: "সংরক্ষণ হচ্ছে...",
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: enTranslations,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // English is the default for all users
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("gocom_lang") || localStorage.getItem("gocom_dashboard_lang");
      if (saved === "bn" || saved === "en") {
        return saved;
      }
    } catch {
      // fallback
    }
    return "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("gocom_lang", lang);
      localStorage.setItem("gocom_dashboard_lang", lang);
    } catch {
      // ignore
    }
  };

  const t = language === "bn" ? bnTranslations : enTranslations;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
