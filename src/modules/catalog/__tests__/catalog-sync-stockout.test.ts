import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePromotionStockout } from '../catalog-sync';
import { Product, Promotion } from '@/types/admin';

describe('evaluatePromotionStockout', () => {
  const mockProducts: Product[] = [
    {
      id: 'prod-in-stock',
      slug: 'rose-water',
      name: 'Rose Water Mist',
      sku: 'RW-001',
      description: '',
      brand: '',
      lowStockThreshold: 10,
      status: 'Active',
      regularPrice: 20000,
      stock: 5,
      categoryId: 'skincare',
      images: [],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      soldCount: 0,
    },
    {
      id: 'prod-out-stock',
      slug: 'serum-glow',
      name: 'Glow Serum',
      sku: 'SG-002',
      description: '',
      brand: '',
      lowStockThreshold: 10,
      status: 'Active',
      regularPrice: 35000,
      stock: 0,
      categoryId: 'skincare',
      images: [],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      soldCount: 0,
    },
  ];

  test('SINGLE_PRODUCT target tier: returns true when target product stock is 0', () => {
    const promo: Promotion = {
      id: 'p1',
      title: 'Serum Flash Sale',
      subtitle: '',
      code: 'SERUMFLASH',
      discountPercentage: 20,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      active: true,
      targetType: 'SINGLE_PRODUCT',
      targetSlug: 'serum-glow',
      redemptionMethod: 'CODE',
      usageCount: 0,
      bannerColor: '#FCEEF2',
      featuredProductIds: [],
      isOutOfStock: false,
    };

    assert.equal(evaluatePromotionStockout(promo, mockProducts), true);
  });

  test('SINGLE_PRODUCT target tier: returns false when target product has stock', () => {
    const promo: Promotion = {
      id: 'p2',
      title: 'Rose Mist Sale',
      subtitle: '',
      code: 'ROSEMIST',
      discountPercentage: 15,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      active: true,
      targetType: 'SINGLE_PRODUCT',
      targetSlug: 'rose-water',
      redemptionMethod: 'CODE',
      usageCount: 0,
      bannerColor: '#FCEEF2',
      featuredProductIds: [],
      isOutOfStock: false,
    };

    assert.equal(evaluatePromotionStockout(promo, mockProducts), false);
  });

  test('ENTIRE_STORE target tier: returns false (storewide campaigns remain active)', () => {
    const storewidePromo: Promotion = {
      id: 'p5',
      title: 'Storewide Holiday',
      subtitle: '',
      code: 'ALLSTORE',
      discountPercentage: 10,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      active: true,
      targetType: 'ENTIRE_STORE',
      redemptionMethod: 'CODE',
      usageCount: 0,
      bannerColor: '#FCEEF2',
      featuredProductIds: [],
      isOutOfStock: false,
    };

    assert.equal(evaluatePromotionStockout(storewidePromo, mockProducts), false);
  });
});
