import { Customer, CustomerAddress, Order } from "@/types/admin";

export interface CustomerDossier extends Customer {
  normalizedPhone: string;
  orders: Order[];
  totalSpent: number;
  orderCount: number;
  activeOrdersCount: number;
  completedOrdersCount: number;
  cancelledOrdersCount: number;
  averageOrderValue: number;
  lastOrderDate: string | null;
  primaryTownship: string;
}

/**
 * Normalizes Myanmar phone numbers to a canonical E.164-style representation.
 * Handles Myanmar numeric glyphs, 09-prefixed numbers, and international 959 prefixes.
 */
export function normalizePhoneNumber(raw: string): string {
  if (!raw) return "";

  // Convert Myanmar numerals to Western Arabic
  const myanmarNumerals: Record<string, string> = {
    "၀": "0", "၁": "1", "၂": "2", "၃": "3", "၄": "4",
    "၅": "5", "၆": "6", "၇": "7", "၈": "8", "၉": "9",
  };
  const converted = raw.replace(/[၀-၉]/g, (char) => myanmarNumerals[char] || char);

  // Strip all non-digits except a leading +
  const cleaned = converted.trim().replace(/[^\d+]/g, "");
  if (!cleaned) return "";

  if (cleaned.startsWith("+959")) {
    return cleaned;
  }
  if (cleaned.startsWith("959")) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith("09")) {
    return `+959${cleaned.slice(2)}`;
  }
  if (cleaned.startsWith("9") && cleaned.length >= 8 && cleaned.length <= 11) {
    return `+95${cleaned}`;
  }
  return cleaned;
}

export interface CustomerDossierFilterOptions {
  query?: string;
  township?: string;
  tier?: "all" | "vip" | "repeat" | "new";
  sortKey?: "totalSpent" | "lastOrder" | "orderCount" | "joinedAt" | "name";
  sortDir?: "asc" | "desc";
}

/**
 * Deep Customer Dossier Engine:
 * Reconciles and unifies guest shoppers and repeat customers by phone number or ID.
 * Produces fully calculated customer profiles with immutable financial aggregates
 * and unified delivery address books.
 */
export function getCustomerDossiers(
  orders: Order[],
  fallbackCustomers: Customer[] = [],
  options?: CustomerDossierFilterOptions
): CustomerDossier[] {
  const customerMap = new Map<
    string,
    {
      latestTimestamp: number;
      customer: Customer;
      orders: Order[];
    }
  >();

  // Index known fallback customers for robust bidirectional linking
  const fallbackById = new Map<string, Customer>();
  const fallbackByPhone = new Map<string, Customer>();
  for (const c of fallbackCustomers) {
    if (c.id) fallbackById.set(c.id, c);
    const np = normalizePhoneNumber(c.phone);
    if (np) fallbackByPhone.set(np, c);
  }

  // Sort orders chronologically ascending to build address and contact timeline
  const chronological = [...orders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const order of chronological) {
    const rawPhone = (order.customerPhone || "").trim();
    const normPhone = normalizePhoneNumber(rawPhone);
    const matchedFallback =
      (order.customerId && fallbackById.get(order.customerId)) ||
      (normPhone && fallbackByPhone.get(normPhone));

    const key =
      matchedFallback?.id ||
      normPhone ||
      (order.customerId && order.customerId.trim()) ||
      (order.customerName && order.customerName.trim().toLowerCase());

    if (!key) continue;

    const customerId =
      matchedFallback?.id ||
      (order.customerId && order.customerId.startsWith("cust-")
        ? order.customerId
        : `cust-${normPhone ? normPhone.replace(/[^\w]/g, "") : key}`);

    const customerName =
      matchedFallback?.name || order.customerName?.trim() || "Valued Shopper";
    const customerPhone =
      matchedFallback?.phone || order.customerPhone?.trim() || "N/A";
    const customerEmail =
      matchedFallback?.email || order.customerEmail?.trim();

    const orderTime = new Date(order.createdAt).getTime() || Date.now();
    const existing = customerMap.get(key);

    if (!existing) {
      const addresses: CustomerAddress[] = [];
      if (order.deliveryAddress && order.deliveryAddress.trim()) {
        addresses.push({
          id: `addr-${order.id}-0`,
          label: "Primary Delivery Address",
          address: order.deliveryAddress.trim(),
          township: order.township || "Yangon",
          city: order.city || "Yangon",
          nearbyLandmark: order.nearbyLandmark,
          isDefault: true,
        });
      }

      customerMap.set(key, {
        latestTimestamp: orderTime,
        orders: [order],
        customer: {
          id: customerId,
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
          addresses,
          joinedAt: matchedFallback?.joinedAt || order.createdAt || new Date().toISOString(),
          notes: matchedFallback?.notes || (order.nearbyLandmark ? `Landmark: ${order.nearbyLandmark}` : undefined),
        },
      });
    } else {
      existing.orders.push(order);

      // Update with newest contact info if this order is more recent
      if (orderTime >= existing.latestTimestamp) {
        existing.latestTimestamp = orderTime;
        if (order.customerName && order.customerName.trim()) {
          existing.customer.name = order.customerName.trim();
        }
        if (order.customerPhone && order.customerPhone.trim()) {
          existing.customer.phone = order.customerPhone.trim();
        }
        if (order.customerEmail && order.customerEmail.trim()) {
          existing.customer.email = order.customerEmail.trim();
        }
        if (order.nearbyLandmark && !existing.customer.notes) {
          existing.customer.notes = `Landmark: ${order.nearbyLandmark}`;
        }
      }

      // Record any newly observed delivery address
      if (order.deliveryAddress && order.deliveryAddress.trim()) {
        const addrText = order.deliveryAddress.trim().toLowerCase();
        const alreadyHas = existing.customer.addresses.some(
          (a) => a.address.trim().toLowerCase() === addrText
        );
        if (!alreadyHas) {
          existing.customer.addresses.push({
            id: `addr-${order.id}-${existing.customer.addresses.length}`,
            label: `Address #${existing.customer.addresses.length + 1}`,
            address: order.deliveryAddress.trim(),
            township: order.township || "Yangon",
            city: order.city || "Yangon",
            nearbyLandmark: order.nearbyLandmark,
            isDefault: false,
          });
        }
      }
    }
  }

  // Build the rich dossier objects
  const dossiers: CustomerDossier[] = [];
  const seenCustomerIds = new Set<string>();
  const seenPhones = new Set<string>();

  customerMap.forEach(({ customer, orders: customerOrders }) => {
    if (customer.id) seenCustomerIds.add(customer.id);
    const normPhone = normalizePhoneNumber(customer.phone);
    if (normPhone) seenPhones.add(normPhone);

    const sortedOrders = [...customerOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const validOrders = sortedOrders.filter((o) => o.orderStatus !== "Cancelled");
    const totalSpent = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const orderCount = sortedOrders.length;
    const completedOrdersCount = sortedOrders.filter(
      (o) => o.orderStatus === "Shipped" || o.paymentStatus === "Paid"
    ).length;
    const cancelledOrdersCount = sortedOrders.filter((o) => o.orderStatus === "Cancelled").length;
    const activeOrdersCount = orderCount - completedOrdersCount - cancelledOrdersCount;
    const averageOrderValue = validOrders.length > 0 ? Math.round(totalSpent / validOrders.length) : 0;
    const lastOrderDate = sortedOrders[0]?.createdAt ?? null;
    const primaryTownship =
      sortedOrders[0]?.township || customer.addresses[0]?.township || "Yangon";

    dossiers.push({
      ...customer,
      normalizedPhone: normPhone,
      orders: sortedOrders,
      totalSpent,
      orderCount,
      activeOrdersCount,
      completedOrdersCount,
      cancelledOrdersCount,
      averageOrderValue,
      lastOrderDate,
      primaryTownship,
    });
  });

  // Merge any standalone customers (e.g. from seed/database) that haven't ordered yet
  for (const c of fallbackCustomers) {
    if (c.id && seenCustomerIds.has(c.id)) continue;
    const normPhone = normalizePhoneNumber(c.phone);
    if (normPhone && seenPhones.has(normPhone)) continue;

    dossiers.push({
      ...c,
      normalizedPhone: normPhone,
      orders: [],
      totalSpent: 0,
      orderCount: 0,
      activeOrdersCount: 0,
      completedOrdersCount: 0,
      cancelledOrdersCount: 0,
      averageOrderValue: 0,
      lastOrderDate: null,
      primaryTownship: c.addresses[0]?.township || "Yangon",
    });
  }

  // Apply optional filtering
  let filtered = dossiers;
  if (options) {
    const q = options.query?.trim().toLowerCase();
    const townshipFilter = options.township?.trim().toLowerCase();
    const tier = options.tier;

    filtered = filtered.filter((d) => {
      if (q) {
        const matchName = d.name.toLowerCase().includes(q);
        const matchPhone = d.phone.toLowerCase().includes(q) || d.normalizedPhone.includes(q);
        const matchEmail = Boolean(d.email && d.email.toLowerCase().includes(q));
        const matchTownship = d.primaryTownship.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchTownship) {
          return false;
        }
      }
      if (townshipFilter && townshipFilter !== "all") {
        if (d.primaryTownship.toLowerCase() !== townshipFilter) {
          return false;
        }
      }
      if (tier && tier !== "all") {
        if (tier === "vip" && d.totalSpent < 150000) {
          return false;
        }
        if (tier === "repeat" && d.orderCount < 2) {
          return false;
        }
        if (tier === "new" && d.orderCount > 1) {
          return false;
        }
      }
      return true;
    });
  }

  // Apply sorting
  const sortKey = options?.sortKey;
  const sortDir = options?.sortDir === "asc" ? 1 : -1;

  filtered.sort((a, b) => {
    if (sortKey === "totalSpent") {
      return (a.totalSpent - b.totalSpent) * sortDir;
    }
    if (sortKey === "orderCount") {
      return (a.orderCount - b.orderCount) * sortDir;
    }
    if (sortKey === "lastOrder") {
      if (!a.lastOrderDate && !b.lastOrderDate) return 0;
      if (!a.lastOrderDate) return 1;
      if (!b.lastOrderDate) return -1;
      return (new Date(a.lastOrderDate).getTime() - new Date(b.lastOrderDate).getTime()) * sortDir;
    }
    if (sortKey === "joinedAt") {
      const timeA = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
      const timeB = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
      return (timeA - timeB) * sortDir;
    }
    if (sortKey === "name") {
      return a.name.localeCompare(b.name) * sortDir;
    }

    // Default business sort: recent order date desc, then totalSpent desc
    if (a.lastOrderDate && b.lastOrderDate) {
      return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime();
    }
    if (a.lastOrderDate) return -1;
    if (b.lastOrderDate) return 1;
    return b.totalSpent - a.totalSpent;
  });

  return filtered;
}

/**
 * Retrieves a single customer dossier by ID or phone number.
 */
export function getCustomerDossierByPhoneOrId(
  orders: Order[],
  identifier: string,
  fallbackCustomers: Customer[] = []
): CustomerDossier | null {
  if (!identifier) return null;
  const targetNorm = normalizePhoneNumber(identifier);
  const targetClean = identifier.trim().toLowerCase();

  const dossiers = getCustomerDossiers(orders, fallbackCustomers);
  return (
    dossiers.find(
      (d) =>
        d.id === identifier ||
        d.name.toLowerCase() === targetClean ||
        (targetNorm && d.normalizedPhone === targetNorm)
    ) ?? null
  );
}

export interface CustomerSegmentCounts {
  all: number;
  vip: number;
  repeat: number;
  new: number;
}

/**
 * Computes live segment tallies for the customer segmentation filters.
 */
export function calculateCustomerSegmentCounts(
  dossiers: CustomerDossier[]
): CustomerSegmentCounts {
  let vip = 0;
  let repeat = 0;
  let newShoppers = 0;

  for (const d of dossiers) {
    if (d.totalSpent >= 150000) {
      vip++;
    }
    if (d.orderCount >= 2) {
      repeat++;
    }
    if (d.orderCount <= 1) {
      newShoppers++;
    }
  }

  return {
    all: dossiers.length,
    vip,
    repeat,
    new: newShoppers,
  };
}

