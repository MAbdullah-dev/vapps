"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type ProductRow = {
  sku: string;
  name: string;
  category: string;
  unit: string;
  cost: string;
  reorder: string;
};

export default function ProductsInventoryPage() {
  const [rows, setRows] = useState<ProductRow[]>([
    { sku: "", name: "", category: "", unit: "", cost: "", reorder: "" },
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground mb-1">Settings &gt; Products &amp; Inventory</div>
          <h1 className="text-2xl font-semibold text-foreground">Products &amp; Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage products and stock defaults moved from onboarding.
          </p>
        </div>
        <Button variant="dark">Save Changes</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Catalog</CardTitle>
          <CardDescription>All onboarding product fields are available here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {rows.map((row, index) => (
            <div key={index} className="space-y-4 border rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input
                    value={row.sku}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, sku: value } : r)));
                    }}
                    placeholder="Enter SKU"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Product Name</Label>
                  <Input
                    value={row.name}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, name: value } : r)));
                    }}
                    placeholder="Enter product name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={row.category}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRows((prev) =>
                        prev.map((r, i) => (i === index ? { ...r, category: value } : r))
                      );
                    }}
                    placeholder="Enter category"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit of Measure</Label>
                  <Input
                    value={row.unit}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, unit: value } : r)));
                    }}
                    placeholder="pcs, box, kg"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit Cost</Label>
                  <Input
                    value={row.cost}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, cost: value } : r)));
                    }}
                    placeholder="Enter cost"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reorder Level</Label>
                  <Input
                    value={row.reorder}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRows((prev) =>
                        prev.map((r, i) => (i === index ? { ...r, reorder: value } : r))
                      );
                    }}
                    placeholder="e.g. 20"
                  />
                </div>
              </div>

              {rows.length > 1 && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                  >
                    Remove Product
                  </Button>
                </div>
              )}
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setRows((prev) => [
                ...prev,
                { sku: "", name: "", category: "", unit: "", cost: "", reorder: "" },
              ])
            }
          >
            + Add Product
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
