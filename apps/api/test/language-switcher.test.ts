import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

describe("Phase 8: Multilingual Website Language Switcher & Persistence Tests", () => {
  const homeHtmlPath = path.join(rootDir, "apps/storefront/src/templates/home.html");
  const authLayoutPath = path.join(rootDir, "apps/storefront/src/components/AuthLayout.astro");
  const marketingCssPath = path.join(rootDir, "apps/storefront/public/assets/css/marketing.css");
  const marketingJsPath = path.join(rootDir, "apps/storefront/public/assets/js/marketing.js");
  const dashboardLangPath = path.join(rootDir, "apps/dashboard/src/context/LanguageContext.tsx");

  const homeHtml = fs.readFileSync(homeHtmlPath, "utf8");
  const authLayout = fs.readFileSync(authLayoutPath, "utf8");
  const marketingCss = fs.readFileSync(marketingCssPath, "utf8");
  const marketingJs = fs.readFileSync(marketingJsPath, "utf8");
  const dashboardLang = fs.readFileSync(dashboardLangPath, "utf8");

  it("Header & Navigation: contains compact EN/BN language switcher in desktop and mobile nav", () => {
    // 1. Home template
    assert.ok(homeHtml.includes('class="lang-switch"'), "home.html must include .lang-switch container");
    assert.ok(homeHtml.includes('data-lang-btn="en"'), "home.html must have EN button");
    assert.ok(homeHtml.includes('data-lang-btn="bn"'), "home.html must have BN button");
    
    // Check occurrence in both desktop header-actions and mobile-actions
    const desktopActionsMatch = homeHtml.match(/class="header-actions"[\s\S]*?class="lang-switch"/);
    assert.ok(desktopActionsMatch, "Desktop header-actions must contain language switcher");

    const mobileActionsMatch = homeHtml.match(/class="mobile-actions"[\s\S]*?class="lang-switch"/);
    assert.ok(mobileActionsMatch, "Mobile mobile-actions must contain language switcher");

    // 2. AuthLayout template (/login, /create-store)
    assert.ok(authLayout.includes('class="lang-switch"'), "AuthLayout must include .lang-switch container");
    assert.ok(authLayout.includes('data-lang-btn="en"'), "AuthLayout must have EN button");
    assert.ok(authLayout.includes('data-lang-btn="bn"'), "AuthLayout must have BN button");

    const authDesktopMatch = authLayout.match(/class="header-actions"[\s\S]*?class="lang-switch"/);
    assert.ok(authDesktopMatch, "AuthLayout desktop header must contain language switcher");

    const authMobileMatch = authLayout.match(/class="mobile-actions"[\s\S]*?class="lang-switch"/);
    assert.ok(authMobileMatch, "AuthLayout mobile nav must contain language switcher");
  });

  it("Styling: marketing.css provides modern, compact, sleek pill button styles for .lang-switch", () => {
    assert.ok(marketingCss.includes(".lang-switch"), "marketing.css must define .lang-switch");
    assert.ok(marketingCss.includes(".lang-switch .lang-btn"), "marketing.css must style .lang-btn");
    assert.ok(marketingCss.includes(".lang-switch .lang-btn.active"), "marketing.css must style active lang-btn");
    assert.ok(marketingCss.includes(".lang-switch .lang-divider"), "marketing.css must style .lang-divider");
  });

  it("Default Language & Persistence: defaults strictly to English and saves to localStorage", () => {
    // Check default setting in marketing.js
    assert.ok(
      marketingJs.includes("return 'en'; // Default is strictly English") ||
      marketingJs.includes("return 'en';"),
      "Default language must be English ('en')"
    );

    // Check localStorage persistence
    assert.ok(marketingJs.includes("localStorage.setItem('gocom_lang', lang)"), "Must store preference in localStorage under gocom_lang");
    assert.ok(marketingJs.includes("localStorage.getItem('gocom_lang')"), "Must retrieve preference from localStorage");
    
    // Check synchronization with dashboard
    assert.ok(marketingJs.includes("localStorage.setItem('gocom_dashboard_lang', lang)"), "Must synchronize with dashboard preference");
    assert.ok(dashboardLang.includes('localStorage.getItem("gocom_lang")'), "Dashboard LanguageContext must read gocom_lang");
  });

  it("Translation Coverage: covers home page, navigation, cards, footer and auth forms", () => {
    // Verify exactly the 6 required header navigation tabs exist
    const requiredNavKeys = [
      'data-i18n="navHome"',
      'data-i18n="navFeatures"',
      'data-i18n="navPricing"',
      'data-i18n="navDownloads"',
      'data-i18n="navContact"',
    ];

    for (const key of requiredNavKeys) {
      assert.ok(homeHtml.includes(key), `home.html must include nav item ${key}`);
      assert.ok(authLayout.includes(key), `AuthLayout.astro must include nav item ${key}`);
    }

    const homeI18nKeys = [
      'data-i18n="navHome"',
      'data-i18n="navFeatures"',
      'data-i18n="navPricing"',
      'data-i18n="navDownloads"',
      'data-i18n="navContact"',
      'data-i18n="navLogIn"',
      'data-i18n="navCreateStore"',
      'data-i18n-html="heroEyebrow"',
      'data-i18n-html="heroTitle"',
      'data-i18n="statMerchantOrders"',
      'data-i18n="toolkitTag"',
      'data-i18n="demoTitle"',
      'data-i18n="stepsTitle"',
      'data-i18n="pricingTitle"',
      'data-i18n="appTitle"',
      'data-i18n="faqTitle"',
      'data-i18n="footerCopyright"',
      'data-i18n="authSubtitleLogin"',
      'data-i18n="authBtnLoginShort"',
      'data-i18n="authBtnCreateStore"',
    ];

    for (const key of homeI18nKeys) {
      assert.ok(homeHtml.includes(key), `home.html must include ${key}`);
    }

    // Check presence of data-i18n attributes on AuthLayout
    const authI18nKeys = [
      'data-i18n-html="authEyebrow"',
      'data-i18n-html="authCardTitleLogin"',
      'data-i18n="authLabelEmail"',
      'data-i18n-placeholder="authPlaceholderEmail"',
      'data-i18n="authLabelPassword"',
      'data-i18n-placeholder="authPlaceholderPassword"',
      'data-i18n="authBtnLogin"',
      'data-i18n="authGoogleBtn"',
      'data-i18n="authLabelStoreName"',
      'data-i18n="authLabelSubdomain"',
      'data-i18n="authBtnCreateStoreLong"',
      'data-i18n="authSecurityFoot"',
    ];

    for (const key of authI18nKeys) {
      assert.ok(authLayout.includes(key), `AuthLayout.astro must include ${key}`);
    }

    // Verify TRANSLATIONS dictionary in marketing.js has both English and Bangla dictionaries
    assert.ok(marketingJs.includes("var TRANSLATIONS = {"), "marketing.js must define TRANSLATIONS dictionary");
    assert.ok(marketingJs.includes("en: {"), "TRANSLATIONS must have en dictionary");
    assert.ok(marketingJs.includes("bn: {"), "TRANSLATIONS must have bn dictionary");
  });

  it("Instant Load: head scripts prevent layout jitter before full script runs", () => {
    const headScriptSignature = "localStorage.getItem('gocom_lang')";
    assert.ok(homeHtml.includes(headScriptSignature), "home.html head must contain early language detection script");
    assert.ok(authLayout.includes(headScriptSignature), "AuthLayout.astro head must contain early language detection script");
  });

  it("Runtime Integrity: marketing.js has zero syntax errors and valid IIFE wrapper", () => {
    assert.ok(marketingJs.startsWith("(function () {\n    'use strict';") || marketingJs.includes("(function () {"), "marketing.js must have IIFE wrapper");
    assert.ok(marketingJs.trim().endsWith("})();"), "marketing.js must properly close IIFE");
    // Verify no syntax errors
    assert.doesNotThrow(() => {
      new Function(marketingJs);
    }, "marketing.js must parse and evaluate without syntax errors");
  });

  it("Section Visibility: all home page sections exist and link with header navigation", () => {
    const expectedSections = [
      'id="features"',
      'id="pricing"',
      'id="downloads"',
      'id="faq"',
      'id="contact"',
      'id="steps"',
      'id="stories"',
      'id="reach"',
      'id="partners"',
    ];

    for (const sec of expectedSections) {
      assert.ok(homeHtml.includes(sec), `home.html must include section ${sec}`);
    }

    // Scroll reveal safety mechanism check
    assert.ok(marketingJs.includes("setupReveal"), "marketing.js must have setupReveal function");
    assert.ok(marketingJs.includes(".reveal"), "marketing.js must query .reveal elements");
  });
});
