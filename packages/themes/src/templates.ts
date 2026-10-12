import { ThemeArchetype } from "@gocom/contracts";
import { ThemeTemplate } from "./types.js";

export const STARTER_TEMPLATES: Record<ThemeArchetype, ThemeTemplate> = {
  "viral-funnel": {
    id: "template-viral-funnel",
    archetype: "viral-funnel",
    name: "Viral Product Funnel",
    banglaName: "ভাইরাল প্রোডাক্ট ফানেল",
    description: "ফেসবুক বিজ্ঞাপনের জন্য অপটিমাইজড ১-পেজ হাই-কনভার্সন ল্যান্ডিং পেজ",
    defaultPreset: "rose-bold",
    sections: [
      {
        id: "sec-announcement",
        type: "announcement_bar",
        enabled: true,
        settings: {
          text: "সারা দেশে ফ্রি হোম ডেলিভারি এবং ক্যাশ অন ডেলিভারি সুবিধা!",
          badge: "সীমিত সময়ের অফার",
          highlightEmoji: "🔥",
        },
      },
      {
        id: "sec-header",
        type: "header",
        enabled: true,
        settings: {
          showLogo: true,
          showPhoneCall: true,
        },
      },
      {
        id: "sec-hero",
        type: "hero_product",
        enabled: true,
        settings: {
          showRatingBadge: true,
          ratingScore: "৪.৯/৫",
          showStockBadge: true,
          stockText: "ইন-স্টক",
          showDiscountBadge: true,
          discountText: "স্পেশাল ছাড়",
          primaryCtaText: "অর্ডার করতে এখানে ক্লিক করুন 👉",
        },
      },
      {
        id: "sec-features",
        type: "features_list",
        enabled: true,
        settings: {
          title: "কেন এই প্রোডাক্টটি আপনার জন্য সেরা?",
        },
      },
      {
        id: "sec-trust",
        type: "trust_badges",
        enabled: true,
        settings: {
          badges: [
            { icon: "truck", title: "হোম ডেলিভারি", desc: "সারা দেশে দ্রুত" },
            { icon: "shield", title: "ক্যাশ অন ডেলিভারি", desc: "দেখে মূল্য পরিশোধ" },
            { icon: "refresh", title: "রিপ্লেসমেন্ট গ্যারান্টি", desc: "৭ দিনের সহজ রিটার্ন" },
          ],
        },
      },
      {
        id: "sec-checkout",
        type: "inline_checkout",
        enabled: true,
        settings: {
          title: "অর্ডার কনফার্ম করতে নিচের ফর্মটি পূরণ করুন",
        },
      },
      {
        id: "sec-sticky-bottom",
        type: "sticky_bottom_bar",
        enabled: true,
        settings: {
          buttonText: "অর্ডার করতে ক্লিক করুন",
        },
      },
    ],
  },

  "fashion-store": {
    id: "template-fashion-store",
    archetype: "fashion-store",
    name: "Fashion & Boutique",
    banglaName: "ফ্যাশন ও বুটিক",
    description: "শাড়ি, পাঞ্জাবি ও পোশাকের জন্য প্রিমিয়াম ডিজাইন লুকবুক",
    defaultPreset: "royal-fashion",
    sections: [
      {
        id: "sec-announcement",
        type: "announcement_bar",
        enabled: true,
        settings: {
          text: "নতুন কালেকশন ২০২৬ — সারা দেশে ক্যাশ অন ডেলিভারি!",
          badge: "নিউ অ্যারাইভাল",
          highlightEmoji: "✨",
        },
      },
      {
        id: "sec-header",
        type: "header",
        enabled: true,
        settings: {
          showLogo: true,
          showPhoneCall: true,
        },
      },
      {
        id: "sec-hero",
        type: "hero_product",
        enabled: true,
        settings: {
          showRatingBadge: true,
          ratingScore: "৫.০/৫",
          showStockBadge: true,
          stockText: "রেডি স্টক",
          showDiscountBadge: true,
          discountText: "এক্সক্লুসিভ অফার",
          primaryCtaText: "পছন্দের সাইজ ও রঙে অর্ডার করুন 👗",
        },
      },
      {
        id: "sec-features",
        type: "features_list",
        enabled: true,
        settings: {
          title: "কাপড়ের বিবরণ ও বিশেষত্ব",
        },
      },
      {
        id: "sec-trust",
        type: "trust_badges",
        enabled: true,
        settings: {
          badges: [
            { icon: "shield", title: "১০০% প্রিমিয়াম ফেব্রিক", desc: "কালার গ্যারান্টি" },
            { icon: "truck", title: "হোম ডেলিভারি", desc: "সারা বাংলাদেশে" },
            { icon: "refresh", title: "সহজ সাইজ এক্সচেঞ্জ", desc: "৭ দিনের মধ্যে" },
          ],
        },
      },
      {
        id: "sec-checkout",
        type: "inline_checkout",
        enabled: true,
        settings: {
          title: "নিরাপদ চেকআউট — ক্যাশ অন ডেলিভারি",
        },
      },
      {
        id: "sec-sticky-bottom",
        type: "sticky_bottom_bar",
        enabled: true,
        settings: {
          buttonText: "অর্ডার করুন",
        },
      },
    ],
  },

  "tech-gadget": {
    id: "template-tech-gadget",
    archetype: "tech-gadget",
    name: "Tech & Gadget",
    banglaName: "টেক ও গ্যাজেট",
    description: "ইলেকট্রনিক্স ও স্মার্ট ডিভাইসের জন্য স্পেসিফিকেশন ও ওয়ারেন্টি সমৃদ্ধ পেজ",
    defaultPreset: "midnight-tech",
    sections: [
      {
        id: "sec-announcement",
        type: "announcement_bar",
        enabled: true,
        settings: {
          text: "১০০% অরিজিনাল ব্র্যান্ড প্রোডাক্ট ও অফিসিয়াল ওয়ারেন্টি!",
          badge: "অফিসিয়াল",
          highlightEmoji: "⚡",
        },
      },
      {
        id: "sec-header",
        type: "header",
        enabled: true,
        settings: {
          showLogo: true,
          showPhoneCall: true,
        },
      },
      {
        id: "sec-hero",
        type: "hero_product",
        enabled: true,
        settings: {
          showRatingBadge: true,
          ratingScore: "৪.৮/৫",
          showStockBadge: true,
          stockText: "ইন-স্টক",
          showDiscountBadge: true,
          discountText: "ধামাকা অফার",
          primaryCtaText: "এখনই কিনুন — ক্যাশ অন ডেলিভারি 🚀",
        },
      },
      {
        id: "sec-specs",
        type: "specs_table",
        enabled: true,
        settings: {
          title: "টেকনিক্যাল স্পেসিফিকেশন",
        },
      },
      {
        id: "sec-features",
        type: "features_list",
        enabled: true,
        settings: {
          title: "ডিভাইসের সেরা সুবিধাসমূহ",
        },
      },
      {
        id: "sec-trust",
        type: "trust_badges",
        enabled: true,
        settings: {
          badges: [
            { icon: "shield", title: "১ বছর অফিসিয়াল ওয়ারেন্টি", desc: "ব্র্যান্ড গ্যারান্টি" },
            { icon: "truck", title: "ফাস্ট ডেলিভারি", desc: "৪৮ ঘণ্টার মধ্যে" },
            { icon: "refresh", title: "ইনস্ট্যান্ট রিপ্লেসমেন্ট", desc: "৭ দিনের মধ্যে" },
          ],
        },
      },
      {
        id: "sec-checkout",
        type: "inline_checkout",
        enabled: true,
        settings: {
          title: "অর্ডার ফর্ম — ঘরে বসে পণ্য বুঝে নিন",
        },
      },
      {
        id: "sec-sticky-bottom",
        type: "sticky_bottom_bar",
        enabled: true,
        settings: {
          buttonText: "অর্ডার কনফার্ম করুন",
        },
      },
    ],
  },

  "organic-food": {
    id: "template-organic-food",
    archetype: "organic-food",
    name: "Pure & Organic Food",
    banglaName: "খাঁটি ও অর্গানিক ফুড",
    description: "খাঁটি মধু, ঘি, তেল ও গ্রোসারি আইটেমের জন্য ন্যাচারাল থিম",
    defaultPreset: "emerald-organic",
    sections: [
      {
        id: "sec-announcement",
        type: "announcement_bar",
        enabled: true,
        settings: {
          text: "শতভাগ খাঁটি ও প্রাকৃতিক খাদ্যের নিশ্চয়তা!",
          badge: "ন্যাচারাল",
          highlightEmoji: "🌿",
        },
      },
      {
        id: "sec-header",
        type: "header",
        enabled: true,
        settings: {
          showLogo: true,
          showPhoneCall: true,
        },
      },
      {
        id: "sec-origin",
        type: "origin_badge",
        enabled: true,
        settings: {
          location: "সুন্দরবন ও গ্রাম্য নিজস্ব খামার",
          purityClaim: "শতভাগ খাঁটি, রাসায়নিক ও ভেজালমুক্ত",
        },
      },
      {
        id: "sec-hero",
        type: "hero_product",
        enabled: true,
        settings: {
          showRatingBadge: true,
          ratingScore: "৫.০/৫",
          showStockBadge: true,
          stockText: "তাজা স্টক",
          showDiscountBadge: true,
          discountText: "ফার্ম ফ্রেশ",
          primaryCtaText: "খাঁটি পণ্যটি অর্ডার করুন 🍯",
        },
      },
      {
        id: "sec-features",
        type: "features_list",
        enabled: true,
        settings: {
          title: "কেন আমাদের পণ্য শতভাগ খাঁটি?",
        },
      },
      {
        id: "sec-trust",
        type: "trust_badges",
        enabled: true,
        settings: {
          badges: [
            { icon: "shield", title: "ল্যাব টেস্টেড", desc: "শতভাগ বিশুদ্ধ" },
            { icon: "truck", title: "নিরাপদ ডেলিভারি", desc: "ফুড-গ্রেড প্যাকেজিং" },
            { icon: "refresh", title: "মান পছন্দ না হলে রিটার্ন", desc: "১০০% মানিব্যাক" },
          ],
        },
      },
      {
        id: "sec-checkout",
        type: "inline_checkout",
        enabled: true,
        settings: {
          title: "ক্যাশ অন ডেলিভারিতে অর্ডার করুন",
        },
      },
      {
        id: "sec-sticky-bottom",
        type: "sticky_bottom_bar",
        enabled: true,
        settings: {
          buttonText: "অর্ডার করুন",
        },
      },
    ],
  },

  "multi-campaign": {
    id: "template-multi-campaign",
    archetype: "multi-campaign",
    name: "Multi-Campaign Funnel",
    banglaName: "মাল্টি-ক্যাম্পেইন অফার",
    description: "একাধিক কম্বো অফার ও বান্ডেল সেলের জন্য স্পেশাল ডিল পেজ",
    defaultPreset: "amber-warm",
    sections: [
      {
        id: "sec-announcement",
        type: "announcement_bar",
        enabled: true,
        settings: {
          text: "আজকের স্পেশাল অফার: ২ বা ততোধিক অর্ডারে বিশেষ ডিসকাউন্ট!",
          badge: "মেগা ডিল",
          highlightEmoji: "🎁",
        },
      },
      {
        id: "sec-header",
        type: "header",
        enabled: true,
        settings: {
          showLogo: true,
          showPhoneCall: true,
        },
      },
      {
        id: "sec-hero",
        type: "hero_product",
        enabled: true,
        settings: {
          showRatingBadge: true,
          ratingScore: "৪.৯/৫",
          showStockBadge: true,
          stockText: "স্টক সীমিত",
          showDiscountBadge: true,
          discountText: "কম্বো অফার",
          primaryCtaText: "অফারে অর্ডার করতে এখানে ক্লিক করুন 🛒",
        },
      },
      {
        id: "sec-features",
        type: "features_list",
        enabled: true,
        settings: {
          title: "প্যাকেজের সাথে যা যা পাচ্ছেন",
        },
      },
      {
        id: "sec-faq",
        type: "faq_accordion",
        enabled: true,
        settings: {
          title: "সাধারণ কিছু প্রশ্নোত্তর (FAQ)",
        },
      },
      {
        id: "sec-trust",
        type: "trust_badges",
        enabled: true,
        settings: {
          badges: [
            { icon: "truck", title: "ফ্রি হোম ডেলিভারি", desc: "কম্বো অর্ডারে" },
            { icon: "shield", title: "ক্যাশ অন ডেলিভারি", desc: "পণ্য দেখে পেমেন্ট" },
            { icon: "refresh", title: "সহজ রিটার্ন পলিসি", desc: "নিশ্চিন্ত কেনাকাটা" },
          ],
        },
      },
      {
        id: "sec-checkout",
        type: "inline_checkout",
        enabled: true,
        settings: {
          title: "আপনার ডেলিভারি তথ্য দিন",
        },
      },
      {
        id: "sec-sticky-bottom",
        type: "sticky_bottom_bar",
        enabled: true,
        settings: {
          buttonText: "অর্ডার করুন",
        },
      },
    ],
  },
};
