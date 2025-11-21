"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { step2Schema, Step2Values } from "@/schemas/onboarding/step2Schema";

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useSiteStore } from "@/store/onboardingStore";

export default function Step2() {
  const { addSiteToStep2 } = useSiteStore();

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
    addSiteToStep2({
      siteName: values.siteName,
      siteCode: values.siteCode,
      location: values.location,
    });

    form.reset();
  };

  return (
    <>
    <div className="bg-white border border-[#0000001A] rounded-[14px] p-6">
      <h2 className="text-lg font-semibold">Sites & Processes</h2>
      <p className="text-sm text-gray-500 mb-6">
        Configure your sites and assign process groups using process taxonomy (ISO-aligned)
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* --- Site Fields --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <FormField
              control={form.control}
              name="siteName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Main Office" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="siteCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Code *</FormLabel>
                  <FormControl>
                    <Input placeholder="S001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location *</FormLabel>
                  <FormControl>
                    <Input placeholder="New York, NY" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          </div>

          {/* --- Processes Dropdown --- */}
          <FormField
            control={form.control}
            name="process"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign Processes to this Site</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <select
                      {...field}
                      className="w-full border border-gray-200 rounded-md h-10 px-3 bg-gray-50 text-sm"
                    >
                      <option value="">Select a process from taxonomy..</option>
                    </select>

                    <Button variant="outline" type="button">
                      +
                    </Button>

                    <span className="text-xs text-gray-500 w-32 text-right">
                      0 processes assigned
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="border-b border-[#0000001A]" />

          {/* Add Site */}
          <Button type="submit" className="bg-black text-white rounded-md">
            + Add Site
          </Button>
        </form>
      </Form>

      {/* Info Box */}
      <div className="mt-6 p-4 rounded-lg bg-[#E8F1FF] border border-[#C3D9FF]">
        <h3 className="font-semibold text-sm mb-1">About Process Taxonomy</h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          Process taxonomy follows ISO 9001 standards, organizing your operations into standardized process groups.
          Each site can have multiple processes assigned, creating a clear hierarchy: <strong>Site → Processes</strong>.
        </p>
      </div>
    </div>
    </>

  );
}
