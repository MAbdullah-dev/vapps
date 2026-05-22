"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FinancialSetupPage() {
  const [formData, setFormData] = useState({
    baseCurrency: "",
    fiscalYearStart: "",
    defaultTaxRate: "",
    paymentTerms: "",
    chartOfAccountsTemplate: "",
    defaultAssetAccount: "",
    defaultRevenueAccount: "",
    defaultExpenseAccount: "",
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground mb-1">Settings &gt; Financial Setup</div>
          <h1 className="text-2xl font-semibold text-foreground">Financial Setup</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure currency, accounting template, and default financial accounts.
          </p>
        </div>
        <Button variant="dark">Save Changes</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Core Financial Settings</CardTitle>
          <CardDescription>Fields moved from onboarding financial setup.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Base Currency</Label>
              <Select
                value={formData.baseCurrency}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, baseCurrency: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select base currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD - US Dollar</SelectItem>
                  <SelectItem value="eur">EUR - Euro</SelectItem>
                  <SelectItem value="gbp">GBP - British Pound</SelectItem>
                  <SelectItem value="pkr">PKR - Pakistani Rupee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fiscal Year Start</Label>
              <Select
                value={formData.fiscalYearStart}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, fiscalYearStart: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fiscal year start" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="january">January</SelectItem>
                  <SelectItem value="april">April</SelectItem>
                  <SelectItem value="july">July</SelectItem>
                  <SelectItem value="october">October</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Default Tax Rate (%)</Label>
              <Input
                value={formData.defaultTaxRate}
                onChange={(e) => setFormData((prev) => ({ ...prev, defaultTaxRate: e.target.value }))}
                placeholder="30"
              />
            </div>

            <div className="space-y-2">
              <Label>Default Payment Terms (days)</Label>
              <Input
                value={formData.paymentTerms}
                onChange={(e) => setFormData((prev) => ({ ...prev, paymentTerms: e.target.value }))}
                placeholder="30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Chart of Accounts Template</Label>
            <Select
              value={formData.chartOfAccountsTemplate}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, chartOfAccountsTemplate: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard Business</SelectItem>
                <SelectItem value="nonprofit">Nonprofit</SelectItem>
                <SelectItem value="manufacturing">Manufacturing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Default Asset Account</Label>
              <Input
                value={formData.defaultAssetAccount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, defaultAssetAccount: e.target.value }))
                }
                placeholder="1000 - Cash"
              />
            </div>
            <div className="space-y-2">
              <Label>Default Revenue Account</Label>
              <Input
                value={formData.defaultRevenueAccount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, defaultRevenueAccount: e.target.value }))
                }
                placeholder="4000 - Sales"
              />
            </div>
            <div className="space-y-2">
              <Label>Default Expense Account</Label>
              <Input
                value={formData.defaultExpenseAccount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, defaultExpenseAccount: e.target.value }))
                }
                placeholder="5000 - Operating Expense"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
