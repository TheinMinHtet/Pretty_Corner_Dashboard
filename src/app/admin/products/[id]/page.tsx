"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAdminStore } from "@/context/admin-store";
import { ProductForm } from "@/components/products/product-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const { products } = useAdminStore();
  const product = products.find((p) => p.id === params.id);

  if (!product) {
    return (
      <Card className="p-8 text-center">
        <p className="text-base font-semibold text-[#33272C]">
          Product not found
        </p>
        <p className="text-xs text-[#806B73] mt-1">
          This product may have been deleted from your local catalog.
        </p>
        <Button asChild className="mt-4">
          <Link href="/admin/products">Back to Products</Link>
        </Button>
      </Card>
    );
  }

  return <ProductForm mode="edit" initialProduct={product} />;
}
