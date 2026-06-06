/**
 * In-app help content (bilingual), ported from GUIDE.md Parts 1 & 3.
 * Rendered by HelpDrawer. Keep plain-language — this is for non-expert business owners.
 */

export interface BilingualText {
  en: string;
  bn: string;
}

export interface GlossaryEntry {
  term: string;            // shown as-is (the jargon itself, e.g. "BIN")
  meaning: BilingualText;  // plain-language explanation
}

export interface ModuleHelp {
  id: string;
  icon: string;
  title: BilingualText;
  what: BilingualText;     // what this screen is / why it matters
  how: BilingualText;      // how to use it
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: 'BIN',
    meaning: {
      en: 'Business Identification Number — a 13-digit tax ID that NBR issues to every registered business. Like a national ID, but for your company.',
      bn: 'বিজনেস আইডেন্টিফিকেশন নম্বর — এনবিআর প্রতিটি নিবন্ধিত ব্যবসাকে ১৩-সংখ্যার যে কর আইডি দেয়। এটি আপনার কোম্পানির জাতীয় পরিচয়পত্রের মতো।',
    },
  },
  {
    term: 'Challan (Musak 6.3)',
    meaning: {
      en: 'The official tax invoice you issue for every sale or purchase. It is your proof of the VAT collected.',
      bn: 'প্রতিটি বিক্রয় বা ক্রয়ের জন্য আপনি যে অফিসিয়াল কর চালান ইস্যু করেন। এটি আদায়কৃত ভ্যাটের প্রমাণ।',
    },
  },
  {
    term: 'Output VAT',
    meaning: {
      en: 'The VAT you collected from your customers on sales. This is money you owe to the government.',
      bn: 'বিক্রয়ের সময় ক্রেতাদের কাছ থেকে আপনি যে ভ্যাট আদায় করেছেন। এটি সরকারকে আপনার দেয় টাকা।',
    },
  },
  {
    term: 'Input VAT (Input Credit)',
    meaning: {
      en: 'The VAT you already paid to your suppliers on purchases. You can subtract this from what you owe.',
      bn: 'ক্রয়ের সময় সরবরাহকারীদের আপনি যে ভ্যাট পরিশোধ করেছেন। আপনার দেয় টাকা থেকে এটি বাদ দিতে পারবেন।',
    },
  },
  {
    term: 'Net VAT Payable',
    meaning: {
      en: 'Output VAT minus Input VAT — the actual amount you send to the government this month.',
      bn: 'আউটপুট ভ্যাট থেকে ইনপুট ভ্যাট বাদ — এই মাসে আপনি সরকারকে আসলে যত টাকা পাঠাবেন।',
    },
  },
  {
    term: 'VDS (Musak 6.6)',
    meaning: {
      en: 'VAT Deduction at Source. Some buyers (banks, government bodies, NGOs, large companies) are required by law to withhold part of your VAT and deposit it to the treasury themselves.',
      bn: 'উৎসে ভ্যাট কর্তন। কিছু ক্রেতা (ব্যাংক, সরকারি সংস্থা, এনজিও, বড় কোম্পানি) আইন অনুযায়ী আপনার ভ্যাটের একটি অংশ কেটে নিজেই ট্রেজারিতে জমা দিতে বাধ্য।',
    },
  },
  {
    term: 'TDS',
    meaning: {
      en: 'Tax Deducted at Source — the income-tax equivalent of VDS. Uses a 12-digit TIN (not the 13-digit BIN).',
      bn: 'উৎসে কর্তিত কর — ভিডিএস-এর আয়কর সংস্করণ। এটি ১২-সংখ্যার টিআইএন ব্যবহার করে (১৩-সংখ্যার বিআইএন নয়)।',
    },
  },
  {
    term: 'Fiscal Year',
    meaning: {
      en: 'Bangladesh VAT runs July 1 to June 30 — not January to December. "FY 2025-2026" means July 2025 to June 2026.',
      bn: 'বাংলাদেশের ভ্যাট হিসাব জুলাই ১ থেকে জুন ৩০ পর্যন্ত চলে — জানুয়ারি থেকে ডিসেম্বর নয়। "অর্থবছর ২০২৫-২০২৬" মানে জুলাই ২০২৫ থেকে জুন ২০২৬।',
    },
  },
  {
    term: 'Musak 9.1',
    meaning: {
      en: 'The monthly VAT return — the summary form you file with NBR by the 15th of every month.',
      bn: 'মাসিক ভ্যাট রিটার্ন — প্রতি মাসের ১৫ তারিখের মধ্যে এনবিআরে দাখিল করা সারসংক্ষেপ ফর্ম।',
    },
  },
  {
    term: 'SD (Supplementary Duty)',
    meaning: {
      en: 'An extra tax on certain goods (like tobacco or luxury items), added on top of VAT.',
      bn: 'কিছু পণ্যের (যেমন তামাক বা বিলাসদ্রব্য) উপর অতিরিক্ত কর, ভ্যাটের সাথে যোগ হয়।',
    },
  },
];

export const MODULES: ModuleHelp[] = [
  {
    id: 'invoices',
    icon: 'receipt_long',
    title: { en: 'Sales & Purchases (Invoices)', bn: 'বিক্রয় ও ক্রয় (চালান)' },
    what: {
      en: 'Every time you sell or buy something for the business, you record it here as a challan (Musak 6.3). This is the heart of the app — the VAT is calculated automatically.',
      bn: 'প্রতিবার ব্যবসার জন্য কিছু বিক্রি বা কেনার সময় এখানে চালান (মূসক ৬.৩) হিসেবে লিপিবদ্ধ করুন। এটিই অ্যাপের প্রাণ — ভ্যাট স্বয়ংক্রিয়ভাবে হিসাব হয়।',
    },
    how: {
      en: 'Click "Record a Sale" or "Record a Purchase", pick the customer/supplier and product, enter the quantity, and save. The VAT is worked out for you.',
      bn: '"একটি বিক্রয় লিপিবদ্ধ করুন" বা "একটি ক্রয় লিপিবদ্ধ করুন"-এ ক্লিক করুন, ক্রেতা/সরবরাহকারী ও পণ্য বেছে নিন, পরিমাণ দিন, সংরক্ষণ করুন। ভ্যাট আপনার জন্য হিসাব হয়ে যাবে।',
    },
  },
  {
    id: 'products',
    icon: 'inventory_2',
    title: { en: 'Products & Services', bn: 'পণ্য ও সেবা' },
    what: {
      en: 'Your list of things you sell, each with its VAT rate. Set this up once so every invoice fills in the right tax automatically.',
      bn: 'আপনি যা বিক্রি করেন তার তালিকা, প্রতিটির ভ্যাট হার সহ। একবার সেট করুন যাতে প্রতিটি চালানে সঠিক কর স্বয়ংক্রিয়ভাবে বসে।',
    },
    how: {
      en: 'Add each product with its name, unit, price and VAT rate. You only do this once per item.',
      bn: 'প্রতিটি পণ্য তার নাম, একক, দাম ও ভ্যাট হার সহ যোগ করুন। প্রতিটি আইটেমের জন্য একবারই করতে হয়।',
    },
  },
  {
    id: 'customers',
    icon: 'group',
    title: { en: 'Customers & Suppliers', bn: 'ক্রেতা ও সরবরাহকারী' },
    what: {
      en: 'The businesses and people you sell to (customers) and buy from (suppliers). Saved once, then reused on every invoice.',
      bn: 'আপনি যাদের কাছে বিক্রি করেন (ক্রেতা) এবং যাদের কাছ থেকে কেনেন (সরবরাহকারী)। একবার সংরক্ষণ করুন, প্রতিটি চালানে পুনরায় ব্যবহার হবে।',
    },
    how: {
      en: 'Add a name, and their BIN if they have one. That is enough to start invoicing them.',
      bn: 'একটি নাম যোগ করুন, এবং থাকলে তাদের বিআইএন। চালান শুরু করার জন্য এটুকুই যথেষ্ট।',
    },
  },
  {
    id: 'money',
    icon: 'payments',
    title: { en: 'Money Owed (Receivables & Payables)', bn: 'বকেয়া টাকা (পাওনা ও দেনা)' },
    what: {
      en: '"Money Owed to Me" shows unpaid sales (customers who still owe you). "Money I Owe" shows unpaid purchases (suppliers you still owe). Both are grouped by how overdue they are.',
      bn: '"আমার পাওনা টাকা" দেখায় অপরিশোধিত বিক্রয় (যেসব ক্রেতা এখনো দেবে)। "আমার দেনা টাকা" দেখায় অপরিশোধিত ক্রয় (যেসব সরবরাহকারীকে এখনো দিতে হবে)। দুটোই কত দিন বকেয়া সে অনুযায়ী সাজানো।',
    },
    how: {
      en: 'Open an invoice and click "Record Payment" each time money changes hands. The outstanding balance updates automatically.',
      bn: 'একটি চালান খুলুন এবং প্রতিবার টাকা লেনদেন হলে "পেমেন্ট লিপিবদ্ধ করুন"-এ ক্লিক করুন। বকেয়া স্বয়ংক্রিয়ভাবে হালনাগাদ হবে।',
    },
  },
  {
    id: 'vds',
    icon: 'verified',
    title: { en: 'VAT Deducted at Source (VDS)', bn: 'উৎসে কর্তিত ভ্যাট (VDS)' },
    what: {
      en: 'When a big buyer (bank, government, NGO) withholds part of your VAT and pays it to the treasury directly, you record a VDS certificate (Musak 6.6) here. It becomes a credit on your return.',
      bn: 'যখন একজন বড় ক্রেতা (ব্যাংক, সরকার, এনজিও) আপনার ভ্যাটের একটি অংশ কেটে সরাসরি ট্রেজারিতে জমা দেয়, তখন এখানে একটি ভিডিএস সনদ (মূসক ৬.৬) লিপিবদ্ধ করুন। এটি আপনার রিটার্নে ক্রেডিট হিসেবে গণ্য হয়।',
    },
    how: {
      en: 'Create the certificate, finalize it, then record the treasury deposit. Only finalized certificates count toward your return.',
      bn: 'সনদ তৈরি করুন, চূড়ান্ত করুন, তারপর ট্রেজারি জমা লিপিবদ্ধ করুন। শুধু চূড়ান্ত সনদ রিটার্নে গণ্য হয়।',
    },
  },
  {
    id: 'returns',
    icon: 'assignment_turned_in',
    title: { en: 'File Monthly VAT (Musak 9.1)', bn: 'মাসিক ভ্যাট দাখিল (মূসক ৯.১)' },
    what: {
      en: 'Once a month, the app totals everything and prepares your VAT return. You review it, then file it on the NBR website (vat.gov.bd) by the 15th.',
      bn: 'মাসে একবার অ্যাপ সবকিছুর যোগফল করে আপনার ভ্যাট রিটার্ন প্রস্তুত করে। আপনি পর্যালোচনা করে ১৫ তারিখের মধ্যে এনবিআর ওয়েবসাইটে (vat.gov.bd) দাখিল করুন।',
    },
    how: {
      en: 'Click "Generate Return", review the numbers, then download the filing guide PDF to enter them on the NBR portal. Deposit any tax owed before filing.',
      bn: '"রিটার্ন তৈরি করুন"-এ ক্লিক করুন, সংখ্যাগুলো পর্যালোচনা করুন, তারপর ফাইলিং গাইড পিডিএফ ডাউনলোড করে এনবিআর পোর্টালে বসান। দাখিলের আগে দেয় কর জমা দিন।',
    },
  },
];
