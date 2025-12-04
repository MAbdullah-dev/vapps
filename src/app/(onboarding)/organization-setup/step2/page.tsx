"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { step2Schema, Step2Values } from "@/schemas/onboarding/step2Schema";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

import { Trash2 } from "lucide-react";
import { useOnboardingStore } from "@/store/onboardingStore";
import { useRouter } from "next/navigation";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import React from "react";

export default function Step2() {
  const router = useRouter();

  const saved = useOnboardingStore((s) => s.data.step2);
  const updateStep = useOnboardingStore((s) => s.updateStep);

  // Default sites with processes as array
  const defaultSites =
    !saved || !saved.sites || saved.sites.length === 0
      ? [{ siteName: "", siteCode: "", location: "", processes: [] }]
      : saved.sites.map((site) => ({
        ...site,
        processes: Array.isArray(site.processes)
          ? site.processes
          : site.processes
            ? [site.processes]
            : [],
      }));

  const form = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: { sites: defaultSites },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "sites",
  });

  const onSubmit = (values: Step2Values) => {
    updateStep("step2", values);
    router.push("/organization-setup/step3");
  };

  const [processList, setProcessList] = React.useState([
    "Quality",
    "Production",
    "HR",
  ]);

  const [newProcess, setNewProcess] = React.useState("");

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Sites & Processes</h2>
      <p className="text-sm text-gray-500 mb-6">
        Configure your sites and assign process groups using process taxonomy
        (ISO-aligned)
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {fields.map((field, index) => (
            <div key={field.id} className="border-b pb-6 relative">

              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="absolute right-0 -top-2 text-red-500 hover:text-red-700"
                >
                  <Trash2 size={18} />
                </button>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                {/* Site Name */}
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

                {/* Site Code */}
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

                {/* Location */}
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

              {/* Multi-select for processes */}
              <FormField
                control={form.control}
                name={`sites.${index}.processes`} // <-- plural
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign Processes to this Site</FormLabel>
                    <FormControl>
                      <div className="flex flex-col gap-2">

                        <div className="flex gap-4 w-full">
                          {/* Select */}
                          <Select
                            onValueChange={(val: string) => {
                              const current = field.value || [];
                              if (!current.includes(val)) {
                                field.onChange([...current, val]);
                              }
                            }}
                            value={undefined}
                          >
                            <SelectTrigger className="w-full shrink h-10 bg-gray-50">
                              <SelectValue placeholder="Select processes..." />
                            </SelectTrigger>

                            <SelectContent>
                              {processList.map((p, i) => (
                                <SelectItem key={i} value={p}>
                                  {p}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Add New Process */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button type="button" variant="outline">
                                + Add Process
                              </Button>
                            </DialogTrigger>

                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add New Process</DialogTitle>
                              </DialogHeader>

                              <Input
                                placeholder="Enter process name"
                                value={newProcess}
                                onChange={(e) => setNewProcess(e.target.value)}
                              />

                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button
                                    onClick={() => {
                                      if (!newProcess.trim()) return;
                                      setProcessList([...processList, newProcess]);
                                      setNewProcess("");
                                    }}
                                  >
                                    Add
                                  </Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>

                        {/* Pills */}
                        <div className="flex flex-wrap gap-2">
                          {(field.value || []).map((value: string, i: number) => (
                            <span
                              key={i}
                              className="bg-[#ECEEF2] text-[#030213] text-sm px-2 py-1 rounded-full flex items-center gap-1"
                            >
                              {value}
                              <button
                                type="button"
                                className="text-black text-base hover:text-red-700"
                                onClick={() =>
                                  field.onChange(
                                    (field.value || []).filter((v: string) => v !== value)
                                  )
                                }
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}

          {/* Add Site */}
          <Button
            type="button"
            variant="default"
            onClick={() =>
              append({
                siteName: "",
                siteCode: "",
                location: "",
                processes: [], // <-- plural
              })
            }
          >
            + Add Site
          </Button>

          {/* Navigation */}
          <div className="flex justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/organization-setup/step1")}
            >
              Previous
            </Button>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/organization-setup/step3")}
              >
                Skip Step
              </Button>

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
