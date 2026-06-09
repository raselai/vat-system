/**
 * Bilingual string dictionary (English + Bangla) for the owner-friendly surfaces:
 * navigation, Simple Home, the setup wizard, in-app help, and plain-language tooltips.
 *
 * Scope note: this intentionally covers only the NEW owner-facing surfaces + nav labels +
 * tooltips. Existing detailed screens are not yet fully translated (future phase).
 *
 * Usage: const { t } = useLang();  t('nav.invoices')
 */

export type Lang = 'en' | 'bn';

// Every key must exist in both `en` and `bn`. The `StringKey` type is derived from `en`.
const en = {
  // ── Language switch ──
  'lang.english': 'English',
  'lang.bangla': 'বাংলা',
  'lang.toggleHint': 'Change language',

  // ── Nav: group headers ──
  'nav.group.home': 'Home',
  'nav.group.daily': 'Day-to-Day',
  'nav.group.money': 'Money In / Out',
  'nav.group.taxes': 'Taxes & Filing',
  'nav.group.insights': 'Insights',
  'nav.group.setup': 'Setup',

  // ── Nav: items (plain-language primary labels) ──
  'nav.home': 'Home',
  'nav.overview': 'Overview',
  'nav.invoices': 'Sales & Purchases',
  'nav.customers': 'Customers & Suppliers',
  'nav.products': 'Products & Services',
  'nav.ar': 'Money Owed to Me',
  'nav.ap': 'Money I Owe',
  'nav.vds': 'VAT Deducted at Source',
  'nav.deposits': 'Treasury Deposits',
  'nav.salesRegister': 'Sales Register',
  'nav.purchaseRegister': 'Purchase Register',
  'nav.returns': 'File Monthly VAT',
  'nav.tdsDeductions': 'Income-Tax Deductions',
  'nav.tdsPayments': 'Income-Tax Payments',
  'nav.incomeTax': 'My Income Tax',
  'nav.reports': 'Reports',
  'nav.audit': 'Activity Log',
  'nav.business': 'Business Setup',
  'nav.importExport': 'Import / Export',
  'nav.settings': 'Settings',
  'nav.newInvoice': 'New Invoice',
  'nav.logout': 'Log Out',

  // ── Header / help ──
  'header.search': 'Search records...',
  'help.title': 'Help & Guide',
  'help.subtitle': 'Plain-language explanations for every part of the app',
  'help.search': 'Search help...',
  'help.glossary': 'Key Terms',
  'help.modules': 'How each screen works',
  'help.open': 'Help',
  'help.whatIsThis': 'What is this page?',
  'help.gotIt': 'Got it',

  // ── Simple Home ──
  'home.eyebrow': 'Welcome',
  'home.greeting': 'What would you like to do?',
  'home.sub': 'Pick a task below — we will guide you through it.',
  'home.thisMonth': 'This month, in plain words',
  'home.collected': 'VAT you collected from sales',
  'home.collectedSub': 'Output VAT',
  'home.paid': 'VAT you already paid on purchases',
  'home.paidSub': 'Input VAT credit',
  'home.owe': 'What you send to NBR',
  'home.oweSub': 'Net VAT payable',
  'home.deadline': 'Filing deadline',
  'home.daysLeft': 'days left',
  'home.dueToday': 'due today',
  'home.overdue': 'overdue',

  // Home task cards
  'task.recordSale': 'Record a Sale',
  'task.recordSaleSub': 'You sold something — make an invoice',
  'task.recordPurchase': 'Record a Purchase / Expense',
  'task.recordPurchaseSub': 'You bought something for the business',
  'task.customersOwe': 'See what customers owe me',
  'task.customersOweSub': 'Unpaid sales, by customer',
  'task.iOwe': 'See what I owe suppliers',
  'task.iOweSub': 'Unpaid purchases, by supplier',
  'task.taxThisMonth': 'How much tax do I owe this month?',
  'task.taxThisMonthSub': 'A simple summary of your VAT',
  'task.fileReturn': 'File my VAT return',
  'task.fileReturnSub': 'Prepare the monthly Musak 9.1',

  // ── Setup Wizard ──
  'wizard.skip': 'Skip for now',
  'wizard.next': 'Continue',
  'wizard.back': 'Back',
  'wizard.finish': 'Finish',
  'wizard.step.welcome': 'Welcome',
  'wizard.step.business': 'Your Business',
  'wizard.step.product': 'First Product',
  'wizard.step.done': 'Done',

  'wizard.welcome.title': 'Welcome to your VAT assistant',
  'wizard.welcome.body': 'This app keeps your Bangladesh VAT in order — record what you sell and buy, and we work out what you owe NBR each month. Let us set you up in a few quick steps.',
  'wizard.welcome.cta': "Let's get started",

  'wizard.business.title': 'Tell us about your business',
  'wizard.business.body': 'This information appears on your official invoices (challans).',
  'wizard.business.created': 'Business saved',

  'wizard.product.title': 'Add your first product or service',
  'wizard.product.body': 'This is something you sell. You can add more later.',
  'wizard.product.created': 'Product added',
  'wizard.product.skipNote': 'No problem — you can add products any time from the Products screen.',

  'wizard.done.title': "You're all set!",
  'wizard.done.body': 'Your business is ready. From the Home screen you can record your first sale whenever you like.',
  'wizard.done.cta': 'Go to Home',

  // ── Common ──
  'common.bin': 'BIN (VAT registration number)',
  'common.required': 'This field is required',
} as const;

export type StringKey = keyof typeof en;

const bn: Record<StringKey, string> = {
  'lang.english': 'English',
  'lang.bangla': 'বাংলা',
  'lang.toggleHint': 'ভাষা পরিবর্তন করুন',

  'nav.group.home': 'হোম',
  'nav.group.daily': 'প্রতিদিনের কাজ',
  'nav.group.money': 'টাকা আসা / যাওয়া',
  'nav.group.taxes': 'কর ও দাখিল',
  'nav.group.insights': 'বিশ্লেষণ',
  'nav.group.setup': 'সেটআপ',

  'nav.home': 'হোম',
  'nav.overview': 'সারসংক্ষেপ',
  'nav.invoices': 'বিক্রয় ও ক্রয়',
  'nav.customers': 'ক্রেতা ও সরবরাহকারী',
  'nav.products': 'পণ্য ও সেবা',
  'nav.ar': 'আমার পাওনা টাকা',
  'nav.ap': 'আমার দেনা টাকা',
  'nav.vds': 'উৎসে কর্তিত ভ্যাট (VDS)',
  'nav.deposits': 'ট্রেজারি জমা',
  'nav.salesRegister': 'বিক্রয় রেজিস্টার',
  'nav.purchaseRegister': 'ক্রয় রেজিস্টার',
  'nav.returns': 'মাসিক ভ্যাট দাখিল',
  'nav.tdsDeductions': 'আয়কর কর্তন (TDS)',
  'nav.tdsPayments': 'আয়কর পরিশোধ',
  'nav.incomeTax': 'আমার আয়কর',
  'nav.reports': 'রিপোর্ট',
  'nav.audit': 'কার্যক্রমের তালিকা',
  'nav.business': 'ব্যবসা সেটআপ',
  'nav.importExport': 'ইমপোর্ট / এক্সপোর্ট',
  'nav.settings': 'সেটিংস',
  'nav.newInvoice': 'নতুন চালান',
  'nav.logout': 'লগ আউট',

  'header.search': 'রেকর্ড খুঁজুন...',
  'help.title': 'সহায়িকা ও গাইড',
  'help.subtitle': 'অ্যাপের প্রতিটি অংশের সহজ ব্যাখ্যা',
  'help.search': 'সহায়িকা খুঁজুন...',
  'help.glossary': 'গুরুত্বপূর্ণ শব্দ',
  'help.modules': 'প্রতিটি স্ক্রিন যেভাবে কাজ করে',
  'help.open': 'সহায়িকা',
  'help.whatIsThis': 'এই পেজটি কী?',
  'help.gotIt': 'বুঝেছি',

  'home.eyebrow': 'স্বাগতম',
  'home.greeting': 'আপনি কী করতে চান?',
  'home.sub': 'নিচে একটি কাজ বেছে নিন — আমরা ধাপে ধাপে সাহায্য করব।',
  'home.thisMonth': 'এই মাসের হিসাব, সহজ ভাষায়',
  'home.collected': 'বিক্রয় থেকে আপনি যে ভ্যাট আদায় করেছেন',
  'home.collectedSub': 'আউটপুট ভ্যাট',
  'home.paid': 'ক্রয়ের সময় আপনি যে ভ্যাট পরিশোধ করেছেন',
  'home.paidSub': 'ইনপুট ভ্যাট ক্রেডিট',
  'home.owe': 'আপনি এনবিআরকে যা দেবেন',
  'home.oweSub': 'নিট প্রদেয় ভ্যাট',
  'home.deadline': 'দাখিলের শেষ তারিখ',
  'home.daysLeft': 'দিন বাকি',
  'home.dueToday': 'আজই শেষ দিন',
  'home.overdue': 'সময় পেরিয়ে গেছে',

  'task.recordSale': 'একটি বিক্রয় লিপিবদ্ধ করুন',
  'task.recordSaleSub': 'আপনি কিছু বিক্রি করেছেন — চালান তৈরি করুন',
  'task.recordPurchase': 'একটি ক্রয় / খরচ লিপিবদ্ধ করুন',
  'task.recordPurchaseSub': 'ব্যবসার জন্য আপনি কিছু কিনেছেন',
  'task.customersOwe': 'ক্রেতারা আমাকে কত টাকা দেবে দেখুন',
  'task.customersOweSub': 'ক্রেতা অনুযায়ী বকেয়া বিক্রয়',
  'task.iOwe': 'সরবরাহকারীদের আমি কত দেব দেখুন',
  'task.iOweSub': 'সরবরাহকারী অনুযায়ী বকেয়া ক্রয়',
  'task.taxThisMonth': 'এই মাসে আমার কত কর দিতে হবে?',
  'task.taxThisMonthSub': 'আপনার ভ্যাটের সহজ সারসংক্ষেপ',
  'task.fileReturn': 'আমার ভ্যাট রিটার্ন দাখিল করুন',
  'task.fileReturnSub': 'মাসিক মূসক ৯.১ প্রস্তুত করুন',

  'wizard.skip': 'এখন থাক',
  'wizard.next': 'এগিয়ে যান',
  'wizard.back': 'পেছনে',
  'wizard.finish': 'সম্পন্ন করুন',
  'wizard.step.welcome': 'স্বাগতম',
  'wizard.step.business': 'আপনার ব্যবসা',
  'wizard.step.product': 'প্রথম পণ্য',
  'wizard.step.done': 'সম্পন্ন',

  'wizard.welcome.title': 'আপনার ভ্যাট সহকারীতে স্বাগতম',
  'wizard.welcome.body': 'এই অ্যাপ আপনার বাংলাদেশ ভ্যাট ঠিক রাখে — আপনি যা বিক্রি ও ক্রয় করেন তা লিপিবদ্ধ করুন, আর আমরা প্রতি মাসে এনবিআরকে কত দিতে হবে তা হিসাব করে দেব। চলুন কয়েকটি দ্রুত ধাপে সেট আপ করি।',
  'wizard.welcome.cta': 'চলুন শুরু করি',

  'wizard.business.title': 'আপনার ব্যবসা সম্পর্কে বলুন',
  'wizard.business.body': 'এই তথ্য আপনার অফিসিয়াল চালানে দেখা যাবে।',
  'wizard.business.created': 'ব্যবসা সংরক্ষিত হয়েছে',

  'wizard.product.title': 'আপনার প্রথম পণ্য বা সেবা যোগ করুন',
  'wizard.product.body': 'এটি এমন কিছু যা আপনি বিক্রি করেন। পরে আরও যোগ করতে পারবেন।',
  'wizard.product.created': 'পণ্য যোগ হয়েছে',
  'wizard.product.skipNote': 'কোনো সমস্যা নেই — পণ্য স্ক্রিন থেকে যেকোনো সময় পণ্য যোগ করতে পারবেন।',

  'wizard.done.title': 'সব প্রস্তুত!',
  'wizard.done.body': 'আপনার ব্যবসা প্রস্তুত। হোম স্ক্রিন থেকে যেকোনো সময় প্রথম বিক্রয় লিপিবদ্ধ করতে পারবেন।',
  'wizard.done.cta': 'হোমে যান',

  'common.bin': 'বিআইএন (ভ্যাট নিবন্ধন নম্বর)',
  'common.required': 'এই ঘরটি পূরণ করা আবশ্যক',
};

export const strings: Record<Lang, Record<StringKey, string>> = { en, bn };
