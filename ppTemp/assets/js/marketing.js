(function () {
    'use strict';

    /* ── Internationalization (i18n) & Language Switcher ───── */
    var TRANSLATIONS = {
        en: {
            navHome: "Home",
            navFeatures: "Features",
            navPricing: "Pricing",
            navDownloads: "Downloads",
            navAbout: "About",
            navContact: "Contact Us",
            navLogIn: "Log In",
            navCreateStore: "Create Your Store",

            heroEyebrow: '<i class="ri-shining-2-fill"></i> No. 1 Online business partner',
            heroTitle: 'One Platform <span class="accent">Thousands of Success Stories</span>',
            heroSub: 'More than <strong>100,000 entrepreneurs</strong> trust GoCommerce<br>Transform your idea into an online business — fast and easy',
            heroStartFree: "Start for Free",
            heroNote: "(No credit card needed. No hidden fees.)",

            slideTrackTitle: "Unlimited Server-Side Tracking",
            slideTrackSub: "Bypass browser limitations straight from server — 100% accurate tracking",
            slideTrackWeb: "Website",
            slideTrackServer: "Server",
            slideTrackAdPlatform: "Ad Platforms",
            slideTrackEventText: "Events Tracked",
            slideTrackAdBlock: "Ad-blocker Proof",

            slideCourierTitle: "1-Click Courier Integration",
            slideCourierSub: "Instantly send parcels to your courier dashboard in a single click",
            slideCourierOrder: "Order #1024 • Dhaka",
            slideCourierSent: "Dispatched — Steadfast",
            slideCourierSendBtn: "Send to Courier",
            slideCourierConnected: "Connected",
            slideCourierActive: "Active",
            slideCourierNote1: "Next-Day Delivery",
            slideCourierNote2: "Express Pickup",
            slideCourierNote3: "Nationwide Delivery",

            slideFakeTitle: "Fake Order Block",
            slideFakeSub: "Automatically detect and block fake and duplicate orders — save delivery costs",
            slideFakeBlocked: "Blocked",
            slideFakeConfirmed: "Confirmed",
            slideFakeScannerTag: "Live Fraud Scanner",
            slideFakeRiskTitle: "Fraud Risk Score",
            slideFakeSigPhone: "Phone Verified",
            slideFakeSigCourier: "Courier Return Check",
            slideFakeSigZone: "Delivery Zone Match",
            slideFakeActive: "Active",
            slideFakeVerified: "Verified",

            slideFraudTitle: "Advanced Fraud Check System",
            slideFraudSub: "Analyze customer previous delivery rate & risk score to ensure 100% safe deliveries",

            slideSpeedTitle: "Instant Blazing-Fast Loading Website",
            slideSpeedSub: "0.4s LCP & 99/100 Google PageSpeed score — double your conversion rate",

            slideBuilderTitle: "Unlimited Landing Page Designs",
            slideBuilderSub: "High-converting ready templates & drag-and-drop builder — no coding needed",

            statMerchantOrders: "Merchant Orders",
            statToday: "Today",
            statThisWeek: "This Week",
            statHappyCustomers: "50k Happy Customers",
            statShopsCreated: "Shops created",
            statOrdersGenerated: "Orders Generated",
            statTodaySell: "Today's Merchant Sell",
            statOnlinePayment: "Online Payment",
            statCashOnDelivery: "Cash on Delivery",
            statWeeklySales: "Weekly Merchant Sales",
            statTotalOrderAmount: "Total Order Amount",
            statNewShop: "New Shop",
            statActiveShop: "Active Shop",
            statLiveActivity: "Live activity",
            statOrder1: "New order #10248",
            statPaid: "Paid",
            statParcel: "Parcel dispatched",
            statInTransit: "In transit",
            statShop: "New shop created",
            statSetup: "Setup",

            marqueeTitle: "100,000+ Stores Built — Yours Could Be Next",

            toolkitTag: "Your Complete Ecommerce Toolkit",
            toolkitHeading: "Manage Shipping, Inventory, Orders, and More From One Platform",
            toolkitSubhead: "Smart tools that make your business smarter",
            toolkitShipTitle: "Shipping Made Simple",
            toolkitShipDesc: "Shipping doesn't have to be complicated. Connect with top delivery services and dispatch parcels in one click.",
            toolkitInvTitle: "Inventory & Order Management",
            toolkitInvDesc: "Forget about stock shortages or overselling. Track inventory in real-time with a low-stock view.",
            toolkitAnalyticsTitle: "Real-Time Analytics & Insights",
            toolkitAnalyticsDesc: "Stay ahead of the game with real-time analytics. Monitor sales, customer behaviour and top products as they happen.",
            toolkitScreenTitle: "Perfect on every screen",
            toolkitScreenDesc: "Your store looks stunning on any device — desktop, tablet, or mobile.",
            toolkitAppTitle: "Manage Your Store Anytime",
            toolkitAppDesc: "Easily build, customize, and manage your store — plus, with our mobile app, from anywhere.",
            toolkitThemeTitle: "Customize Your Store",
            toolkitThemeDesc: "Choose from beautifully crafted themes and personalize every detail of your store.",

            demoTitle: "Explore the Full Demo and Discover What's Possible",
            demoDesc: "Step inside the GoCommerce experience and preview how your store will look, function, and grow — before you even start",
            demoBtn: 'Explore Demo <i class="ri-arrow-right-line"></i>',

            stepsTitle: "Simple Steps to Make Your Website Live",
            stepsDesc: "No need to learn design or development. We have simplified everything so you can build your store confidently, quickly, and without any technical knowledge",
            stepsGetApp: '<i class="ri-google-play-fill"></i> Get App',
            stepsStartFree: "Get started for free",
            step1Num: "Step 01",
            step1Title: "Create an Account",
            step1Desc: "Welcome to GoCommerce! Sign up to launch your online store and access powerful tools to grow your business.",
            step2Num: "Step 02",
            step2Title: "Set Up Your Store",
            step2Desc: "Add your store name, select your country and category to launch in minutes.",
            step3Num: "Step 03",
            step3Title: "Start Your Sales",
            step3Desc: "Start selling by adding your product. Enter product details like name, price, and photos to showcase what you're offering.",

            storiesTitle: "How we transformed their journey",

            pricingTag: "Pricing",
            pricingTitle: "Choose The Plan To Grow Your Business",
            pricingDesc: "No hidden fees. Flexible pricing. Try any plan free for 3 days.",
            billingMonthly: "Monthly",
            billingHalf: '6 Months <em>SAVE 10%</em>',
            billingYearly: 'Yearly <em>SAVE 25%</em>',
            planGetStarted: "Get started →",

            appTitle: "Download the GoCommerce BD app",
            appDesc: "Sign up and begin selling in just a few minutes! Manage orders, stock and payments right from your phone.",
            appBtn: '<i class="ri-android-line"></i> Download for Android',

            faqTitle: "Frequently Asked Questions",

            teamTitle: "The Team Powering GoCommerce",
            teamDesc: "The visionaries behind GoCommerce, shaping the future of e-commerce",
            reachTitle: "Empowering entrepreneurs around the world",
            reachDesc: "Merchants use our platform from Dhaka to Dubai, London to Singapore",
            partnerTitle: "Partner Program",
            partnerDesc: 'Earn up to <b>15% recurring commission</b> for every merchant you bring on board.',
            partnerBtn: "Become A Partner",

            footerDesc: "Everything you need to start, run and grow your online business — store, orders, payments and delivery in one place.",
            footerGeneral: "General",
            footerCompany: "Company",
            footerPartner: "Partner Program",
            footerAddress: "Address",
            footerContactUs: "Contact Us",
            footerTerms: "Terms & Conditions",
            footerPrivacy: "Privacy Policy",
            footerRefund: "Return and Refund Policy",
            footerCopyright: "Copyright © 2022–2026 GoCommerce BD. All rights reserved.",

            // Auth (Modal & Standalone Pages)
            authSubtitleLogin: "Sign in to your store dashboard",
            authSubtitleSignup: "Launch your own online store in 1 minute",
            authTabLogin: "Log In",
            authTabSignup: "Open New Store",
            authEyebrow: '<i class="ri-shining-2-fill"></i> GoCommerce BD Platform',
            authCardTitleLogin: 'Merchant <span class="accent">Log In</span>',
            authCardTitleSignup: 'Create <span class="accent">Online Store</span>',
            authCardDescLogin: "Sign in to your store dashboard to manage sales and orders",
            authCardDescSignup: "Launch your own eCommerce store in 2 minutes without coding",
            authLabelEmail: "Email or Username",
            authPlaceholderEmail: "your@email.com or username",
            authLabelPassword: "Password",
            authPlaceholderPassword: "Enter your password",
            authRememberMe: "Remember me",
            authRememberMeLong: "Remember me (Stay signed in 30 days)",
            authForgotPassword: "Forgot password?",
            authBtnLogin: "Log In to Dashboard",
            authBtnLoginShort: "Log In",
            authDivider: "or continue with",
            authGoogleBtn: "Continue with Google",
            authGoogleDemoBtn: "Sign in with Demo Google Account",
            authGoogleDevText: "Want to test Google authentication in local demo mode?",
            authLabelStoreName: "Store Name",
            authPlaceholderStoreName: "e.g. My Super Shop",
            authLabelSubdomain: "Website Subdomain / Address",
            authSubdomainNote: 'Store link will be: <b style="color:#155dfc;">gocommercebd.online/<span id="slugPreview">axiswear</span></b>',
            authLabelFullName: "Full Name (Owner)",
            authPlaceholderFullName: "e.g. John Doe",
            authLabelPhone: "Mobile Number (11 digits)",
            authLabelSignupEmail: "Email Address",
            authLabelSignupPassword: "Password (Min 8 characters)",
            authPlaceholderSignupPassword: "Strong password with at least 8 characters",
            authTermsAgree: "I agree to GoCommerce BD Terms of Service and Privacy Policy.",
            authBtnCreateStore: "Create Store",
            authBtnCreateStoreLong: "Launch Store — 100% Free",
            authSecurityFoot: "© 2026 GoCommerce BD. All rights reserved.",
            authTrialTag: "15 Days Free Trial",
            authSwitchToSignup: 'Don\'t have a store yet? <a href="/create-store" class="auth-switch-action">Create Free Store <i class="ri-arrow-right-line"></i></a>',
            authSwitchToLogin: 'Already have an account? <a href="/login">Log In</a>',
            authBackHome: '<i class="ri-arrow-left-line"></i> Back to Home Page',
            authCopyright: "© 2026 GoCommerce BD. All rights reserved.",
            langLabel: "Language"
        },
        bn: {
            navHome: "হোম",
            navFeatures: "ফিচারসমূহ",
            navPricing: "প্রাইসিং",
            navDownloads: "ডাউনলোড",
            navAbout: "আমাদের সম্পর্কে",
            navContact: "যোগাযোগ",
            navLogIn: "লগইন",
            navCreateStore: "স্টোর তৈরি করুন",
            langLabel: "ভাষা",

            heroEyebrow: '<i class="ri-shining-2-fill"></i> ১ নম্বর অনলাইন বিজনেস পার্টনার',
            heroTitle: 'একটি প্ল্যাটফর্ম <span class="accent">হাজারো সফলতার গল্প</span>',
            heroSub: '<strong>১,০০,০০০-এর বেশি উদ্যোক্তা</strong> ভরসা রেখেছেন GoCommerce-এ<br>আপনার ভাবনাকে বাস্তবে রূপ দিন — সহজে ও দ্রুততম সময়ে',
            heroStartFree: "ফ্রিতে শুরু করুন",
            heroNote: "(কোনো ক্রেডিট কার্ডের প্রয়োজন নেই। কোনো গোপন চার্জ নেই।)",

            slideTrackTitle: "আনলিমিটেড সার্ভার-সাইড ট্র্যাকিং",
            slideTrackSub: "ব্রাউজার বাইপাস করে সার্ভার থেকেই সব ডেটা — ১০০% নির্ভুল ট্র্যাকিং",
            slideTrackWeb: "ওয়েবসাইট",
            slideTrackServer: "সার্ভার",
            slideTrackAdPlatform: "অ্যাড প্ল্যাটফর্ম",
            slideTrackEventText: "ইভেন্ট ট্র্যাক হয়েছে",
            slideTrackAdBlock: "অ্যাড-ব্লকার প্রুফ",

            slideCourierTitle: "এক ক্লিকেই কুরিয়ার ইন্টিগ্রেশন",
            slideCourierSub: "অর্ডার প্রসেস করার সাথে সাথেই পার্সেল চলে যাবে কুরিয়ার প্যানেলে",
            slideCourierOrder: "অর্ডার #১০২৪ • ঢাকা",
            slideCourierSent: "সেন্ড সম্পন্ন — Steadfast",
            slideCourierSendBtn: "কুরিয়ার পাঠান",
            slideCourierConnected: "কানেক্টেড",
            slideCourierActive: "সক্রিয়",
            slideCourierNote1: "পরবর্তী দিন ডেলিভারি",
            slideCourierNote2: "দ্রুত পিকআপ সুবিধা",
            slideCourierNote3: "দেশজুড়ে ডেলিভারি",

            slideFakeTitle: "ফেক অর্ডার ব্লক",
            slideFakeSub: "ভুয়া ও ডুপ্লিকেট অর্ডার স্বয়ংক্রিয়ভাবে শনাক্ত ও বাতিল — ডেলিভারি খরচ বাঁচান",
            slideFakeBlocked: "ব্লকড",
            slideFakeConfirmed: "কনফার্মড",
            slideFakeScannerTag: "লাইভ ফ্রড স্ক্যানার",
            slideFakeRiskTitle: "ফ্রড রিস্ক স্কোর",
            slideFakeSigPhone: "নম্বর ভ্যালিডেশন",
            slideFakeSigCourier: "কুরিয়ার রিটার্ন চেক",
            slideFakeSigZone: "ডেলিভারি জোন",
            slideFakeActive: "সক্রিয়",
            slideFakeVerified: "যাচাইকৃত",

            slideFraudTitle: "অ্যাডভান্সড ফ্রড চেকিং সিস্টেম",
            slideFraudSub: "কাস্টমারের পূর্বের ডেলিভারি রেট ও ঝুঁকি বিশ্লেষণ করে ১০০% সেফ ডেলিভারি নিশ্চিত করুন",

            slideSpeedTitle: "চোখের পলকেই লোড হবে আপনার ওয়েবসাইট",
            slideSpeedSub: "০.৪ সেকেন্ডে এলসিপি ও ৯৯/১০০ গুগল পেজস্পিড স্কোর — দ্বিগুণ কনভার্শন",

            slideBuilderTitle: "আনলিমিটেড ল্যান্ডিং পেজ ডিজাইন",
            slideBuilderSub: "হাই-কনভার্টিং রেডিমেড টেমপ্লেট ও ড্র্যাগ অ্যান্ড ড্রপ বিল্ডার — কোডিং ছাড়াই",

            statMerchantOrders: "মার্চেন্ট অর্ডার",
            statToday: "আজ",
            statThisWeek: "এই সপ্তাহ",
            statHappyCustomers: "৫০ হাজার সন্তুষ্ট কাস্টমার",
            statShopsCreated: "স্টোর তৈরি হয়েছে",
            statOrdersGenerated: "অর্ডার তৈরি হয়েছে",
            statTodaySell: "আজকের মার্চেন্ট সেল",
            statOnlinePayment: "অনলাইন পেমেন্ট",
            statCashOnDelivery: "ক্যাশ অন ডেলিভারি",
            statWeeklySales: "সাপ্তাহিক মার্চেন্ট বিক্রয়",
            statTotalOrderAmount: "মোট অর্ডারের পরিমাণ",
            statNewShop: "নতুন শপ",
            statActiveShop: "সক্রিয় শপ",
            statLiveActivity: "লাইভ অ্যাক্টিভিটি",
            statOrder1: "নতুন অর্ডার #১০২৪৮",
            statPaid: "পেইড",
            statParcel: "পার্সেল ডিসপ্যাচ",
            statInTransit: "ট্রানজিটে আছে",
            statShop: "নতুন স্টোর তৈরি",
            statSetup: "সেটআপ",

            marqueeTitle: "১,০০,০০০+ স্টোর তৈরি হয়েছে — পরবর্তী স্টোরটি হতে পারে আপনার",

            toolkitTag: "আপনার পূর্ণাঙ্গ ই-কমার্স টুলকিট",
            toolkitHeading: "শিপিং, ইনভেন্টরি ও অর্ডার নিয়ন্ত্রণ করুন একটি প্ল্যাটফর্ম থেকে",
            toolkitSubhead: "স্মার্ট প্রযুক্তি যা আপনার ব্যবসাকে করবে আরো সহজ ও গতিশীল",
            toolkitShipTitle: "সহজ ও দ্রুত শিপিং",
            toolkitShipDesc: "শিপিং এখন আরো সহজ। দেশের শীর্ষ কুরিয়ার সার্ভিসের সাথে এক ক্লিকে পার্সেল বুকিং দিন।",
            toolkitInvTitle: "ইনভেন্টরি ও অর্ডার ব্যবস্থাপনা",
            toolkitInvDesc: "স্টক ঘাটতির দুশ্চিন্তা দূর করুন। রিয়েল-টাইমে ইনভেন্টরি ও লো-স্টক অ্যালার্ট পর্যবেক্ষণ করুন।",
            toolkitAnalyticsTitle: "রিয়েল-টাইম অ্যানালিটিক্স ও ইনসাইটস",
            toolkitAnalyticsDesc: "লাইভ ডেটা দেখে সিদ্ধান্ত নিন। তাৎক্ষণিকভাবে বিক্রয়, ক্রেতার পছন্দ ও টপ প্রোডাক্ট মনিটর করুন।",
            toolkitScreenTitle: "প্রতিটি ডিভাইসে আকর্ষণীয়",
            toolkitScreenDesc: "ডেস্কটপ, ট্যাবলেট বা মোবাইল — প্রতিটি স্ক্রিনেই আপনার শপ দেখাবে প্রিমিয়াম।",
            toolkitAppTitle: "যেকোনো স্থান থেকে নিয়ন্ত্রণ",
            toolkitAppDesc: "সহজে নিজের স্টোর তৈরি করুন এবং মোবাইল অ্যাপ দিয়ে পরিচালনা করুন যেকোনো স্থান থেকে।",
            toolkitThemeTitle: "কাস্টমাইজ করুন ইচ্ছামতো",
            toolkitThemeDesc: "আকর্ষণীয় রেডিমেড থিম থেকে বেছে নিয়ে স্টোরের প্রতিটি অংশ নিজের মতো সাজান।",

            demoTitle: "লাইভ ডেমো দেখে জেনে নিন এর অপার সম্ভাবনা",
            demoDesc: "GoCommerce ব্যবহারের অভিজ্ঞতা নিন এবং দেখে নিন শুরু করার আগেই আপনার স্টোর কেমন দেখাবে",
            demoBtn: 'ডেমো স্টোর দেখুন <i class="ri-arrow-right-line"></i>',

            stepsTitle: "সহজ ৩টি ধাপে ওয়েবসাইট লাইভ করুন",
            stepsDesc: "ডিজাইন বা কোডিং জানার প্রয়োজন নেই। সবকিছু এমনভাবে তৈরি যাতে আপনি সহজে ও দ্রুত শপ চালু করতে পারেন",
            stepsGetApp: '<i class="ri-google-play-fill"></i> মোবাইল অ্যাপ',
            stepsStartFree: "বিনামূল্যে শুরু করুন",
            step1Num: "ধাপ ০১",
            step1Title: "অ্যাকাউন্ট তৈরি করুন",
            step1Desc: "GoCommerce-এ স্বাগতম! ফ্রি সাইন আপ করে আপনার অনলাইন স্টোর চালু করুন এবং ব্যবসার সেরা টুলস ব্যবহার করুন।",
            step2Num: "ধাপ ০২",
            step2Title: "স্টোর সেটআপ করুন",
            step2Desc: "দোকানের নাম, ক্যাটাগরি ও বিবরণ দিয়ে মাত্র কয়েক মিনিটে আপনার স্টোর চালু করুন।",
            step3Num: "ধাপ ০৩",
            step3Title: "বিক্রয় শুরু করুন",
            step3Desc: "পণ্যের নাম, ছবি ও মূল্য যুক্ত করে সাথে সাথে অনলাইনে বিক্রি শুরু করুন।",

            storiesTitle: "উদ্যোক্তাদের সফলতার বাস্তব অভিজ্ঞতা",

            pricingTag: "প্রাইসিং",
            pricingTitle: "আপনার ব্যবসার জন্য সেরা প্ল্যান বেছে নিন",
            pricingDesc: "কোনো গোপন চার্জ নেই। সুবিধাজনক প্ল্যান। ৩ দিন ফ্রি ট্রায়াল নিন।",
            billingMonthly: "মাসিক",
            billingHalf: '৬ মাস <em>১০% ছাড়</em>',
            billingYearly: 'বাৎসরিক <em>২৫% ছাড়</em>',
            planGetStarted: "শুরু করুন →",

            appTitle: "ডাউনলোড করুন GoCommerce BD অ্যাপ",
            appDesc: "কয়েক মিনিটেই সাইন আপ করে বিক্রি শুরু করুন! পকেট থেকেই সামলান অর্ডার, স্টক ও কুরিয়ার।",
            appBtn: '<i class="ri-android-line"></i> অ্যান্ড্রয়েড অ্যাপ ডাউনলোড',

            faqTitle: "সাধারণ জিজ্ঞাসা (FAQ)",

            teamTitle: "GoCommerce-এর পেছনের দক্ষ টিম",
            teamDesc: "ই-কমার্সের ভবিষ্যৎ বিনির্মাণে নিবেদিত আমাদের দক্ষ দল",
            reachTitle: "সারা বিশ্বের উদ্যোক্তাদের এগিয়ে নেওয়ার প্রত্যয়",
            reachDesc: "ঢাকা থেকে দুবাই, লন্ডন থেকে সিঙ্গাপুর — বিশ্বজুড়ে উদ্যোক্তাদের ভরসা",
            partnerTitle: "পার্টনার প্রোগ্রাম",
            partnerDesc: 'প্রতিটি মার্চেন্ট যুক্ত করে আজীবন আয় করুন <b>১৫% পর্যন্ত রিকারিং কমিশন</b>।',
            partnerBtn: "পার্টনার হিসেবে যোগ দিন",

            footerDesc: "অনলাইন ব্যবসা শুরু, পরিচালনা ও বৃদ্ধির জন্য প্রয়োজনীয় সবকিছু — স্টোর, অর্ডার, পেমেন্ট ও ডেলিভারি এক প্ল্যাটফর্মে।",
            footerGeneral: "সাধারণ",
            footerCompany: "কোম্পানি",
            footerPartner: "পার্টনার প্রোগ্রাম",
            footerAddress: "ঠিকানা",
            footerContactUs: "যোগাযোগ",
            footerTerms: "শর্তাবলী",
            footerPrivacy: "প্রাইভেসি পলিসি",
            footerRefund: "রিটার্ন ও রিফান্ড পলিসি",
            footerCopyright: "কপিরাইট © ২০২২–২০২৬ GoCommerce BD. সর্বস্বত্ব সংরক্ষিত।",

            // Auth (Modal & Standalone Pages)
            authSubtitleLogin: "আপনার স্টোর ড্যাশবোর্ডে প্রবেশ করুন",
            authSubtitleSignup: "মাত্র ১ মিনিটে নিজস্ব অনলাইন স্টোর চালু করুন",
            authTabLogin: "লগইন",
            authTabSignup: "নতুন স্টোর খুলুন",
            authEyebrow: '<i class="ri-shining-2-fill"></i> GoCommerce BD Platform',
            authCardTitleLogin: 'মার্চেন্ট <span class="accent">লগইন</span>',
            authCardTitleSignup: 'অনলাইন স্টোর <span class="accent">তৈরি করুন</span>',
            authCardDescLogin: "আপনার স্টোর ড্যাশবোর্ডে প্রবেশ করে বিক্রয় ও অর্ডার পরিচালনা করুন",
            authCardDescSignup: "মাত্র ২ মিনিটে কোনো কোডিং ছাড়াই আপনার নিজস্ব ই-কমার্স শপ চালু করুন",
            authLabelEmail: "ইমেইল বা ইউজারনেম",
            authPlaceholderEmail: "your@email.com বা axiswear",
            authLabelPassword: "পাসওয়ার্ড",
            authPlaceholderPassword: "আপনার পাসওয়ার্ড দিন",
            authRememberMe: "মনে রাখুন",
            authRememberMeLong: "আমাকে মনে রাখুন (৩০ দিন সক্রিয়)",
            authForgotPassword: "পাসওয়ার্ড ভুলে গেছেন?",
            authBtnLogin: "ড্যাশবোর্ডে লগইন করুন",
            authBtnLoginShort: "লগইন করুন",
            authDivider: "অথবা Google দিয়ে",
            authGoogleBtn: "Google দিয়ে লগইন করুন",
            authGoogleDemoBtn: "ডেমো গুগল অ্যাকাউন্ট দিয়ে প্রবেশ",
            authGoogleDevText: "লোকাল ডেমো মোডে গুগল অথেনটিকেশন টেস্ট করতে চান?",
            authLabelStoreName: "দোকানের নাম (Store Name)",
            authPlaceholderStoreName: "যেমন: My Super Shop",
            authLabelSubdomain: "ওয়েবসাইট ডোমেন / অ্যাড্রেস",
            authSubdomainNote: 'দোকানের লিংক হবে: <b style="color:#155dfc;">gocommercebd.online/<span id="slugPreview">axiswear</span></b>',
            authLabelFullName: "আপনার পূর্ণ নাম (Full Name)",
            authPlaceholderFullName: "যেমন: তানভীর আহমেদ",
            authLabelPhone: "মোবাইল নম্বর (১১ ডিজিট)",
            authLabelSignupEmail: "ইমেইল অ্যাড্রেস",
            authLabelSignupPassword: "পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)",
            authPlaceholderSignupPassword: "কমপক্ষে ৮ অক্ষরের শক্তিশালী পাসওয়ার্ড",
            authTermsAgree: "GoCommerce BD-এর ব্যবহারের শর্তাবলী এবং গোপনীয়তা নীতি মেনে নিচ্ছি।",
            authBtnCreateStore: "স্টোর তৈরি করুন",
            authBtnCreateStoreLong: "দোকান চালু করুন — সম্পূর্ণ ফ্রি",
            authSecurityFoot: "© 2026 GoCommerce BD. All rights reserved.",
            authTrialTag: "১৫ দিনের ফ্রি ট্রায়াল",
            authSwitchToSignup: 'কোনো অ্যাকাউন্ট নেই? <a href="/create-store" class="auth-switch-action">বিনামূল্যে স্টোর তৈরি করুন <i class="ri-arrow-right-line"></i></a>',
            authSwitchToLogin: 'ইতিমধ্যে অ্যাকাউন্ট আছে? <a href="/login">লগইন করুন</a>',
            authBackHome: '<i class="ri-arrow-left-line"></i> হোম পেজে ফিরে যান',
            authCopyright: "© 2026 GoCommerce BD. সর্বস্বত্ব সংরক্ষিত।"
        }
    };

    function getCurrentLanguage() {
        try {
            var saved = localStorage.getItem('gocom_lang') || localStorage.getItem('gocom_dashboard_lang');
            if (saved === 'bn' || saved === 'en') return saved;
        } catch (e) {}
        return 'en'; // Default is strictly English
    }

    function setLanguage(lang) {
        lang = (lang === 'bn') ? 'bn' : 'en';
        try {
            localStorage.setItem('gocom_lang', lang);
            localStorage.setItem('gocom_dashboard_lang', lang);
        } catch (e) {}

        document.documentElement.lang = lang;
        document.documentElement.setAttribute('data-lang', lang);

        var dict = TRANSLATIONS[lang] || TRANSLATIONS.en;

        // 1. Text elements
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            if (dict[key] !== undefined) {
                el.textContent = dict[key];
            }
        });

        // 2. HTML elements
        document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
            var key = el.getAttribute('data-i18n-html');
            if (dict[key] !== undefined) {
                el.innerHTML = dict[key];
            }
        });

        // 3. Placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
            var key = el.getAttribute('data-i18n-placeholder');
            if (dict[key] !== undefined) {
                el.setAttribute('placeholder', dict[key]);
            }
        });

        // 4. Update switch buttons active states
        document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
            var targetLang = btn.getAttribute('data-lang-btn');
            var isActive = (targetLang === lang);
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        // Dispatch notification
        window.dispatchEvent(new CustomEvent('gocom_lang_changed', { detail: { lang: lang } }));
    }

    // Expose helpers globally
    window.gocomSetLanguage = setLanguage;
    window.gocomGetLanguage = getCurrentLanguage;

    // Delegate language switch button clicks
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-lang-btn]');
        if (!btn) return;
        var lang = btn.getAttribute('data-lang-btn');
        if (lang) {
            setLanguage(lang);
        }
    });

    // Apply language preference immediately
    setLanguage(getCurrentLanguage());
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setLanguage(getCurrentLanguage());
        });
    }

    /* ── Mobile navigation ─────────────────────────────────── */
    var toggle = document.querySelector('[data-nav-toggle]');
    var mobileNav = document.querySelector('[data-mobile-nav]');
    if (toggle && mobileNav) {
        function closeMobileNav() {
            if (mobileNav.classList.contains('open')) {
                mobileNav.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
                var icon = toggle.querySelector('i');
                if (icon) icon.className = 'ri-menu-line';
            }
        }

        toggle.addEventListener('click', function (e) {
            e.stopPropagation();
            var isOpen = mobileNav.classList.toggle('open');
            toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            var icon = toggle.querySelector('i');
            if (icon) {
                icon.className = isOpen ? 'ri-close-line' : 'ri-menu-line';
            }
        });

        // Close on clicking any link inside mobile navigation
        mobileNav.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                closeMobileNav();
            });
        });

        // Close if clicked outside the header
        document.addEventListener('click', function (e) {
            var header = e.target.closest('.site-header');
            if (!header && mobileNav.classList.contains('open')) {
                closeMobileNav();
            }
        });
    }

    /* ── Generic segmented controls (hero range, billing) ──── */
    document.querySelectorAll('[data-seg]').forEach(function (seg) {
        seg.addEventListener('click', function (e) {
            var btn = e.target.closest('button');
            if (!btn) return;
            seg.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            var target = seg.getAttribute('data-seg');
            if (target === 'billing') applyBilling(btn.getAttribute('data-cycle'));
            if (target === 'range') applyRange(btn.getAttribute('data-range'));
        });
    });

    /* ── Pricing: monthly / 6 months (-10%) / yearly (-25%) ── */
    var CYCLES = { monthly: 1, half: 0.9, yearly: 0.75 };
    function applyBilling(cycle) {
        var factor = CYCLES[cycle] || 1;
        document.querySelectorAll('[data-price]').forEach(function (el) {
            var base = parseFloat(el.getAttribute('data-price'));
            var value = base * factor;
            el.textContent = value.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        });
        document.querySelectorAll('[data-price-plain]').forEach(function (el) {
            var base = parseFloat(el.getAttribute('data-price-plain'));
            el.textContent = Math.round(base * factor).toLocaleString('en-US');
        });
    }

    /* ── Dynamic Pricing Packages Hydration ─────────────────── */
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function loadDynamicPackages() {
        var plansContainer = document.querySelector('#pricing .plans');
        if (!plansContainer) return;

        var apiHost = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:3000'
            : '';

        fetch(apiHost + '/api/storefront/packages')
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (data) {
                if (!data || !data.success || !Array.isArray(data.packages) || data.packages.length === 0) return;

                var html = '';
                data.packages.forEach(function (pkg) {
                    var isPopular = Boolean(pkg.isPopular);
                    var priceNum = Number(pkg.priceBdt || 0);
                    var formattedPrice = priceNum.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });

                    var badgeHtml = '';
                    if (pkg.badge) {
                        badgeHtml = '<span class="plan-badge">' + escapeHtml(pkg.badge) + '</span>';
                    } else if (isPopular) {
                        badgeHtml = '<span class="plan-badge">MOST POPULAR</span>';
                    }

                    var featuresHtml = '';
                    if (Array.isArray(pkg.featuresList)) {
                        pkg.featuresList.forEach(function (feat) {
                            featuresHtml += '<li><i class="ri-checkbox-circle-fill"></i><span>' + escapeHtml(feat) + '</span></li>';
                        });
                    }

                    var physicalFee = (pkg.fees && pkg.fees.physical) || '0%';
                    var digitalFee = (pkg.fees && pkg.fees.digital) || '0%';
                    var resellFee = (pkg.fees && pkg.fees.resell) || '0%';

                    var btnClass = isPopular ? 'btn btn-primary btn-block' : 'btn btn-white btn-block';
                    var ctaText = pkg.ctaText || 'Get started &rarr;';
                    var ctaLink = pkg.ctaLink || '#pricing';

                    html += '<div class="plan ' + (isPopular ? 'popular ' : '') + 'reveal visible">' +
                        badgeHtml +
                        '<h3>' + escapeHtml(pkg.name) + '</h3>' +
                        '<p class="plan-desc">' + escapeHtml(pkg.description || '') + '</p>' +
                        '<div class="price">' +
                            '<span class="cur">৳</span>' +
                            '<span class="amt" data-price="' + priceNum + '">' + formattedPrice + '</span>' +
                            '<span class="per">/ month</span>' +
                        '</div>' +
                        '<a href="' + escapeHtml(ctaLink) + '" class="' + btnClass + '">' + escapeHtml(ctaText) + '</a>' +
                        '<ul>' + featuresHtml + '</ul>' +
                        '<div class="fees">' +
                            '<div class="fees-title">Fees per order</div>' +
                            '<div class="fees-grid">' +
                                '<div><b>' + escapeHtml(physicalFee) + '</b><small>physical</small></div>' +
                                '<div><b>' + escapeHtml(digitalFee) + '</b><small>digital</small></div>' +
                                '<div><b>' + escapeHtml(resellFee) + '</b><small>resell</small></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
                });

                plansContainer.innerHTML = html;

                // Sync current active billing cycle
                var activeCycleBtn = document.querySelector('[data-seg="billing"] button.active');
                var activeCycle = activeCycleBtn ? activeCycleBtn.getAttribute('data-cycle') : 'monthly';
                if (activeCycle && activeCycle !== 'monthly') {
                    applyBilling(activeCycle);
                }
            })
            .catch(function (err) {
                // Silently keep static pre-rendered fallback
                console.warn('Storefront dynamic packages note:', err);
            });
    }

    loadDynamicPackages();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadDynamicPackages);
    }

    /* ── Hero: Today / This Week figures ───────────────────── */
    function applyRange(range) {
        document.querySelectorAll('[data-today]').forEach(function (el) {
            el.textContent = range === 'today'
                ? el.getAttribute('data-today')
                : el.getAttribute('data-week');
        });
    }

    /* ── FAQ accordion ─────────────────────────────────────── */
    document.querySelectorAll('.faq-q').forEach(function (q) {
        q.addEventListener('click', function () {
            var item = q.closest('.faq-item');
            var isOpen = item.classList.contains('open');
            item.parentNode.querySelectorAll('.faq-item').forEach(function (i) { i.classList.remove('open'); });
            if (!isOpen) item.classList.add('open');
        });
    });

    /* ── Count-up for hero metrics ─────────────────────────── */
    function countUp(el) {
        var target = parseFloat(el.getAttribute('data-count'));
        var started = 0;
        var duration = 1200;
        var start = performance.now();
        function frame(now) {
            var p = Math.min((now - start) / duration, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            var value = Math.floor(started + (target - started) * eased);
            el.textContent = value.toLocaleString('en-US');
            if (p < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }

    /* ── Scroll reveal ─────────────────────────────────────── */
    function setupReveal() {
        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('visible');
                    if (entry.target.hasAttribute('data-count')) countUp(entry.target);
                    io.unobserve(entry.target);
                });
            }, { threshold: 0.05 });

            document.querySelectorAll('.reveal, [data-count]').forEach(function (el) { io.observe(el); });
        } else {
            document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
        }
    }

    function toBnDigits(num) {
        var bn = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
        return String(num).replace(/[0-9]/g, function (d) { return bn[+d]; });
    }

    /* ── Interactive Feature Showcase Carousel ───────────────── */
    function initHeroShowcase() {
        var showcase = document.getElementById('heroShowcase');
        if (!showcase) return;

        var slides = showcase.querySelectorAll('.showcase-slide');
        var dotsContainer = document.getElementById('showcaseDots');
        var titleEl = document.getElementById('showcaseTitle');
        var counterEl = document.getElementById('showcaseCounter');
        var prevBtn = document.getElementById('showcasePrevBtn');
        var nextBtn = document.getElementById('showcaseNextBtn');

        var SLIDE_DATA = [
            {
                titleEn: "Unlimited Server-Side Tracking",
                titleBn: "আনলিমিটেড সার্ভার-সাইড ট্র্যাকিং"
            },
            {
                titleEn: "1-Click Courier Integration",
                titleBn: "এক ক্লিকেই কুরিয়ার ইন্টিগ্রেশন"
            },
            {
                titleEn: "Fake Order Block",
                titleBn: "ফেক অর্ডার ব্লক"
            }
        ];

        var currentIndex = 0;
        var totalSlides = slides.length;
        var autoPlayTimer = null;
        var isHovered = false;
        var DURATION = 5200;

        // Build pagination dots
        if (dotsContainer) {
            dotsContainer.innerHTML = '';
            for (var i = 0; i < totalSlides; i++) {
                var dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'showcase-dot' + (i === 0 ? ' active' : '');
                dot.setAttribute('aria-label', 'Slide ' + (i + 1));
                dot.setAttribute('data-slide-index', i);
                dot.innerHTML = '<span class="showcase-progress"></span>';
                dotsContainer.appendChild(dot);
            }
        }

        function updateTitle(idx, immediate) {
            if (!titleEl) return;
            var lang = getCurrentLanguage();
            var item = SLIDE_DATA[idx];
            if (!item) return;
            var targetText = (lang === 'bn' ? item.titleBn : item.titleEn);
            if (immediate) {
                titleEl.textContent = targetText;
                titleEl.classList.remove('fade');
                return;
            }
            titleEl.classList.add('fade');
            setTimeout(function () {
                titleEl.textContent = targetText;
                titleEl.classList.remove('fade');
            }, 140);
        }

        window.addEventListener('gocom_lang_changed', function () {
            updateTitle(currentIndex, true);
            updateCounter(currentIndex);
        });

        function updateCounter(idx) {
            if (!counterEl) return;
            var lang = getCurrentLanguage();
            if (lang === 'bn') {
                counterEl.textContent = toBnDigits(idx + 1) + ' / ' + toBnDigits(totalSlides);
            } else {
                counterEl.textContent = (idx + 1) + ' / ' + totalSlides;
            }
        }

        function goToSlide(idx, immediate) {
            if (idx < 0) idx = totalSlides - 1;
            if (idx >= totalSlides) idx = 0;
            currentIndex = idx;

            slides.forEach(function (slide, sIdx) {
                slide.classList.toggle('active', sIdx === currentIndex);
            });

            var allDots = dotsContainer ? dotsContainer.querySelectorAll('.showcase-dot') : [];
            allDots.forEach(function (d, dIdx) {
                var isActive = (dIdx === currentIndex);
                d.classList.toggle('active', isActive);
                var prog = d.querySelector('.showcase-progress');
                if (prog) {
                    prog.style.animation = 'none';
                    void d.offsetWidth;
                    if (isActive) {
                        prog.style.animation = 'showcaseProgress ' + DURATION + 'ms linear forwards';
                    }
                }
            });

            updateTitle(currentIndex, immediate);
            updateCounter(currentIndex);
            resetAutoPlay();
        }

        function nextSlide() {
            goToSlide(currentIndex + 1);
        }

        function prevSlide() {
            goToSlide(currentIndex - 1);
        }

        function resetAutoPlay() {
            if (autoPlayTimer) clearInterval(autoPlayTimer);
            autoPlayTimer = setInterval(function () {
                if (!isHovered) {
                    nextSlide();
                }
            }, DURATION);
        }

        if (prevBtn) prevBtn.addEventListener('click', prevSlide);
        if (nextBtn) nextBtn.addEventListener('click', nextSlide);

        if (dotsContainer) {
            dotsContainer.addEventListener('click', function (e) {
                var dot = e.target.closest('.showcase-dot');
                if (dot) {
                    var sIdx = parseInt(dot.getAttribute('data-slide-index'), 10);
                    if (!isNaN(sIdx)) goToSlide(sIdx);
                }
            });
        }

        showcase.addEventListener('mouseenter', function () { isHovered = true; });
        showcase.addEventListener('mouseleave', function () { isHovered = false; });

        var touchStartX = 0;
        var touchStartY = 0;
        showcase.addEventListener('touchstart', function (e) {
            if (!e.changedTouches || !e.changedTouches[0]) return;
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        showcase.addEventListener('touchend', function (e) {
            if (!e.changedTouches || !e.changedTouches[0]) return;
            var diffX = e.changedTouches[0].screenX - touchStartX;
            var diffY = e.changedTouches[0].screenY - touchStartY;
            if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX < 0) nextSlide();
                else prevSlide();
            }
        }, { passive: true });

        goToSlide(0, true);

        /* ── Micro-Interactions ───────────────────────────────── */
        // 1. Slide 0: Live Event Counter & Event Pill Cycling
        var liveCounterEl = document.getElementById('liveEventCount');
        var eventPillEl = document.getElementById('trackEventPill');
        var eventNames = ['PageView', 'AddToCart', 'Purchase', 'Checkout'];
        var eventNameIdx = 0;
        var liveCount = 9;

        setInterval(function () {
            if (currentIndex === 0) {
                liveCount += 1 + Math.floor(Math.random() * 2);
                if (liveCounterEl) {
                    var lang = getCurrentLanguage();
                    liveCounterEl.textContent = (lang === 'bn') ? toBnDigits(liveCount) : String(liveCount);
                }
            }
        }, 950);

        setInterval(function () {
            if (currentIndex === 0 && eventPillEl) {
                eventNameIdx = (eventNameIdx + 1) % eventNames.length;
                eventPillEl.style.opacity = '0';
                eventPillEl.style.transform = 'translateY(4px)';
                setTimeout(function () {
                    eventPillEl.textContent = eventNames[eventNameIdx];
                    eventPillEl.style.opacity = '1';
                    eventPillEl.style.transform = 'translateY(0)';
                }, 180);
            }
        }, 1600);

        // 2. Slide 1: Courier Dispatch Simulation
        var courierBtn = document.getElementById('courierSendBtn');
        var courierRipple = document.getElementById('courierRipple');
        var courierStatusBadge = document.getElementById('courierStatusBadge');
        var courierCards = document.querySelectorAll('.courier-card');
        var courierNames = ['Steadfast', 'Pathao', 'RedX'];
        var courierIdx = 0;

        function runCourierDispatch() {
            if (currentIndex !== 1) return;
            if (courierRipple) {
                courierRipple.classList.remove('pulse');
                void courierRipple.offsetWidth;
                courierRipple.classList.add('pulse');
            }
            courierIdx = (courierIdx + 1) % courierNames.length;
            var activeCourier = courierNames[courierIdx];
            courierCards.forEach(function (c) {
                var isThis = c.getAttribute('data-courier') === activeCourier.toLowerCase();
                c.classList.toggle('active', isThis);
            });
            if (courierStatusBadge) {
                var lang = getCurrentLanguage();
                courierStatusBadge.innerHTML = '<i class="ri-check-line"></i> ' + (lang === 'bn' ? 'সেন্ড সম্পন্ন — ' + activeCourier : 'Dispatched — ' + activeCourier);
            }
        }
        if (courierBtn) courierBtn.addEventListener('click', runCourierDispatch);
        setInterval(function () {
            if (currentIndex === 1) runCourierDispatch();
        }, 2800);

        // 3. Slide 2: Fake Order Scanner Simulation
        var fakeOrders = [
            { 
                name: 'আরিফুল ইসলাম', nameEn: 'Ariful Islam', 
                phone: '০১৩০০-০০০০০০', 
                location: 'মিরপুর, ঢাকা', locationEn: 'Mirpur, Dhaka',
                item: 'স্মার্টওয়াচ × ৩', itemEn: 'Smartwatch × 3', 
                total: '৳৯,৯৯৯', totalEn: '৳9,999',
                fake: true, 
                riskScore: '৮৮% (উচ্চ ঝুঁকি)', riskScoreEn: '88% (High Risk)',
                riskPercent: '88%',
                trigger: 'পূর্ববর্তী ২টি পার্সেল রিটার্ন', triggerEn: '2 previous parcels returned',
                sigCourierStatus: 'warn', sigCourierText: 'ফ্ল্যাগড', sigCourierTextEn: 'Flagged'
            },
            { 
                name: 'রাকিব হাসান', nameEn: 'Rakib Hasan', 
                phone: '০১৭১২-৩৪৫৬৭৮', 
                location: 'ধানমন্ডি, ঢাকা', locationEn: 'Dhanmondi, Dhaka',
                item: 'জামদানি শাড়ি × ১', itemEn: 'Jamdani Saree × 1', 
                total: '৳১,৮৫০', totalEn: '৳1,850',
                fake: false, 
                riskScore: '৬% (নিরাপদ ক্রেতা)', riskScoreEn: '6% (Safe Buyer)',
                riskPercent: '6%',
                trigger: '১২টি সফল ডেলিভারি রেকর্ড', triggerEn: '12 successful deliveries record',
                sigCourierStatus: 'ok', sigCourierText: 'পরিষ্কার', sigCourierTextEn: 'Clear'
            },
            { 
                name: 'মেহেদী হাসান', nameEn: 'Mehedi Hasan', 
                phone: '০১৮২২-৪৫৬৭৮৯', 
                location: 'উত্তরা, ঢাকা', locationEn: 'Uttara, Dhaka',
                item: 'ইয়ারবাডস × ২', itemEn: 'Earbuds × 2', 
                total: '৳৩,২০০', totalEn: '৳3,200',
                fake: true, 
                riskScore: '৯৪% (ডুপ্লিকেট অর্ডার)', riskScoreEn: '94% (Duplicate Order)',
                riskPercent: '94%',
                trigger: '১ ঘণ্টায় একই ঠিকানায় ৩টি অর্ডার', triggerEn: '3 orders in 1hr to same address',
                sigCourierStatus: 'warn', sigCourierText: 'ডুপ্লিকেট', sigCourierTextEn: 'Duplicate'
            },
            { 
                name: 'সুমাইয়া আক্তার', nameEn: 'Sumaiya Akter', 
                phone: '০১৭৫২-৯৮৭৬৫৪', 
                location: 'গুলশান, ঢাকা', locationEn: 'Gulshan, Dhaka',
                item: 'বিউটি বক্স × ২', itemEn: 'Beauty Box × 2', 
                total: '৳২,৪০০', totalEn: '৳2,400',
                fake: false, 
                riskScore: '৪% (ভেরিফায়েড ক্রেতা)', riskScoreEn: '4% (Verified Buyer)',
                riskPercent: '4%',
                trigger: 'সব তথ্য শতভাগ নিখুঁত', triggerEn: 'All information 100% verified',
                sigCourierStatus: 'ok', sigCourierText: 'পরিষ্কার', sigCourierTextEn: 'Clear'
            }
        ];
        var fakeIdx = 0;
        var blockedNum = 3;
        var confirmedNum = 7;
        var scanCard = document.getElementById('scanOrderCard');
        var scanAvatar = document.getElementById('scanAvatar');
        var scanName = document.getElementById('scanName');
        var scanLocation = document.getElementById('scanLocation');
        var scanPhone = document.getElementById('scanPhone');
        var scanItem = document.getElementById('scanItem');
        var scanTotal = document.getElementById('scanTotal');
        var scanStamp = document.getElementById('scanStamp');
        var scanRiskScore = document.getElementById('scanRiskScore');
        var scanRiskBar = document.getElementById('scanRiskBar');
        var scanTriggerPill = document.getElementById('scanTriggerPill');
        var scanTriggerText = document.getElementById('scanTriggerText');
        var sigCourierStatus = document.getElementById('sigCourierStatus');
        var blockedEl = document.getElementById('blockedCount');
        var confirmedEl = document.getElementById('confirmedCount');

        setInterval(function () {
            if (currentIndex !== 2 || !scanCard) return;
            fakeIdx = (fakeIdx + 1) % fakeOrders.length;
            var ord = fakeOrders[fakeIdx];
            var lang = getCurrentLanguage();

            scanCard.classList.remove('fake', 'real');
            if (scanStamp) scanStamp.classList.remove('real');

            setTimeout(function () {
                if (scanAvatar) scanAvatar.textContent = (lang === 'bn' ? ord.name[0] : ord.nameEn[0]);
                if (scanName) scanName.textContent = (lang === 'bn' ? ord.name : ord.nameEn);
                if (scanLocation) scanLocation.innerHTML = '<i class="ri-map-pin-2-line"></i> ' + (lang === 'bn' ? ord.location : ord.locationEn);
                if (scanPhone) scanPhone.textContent = ord.phone;
                if (scanItem) scanItem.textContent = (lang === 'bn' ? ord.item : ord.itemEn);
                if (scanTotal) scanTotal.textContent = (lang === 'bn' ? ord.total : ord.totalEn);
                if (scanRiskScore) {
                    scanRiskScore.textContent = (lang === 'bn' ? ord.riskScore : ord.riskScoreEn);
                    scanRiskScore.classList.toggle('real', !ord.fake);
                }
                if (scanRiskBar) {
                    scanRiskBar.style.width = ord.riskPercent;
                    scanRiskBar.classList.toggle('real', !ord.fake);
                }
                if (scanTriggerText) scanTriggerText.textContent = (lang === 'bn' ? ord.trigger : ord.triggerEn);
                if (scanTriggerPill) scanTriggerPill.classList.toggle('real', !ord.fake);
                if (sigCourierStatus) {
                    sigCourierStatus.className = 'sig-status ' + ord.sigCourierStatus;
                    sigCourierStatus.textContent = (lang === 'bn' ? ord.sigCourierText : ord.sigCourierTextEn);
                }

                setTimeout(function () {
                    if (ord.fake) {
                        scanCard.classList.add('fake');
                        blockedNum++;
                        if (blockedEl) blockedEl.textContent = (lang === 'bn' ? toBnDigits(blockedNum) : String(blockedNum));
                        if (scanStamp) {
                            scanStamp.textContent = '✕ BLOCKED';
                            scanStamp.classList.remove('real');
                        }
                    } else {
                        scanCard.classList.add('real');
                        confirmedNum++;
                        if (confirmedEl) confirmedEl.textContent = (lang === 'bn' ? toBnDigits(confirmedNum) : String(confirmedNum));
                        if (scanStamp) {
                            scanStamp.textContent = '✓ CONFIRMED';
                            scanStamp.classList.add('real');
                        }
                    }
                }, 600);
            }, 250);
        }, 3400);



        window.addEventListener('gocom_lang_changed', function () {
            updateTitle(currentIndex);
            updateCounter(currentIndex);
        });
        window.addEventListener('languageChanged', function () {
            updateTitle(currentIndex);
            updateCounter(currentIndex);
        });
    }

    setupReveal();
    initHeroShowcase();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setupReveal();
            initHeroShowcase();
        });
    }
    // Safety fallback: ensure nothing stays hidden if observer misses on throttled devices
    setTimeout(function () {
        document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
    }, 1000);

    /* ── Header shadow on scroll ───────────────────────────── */
    var header = document.querySelector('.site-header');
    if (header) {
        window.addEventListener('scroll', function () {
            header.style.background = window.scrollY > 10 ? 'rgba(239,246,255,.92)' : 'var(--blue-50)';
            header.style.backdropFilter = window.scrollY > 10 ? 'blur(10px)' : 'none';
        }, { passive: true });
    }

    /* ── GoCommerce BD Auth Modal Controller ───────────────── */
    var authBackdrop = document.getElementById('gocomAuthBackdrop');
    var loginForm = document.getElementById('gocomLoginForm');
    var signupForm = document.getElementById('gocomSignupForm');
    var errorBox = document.getElementById('gocomAuthError');
    var successBox = document.getElementById('gocomAuthSuccess');
    var subtitle = document.getElementById('gocomAuthSubtitle');
    var tabs = document.querySelectorAll('[data-auth-tab]');

    var DASHBOARD_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:5173/'
        : '/dashboard';

    function setAuthMode(mode) {
        if (!authBackdrop) return;
        tabs.forEach(function (tab) {
            var isTab = tab.getAttribute('data-auth-tab') === mode;
            tab.classList.toggle('active', isTab);
        });
        if (errorBox) { errorBox.style.display = 'none'; errorBox.textContent = ''; }
        if (successBox) { successBox.style.display = 'none'; successBox.textContent = ''; }
        
        if (mode === 'login') {
            if (loginForm) loginForm.style.display = 'block';
            if (signupForm) signupForm.style.display = 'none';
            if (subtitle) {
                var cur = getCurrentLanguage();
                subtitle.textContent = (TRANSLATIONS[cur] && TRANSLATIONS[cur].authSubtitleLogin) ? TRANSLATIONS[cur].authSubtitleLogin : 'Sign in to your store dashboard';
            }
        } else {
            if (loginForm) loginForm.style.display = 'none';
            if (signupForm) signupForm.style.display = 'block';
            if (subtitle) {
                var cur = getCurrentLanguage();
                subtitle.textContent = (TRANSLATIONS[cur] && TRANSLATIONS[cur].authSubtitleSignup) ? TRANSLATIONS[cur].authSubtitleSignup : 'Launch your own online store in 1 minute';
            }
        }
    }

    function openAuthModal(mode) {
        if (!authBackdrop) return;
        setAuthMode(mode || 'login');
        authBackdrop.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeAuthModal() {
        if (!authBackdrop) return;
        authBackdrop.style.display = 'none';
        document.body.style.overflow = '';
        if (errorBox) { errorBox.style.display = 'none'; errorBox.textContent = ''; }
        if (successBox) { successBox.style.display = 'none'; successBox.textContent = ''; }
    }

    // Triggers
    document.querySelectorAll('[data-open-auth]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            var mode = btn.getAttribute('data-open-auth') || 'login';
            openAuthModal(mode);
        });
    });

    document.querySelectorAll('[data-close-auth]').forEach(function (btn) {
        btn.addEventListener('click', closeAuthModal);
    });

    if (authBackdrop) {
        authBackdrop.addEventListener('click', function (e) {
            if (e.target === authBackdrop) closeAuthModal();
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && authBackdrop && authBackdrop.style.display !== 'none') {
            closeAuthModal();
        }
    });

    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            var mode = tab.getAttribute('data-auth-tab');
            setAuthMode(mode);
        });
    });

    // Hash check on load
    if (window.location.hash === '#login') openAuthModal('login');
    if (window.location.hash === '#signup') openAuthModal('signup');

    // Password visibility toggles
    document.querySelectorAll('[data-toggle-pwd]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var targetId = btn.getAttribute('data-toggle-pwd');
            var input = document.getElementById(targetId);
            if (!input) return;
            var isPass = input.type === 'password';
            input.type = isPass ? 'text' : 'password';
            var icon = btn.querySelector('i');
            if (icon) icon.className = isPass ? 'ri-eye-off-line' : 'ri-eye-line';
        });
    });

    // Phone Bangla digit normalization
    var phoneInput = document.getElementById('signupPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function () {
            var bangla = {'০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9'};
            phoneInput.value = phoneInput.value.replace(/[০-৯]/g, function (w) { return bangla[w] || w; });
        });
    }

    // Subdomain slug auto-generator
    var storeNameInput = document.getElementById('signupStoreName');
    var subdomainInput = document.getElementById('signupSubdomain');
    var subdomainBadge = document.getElementById('subdomainBadge');
    var checkTimer = null;

    function checkSubdomain(sub) {
        if (!subdomainBadge) return;
        if (sub.length < 3) {
            subdomainBadge.textContent = '';
            subdomainBadge.className = 'gocom-badge';
            return;
        }
        subdomainBadge.textContent = 'যাচাই হচ্ছে...';
        subdomainBadge.className = 'gocom-badge checking';
        fetch('/api/auth/check-subdomain?subdomain=' + encodeURIComponent(sub))
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (d.available) {
                    subdomainBadge.textContent = '✓ খালি আছে';
                    subdomainBadge.className = 'gocom-badge available';
                } else {
                    subdomainBadge.textContent = '✕ ব্যবহৃত';
                    subdomainBadge.className = 'gocom-badge taken';
                }
            })
            .catch(function () {
                subdomainBadge.textContent = '';
            });
    }

    var previewSlug = document.getElementById('gocomStoreSlugPreview');
    function updateSlugPreview(val) {
        if (previewSlug) {
            previewSlug.textContent = val || 'axiswear';
        }
    }

    if (storeNameInput && subdomainInput) {
        storeNameInput.addEventListener('input', function () {
            if (!subdomainInput.dataset.manual) {
                var val = storeNameInput.value.toLowerCase().trim()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/[\s_-]+/g, '-')
                    .replace(/^-+|-+$/g, '');
                subdomainInput.value = val;
                updateSlugPreview(val);
                clearTimeout(checkTimer);
                checkTimer = setTimeout(function () { checkSubdomain(val); }, 300);
            }
        });
        subdomainInput.addEventListener('input', function () {
            subdomainInput.dataset.manual = 'true';
            var val = subdomainInput.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
            subdomainInput.value = val;
            updateSlugPreview(val);
            clearTimeout(checkTimer);
            checkTimer = setTimeout(function () { checkSubdomain(val); }, 300);
        });
    }

    // Password strength bar
    var pwdInput = document.getElementById('signupPassword');
    var pwdBar = document.getElementById('pwdStrengthBar');
    if (pwdInput && pwdBar) {
        pwdInput.addEventListener('input', function () {
            var len = pwdInput.value.length;
            pwdBar.className = 'gocom-pwd-bar';
            if (len === 0) {
                pwdBar.style.width = '0%';
            } else if (len < 8) {
                pwdBar.classList.add('weak');
            } else if (len < 12) {
                pwdBar.classList.add('medium');
            } else {
                pwdBar.classList.add('strong');
            }
        });
    }


    // Submit Login
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            if (errorBox) errorBox.style.display = 'none';
            if (successBox) successBox.style.display = 'none';

            var email = document.getElementById('loginEmail').value.trim();
            var password = document.getElementById('loginPassword').value;
            var submitBtn = document.getElementById('loginSubmitBtn');
            var originalText = submitBtn ? submitBtn.innerHTML : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="ri-loader-4-line ri-spin"></span> লগইন হচ্ছে...';
            }

            fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: email, password: password })
            })
            .then(function (r) { return r.json().then(function (d) { return { status: r.status, ok: r.ok, data: d }; }); })
            .then(function (res) {
                if (!res.ok) {
                    throw new Error(res.data.detail || res.data.error || 'লগইন ব্যর্থ হয়েছে।');
                }
                if (successBox) {
                    successBox.textContent = '✓ সফলভাবে লগইন হয়েছে! ড্যাশবোর্ডে প্রবেশ করানো হচ্ছে...';
                    successBox.style.display = 'flex';
                }
                setTimeout(function () {
                    window.location.href = DASHBOARD_URL;
                }, 600);
            })
            .catch(function (err) {
                if (errorBox) {
                    errorBox.textContent = err.message || 'লগইন ব্যর্থ হয়েছে।';
                    errorBox.style.display = 'flex';
                }
            })
            .finally(function () {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            });
        });
    }

    // Submit Signup
    if (signupForm) {
        signupForm.addEventListener('submit', function (e) {
            e.preventDefault();
            if (errorBox) errorBox.style.display = 'none';
            if (successBox) successBox.style.display = 'none';

            var storeName = document.getElementById('signupStoreName').value.trim();
            var subdomain = document.getElementById('signupSubdomain').value.trim().toLowerCase();
            var name = document.getElementById('signupName').value.trim();
            var phone = document.getElementById('signupPhone').value.trim();
            var email = document.getElementById('signupEmail').value.trim();
            var password = document.getElementById('signupPassword').value;
            var submitBtn = document.getElementById('signupSubmitBtn');
            var originalText = submitBtn ? submitBtn.innerHTML : '';

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="ri-loader-4-line ri-spin"></span> দোকান তৈরি হচ্ছে...';
            }

            fetch('/api/auth/register-store', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    storeName: storeName,
                    subdomain: subdomain,
                    name: name,
                    phone: phone,
                    email: email,
                    password: password
                })
            })
            .then(function (r) { return r.json().then(function (d) { return { status: r.status, ok: r.ok, data: d }; }); })
            .then(function (res) {
                if (!res.ok) {
                    throw new Error(res.data.detail || res.data.error || 'দোকান তৈরি করা সম্ভব হয়নি।');
                }
                if (successBox) {
                    successBox.textContent = '✓ আপনার দোকান ও অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...';
                    successBox.style.display = 'flex';
                }
                setTimeout(function () {
                    window.location.href = DASHBOARD_URL;
                }, 800);
            })
            .catch(function (err) {
                if (errorBox) {
                    errorBox.textContent = err.message || 'দোকান তৈরি ব্যর্থ হয়েছে।';
                    errorBox.style.display = 'flex';
                }
            })
            .finally(function () {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            });
        });
    }

    /* ══════════════════════════════════════════════════════════════════
       Bento Courier Dispatch Controller (Image 2)
       ══════════════════════════════════════════════════════════════════ */
    function initBentoCourierShowcase() {
        var courierButtons = document.querySelectorAll('.courier-tab-btn');
        if (!courierButtons.length) return;

        var stepperBar = document.getElementById('courierStepperBar');
        var stepperNodes = document.querySelectorAll('.courier-stepper-list .stepper-node');
        var bookBtn = document.getElementById('courierBookActionBtn');
        var bookBtnText = document.getElementById('courierBookBtnText');
        var bookStatus = document.getElementById('courierActionStatus');
        var dispatchLogo = document.getElementById('dispatchActiveLogo');
        var dispatchStatusBadge = document.getElementById('dispatchStatusBadge');
        var dispatchOrderId = document.getElementById('dispatchOrderId');

        var couriers = [
            { key: 'steadfast', name: 'SteadFast', prefix: 'SF', logo: '/assets/images/couriers/steadfast.svg' },
            { key: 'pathao', name: 'Pathao', prefix: 'PT', logo: '/assets/images/couriers/pathao.svg' },
            { key: 'redx', name: 'REDX', prefix: 'RX', logo: '/assets/images/couriers/redx.svg' }
        ];

        var currentIndex = 0; // Steadfast default
        var autoTimer = null;
        var stepTimer = null;
        var isUserInteracted = false;

        function setCourier(index, animateSteps) {
            currentIndex = index;
            var c = couriers[index];

            courierButtons.forEach(function (btn, i) {
                var isActive = (i === index);
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });

            if (dispatchLogo) {
                dispatchLogo.src = c.logo;
                dispatchLogo.alt = c.name;
            }

            if (bookBtnText) {
                bookBtnText.textContent = c.name + '-এ আবার বুক করুন';
            }

            if (dispatchOrderId) {
                var randNum = 48269 + index * 142;
                dispatchOrderId.textContent = 'অর্ডার #' + randNum;
            }

            if (animateSteps) {
                runStepperAnimation();
            }
        }

        function runStepperAnimation() {
            if (stepTimer) clearInterval(stepTimer);
            if (stepperBar) stepperBar.style.width = '0%';
            stepperNodes.forEach(function (node) { node.classList.remove('done'); });
            if (bookStatus) bookStatus.textContent = 'বুকিং হচ্ছে…';
            if (dispatchStatusBadge) dispatchStatusBadge.textContent = 'প্যাকিং চলছে';

            var stepProgress = ['0%', '33.33%', '66.67%', '100%'];
            var statusLabels = ['অর্ডার কনফার্ম', 'প্যাকড', 'কুরিয়ারে', 'ডেলিভারড'];
            var currentStep = 0;

            stepTimer = setInterval(function () {
                if (currentStep < 4) {
                    stepperNodes[currentStep].classList.add('done');
                    if (stepperBar) stepperBar.style.width = stepProgress[currentStep] || '0%';
                    
                    if (dispatchStatusBadge) {
                        dispatchStatusBadge.textContent = statusLabels[currentStep] || 'ডেলিভারড';
                    }
                    if (currentStep === 3) {
                        if (bookStatus) bookStatus.textContent = 'ডেলিভারি সম্পন্ন';
                    }
                    currentStep++;
                } else {
                    clearInterval(stepTimer);
                    stepTimer = null;
                    if (bookStatus) bookStatus.textContent = 'ডেলিভারি সম্পন্ন';
                    if (dispatchStatusBadge) dispatchStatusBadge.textContent = 'ডেলিভারড';
                    if (stepperBar) stepperBar.style.width = '100%';
                    stepperNodes.forEach(function (node) { node.classList.add('done'); });
                }
            }, 450);
        }

        courierButtons.forEach(function (btn, idx) {
            btn.addEventListener('click', function () {
                isUserInteracted = true;
                if (autoTimer) clearInterval(autoTimer);
                setCourier(idx, true);
            });
        });

        if (bookBtn) {
            bookBtn.addEventListener('click', function () {
                isUserInteracted = true;
                if (autoTimer) clearInterval(autoTimer);
                runStepperAnimation();
            });
        }

        // Auto cycling every 5.5 seconds if not interacted
        autoTimer = setInterval(function () {
            if (!isUserInteracted) {
                var nextIndex = (currentIndex + 1) % couriers.length;
                setCourier(nextIndex, true);
            }
        }, 5500);

        setCourier(0, false);
    }

    /* ══════════════════════════════════════════════════════════════════
       Bento Fraud Detection & Risk Analysis Controller (Image 3)
       ══════════════════════════════════════════════════════════════════ */
    function initBentoFraudShowcase() {
        var tabBtns = document.querySelectorAll('.fraud-tab-pill-btn');
        if (!tabBtns.length) return;

        var meterFill = document.getElementById('fraudMeterPath');
        var scoreNum = document.getElementById('fraudMeterScore');
        var verifyBtn = document.getElementById('fraudVerifyBtn');
        var verifyBtnText = document.getElementById('fraudVerifyBtnText');
        var buyerText = document.getElementById('analysisPanelBuyer');
        var signalsList = document.getElementById('analysisSignalsList');
        var blockedBadge = document.getElementById('analysisBlockedBadge');
        var blockedCount = document.getElementById('analysisBlockedCount');

        var data = {
            ok: {
                score: 94,
                scoreBn: '৯৪%',
                dashOffset: 6,
                stroke: '#155dfc',
                btnClass: 'ok',
                btnText: 'কল দিয়ে যাচাই করুন',
                buyer: 'ক্রেতা: সাদিয়া ইসলাম · ঢাকা',
                signals: [
                    { courier: 'steadfast', label: '৯টি পার্সেল, সব ডেলিভারড', weight: 96, chip: 'পরিष्कार', type: 'blue' },
                    { courier: 'pathao', label: '৭টি পার্সেল, ১টি রিটার্ন', weight: 90, chip: 'পরিष्कार', type: 'blue' },
                    { courier: 'redx', label: 'নম্বরটি ভেরিফায়েড, ২ বছর পুরনো', weight: 94, chip: 'পরিष्कार', type: 'blue' },
                    { courier: 'carrybee', label: 'গড় ডেলিভারি সময় ৩৬ ঘণ্টা', weight: 88, chip: 'পরিष्कार', type: 'blue' }
                ]
            },
            mid: {
                score: 56,
                scoreBn: '৫৬%',
                dashOffset: 44,
                stroke: '#f59e0b',
                btnClass: 'mid',
                btnText: 'কল দিয়ে যাচাই করুন',
                buyer: 'ক্রেতা: আরিফ চৌধুরী · ময়মনসিংহ',
                signals: [
                    { courier: 'steadfast', label: '৫টি পার্সেলের ২টি রিটার্ন', weight: 52, chip: 'যাচাই', type: 'amber' },
                    { courier: 'pathao', label: 'কোনো অর্ডার হিস্ট্রি নেই', weight: 62, chip: 'যাচাই', type: 'amber' },
                    { courier: 'redx', label: 'নম্বরটি মাত্র ৩ দিনের পুরনো', weight: 58, chip: 'যাচাই', type: 'amber' },
                    { courier: 'carrybee', label: 'ডেলিভারি ঠিকানা যাচাই হয়নি', weight: 44, chip: 'যাচাই', type: 'amber' }
                ]
            },
            bad: {
                score: 7,
                scoreBn: '৭%',
                dashOffset: 93,
                stroke: '#e11d48',
                btnClass: 'bad',
                btnText: 'অর্ডার আটকে দিন',
                buyer: 'ক্রেতা: একই ঠিকানায় ৪টি নাম',
                signals: [
                    { courier: 'steadfast', label: 'গত ৩০ দিনে ৩টি রিটার্ন', weight: 95, chip: 'ঝুঁকি', type: 'red' },
                    { courier: 'pathao', label: '৩টি COD পেমেন্ট নেওয়া হয়নি', weight: 91, chip: 'ঝুঁকি', type: 'red' },
                    { courier: 'redx', label: 'একই ঠিকানায় ৪টি আলাদা নাম', weight: 88, chip: 'ঝুঁকি', type: 'red' },
                    { courier: 'carrybee', label: 'ভেরিফিকেশন কলে সাড়া দেননি', weight: 84, chip: 'ঝুঁকি', type: 'red' }
                ]
            }
        };

        var currentRisk = 'ok';
        var autoTimer = null;
        var isUserInteracted = false;
        var blockedNumber = 7;

        var courierLogos = {
            steadfast: '/assets/images/couriers/steadfast.svg',
            pathao: '/assets/images/couriers/pathao.svg',
            redx: '/assets/images/couriers/redx.svg',
            carrybee: '/assets/images/couriers/carrybee.svg'
        };

        function setRisk(riskKey) {
            currentRisk = riskKey;
            var d = data[riskKey];
            if (!d) return;

            tabBtns.forEach(function (btn) {
                var isActive = (btn.getAttribute('data-risk') === riskKey);
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });

            if (meterFill) {
                meterFill.style.strokeDashoffset = d.dashOffset;
                meterFill.style.stroke = d.stroke;
            }

            if (scoreNum) {
                scoreNum.textContent = d.scoreBn;
                scoreNum.style.color = (riskKey === 'bad') ? '#e11d48' : (riskKey === 'mid' ? '#d97706' : '#155dfc');
            }

            if (verifyBtn) {
                verifyBtn.className = 'btn-fraud-verify ' + d.btnClass;
                if (verifyBtnText) verifyBtnText.textContent = d.btnText;
            }

            if (buyerText) {
                buyerText.textContent = d.buyer;
            }

            if (signalsList) {
                signalsList.innerHTML = d.signals.map(function (s) {
                    var logoSrc = courierLogos[s.courier] || '';
                    return '<li class="signal-item">' +
                        '<div class="signal-logo-wrap">' +
                            '<img src="' + logoSrc + '" alt="' + s.courier + '" class="signal-courier-logo" />' +
                            '<span class="signal-status-dot ' + s.type + '"><i class="ri-check-line"></i></span>' +
                        '</div>' +
                        '<div class="signal-progress-wrap">' +
                            '<span class="signal-label">' + s.label + '</span>' +
                            '<div class="signal-bar-track">' +
                                '<div class="signal-bar-fill ' + s.type + '" style="width: ' + s.weight + '%;"></div>' +
                            '</div>' +
                        '</div>' +
                        '<span class="signal-chip ' + s.type + '">' + s.chip + '</span>' +
                    '</li>';
                }).join('');
            }
        }

        tabBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                isUserInteracted = true;
                if (autoTimer) clearInterval(autoTimer);
                var r = btn.getAttribute('data-risk');
                setRisk(r);
            });
        });

        if (verifyBtn) {
            verifyBtn.addEventListener('click', function () {
                if (currentRisk === 'bad') {
                    blockedNumber++;
                    var bnDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
                    var bnStr = String(blockedNumber).split('').map(function (ch) { return bnDigits[parseInt(ch, 10)] || ch; }).join('') + 'টি';
                    if (blockedCount) blockedCount.textContent = bnStr;
                    if (blockedBadge) {
                        blockedBadge.style.transform = 'scale(1.12)';
                        setTimeout(function () { blockedBadge.style.transform = 'scale(1)'; }, 300);
                    }
                }
            });
        }

        var keys = ['ok', 'mid', 'bad'];
        var kIdx = 0;
        autoTimer = setInterval(function () {
            if (!isUserInteracted) {
                kIdx = (kIdx + 1) % keys.length;
                setRisk(keys[kIdx]);
            }
        }, 5800);

        setRisk('ok');
    }

    // Initialize Bento Showcases
    initBentoCourierShowcase();
    initBentoFraudShowcase();

})();

