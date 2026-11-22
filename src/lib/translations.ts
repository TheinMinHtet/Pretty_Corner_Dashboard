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

  // Status Badges
  statusPending: string;
  statusConfirmed: string;
  statusProcessing: string;
  statusShipped: string;
  statusDelivered: string;
  statusCancelled: string;

  payPending: string;
  payPaid: string;
  payFailed: string;
  payExpired: string;
  payRefunded: string;
  payCancelled: string;

  prodActive: string;
  prodDraft: string;
  prodArchived: string;

  inStock: string;
  lowStock: string;
  outOfStock: string;

  // Dashboard Overview
  totalSales: string;
  totalOrders: string;
  avgOrderValue: string;
  activeProducts: string;
  urgentAttention: string;
  pendingOrders: string;
  lowStockAlert: string;
  recentOrders: string;
  recentOrdersDesc: string;
  topSellingProducts: string;
  topSellingDesc: string;
  viewAllOrders: string;
  viewAllProducts: string;
  viewAllInventory: string;

  // Table Columns & Common Labels
  orderCol: string;
  customerCol: string;
  paymentCol: string;
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

    statusPending: "Pending",
    statusConfirmed: "Confirmed",
    statusProcessing: "Processing",
    statusShipped: "Shipped",
    statusDelivered: "Delivered",
    statusCancelled: "Cancelled",

    payPending: "Pending",
    payPaid: "Paid",
    payFailed: "Failed",
    payExpired: "Expired",
    payRefunded: "Refunded",
    payCancelled: "Cancelled",

    prodActive: "Active",
    prodDraft: "Draft",
    prodArchived: "Archived",

    inStock: "In Stock",
    lowStock: "Low Stock",
    outOfStock: "Out of Stock",

    totalSales: "Total Sales",
    totalOrders: "Total Orders",
    avgOrderValue: "Avg Order Value",
    activeProducts: "Active Products",
    urgentAttention: "Urgent Attention",
    pendingOrders: "Pending Orders",
    lowStockAlert: "Low Stock Alert",
    recentOrders: "Recent Orders",
    recentOrdersDesc: "Latest storefront and counter orders",
    topSellingProducts: "Top Selling Products",
    topSellingDesc: "Highest velocity items by unit volume",
    viewAllOrders: "View all orders",
    viewAllProducts: "View all products",
    viewAllInventory: "Open inventory",

    orderCol: "Order",
    customerCol: "Customer",
    paymentCol: "Payment",
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

    statusPending: "ဆိုင်းငံ့ထားဆဲ",
    statusConfirmed: "အတည်ပြုပြီး",
    statusProcessing: "ပြင်ဆင်နေသည်",
    statusShipped: "ပို့ဆောင်ဆဲ",
    statusDelivered: "ပို့ဆောင်ပြီး",
    statusCancelled: "ပယ်ဖျက်ပြီး",

    payPending: "ငွေပေးချေရန်ကျန်",
    payPaid: "ငွေပေးချေပြီး",
    payFailed: "မအောင်မြင်ပါ",
    payExpired: "သက်တမ်းကုန်ဆုံး",
    payRefunded: "ငွေပြန်အမ်းပြီး",
    payCancelled: "ပယ်ဖျက်ပြီး",

    prodActive: "ရောင်းချနေသည်",
    prodDraft: "မူကြမ်း",
    prodArchived: "သိမ်းဆည်းထားသည်",

    inStock: "လက်ကျန်ရှိသည်",
    lowStock: "လက်ကျန်နည်း",
    outOfStock: "ပစ္စည်းပြတ်လပ်",

    totalSales: "စုစုပေါင်း အရောင်းပမာဏ",
    totalOrders: "စုစုပေါင်း အော်ဒါ",
    avgOrderValue: "ပျမ်းမျှ အော်ဒါတန်ဖိုး",
    activeProducts: "ရောင်းချဆဲ ပစ္စည်းများ",
    urgentAttention: "အရေးပေါ် စစ်ဆေးရန်များ",
    pendingOrders: "စစ်ဆေးရန်ကျန် အော်ဒါများ",
    lowStockAlert: "လက်ကျန်နည်း ပစ္စည်းများ",
    recentOrders: "လတ်တလော အော်ဒါများ",
    recentOrdersDesc: "အွန်လိုင်းဆိုင်နှင့် ကောင်တာမှ နောက်ဆုံးရရှိသော အော်ဒါများ",
    topSellingProducts: "အရောင်းရဆုံး ပစ္စည်းများ",
    topSellingDesc: "အရေအတွက် အများဆုံး ရောင်းချရသော ပစ္စည်းများ",
    viewAllOrders: "အော်ဒါအားလုံး ကြည့်မည်",
    viewAllProducts: "ပစ္စည်းအားလုံး ကြည့်မည်",
    viewAllInventory: "ကုန်ပစ္စည်းလက်ကျန် ကြည့်မည်",

    orderCol: "အော်ဒါ",
    customerCol: "ဝယ်ယူသူ",
    paymentCol: "ငွေပေးချေမှု",
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
