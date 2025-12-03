"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { step2Schema, Step2Values } from "@/schemas/onboarding/step2Schema";

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { Trash2 } from "lucide-react";
import { useOnboardingStore } from "@/store/onboardingStore";
import { useRouter } from "next/navigation";

export default function Step2() {
  const router = useRouter();

  const saved = useOnboardingStore((s) => s.data.step2);
  const updateStep = useOnboardingStore((s) => s.updateStep);

  const form = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: saved || {
      sites: [
        { siteName: "", siteCode: "", location: "", process: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "sites",
  });

  const onSubmit = (values: Step2Values) => {
    updateStep("step2", values); // ✅ Store entire step2 object correctly
    router.push("/organization-setup/step3");
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Sites & Processes</h2>
      <p className="text-sm text-gray-500 mb-6">
        Configure your sites and assign process groups using process taxonomy (ISO-aligned)
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

          {fields.map((field, index) => (
            <div key={field.id} className="border-b pb-6 relative">

              {fields.length > 1 && (
                <Button
                  type="button"
                  onClick={() => remove(index)}
                  className="absolute right-0 -top-2 text-red-500 hover:text-red-700"
                >
                  <Trash2 size={18} />
                </Button>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">

                <FormField
                  control={form.control}
                  name={`sites.${index}.siteName`}
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
                  name={`sites.${index}.siteCode`}
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
                  name={`sites.${index}.location`}
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

              <FormField
                control={form.control}
                name={`sites.${index}.process`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign Processes to this Site</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <select
                          {...field}
                          className="w-full border border-gray-200 rounded-md h-10 px-3 bg-gray-50 text-sm"
                        >
                          <option value="">Select a process...</option>
                          <option value="Quality">Quality</option>
                          <option value="Production">Production</option>
                          <option value="HR">HR</option>
                        </select>

                        <Button variant="outline" type="button">+</Button>

                        <span className="text-xs text-gray-500 w-32 text-right">
                          {field.value ? 1 : 0} processes assigned
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}

          <Button
            type="button"
            variant="default"
            onClick={() =>
              append({ siteName: "", siteCode: "", location: "", process: "" })
            }
          >
            + Add Site
          </Button>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push("/organization-setup/step1")}>
              Previous
            </Button>
            <Button type="submit" variant="default">Next</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}