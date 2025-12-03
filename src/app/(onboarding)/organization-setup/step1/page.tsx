// Step1Form.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { step1Schema, Step1Values } from "@/schemas/onboarding/step1Schema";

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useOnboardingStore } from "@/store/onboardingStore";
import { useRouter } from "next/navigation";

export default function Step1Form() {
  const router = useRouter();
  const saved = useOnboardingStore((s) => s.data.step1);
  const updateStep = useOnboardingStore((s) => s.updateStep);

  const form = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: saved || {
      companyName: "",
      registrationId: "",
      address: "",
      contactName: "",
      contactEmail: "",
      phone: "",
      website: "",
      industry: "",
    },
  });

  const onSubmit = (values: Step1Values) => {
    updateStep("step1", values);
    router.push("/organization-setup/step2");
  };

  return (
    <div className="bg-white">
      <h1 className="text-2xl font-bold mb-2">Company Information</h1>
      <p className="text-gray-600 mb-8">Configure your company information settings</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <FormField name="companyName" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name *</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="registrationId" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Registration ID</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="md:col-span-2">
              <FormField name="address" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField name="contactName" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Primary Contact Name</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="contactEmail" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Email</FormLabel>
                <FormControl><Input type="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="phone" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="website" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="md:col-span-2">
              <FormField name="industry" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

          </div>

          <div className="flex justify-between items-center mt-6">
            <div />

            <div className="flex items-center gap-6">
              <Button type="submit" variant="default">
                Next
              </Button>
            </div>
          </div>

        </form>
      </Form>
    </div>
  );
}
