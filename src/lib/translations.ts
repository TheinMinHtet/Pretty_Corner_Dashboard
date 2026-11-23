export type Language = "en" | "my";

export interface AdminTranslationSchema {
  // Navigation & Brand
  navDashboard: string;
  navOrders: string;
  navProducts: string;
  navCategories: string;
  navInventory: string;
  navCustomers: string;
  navPromotions: string;
  navReports: string;
  navSettings: string;
  navNewProduct: string;
  storeAdmin: string;
  boutiqueOperations: string;
  expandSidebar: string;
  collapseSidebar: string;
  loadingPrettyCorner: string;

  // Global Header & Shell
  searchPlaceholder: string;
  notifications: string;
  markAllRead: string;
  noNotifications: string;
  allMarkedReadToast: string;
  profileAndSettings: string;
  resetDemoData: string;
  demoDataResetToast: string;
  signOut: string;
  signOutToast: string;

  // Authentication & Login
  loginPortalTitle: string;
  adminLogin: string;
  secureAccessDesc: string;
  staffEmail: string;
  password: string;
  demoPin: string;
  fillDemoCredentials: string;
  enterAdminPortal: string;
  authenticating: string;
  loginWelcomeToast: string;
  loginErrorToast: string;
  loginEmptyToast: string;
  rememberMe: string;
  sessionExpiredToast: string;
  signedInAs: string;

  // Status Badges
  statusPending: string;
  statusConfirmed: string;
  statusProcessing: string;
  statusShipped: string;
  statusDelivered: string;
  statusExpired: string;
  statusCancelled: string;

  payPending: string;
  payPaid: string;
  payFailed: string;
  payExpired: string;
  payCancelled: string;

  prodActive: string;
  prodArchived: string;

  inStock: string;
  lowStock: string;
  outOfStock: string;

  // Dashboard Overview
  overviewTitle: string;
  overviewSubtitle: string;
  salesSummaryTitle: string;
  revenueOverviewTitle: string;
  ordersOverTimeTitle: string;
  orderStatusDistTitle: string;
  liveBadge: string;
  totalSales: string;
  totalOrders: string;
  avgOrderValue: string;
  activeProducts: string;
  urgentAttention: string;
  pendingOrders: string;
  lowStockAlert: string;
  lowStockAlertDesc: string;
  recentOrders: string;
  recentOrdersDesc: string;
  topSellingProducts: string;
  topSellingDesc: string;
  viewAllOrders: string;
  viewAllProducts: string;
  viewAllInventory: string;

  // Page & Section Titles
  ordersPageTitle: string;
  ordersPageSubtitle: string;
  ordersListTitle: string;
  purchasedProductsTitle: string;
  orderTimelineTitle: string;
  orderTimelineDesc: string;
  orderPaymentStatusTitle: string;
  customerInfoTitle: string;

  productsPageTitle: string;
  productsPageSubtitle: string;
  addProductBtn: string;
  addNewProductTitle: string;
  editProductPrefix: string;
  productFormSubtitle: string;
  generalInfoTitle: string;
  generalInfoDesc: string;
  productNameLabel: string;
  productDescriptionLabel: string;
  productCategoryLabel: string;
  productBrandLabel: string;
  storefrontContentTitle: string;
  storefrontContentDesc: string;
  badgeOptionalLabel: string;
  taglineOptionalLabel: string;
  whyWeLoveItLabel: string;
  howToUseLabel: string;
  productImagesTitle: string;
  productImagesDesc: string;
  uploadLabel: string;
  productVisibilityLabel: string;
  pricingMmkTitle: string;
  priceMmkLabel: string;
  inventorySkuTitle: string;
  skuLabel: string;
  stockQuantityLabel: string;
  lowStockThresholdLabel: string;
  cancelBtn: string;
  createProductBtn: string;
  saveChangesBtn: string;

  categoriesPageTitle: string;
  categoriesPageSubtitle: string;
  addCategoryBtn: string;
  addNewCategoryTitle: string;
  editCategoryTitle: string;
  addNewCategoryDesc: string;
  editCategoryDesc: string;
  categoryNameLabel: string;
  activeOnStorefrontLabel: string;
  activeOnStorefrontDesc: string;
  createCategoryBtn: string;

  inventoryPageTitle: string;
  inventoryPageSubtitle: string;
  stockLevelsTab: string;
  stockHistoryTab: string;

  customersPageTitle: string;
  customersPageSubtitle: string;

  promotionsPageTitle: string;
  promotionsPageSubtitle: string;
  newPromotionBtn: string;

  reportsPageTitle: string;
  reportsPageSubtitle: string;
  revenueTrendsTitle: string;
  revenueTrendsDesc: string;
  salesByCategoryTitle: string;
  salesByCategoryDesc: string;
  ordersByStatusTitle: string;
  ordersByStatusDesc: string;
  paymentChannelsTitle: string;
  paymentChannelsDesc: string;
  customerRetentionTitle: string;
  customerRetentionDesc: string;
  bestSellingProductsTitle: string;
  bestSellingProductsDesc: string;

  settingsPageTitle: string;
  settingsPageSubtitle: string;
  tabStoreContact: string;
  tabPayments: string;
  tabStockAlerts: string;
  tabAdminProfile: string;
  storeContactTitle: string;
  storeContactDesc: string;
  storeNameLabel: string;
  taglineLabel: string;
  supportEmailLabel: string;
  supportPhoneLabel: string;
  viberHotlineLabel: string;
  boutiqueAddressLabel: string;
  currencyLabel: string;
  socialChannelsTitle: string;
  socialChannelsDesc: string;
  paymentSettingsTitle: string;
  paymentSettingsDesc: string;
  lowStockThresholdTitle: string;
  lowStockThresholdDesc: string;
  defaultThresholdLabel: string;
  notificationPrefsTitle: string;
  notificationPrefsDesc: string;
  adminProfileTitle: string;
  adminProfileDesc: string;
  fullNameLabel: string;
  roleLabel: string;
  emailAddressLabel: string;
  phoneNumberLabel: string;
  saveSettingsBtn: string;

  // Table Columns & Common Labels
  orderCol: string;
  customerCol: string;
  paymentCol: string;
  paymentMobileBanking: string;
  paymentCOD: string;
  totalCol: string;
  statusCol: string;
  actionCol: string;
  productCol: string;
  categoryCol: string;
  priceCol: string;
  stockCol: string;
  unitsSoldCol: string;
  revenueCol: string;
  noData: string;
  quickActions: string;

  // Date ranges
  range7d: string;
  range30d: string;
  range6m: string;

  // Language
  languageToggleLabel: string;
  langEn: string;
  langMy: string;
}

export const adminTranslations: Record<Language, AdminTranslationSchema> = {
  en: {
    navDashboard: "Dashboard",
    navOrders: "Orders",
    navProducts: "Products",
    navCategories: "Categories",
    navInventory: "Inventory",
    navCustomers: "Customers",
    navPromotions: "Promotions",
    navReports: "Sales Reports",
    navSettings: "Settings",
    navNewProduct: "New Product",
    storeAdmin: "Pretty Corner Admin",
    boutiqueOperations: "Boutique Operations v1.0",
    expandSidebar: "Expand sidebar",
    collapseSidebar: "Collapse sidebar",
    loadingPrettyCorner: "Loading Pretty Corner...",

    searchPlaceholder: "Search orders, products, SKU...",
    notifications: "Notifications",
    markAllRead: "Mark all read",
    noNotifications: "No notifications",
    allMarkedReadToast: "All notifications marked as read",
    profileAndSettings: "Profile & Settings",
    resetDemoData: "Reset Demo Data",
    demoDataResetToast: "Demo data reset to defaults",
    signOut: "Sign Out",
    signOutToast: "Signed out from administrator session",

    loginPortalTitle: "Boutique Management & Dispatch Portal",
    adminLogin: "Administrator Login",
    secureAccessDesc: "Secure access to inventory, orders & finance",
    staffEmail: "Staff Email",
    password: "Password",
    demoPin: "Demo PIN: admin123",
    fillDemoCredentials: "Fill Demo Credentials",
    enterAdminPortal: "Enter Administrator Portal",
    authenticating: "Authenticating...",
    loginWelcomeToast: "Welcome back to Pretty Corner Admin",
    loginErrorToast: "Invalid credentials. Demo login: admin@prettycorner.com / admin123",
    loginEmptyToast: "Please enter both email and password",
    rememberMe: "Remember this device for 7 days",
    sessionExpiredToast: "Your session has expired due to inactivity. Please sign in again.",
    signedInAs: "Signed in as",

    statusPending: "Pending",
    statusConfirmed: "Confirmed",
    statusProcessing: "Processing",
    statusShipped: "Paid",
    statusDelivered: "Delivered",
    statusExpired: "Time Expired",
    statusCancelled: "Cancelled",

    payPending: "Awaiting Payment",
    payPaid: "Payment Verified / Success",
    payFailed: "Payment Failed",
    payExpired: "Time Expired",
    payCancelled: "Order / Transaction Cancelled",

    prodActive: "Active",
    prodArchived: "Archived",

    inStock: "In Stock",
    lowStock: "Low Stock",
    outOfStock: "Out of Stock",

    overviewTitle: "Pretty Corner Overview",
    overviewSubtitle: "Monitor daily sales, order fulfillment, and beauty inventory at a glance.",
    salesSummaryTitle: "Sales Summary",
    revenueOverviewTitle: "Revenue Overview",
    ordersOverTimeTitle: "Orders Over Time",
    orderStatusDistTitle: "Order Status Distribution",
    liveBadge: "Live",
    totalSales: "Total Sales",
    totalOrders: "Total Orders",
    avgOrderValue: "Avg Order Value",
    activeProducts: "Active Products",
    urgentAttention: "Urgent Attention",
    pendingOrders: "Pending Orders",
    lowStockAlert: "Low Stock Alert",
    lowStockAlertDesc: "Products at or below reorder threshold",
    recentOrders: "Recent Orders",
    recentOrdersDesc: "Latest storefront and counter orders",
    topSellingProducts: "Top Selling Products",
    topSellingDesc: "Highest velocity items by unit volume",
    viewAllOrders: "View all orders",
    viewAllProducts: "View all products",
    viewAllInventory: "Open inventory",

    ordersPageTitle: "Order Management",
    ordersPageSubtitle: "Track customer orders, verify payments, and update fulfillment stages.",
    ordersListTitle: "Orders List",
    purchasedProductsTitle: "Purchased Products",
    orderTimelineTitle: "Order Status Timeline",
    orderTimelineDesc: "Chronological history of order & fulfillment updates",
    orderPaymentStatusTitle: "Order & Payment Status",
    customerInfoTitle: "Customer Information",

    productsPageTitle: "Products",
    productsPageSubtitle: "Manage your beauty and skincare catalog, pricing, and stock.",
    addProductBtn: "Add Product",
    addNewProductTitle: "Add New Product",
    editProductPrefix: "Edit",
    productFormSubtitle: "Configure pricing, stock levels, and images",
    generalInfoTitle: "General Information",
    generalInfoDesc: "Basic product identity and copy",
    productNameLabel: "Product Name *",
    productDescriptionLabel: "Description",
    productCategoryLabel: "Category",
    productBrandLabel: "Brand",
    storefrontContentTitle: "Storefront Content",
    storefrontContentDesc:
      "Controls the “Why we love it” and “How to use” sections on the customer product page",
    badgeOptionalLabel: "Badge (Optional)",
    taglineOptionalLabel: "Tagline (Optional)",
    whyWeLoveItLabel: "Why We Love It — Key Benefits (one bullet per line)",
    howToUseLabel: "How to Use",
    productImagesTitle: "Product Images",
    productImagesDesc:
      "Upload local images for instant preview (stored in browser state)",
    uploadLabel: "Upload",
    productVisibilityLabel: "Product Visibility",
    pricingMmkTitle: "Pricing (MMK)",
    priceMmkLabel: "Price (MMK) *",
    inventorySkuTitle: "Inventory & SKU",
    skuLabel: "SKU *",
    stockQuantityLabel: "Stock Quantity",
    lowStockThresholdLabel: "Low-Stock Threshold",
    cancelBtn: "Cancel",
    createProductBtn: "Create Product",
    saveChangesBtn: "Save Changes",

    categoriesPageTitle: "Categories",
    categoriesPageSubtitle: "Organize Pretty Corner beauty collections and product departments.",
    addCategoryBtn: "Add Category",
    addNewCategoryTitle: "Add New Category",
    editCategoryTitle: "Edit Category",
    addNewCategoryDesc: "Create a new product department for catalog organization.",
    editCategoryDesc: "Update category details and storefront visibility.",
    categoryNameLabel: "Category Name *",
    activeOnStorefrontLabel: "Active on Storefront",
    activeOnStorefrontDesc:
      "Inactive categories are hidden from the customer navigation menu.",
    createCategoryBtn: "Create Category",

    inventoryPageTitle: "Inventory Management",
    inventoryPageSubtitle: "Monitor stock levels, handle restocks, and audit stock adjustment logs.",
    stockLevelsTab: "Stock Levels",
    stockHistoryTab: "Stock History",

    customersPageTitle: "Customers",
    customersPageSubtitle: "View loyal shoppers, order history, and saved delivery addresses.",

    promotionsPageTitle: "Promotions & Campaigns",
    promotionsPageSubtitle: "Curate high-impact seasonal boutique banners, discount codes, 4-tier target routing, and hero product drops.",
    newPromotionBtn: "New Promotion",

    reportsPageTitle: "Sales Reports & Analytics",
    reportsPageSubtitle: "Evaluate revenue growth, category performance, and order conversion.",
    revenueTrendsTitle: "Revenue Trends",
    revenueTrendsDesc: "Sales performance over selected period",
    salesByCategoryTitle: "Sales by Category",
    salesByCategoryDesc: "Cumulative revenue per beauty category",
    ordersByStatusTitle: "Orders by Status",
    ordersByStatusDesc: "Current active order distribution",
    paymentChannelsTitle: "Payment Channels & Settlements",
    paymentChannelsDesc: "Volume and revenue distribution across payment providers",
    customerRetentionTitle: "Customer Retention & Segmentation",
    customerRetentionDesc: "First-time buyers vs. repeat beauty enthusiasts",
    bestSellingProductsTitle: "Best-Selling Products",
    bestSellingProductsDesc: "Top revenue-generating items in the selected period",

    settingsPageTitle: "Store Settings",
    settingsPageSubtitle: "Configure Pretty Corner social channels, stock thresholds, and alerts.",
    tabStoreContact: "Social Channels",
    tabPayments: "Payments",
    tabStockAlerts: "Stock & Alerts",
    tabAdminProfile: "Admin Profile",
    storeContactTitle: "Store & Contact Information",
    storeContactDesc: "Boutique identity and customer support channels",
    storeNameLabel: "Store Name",
    taglineLabel: "Tagline",
    supportEmailLabel: "Support Email",
    supportPhoneLabel: "Support Phone",
    viberHotlineLabel: "Viber Hotline",
    boutiqueAddressLabel: "Boutique Address",
    currencyLabel: "Currency",
    socialChannelsTitle: "Social Channels",
    socialChannelsDesc: "Public links used on storefront content (PC-CT-006)",
    paymentSettingsTitle: "Payment Method Settings",
    paymentSettingsDesc: "Enable or disable accepted checkout payment channels",
    lowStockThresholdTitle: "Low-Stock Threshold",
    lowStockThresholdDesc: "Default reorder alert threshold for new products",
    defaultThresholdLabel: "Default Threshold (Units)",
    notificationPrefsTitle: "Notification Preferences",
    notificationPrefsDesc: "Choose which admin alerts appear in your dashboard",
    adminProfileTitle: "Administrator Profile",
    adminProfileDesc: "Manage your administrator display details",
    fullNameLabel: "Full Name",
    roleLabel: "Role",
    emailAddressLabel: "Email Address",
    phoneNumberLabel: "Phone Number",
    saveSettingsBtn: "Save Settings",

    orderCol: "Order",
    customerCol: "Customer",
    paymentCol: "Payment",
    paymentMobileBanking: "Mobile Banking",
    paymentCOD: "Cash on Delivery",
    totalCol: "Total",
    statusCol: "Status",
    actionCol: "Action",
    productCol: "Product",
    categoryCol: "Category",
    priceCol: "Price",
    stockCol: "Stock",
    unitsSoldCol: "Units Sold",
    revenueCol: "Revenue",
    noData: "No data available",
    quickActions: "Quick Actions",

    range7d: "Last 7 Days",
    range30d: "Last 30 Days",
    range6m: "Last 6 Months",

    languageToggleLabel: "Language selection",
    langEn: "EN",
    langMy: "မြန်မာ",
  },

  my: {
    navDashboard: "ပင်မဒက်ရှ်ဘုတ်",
    navOrders: "အော်ဒါများ",
    navProducts: "ကုန်ပစ္စည်းများ",
    navCategories: "အမျိုးအစားများ",
    navInventory: "ကုန်ပစ္စည်းလက်ကျန်",
    navCustomers: "ဝယ်ယူသူများ",
    navPromotions: "ပရိုမိုးရှင်းများ",
    navReports: "အရောင်းအစီရင်ခံစာ",
    navSettings: "ဆက်တင်များ",
    navNewProduct: "ပစ္စည်းအသစ်ထည့်မည်",
    storeAdmin: "Pretty Corner စီမံခန့်ခွဲမှု",
    boutiqueOperations: "ဘိုတိတ်ဆိုင် လုပ်ငန်းလည်ပတ်မှု v1.0",
    expandSidebar: "မီနူးဖွင့်ရန်",
    collapseSidebar: "မီနူးပိတ်ရန်",
    loadingPrettyCorner: "Pretty Corner ကို ဖွင့်နေပါသည်...",

    searchPlaceholder: "အော်ဒါ၊ ပစ္စည်း၊ SKU ရှာဖွေရန်...",
    notifications: "အသိပေးချက်များ",
    markAllRead: "အားလုံးဖတ်ပြီးသားမှတ်ရန်",
    noNotifications: "အသိပေးချက်မရှိသေးပါ",
    allMarkedReadToast: "အသိပေးချက်အားလုံးကို ဖတ်ပြီးသားအဖြစ် မှတ်သားပြီးပါပြီ",
    profileAndSettings: "ပရိုဖိုင်နှင့် ဆက်တင်များ",
    resetDemoData: "သရုပ်ပြဒေတာ ပြန်လည်သတ်မှတ်ရန်",
    demoDataResetToast: "သရုပ်ပြဒေတာကို မူလအတိုင်း ပြန်လည်သတ်မှတ်ပြီးပါပြီ",
    signOut: "အကောင့်ထွက်ရန်",
    signOutToast: "စီမံခန့်ခွဲသူ အကောင့်မှ ထွက်ခွာပြီးပါပြီ",

    loginPortalTitle: "ဘိုတိတ်ဆိုင် စီမံခန့်ခွဲမှုနှင့် အော်ဒါပို့ဆောင်ရေး ပေါ်တယ်",
    adminLogin: "စီမံခန့်ခွဲသူ ဝင်ရောက်ရန်",
    secureAccessDesc: "ကုန်ပစ္စည်း၊ အော်ဒါနှင့် ဘဏ္ဍာရေး စနစ်အား လုံခြုံစွာ ဝင်ရောက်နိုင်ပါသည်",
    staffEmail: "ဝန်ထမ်း အီးမေးလ်",
    password: "လျှို့ဝှက်နံပါတ်",
    demoPin: "သရုပ်ပြ PIN: admin123",
    fillDemoCredentials: "သရုပ်ပြ အကောင့်အချက်အလက် ဖြည့်မည်",
    enterAdminPortal: "စီမံခန့်ခွဲရေး စနစ်သို့ ဝင်ရောက်မည်",
    authenticating: "စစ်ဆေးနေပါသည်...",
    loginWelcomeToast: "Pretty Corner စီမံခန့်ခွဲရေး စနစ်မှ ကြိုဆိုပါသည်",
    loginErrorToast: "အီးမေးလ် သို့မဟုတ် လျှို့ဝှက်နံပါတ် မှားယွင်းနေပါသည်။ သရုပ်ပြ: admin@prettycorner.com / admin123",
    loginEmptyToast: "ကျေးဇူးပြု၍ အီးမေးလ်နှင့် လျှို့ဝှက်နံပါတ် ထည့်သွင်းပါ",
    rememberMe: "ဤစက်တွင် ၇ ရက် မှတ်ထားပေးပါ",
    sessionExpiredToast: "အချိန်ကြာမြင့်စွာ အသုံးမပြုသဖြင့် လုံခြုံရေးအရ ပြန်လည်ဝင်ရောက်ပေးပါ",
    signedInAs: "အသုံးပြုသူ",

    statusPending: "ငွေပေးချေရန်ကျန် (Pending)",
    statusConfirmed: "အတည်ပြုပြီး",
    statusProcessing: "ပြင်ဆင်နေသည်",
    statusShipped: "ငွေပေးချေပြီး (Paid)",
    statusDelivered: "ပို့ဆောင်ပြီး",
    statusExpired: "အချိန်ပြည့် သက်တမ်းကုန်ဆုံး",
    statusCancelled: "ပယ်ဖျက်ပြီး",

    payPending: "ငွေပေးချေရန်ကျန် (Awaiting Payment)",
    payPaid: "ငွေပေးချေပြီး (Payment Verified / Success)",
    payFailed: "ငွေပေးချေမှု မအောင်မြင်ပါ (Payment Failed)",
    payExpired: "အချိန်ပြည့် သက်တမ်းကုန်ဆုံး (Time Expired)",
    payCancelled: "ပယ်ဖျက်ပြီး (Order / Transaction Cancelled)",

    prodActive: "ရောင်းချနေသည်",
    prodArchived: "သိမ်းဆည်းထားသည်",

    inStock: "လက်ကျန်ရှိသည်",
    lowStock: "လက်ကျန်နည်း",
    outOfStock: "ပစ္စည်းပြတ်လပ်",

    overviewTitle: "Pretty Corner ခြုံငုံသုံးသပ်ချက်",
    overviewSubtitle: "နေ့စဉ် အရောင်း၊ အော်ဒါပို့ဆောင်မှုနှင့် ကုန်ပစ္စည်းလက်ကျန်များကို တစ်နေရာတည်းတွင် ကြည့်ရှုစစ်ဆေးပါ။",
    salesSummaryTitle: "အရောင်းအကျဉ်းချုပ်",
    revenueOverviewTitle: "ဝင်ငွေ ခြုံငုံသုံးသပ်ချက်",
    ordersOverTimeTitle: "အချိန်အလိုက် အော်ဒါပမာဏ",
    orderStatusDistTitle: "အော်ဒါအခြေအနေ ခွဲခြမ်းစိတ်ဖြာမှု",
    liveBadge: "တိုက်ရိုက်",
    totalSales: "စုစုပေါင်း အရောင်းပမာဏ",
    totalOrders: "စုစုပေါင်း အော်ဒါ",
    avgOrderValue: "ပျမ်းမျှ အော်ဒါတန်ဖိုး",
    activeProducts: "ရောင်းချဆဲ ပစ္စည်းများ",
    urgentAttention: "အရေးပေါ် စစ်ဆေးရန်များ",
    pendingOrders: "စစ်ဆေးရန်ကျန် အော်ဒါများ",
    lowStockAlert: "လက်ကျန်နည်း ပစ္စည်းများ",
    lowStockAlertDesc: "ပြန်လည်မှာယူရန် သတ်မှတ်ပမာဏသို့ ရောက်ရှိနေသော ပစ္စည်းများ",
    recentOrders: "လတ်တလော အော်ဒါများ",
    recentOrdersDesc: "အွန်လိုင်းဆိုင်နှင့် ကောင်တာမှ နောက်ဆုံးရရှိသော အော်ဒါများ",
    topSellingProducts: "အရောင်းရဆုံး ပစ္စည်းများ",
    topSellingDesc: "အရေအတွက် အများဆုံး ရောင်းချရသော ပစ္စည်းများ",
    viewAllOrders: "အော်ဒါအားလုံး ကြည့်မည်",
    viewAllProducts: "ပစ္စည်းအားလုံး ကြည့်မည်",
    viewAllInventory: "ကုန်ပစ္စည်းလက်ကျန် ကြည့်မည်",

    ordersPageTitle: "အော်ဒါ စီမံခန့်ခွဲမှု",
    ordersPageSubtitle: "ဝယ်ယူသူ အော်ဒါများ၊ ငွေပေးချေမှု စစ်ဆေးခြင်းနှင့် ပို့ဆောင်မှုအဆင့်များကို စီမံပါ။",
    ordersListTitle: "အော်ဒါစာရင်း",
    purchasedProductsTitle: "ဝယ်ယူထားသော ပစ္စည်းများ",
    orderTimelineTitle: "အော်ဒါအခြေအနေ မှတ်တမ်း",
    orderTimelineDesc: "အော်ဒါနှင့် ပို့ဆောင်မှု အဆင့်ဆင့် ပြောင်းလဲမှု မှတ်တမ်း",
    orderPaymentStatusTitle: "အော်ဒါနှင့် ငွေပေးချေမှု အခြေအနေ",
    customerInfoTitle: "ဝယ်ယူသူ အချက်အလက်",

    productsPageTitle: "ကုန်ပစ္စည်းများ",
    productsPageSubtitle: "အလှကုန်ပစ္စည်း စာရင်း၊ ဈေးနှုန်းနှင့် လက်ကျန်ပမာဏများကို စီမံခန့်ခွဲပါ။",
    addProductBtn: "ပစ္စည်းအသစ်ထည့်မည်",
    addNewProductTitle: "ကုန်ပစ္စည်းအသစ် ထည့်သွင်းရန်",
    editProductPrefix: "ပြင်ဆင်ရန် -",
    productFormSubtitle: "ဈေးနှုန်း၊ ကုန်ပစ္စည်းလက်ကျန်နှင့် ဓာတ်ပုံများကို သတ်မှတ်ပါ",
    generalInfoTitle: "အခြေခံ အချက်အလက်",
    generalInfoDesc: "ကုန်ပစ္စည်း၏ အခြေခံအမည်နှင့် အကြောင်းအရာ",
    productNameLabel: "ကုန်ပစ္စည်းအမည် *",
    productDescriptionLabel: "ဖော်ပြချက်",
    productCategoryLabel: "အမျိုးအစား",
    productBrandLabel: "တံဆိပ် (Brand)",
    storefrontContentTitle: "ဆိုင်စာမျက်နှာ အချက်အလက်",
    storefrontContentDesc:
      "ဝယ်ယူသူစာမျက်နှာရှိ “Why we love it” နှင့် “How to use” အပိုင်းများကို ထိန်းချုပ်သည်",
    badgeOptionalLabel: "တံဆိပ်အမှတ်အသား (Badge - ရွေးချယ်နိုင်)",
    taglineOptionalLabel: "ဆောင်ပုဒ် (Tagline - ရွေးချယ်နိုင်)",
    whyWeLoveItLabel: "နှစ်သက်ရသည့် အဓိကအချက်များ (တစ်ကြောင်းလျှင် တစ်ချက်)",
    howToUseLabel: "အသုံးပြုနည်း",
    productImagesTitle: "ကုန်ပစ္စည်း ဓာတ်ပုံများ",
    productImagesDesc: "ချက်ချင်းကြည့်ရှုရန် စက်ထဲမှ ဓာတ်ပုံများ တင်ပါ",
    uploadLabel: "ပုံတင်မည်",
    productVisibilityLabel: "ပြသမှု အခြေအနေ",
    pricingMmkTitle: "ဈေးနှုန်းသတ်မှတ်ချက် (MMK)",
    priceMmkLabel: "ဈေးနှုန်း (MMK) *",
    inventorySkuTitle: "ကုန်ပစ္စည်းလက်ကျန်နှင့် SKU",
    skuLabel: "ကုန်ပစ္စည်းကုဒ် (SKU) *",
    stockQuantityLabel: "လက်ကျန် အရေအတွက်",
    lowStockThresholdLabel: "လက်ကျန်နည်း သတိပေးမည့် ပမာဏ",
    cancelBtn: "မလုပ်တော့ပါ",
    createProductBtn: "ပစ္စည်းအသစ် ထည့်မည်",
    saveChangesBtn: "ပြင်ဆင်မှု သိမ်းမည်",

    categoriesPageTitle: "အမျိုးအစားများ",
    categoriesPageSubtitle: "Pretty Corner အလှကုန် ကဏ္ဍများနှင့် အမျိုးအစားများကို စနစ်တကျ စီစဉ်ပါ။",
    addCategoryBtn: "အမျိုးအစားအသစ် ထည့်မည်",
    addNewCategoryTitle: "အမျိုးအစားအသစ် ထည့်သွင်းရန်",
    editCategoryTitle: "အမျိုးအစား ပြင်ဆင်ရန်",
    addNewCategoryDesc: "ကုန်ပစ္စည်းစာရင်း စနစ်တကျ စီစဉ်ရန် အမျိုးအစားအသစ် ဖန်တီးပါ။",
    editCategoryDesc: "အမျိုးအစား အချက်အလက်နှင့် ဆိုင်စာမျက်နှာ ပြသမှုကို ပြင်ဆင်ပါ။",
    categoryNameLabel: "အမျိုးအစား အမည် *",
    activeOnStorefrontLabel: "ဆိုင်စာမျက်နှာတွင် ပြသမည်",
    activeOnStorefrontDesc:
      "ပိတ်ထားသော အမျိုးအစားများကို ဝယ်ယူသူ မီနူးတွင် ဖျောက်ထားပါမည်။",
    createCategoryBtn: "အမျိုးအစား ဖန်တီးမည်",

    inventoryPageTitle: "ကုန်ပစ္စည်းလက်ကျန် စီမံခန့်ခွဲမှု",
    inventoryPageSubtitle: "ပစ္စည်းလက်ကျန် အခြေအနေများ၊ ဖြည့်တင်းမှုနှင့် ပြင်ဆင်မှုမှတ်တမ်းများကို စစ်ဆေးပါ။",
    stockLevelsTab: "လက်ကျန်အခြေအနေ",
    stockHistoryTab: "လက်ကျန် ပြင်ဆင်မှုမှတ်တမ်း",

    customersPageTitle: "ဝယ်ယူသူများ",
    customersPageSubtitle: "ပုံမှန်ဝယ်ယူသူများ၊ အော်ဒါမှတ်တမ်းနှင့် ပို့ဆောင်ရမည့် လိပ်စာများကို ကြည့်ရှုပါ။",

    promotionsPageTitle: "ပရိုမိုးရှင်းနှင့် ကမ်ပိန်းများ",
    promotionsPageSubtitle: "ရာသီအလိုက် ပရိုမိုးရှင်း ဘန်နာများ၊ လျှော့ဈေးကုဒ်များနှင့် အထူးထုတ်ကုန် ကမ်ပိန်းများကို စီမံဖန်တီးပါ။",
    newPromotionBtn: "ပရိုမိုးရှင်းအသစ် ဖန်တီးမည်",

    reportsPageTitle: "အရောင်းအစီရင်ခံစာနှင့် သုံးသပ်ချက်",
    reportsPageSubtitle: "ဝင်ငွေတိုးတက်မှု၊ အမျိုးအစားအလိုက် ရောင်းအားနှင့် အော်ဒါအခြေအနေများကို သုံးသပ်ပါ။",
    revenueTrendsTitle: "ဝင်ငွေ ပြောင်းလဲမှုနှုန်း",
    revenueTrendsDesc: "ရွေးချယ်ထားသော ကာလအတွင်း အရောင်းစွမ်းဆောင်ရည်",
    salesByCategoryTitle: "အမျိုးအစားအလိုက် ရောင်းအား",
    salesByCategoryDesc: "အလှကုန် အမျိုးအစားတစ်ခုချင်းစီအလိုက် စုစုပေါင်းဝင်ငွေ",
    ordersByStatusTitle: "အခြေအနေအလိုက် အော်ဒါများ",
    ordersByStatusDesc: "လက်ရှိ အော်ဒါများ၏ အခြေအနေခွဲခြမ်းစိတ်ဖြာမှု",
    paymentChannelsTitle: "ငွေပေးချေမှု နည်းလမ်းများ",
    paymentChannelsDesc: "ငွေပေးချေမှုစနစ်အလိုက် အရေအတွက်နှင့် ဝင်ငွေခွဲဝေမှု",
    customerRetentionTitle: "ဝယ်ယူသူ ထပ်မံဝယ်ယူမှုနှင့် အမျိုးအစားခွဲခြားမှု",
    customerRetentionDesc: "ပထမဆုံးအကြိမ် ဝယ်ယူသူများနှင့် ပုံမှန်ဖောက်သည်များ",
    bestSellingProductsTitle: "အရောင်းရဆုံး ကုန်ပစ္စည်းများ",
    bestSellingProductsDesc: "ရွေးချယ်ထားသော ကာလအတွင်း ဝင်ငွေအများဆုံး ရရှိသည့် ပစ္စည်းများ",

    settingsPageTitle: "ဆိုင် ဆက်တင်များ",
    settingsPageSubtitle: "Pretty Corner လူမှုကွန်ရက် ချန်နယ်များ၊ ကုန်ပစ္စည်းလက်ကျန် သတ်မှတ်ချက်နှင့် အသိပေးချက်များကို ပြင်ဆင်ပါ။",
    tabStoreContact: "လူမှုကွန်ရက် စာမျက်နှာများ",
    tabPayments: "ငွေပေးချေမှု",
    tabStockAlerts: "လက်ကျန်နှင့် သတိပေးချက်",
    tabAdminProfile: "စီမံခန့်ခွဲသူ ပရိုဖိုင်",
    storeContactTitle: "ဆိုင်နှင့် ဆက်သွယ်ရန် အချက်အလက်",
    storeContactDesc: "ဆိုင်အချက်အလက်နှင့် ဝယ်ယူသူ ဆက်သွယ်ရန် ချန်နယ်များ",
    storeNameLabel: "ဆိုင်အမည်",
    taglineLabel: "ဆောင်ပုဒ် (Tagline)",
    supportEmailLabel: "ဝန်ဆောင်မှု အီးမေးလ်",
    supportPhoneLabel: "ဝန်ဆောင်မှု ဖုန်းနံပါတ်",
    viberHotlineLabel: "Viber ဖုန်းနံပါတ်",
    boutiqueAddressLabel: "ဆိုင်လိပ်စာ",
    currencyLabel: "ငွေကြေး",
    socialChannelsTitle: "လူမှုကွန်ရက် စာမျက်နှာများ",
    socialChannelsDesc: "ဆိုင်စာမျက်နှာတွင် အသုံးပြုမည့် လူမှုကွန်ရက် လင့်ခ်များ",
    paymentSettingsTitle: "ငွေပေးချေမှု နည်းလမ်း ဆက်တင်များ",
    paymentSettingsDesc: "လက်ခံမည့် ငွေပေးချေမှု နည်းလမ်းများကို ဖွင့်/ပိတ် ပြုလုပ်ပါ",
    lowStockThresholdTitle: "လက်ကျန်နည်း သတိပေးချက် သတ်မှတ်ချက်",
    lowStockThresholdDesc: "ကုန်ပစ္စည်းအသစ်များအတွက် မူလ လက်ကျန်နည်း သတိပေးပမာဏ",
    defaultThresholdLabel: "မူလ သတ်မှတ်ပမာဏ (အရေအတွက်)",
    notificationPrefsTitle: "အသိပေးချက် ဆက်တင်များ",
    notificationPrefsDesc: "ဒက်ရှ်ဘုတ်တွင် ပြသမည့် အသိပေးချက်များကို ရွေးချယ်ပါ",
    adminProfileTitle: "စီမံခန့်ခွဲသူ ပရိုဖိုင်",
    adminProfileDesc: "စီမံခန့်ခွဲသူ၏ ပြသမည့် အချက်အလက်များကို စီမံပါ",
    fullNameLabel: "အမည်အပြည့်အစုံ",
    roleLabel: "ရာထူး / တာဝန်",
    emailAddressLabel: "အီးမေးလ်လိပ်စာ",
    phoneNumberLabel: "ဖုန်းနံပါတ်",
    saveSettingsBtn: "ဆက်တင်များ သိမ်းဆည်းမည်",

    orderCol: "အော်ဒါ",
    customerCol: "ဝယ်ယူသူ",
    paymentCol: "ငွေပေးချေမှု",
    paymentMobileBanking: "မိုဘိုင်းဘဏ်စနစ် (Mobile Banking)",
    paymentCOD: "အိမ်ရောက်ငွေချေ (Cash on Delivery)",
    totalCol: "ကျသင့်ငွေ",
    statusCol: "အခြေအနေ",
    actionCol: "လုပ်ဆောင်ချက်",
    productCol: "ကုန်ပစ္စည်း",
    categoryCol: "အမျိုးအစား",
    priceCol: "ဈေးနှုန်း",
    stockCol: "လက်ကျန်",
    unitsSoldCol: "ရောင်းရသည့် အရေအတွက်",
    revenueCol: "ရရှိငွေ",
    noData: "ဒေတာမရှိသေးပါ",
    quickActions: "အမြန် လုပ်ဆောင်ချက်များ",

    range7d: "လွန်ခဲ့သော ၇ ရက်",
    range30d: "လွန်ခဲ့သော ရက် ၃၀",
    range6m: "လွန်ခဲ့သော ၆ လ",

    languageToggleLabel: "ဘာသာစကား ရွေးချယ်မှု",
    langEn: "EN",
    langMy: "မြန်မာ",
  },
};
