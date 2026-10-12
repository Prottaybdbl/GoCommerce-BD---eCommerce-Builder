import { test, describe } from "node:test";
import assert from "node:assert";
import {
  bdPhoneSchema,
  poishaToBdt,
  bdtToPoisha,
  formatBdt,
  formatOrderToSteadfastCsvRow,
  generateWhatsappRecoveryUrl,
  checkoutOrderSchema,
} from "../src/index.js";

describe("GoCom Bangladesh Contracts & Validation", () => {
  test("BD Phone Schema: validates and normalizes 11-digit mobile numbers", () => {
    // Valid numbers from GP, Robi, Banglalink, Teletalk
    assert.strictEqual(bdPhoneSchema.parse("01711223344"), "+8801711223344");
    assert.strictEqual(bdPhoneSchema.parse("+8801812345678"), "+8801812345678");
    assert.strictEqual(bdPhoneSchema.parse("01999-887766"), "+8801999887766");
    assert.strictEqual(bdPhoneSchema.parse(" 01300112233 "), "+8801300112233");

    // Invalid numbers
    assert.throws(() => bdPhoneSchema.parse("01234567890")); // 012 is invalid operator
    assert.throws(() => bdPhoneSchema.parse("0171122334")); // 10 digits (too short)
    assert.throws(() => bdPhoneSchema.parse("017112233445")); // 12 digits (too long)
    assert.throws(() => bdPhoneSchema.parse("abcdefghijk"));
  });

  test("BD Phone Schema: converts Bangla digits (০-৯) to canonical E.164 ASCII format", () => {
    assert.strictEqual(bdPhoneSchema.parse("০১৭১১২২৩৩৪৪"), "+8801711223344");
    assert.strictEqual(bdPhoneSchema.parse("+৮৮০১৮১২৩৪৫৬৭৮"), "+8801812345678");
    assert.strictEqual(bdPhoneSchema.parse("০১৯৯৯-৮৮৭৭৬৬"), "+8801999887766");
  });

  test("Poisha & BDT Conversion: handles exact monetary amounts", () => {
    assert.strictEqual(poishaToBdt(105000), 1050);
    assert.strictEqual(bdtToPoisha(1050), 105000);
    assert.strictEqual(formatBdt(105000), "৳1,050");
    assert.strictEqual(formatBdt(6000), "৳60");
    assert.strictEqual(formatBdt(12000), "৳120");
  });

  test("Steadfast CSV Generator: strips +88 and formats columns for portal upload", () => {
    const csvRow = formatOrderToSteadfastCsvRow({
      orderNumber: 1001,
      customerName: "Md. Rafiqul Islam",
      phone: "+8801711223344",
      deliveryAddress: "House 12, Road 4, Mirpur-2",
      deliveryDistrict: "Dhaka",
      totalAmount: 111000, // ৳1,110
      advanceVerified: false,
      advanceAmount: 0,
      customerNote: "Urgent delivery",
    });

    assert.strictEqual(csvRow.Invoice, "#1001");
    assert.strictEqual(csvRow.Name, "Md. Rafiqul Islam");
    assert.strictEqual(csvRow.Phone, "01711223344"); // Stripped +88 for Steadfast portal
    assert.strictEqual(csvRow.Amount, 1110);
    assert.strictEqual(csvRow.Address, "House 12, Road 4, Mirpur-2, Dhaka");
  });

  test("Steadfast CSV Generator: deducts advance delivery payment if verified", () => {
    const csvRow = formatOrderToSteadfastCsvRow({
      orderNumber: 1002,
      customerName: "Sabbir Hossain",
      phone: "+8801911998877",
      deliveryAddress: "Agrabad",
      deliveryDistrict: "Chattogram",
      totalAmount: 207000, // ৳2,070
      advanceVerified: true, // Advance paid!
      advanceAmount: 12000, // ৳120
    });

    // COD should be ৳2,070 - ৳120 = ৳1,950
    assert.strictEqual(csvRow.Amount, 1950);
  });

  test("1-Click WhatsApp Recovery URL: generates valid wa.me link with encoded Bangla message", () => {
    const url = generateWhatsappRecoveryUrl({
      phone: "+8801755667788",
      customerName: "ফারজানা আক্তার",
      productTitles: ["স্মার্ট ফুড চপার"],
      storeName: "গৃহগ্যাজেট",
    });

    assert.ok(url.startsWith("https://wa.me/8801755667788?text="));
    assert.ok(url.includes("%E0%A6%86%E0%A6%B8%E0%A6%B8%E0%A6%BE%E0%A6%B2%E0%A6%BE%E0%A6%AE%E0%A7%81")); // Assalamu alaikum in URL encoding
  });

  test("Checkout Order Schema: enforces mandatory fields for COD", () => {
    const validData = {
      customerName: "তানভীর আহমেদ",
      phone: "01711223344",
      deliveryZone: "inside_dhaka",
      deliveryDistrict: "Dhaka",
      deliveryAddress: "ধানমন্ডি ৩২, বাড়ি ৫",
      items: [
        {
          productId: "11111111-1111-1111-1111-111111111111",
          variantId: "22222222-2222-2222-2222-222222222222",
          quantity: 2,
        },
      ],
    };

    const parsed = checkoutOrderSchema.parse(validData);
    assert.strictEqual(parsed.customerName, "তানভীর আহমেদ");
    assert.strictEqual(parsed.phone, "+8801711223344");
    assert.strictEqual(parsed.items.length, 1);
    assert.strictEqual(parsed.items[0]?.quantity, 2);
  });
});
