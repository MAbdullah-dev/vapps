"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Step5Schema, Step5SchemaType } from "@/schemas/onboarding/step5Schema";

import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/store/onboardingStore";

const Step5 = () => {
  const router = useRouter();

  const saved = useOnboardingStore((s) => s.data.step5);
  const updateStep = useOnboardingStore((s) => s.updateStep);

  const form = useForm<Step5SchemaType>({
    resolver: zodResolver(Step5Schema),
    defaultValues: saved || {
      baseCurrency: "",
      fiscalYearStart: "",
      defaultTaxRate: "",
      paymentTerms: "",
      chartOfAccountsTemplate: "",
      defaultAssetAccount: "",
      defaultRevenueAccount: "",
      defaultExpenseAccount: "",
    },
  });

  const onSubmit = (values: Step5SchemaType) => {
    updateStep("step5", values);
    router.push("/organization-setup/step6");
  };

  return (
    <Form {...form}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">Financial Setup</h1>
          <p className="text-sm text-muted-foreground">Configure your financial setup settings</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Base Currency */}
            <FormField
              control={form.control}
              name="baseCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Currency</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="USD - US Dollar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usd">USD - US Dollar</SelectItem>
                        <SelectItem value="eur">EUR - Euro</SelectItem>
                        <SelectItem value="gbp">GBP - British Pound</SelectItem>
                        <SelectItem value="pkr">PKR - Pakistani Rupee</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fiscal Year */}
            <FormField
              control={form.control}
              name="fiscalYearStart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fiscal Year Start</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="January" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="january">January</SelectItem>
                        <SelectItem value="april">April</SelectItem>
                        <SelectItem value="july">July</SelectItem>
                        <SelectItem value="october">October</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tax Rate */}
            <FormField
              control={form.control}
              name="defaultTaxRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Tax Rate (%)</FormLabel>
                  <FormControl><Input placeholder="30" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Terms */}
            <FormField
              control={form.control}
              name="paymentTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Payment Terms (days)</FormLabel>
                  <FormControl><Input placeholder="30" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          </div>

          {/* Chart of Accounts */}
          <div>
            <FormField
              control={form.control}
              name="chartOfAccountsTemplate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chart of Accounts Template</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Standard Business" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard Business</SelectItem>
                        <SelectItem value="nonprofit">Nonprofit</SelectItem>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Accounts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <FormField
              control={form.control}
              name="defaultAssetAccount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Asset Account</FormLabel>
                  <FormControl><Input placeholder="1000 - Cash" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="defaultRevenueAccount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Revenue Account</FormLabel>
                  <FormControl><Input placeholder="4000 - Sales" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="defaultExpenseAccount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Expense Account</FormLabel>
                  <FormControl><Input placeholder="5000 - Operating Expense" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          </div>

          <div className="flex justify-end">
            <Button type="submit">Save & Continue</Button>
          </div>
        </form>
      </div>
    </Form>
  );
};

export default Step5;
