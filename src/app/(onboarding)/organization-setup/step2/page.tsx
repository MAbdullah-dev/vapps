"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { step2Schema, Step2Values } from "@/schemas/onboarding/step2Schema";

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useOnboardingStore } from "@/store/onboardingStore";
import { useRouter } from "next/navigation";

export default function Step2() {
  const router = useRouter();
  const savedSites = useOnboardingStore((s) => s.data.step2.sites);
  const addSite = useOnboardingStore((s) => s.addSite);

  const form = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      siteName: "",
      siteCode: "",
      location: "",
      process: "",
    },
  });

  const onSubmit = (values: Step2Values) => {
    addSite({
      siteName: values.siteName,
      siteCode: values.siteCode,
      location: values.location,
      processes: values.process ? [values.process] : [],
    });
    form.reset();
    console.log("Site added:", values);
    router.push("/organization-setup/step3");
  };

  return (
    <div className="">
      <h2 className="text-lg font-semibold mb-2">Sites & Processes</h2>
      <p className="text-sm text-gray-500 mb-6">
        Configure your sites and assign process groups using process taxonomy (ISO-aligned)
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="siteName" render={({ field }) => (
              <FormItem>
                <FormLabel>Site Name *</FormLabel>
                <FormControl><Input placeholder="Main Office" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="siteCode" render={({ field }) => (
              <FormItem>
                <FormLabel>Site Code *</FormLabel>
                <FormControl><Input placeholder="S001" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem>
                <FormLabel>Location *</FormLabel>
                <FormControl><Input placeholder="New York, NY" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="process" render={({ field }) => (
            <FormItem>
              <FormLabel>Assign Processes to this Site</FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                  <select {...field} className="w-full border border-gray-200 rounded-md h-10 px-3 bg-gray-50 text-sm">
                    <option value="">Select a process from taxonomy..</option>
                  </select>
                  <Button variant="outline" type="button">+</Button>
                  <span className="text-xs text-gray-500 w-32 text-right">{0} processes assigned</span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/organization-setup/step1")}>
              Previous
            </Button>
            <Button type="submit" variant="default">
              Next
            </Button>
          </div>
        </form>
      </Form>

      <div className="mt-6 p-4 rounded-lg bg-[#E8F1FF] border border-[#C3D9FF]">
        <h3 className="font-semibold text-sm mb-1">About Process Taxonomy</h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          Process taxonomy follows ISO 9001 standards, organizing your operations into standardized process groups.
          Each site can have multiple processes assigned, creating a clear hierarchy: <strong>Site → Processes</strong>.
        </p>
      </div>
    </div>
  );
}
