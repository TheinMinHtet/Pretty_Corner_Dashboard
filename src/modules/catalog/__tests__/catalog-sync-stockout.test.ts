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
      variants: [],
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
      variants: [],
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

  test('SELECTED_PRODUCTS target tier: returns true only if ALL featured products are out of stock', () => {
    const allOutPromo: Promotion = {
      id: 'p3',
      title: 'Out of Stock Drop',
      subtitle: '',
      code: 'EMPTYDROP',
      discountPercentage: 25,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      active: true,
      targetType: 'SELECTED_PRODUCTS',
      redemptionMethod: 'CODE',
      usageCount: 0,
      bannerColor: '#FCEEF2',
      featuredProductIds: ['prod-out-stock'],
      isOutOfStock: false,
    };

    assert.equal(evaluatePromotionStockout(allOutPromo, mockProducts), true);

    const mixedPromo: Promotion = {
      id: 'p4',
      title: 'Mixed Drop',
      subtitle: '',
      code: 'MIXEDDROP',
      discountPercentage: 25,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      active: true,
      targetType: 'SELECTED_PRODUCTS',
      redemptionMethod: 'CODE',
      usageCount: 0,
      bannerColor: '#FCEEF2',
      featuredProductIds: ['prod-out-stock', 'prod-in-stock'],
      isOutOfStock: false,
    };

    // Since at least 1 item is still in stock, the campaign is NOT out of stock
    assert.equal(evaluatePromotionStockout(mixedPromo, mockProducts), false);
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
