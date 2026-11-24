import test from "node:test";
import assert from "node:assert/strict";
import {
  getCustomerDossiers,
  calculateCustomerSegmentCounts,
} from "../customer-dossier";
import { Customer, Order } from "@/types/admin";

function createMockCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "cust-1",
    name: "Su Myat Noe",
    phone: "09-784512390",
    email: "sumyatnoe@gmail.com",
    addresses: [
      {
        id: "addr-1",
        label: "Home",
        address: "No. 42, Kabar Aye Pagoda Rd",
        township: "Bahan",
        city: "Yangon",
        isDefault: true,
      },
    ],
    joinedAt: "2026-02-12T08:00:00Z",
    ...overrides,
  };
}

function createMockOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "ord-1",
    reference: "PC-2026-1001",
    customerId: "cust-1",
    customerName: "Su Myat Noe",
    customerPhone: "09-784512390",
    deliveryAddress: "No. 42, Kabar Aye Pagoda Rd",
    township: "Bahan",
    city: "Yangon",
    deliveryMethod: "courier",
    items: [],
    subtotal: 50000,
    deliveryFee: 2000,
    discountAmount: 0,
    total: 52000,
    paymentMethod: "Mobile Banking",
    paymentStatus: "Paid",
    orderStatus: "Shipped",
    timeline: [],
    createdAt: "2026-11-01T10:00:00Z",
    updatedAt: "2026-11-01T10:00:00Z",
    ...overrides,
  };
}

test("Customer Dossier Segmentation: All Shoppers returns complete customer roster", () => {
  const customers = [
    createMockCustomer({ id: "cust-1", name: "VIP Repeat Shopper", phone: "09-111111111" }),
    createMockCustomer({ id: "cust-2", name: "New First-Time Shopper", phone: "09-222222222" }),
    createMockCustomer({ id: "cust-3", name: "Zero Order Shopper", phone: "09-333333333" }),
  ];

  const orders = [
    createMockOrder({ id: "ord-1", customerId: "cust-1", customerPhone: "09-111111111", total: 100000 }),
    createMockOrder({ id: "ord-2", customerId: "cust-1", customerPhone: "09-111111111", total: 80000 }),
    createMockOrder({ id: "ord-3", customerId: "cust-2", customerPhone: "09-222222222", total: 45000 }),
  ];

  const all = getCustomerDossiers(orders, customers, { tier: "all" });
  assert.equal(all.length, 3);
});

test("Customer Dossier Segmentation: VIP Spenders strictly filters totalSpent >= 150000 MMK", () => {
  const customers = [
    createMockCustomer({ id: "cust-1", name: "High Roller", phone: "09-111111111" }),
    createMockCustomer({ id: "cust-2", name: "Low Spender", phone: "09-222222222" }),
  ];

  const orders = [
    createMockOrder({ id: "ord-1", customerId: "cust-1", customerName: "High Roller", customerPhone: "09-111111111", total: 160000 }),
    createMockOrder({ id: "ord-2", customerId: "cust-2", customerName: "Low Spender", customerPhone: "09-222222222", total: 40000 }),
  ];

  const vip = getCustomerDossiers(orders, customers, { tier: "vip" });
  assert.equal(vip.length, 1);
  assert.equal(vip[0].name, "High Roller");
  assert.equal(vip[0].totalSpent, 160000);
});

test("Customer Dossier Segmentation: Repeat Buyers strictly filters orderCount >= 2", () => {
  const customers = [
    createMockCustomer({ id: "cust-1", name: "Repeat Buyer", phone: "09-111111111" }),
    createMockCustomer({ id: "cust-2", name: "Single Buyer", phone: "09-222222222" }),
  ];

  const orders = [
    createMockOrder({ id: "ord-1", customerId: "cust-1", customerName: "Repeat Buyer", customerPhone: "09-111111111", total: 30000 }),
    createMockOrder({ id: "ord-2", customerId: "cust-1", customerName: "Repeat Buyer", customerPhone: "09-111111111", total: 40000 }),
    createMockOrder({ id: "ord-3", customerId: "cust-2", customerName: "Single Buyer", customerPhone: "09-222222222", total: 50000 }),
  ];

  const repeat = getCustomerDossiers(orders, customers, { tier: "repeat" });
  assert.equal(repeat.length, 1);
  assert.equal(repeat[0].name, "Repeat Buyer");
  assert.equal(repeat[0].orderCount, 2);
});

test("Customer Dossier Segmentation: New Shoppers strictly filters orderCount <= 1", () => {
  const customers = [
    createMockCustomer({ id: "cust-1", name: "Repeat Buyer", phone: "09-111111111" }),
    createMockCustomer({ id: "cust-2", name: "New First-Time Buyer", phone: "09-222222222" }),
    createMockCustomer({ id: "cust-3", name: "Registered Non-Buyer", phone: "09-333333333" }),
  ];

  const orders = [
    createMockOrder({ id: "ord-1", customerId: "cust-1", customerPhone: "09-111111111", total: 30000 }),
    createMockOrder({ id: "ord-2", customerId: "cust-1", customerPhone: "09-111111111", total: 40000 }),
    createMockOrder({ id: "ord-3", customerId: "cust-2", customerPhone: "09-222222222", total: 50000 }),
  ];

  const newShoppers = getCustomerDossiers(orders, customers, { tier: "new" });
  assert.equal(newShoppers.length, 2);
  const names = newShoppers.map((s) => s.name);
  assert.ok(names.includes("New First-Time Buyer"));
  assert.ok(names.includes("Registered Non-Buyer"));
  assert.ok(!names.includes("Repeat Buyer"));
});

test("calculateCustomerSegmentCounts calculates segment tallies accurately", () => {
  const customers = [
    createMockCustomer({ id: "cust-1", name: "VIP & Repeat", phone: "09-111111111" }),
    createMockCustomer({ id: "cust-2", name: "New Shopper", phone: "09-222222222" }),
    createMockCustomer({ id: "cust-3", name: "Zero Orders", phone: "09-333333333" }),
  ];

  const orders = [
    createMockOrder({ id: "ord-1", customerId: "cust-1", customerPhone: "09-111111111", total: 100000 }),
    createMockOrder({ id: "ord-2", customerId: "cust-1", customerPhone: "09-111111111", total: 80000 }),
    createMockOrder({ id: "ord-3", customerId: "cust-2", customerPhone: "09-222222222", total: 45000 }),
  ];

  const dossiers = getCustomerDossiers(orders, customers);
  const counts = calculateCustomerSegmentCounts(dossiers);

  assert.equal(counts.all, 3);
  assert.equal(counts.vip, 1);
  assert.equal(counts.repeat, 1);
  assert.equal(counts.new, 2);
});
