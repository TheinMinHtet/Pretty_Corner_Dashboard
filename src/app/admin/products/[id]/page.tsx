"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Product } from "@/types/admin";
import { ProductForm } from "@/components/products/product-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!params.id) return;

    fetch(`/api/products/${params.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.product) {
          setProduct(data.product);
        }
      })
      .catch((err) => console.error("Failed to load product:", err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  if (loading) {
    return (
      <Card className="p-12 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-[#D96B91]" />
        <p className="text-xs text-[#806B73]">Loading product details...</p>
      </Card>
    );
  }

  if (!product) {
    return (
      <Card className="p-8 text-center">
        <p className="text-base font-semibold text-[#33272C]">
          Product not found
        </p>
        <p className="text-xs text-[#806B73] mt-1">
          This product may have been deleted from your catalog.
        </p>
        <Button asChild className="mt-4">
          <Link href="/admin/products">Back to Products</Link>
        </Button>
      </Card>
    );
  }

  return <ProductForm mode="edit" initialProduct={product} />;
}
