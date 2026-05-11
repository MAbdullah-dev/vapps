"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Party = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

export default function CustomersVendorsPage() {
  const [activeTab, setActiveTab] = useState<"customers" | "vendors">("customers");
  const [customers, setCustomers] = useState<Party[]>([{ name: "", email: "", phone: "", address: "" }]);
  const [vendors, setVendors] = useState<Party[]>([{ name: "", email: "", phone: "", address: "" }]);

  const rows = activeTab === "customers" ? customers : vendors;
  const setRows = activeTab === "customers" ? setCustomers : setVendors;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1 text-sm text-muted-foreground">Settings &gt; Customers &amp; Vendors</div>
          <h1 className="text-2xl font-semibold text-foreground">Customers &amp; Vendors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage customer and vendor records moved from onboarding.
          </p>
        </div>
        <Button variant="dark">Save Changes</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
          <CardDescription>All onboarding fields are available for both customers and vendors.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex w-fit gap-3 rounded-full border bg-muted p-1">
            <Button
              type="button"
              variant={activeTab === "customers" ? "default" : "ghost"}
              className="rounded-full px-4"
              onClick={() => setActiveTab("customers")}
            >
              Customers
            </Button>
            <Button
              type="button"
              variant={activeTab === "vendors" ? "default" : "ghost"}
              className="rounded-full px-4"
              onClick={() => setActiveTab("vendors")}
            >
              Vendors
            </Button>
          </div>

          {rows.map((row, index) => (
            <div key={index} className="space-y-4 border rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{activeTab === "customers" ? "Customer Name" : "Vendor Name"}</Label>
                  <Input
                    value={row.name}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, name: value } : r)));
                    }}
                    placeholder={activeTab === "customers" ? "ABC Corp" : "Supplier Inc"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={row.email}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, email: value } : r)));
                    }}
                    placeholder="contact@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={row.phone}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, phone: value } : r)));
                    }}
                    placeholder="+1 555-0100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={row.address}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRows((prev) =>
                        prev.map((r, i) => (i === index ? { ...r, address: value } : r))
                      );
                    }}
                    placeholder="123 Main St"
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
                    Remove
                  </Button>
                </div>
              )}
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => setRows((prev) => [...prev, { name: "", email: "", phone: "", address: "" }])}
          >
            + Add {activeTab === "customers" ? "Customer" : "Vendor"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
