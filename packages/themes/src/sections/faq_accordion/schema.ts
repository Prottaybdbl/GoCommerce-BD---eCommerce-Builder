import { z, ui } from "../../schema-kit.js";

export const faqItemSchema = z.object({
  question: z
    .string()
    .max(200)
    .meta(ui({ control: "text", label: "Question", banglaLabel: "প্রশ্ন" })),
  answer: z
    .string()
    .max(1000)
    .meta(ui({ control: "textarea", label: "Answer", banglaLabel: "উত্তর" })),
});

export const schema = z.object({
  title: z
    .string()
    .max(120)
    .default("সাধারণ জিজ্ঞাসা (FAQ)")
    .meta(ui({ control: "text", label: "Section title", banglaLabel: "শিরোনাম", group: "Content", order: 1 })),

  items: z
    .array(faqItemSchema)
    .default([
      {
        question: "ডেলিভারি চার্জ কত এবং কত দিনের মধ্যে পাবো?",
        answer: "ঢাকার ভেতরে সাধারণত ২৪-৪৮ ঘণ্টার মধ্যে এবং ঢাকার বাইরে ২-৩ কার্যদিবসের মধ্যে ডেলিভারি সম্পন্ন হয়। বর্তমানে ডেলিভারি চার্জ সম্পূর্ণ ফ্রি!",
      },
      {
        question: "আমি কি প্রোডাক্ট হাতে পেয়ে চেক করে পেমেন্ট করতে পারবো?",
        answer: "হ্যাঁ, অবশ্যই! ডেলিভারি ম্যানের সামনে প্যাকেট খুলে পণ্য যাচাই করে সম্পূর্ণ মূল্য পরিশোধ করবেন।",
      },
      {
        question: "প্রোডাক্টে সমস্যা থাকলে রিটার্ন বা রিপ্লেসমেন্ট সুবিধা আছে কি?",
        answer: "কোনো ডিফেক্ট বা ত্রুটি থাকলে ৭ দিনের মধ্যে কোনো ঝামেলা ছাড়াই ফ্রি রিপ্লেসমেন্ট অথবা রিফান্ড পাবেন।",
      },
    ])
    .meta(
      ui({
        control: "repeater",
        label: "FAQ Items",
        banglaLabel: "প্রশ্নোত্তর তালিকা",
        group: "Content",
        order: 2,
        minItems: 1,
        maxItems: 12,
      })
    ),
});

export type Settings = z.infer<typeof schema>;
export type FaqItem = z.infer<typeof faqItemSchema>;
