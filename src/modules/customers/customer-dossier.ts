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

  // Sort orders chronologically ascending to build address and contact timeline
  const chronological = [...orders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const order of chronological) {
    const rawPhone = (order.customerPhone || "").trim();
    const normPhone = normalizePhoneNumber(rawPhone);
    const key =
      normPhone ||
      (order.customerId && order.customerId.trim()) ||
      (order.customerName && order.customerName.trim().toLowerCase());

    if (!key) continue;

    const customerId =
      order.customerId && order.customerId.startsWith("cust-")
        ? order.customerId
        : `cust-${normPhone ? normPhone.replace(/[^\w]/g, "") : key}`;

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
          name: order.customerName?.trim() || "Valued Shopper",
          phone: order.customerPhone?.trim() || "N/A",
          email: order.customerEmail?.trim(),
          addresses,
          joinedAt: order.createdAt || new Date().toISOString(),
          notes: order.nearbyLandmark ? `Landmark: ${order.nearbyLandmark}` : undefined,
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
  const seenPhones = new Set<string>();

  customerMap.forEach(({ customer, orders: customerOrders }) => {
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

  // Sort by recent order date or lifetime spend
  dossiers.sort((a, b) => {
    if (a.lastOrderDate && b.lastOrderDate) {
      return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime();
    }
    if (a.lastOrderDate) return -1;
    if (b.lastOrderDate) return 1;
    return b.totalSpent - a.totalSpent;
  });

  // Apply optional filtering
  if (!options) return dossiers;

  const q = options.query?.trim().toLowerCase();
  const townshipFilter = options.township?.trim().toLowerCase();

  return dossiers.filter((d) => {
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
    return true;
  });
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
