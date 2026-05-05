// Step1Form.tsx
"use client";
import { useState } from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { step1Schema, Step1Values } from "@/schemas/onboarding/step1Schema";

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useOnboardingStore } from "@/store/onboardingStore";
import { useRouter } from "next/navigation";
import axios from "axios";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { Step2Site } from "@/store/onboardingStore";

type ProcessBlock = {
  id: string;
  name: string;
};

function newBlockId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function blocksFromSavedSite(site: Step2Site | undefined): ProcessBlock[] {
  if (!site) return [];
  if (site.processDefinitions?.length) {
    return site.processDefinitions.map((d) => ({
      id: newBlockId(),
      name: d.name,
    }));
  }
  if (site.processes?.length) {
    return site.processes.map((name) => ({
      id: newBlockId(),
      name,
    }));
  }
  return [];
}

export default function Step1Form() {
  const router = useRouter();
  const saved = useOnboardingStore((s) => s.data.step1);
  const savedFirstSite = useOnboardingStore((s) => s.data.step2.sites?.[0]);
  const updateStep = useOnboardingStore((s) => s.updateStep);
  const resetStore = useOnboardingStore((s) => s.reset);

  const [siteName, setSiteName] = useState(() => savedFirstSite?.siteName ?? "");
  const [siteLocation, setSiteLocation] = useState(() => savedFirstSite?.location ?? "");
  const [processBlocks, setProcessBlocks] = useState<ProcessBlock[]>(() =>
    blocksFromSavedSite(savedFirstSite)
  );
  const [newProcessName, setNewProcessName] = useState("");
  const [editingProcessId, setEditingProcessId] = useState<string | null>(null);

  const form = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: saved || {
      slug: "",
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

  const [customIndustryMode, setCustomIndustryMode] = useState(false);
  const [customIndustry, setCustomIndustry] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [industries, setIndustries] = useState<string[]>([
    "Technology",
    "Finance",
    "Healthcare",
    "Retail",
    "Manufacturing",
  ]);

  const onSubmit = async (values: Step1Values) => {
    setIsSubmitting(true);
    setSubmitError(null);

    const definitions = processBlocks
      .map((b) => ({
        name: b.name.trim(),
        items: [] as string[],
      }))
      .filter((d) => d.name.length > 0);

    const nameKeys = definitions.map((d) => d.name.toLowerCase());
    if (nameKeys.length !== new Set(nameKeys).size) {
      setSubmitError("Each process name must be unique.");
      setIsSubmitting(false);
      return;
    }

    const sn = siteName.trim();
    const sl = siteLocation.trim();

    if (definitions.length > 0) {
      if (!sn || !sl) {
        setSubmitError("Please enter site name and location before adding processes.");
        setIsSubmitting(false);
        return;
      }
    }

    let step2Data: { sites: Step2Site[] };
    if (definitions.length > 0) {
      step2Data = {
        sites: [
          {
            siteName: sn,
            siteCode: "",
            location: sl,
            processes: definitions.map((d) => d.name),
            processDefinitions: definitions,
          },
        ],
      };
    } else if (sn.length > 0 && sl.length > 0) {
      step2Data = {
        sites: [
          {
            siteName: sn,
            siteCode: "",
            location: sl,
            processes: [],
            processDefinitions: [],
          },
        ],
      };
    } else {
      step2Data = { sites: [] };
    }

    // Keep local store in sync so user data is not lost if submission fails.
    updateStep("step1", values);
    updateStep("step2", step2Data);

    try {
      await axios.post("/api/organization/create", {
        step1: values,
        step2: step2Data,
      });
      resetStore();
      router.push("/");
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create organization. Please try again.";
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background text-foreground">
      <h1 className="text-2xl font-bold mb-2">Company Information</h1>
      <p className="text-muted-foreground mb-8">Configure your company information settings</p>

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

            <FormField name="slug" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Organization URL slug *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g. my-company"
                    onChange={(e) => field.onChange(e.target.value.toLowerCase().replace(/\s/g, "").replace(/[^a-z0-9-]/g, ""))}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">Used in your dashboard URL (e.g. {field.value || "yourslug"}.vie.click). No spaces; lowercase letters, numbers and hyphens only.</p>
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

            {/* <div className="md:col-span-2">
              <FormField name="industry" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div> */}

            <div className="md:col-span-2 space-y-1">
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry *</FormLabel>

                    {customIndustryMode ? (
                      /* CUSTOM INPUT MODE */
                      <div className="flex items-center gap-2 w-full">
                        <Input
                          placeholder="Enter custom industry"
                          value={customIndustry}
                          onChange={(e) => setCustomIndustry(e.target.value)}
                        />

                        <Button
                          type="button"
                          onClick={() => {
                            const value = customIndustry.trim();
                            if (!value) return;

                            setIndustries((prev) =>
                              prev.includes(value) ? prev : [...prev, value]
                            );

                            field.onChange(value);
                            setCustomIndustry("");
                            setCustomIndustryMode(false);
                          }}
                        >
                          Save
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setCustomIndustry("");
                            setCustomIndustryMode(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      /* SELECT MODE */
                      <div className="flex items-center gap-2 w-full">
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select industry *" />
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            {industries.map((industry) => (
                              <SelectItem key={industry} value={industry}>
                                {industry}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          type="button"
                          className="w-40"
                          variant="dark"
                          onClick={() => setCustomIndustryMode(true)}
                        >
                          Add Custom
                        </Button>
                      </div>
                    )}

                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            <div className="md:col-span-2 space-y-3 border-t pt-8">
              <h2 className="text-lg font-semibold">Site details</h2>
              <p className="text-xs text-muted-foreground">
                Enter your first site, then add custom processes under it. You can manage more sites later in Settings.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <FormLabel>Site name</FormLabel>
                  <Input
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="e.g. Main Office"
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel>Location</FormLabel>
                  <Input
                    value={siteLocation}
                    onChange={(e) => setSiteLocation(e.target.value)}
                    placeholder="e.g. New York, NY"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-4 pt4">
              <div>
                <h2 className="text-lg font-semibold">Processes under this site</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Add a process and it will appear as a capsule below. Use Edit to update it, or click the
                  cross icon to remove it.
                  Site name and location are required when you add at least one process.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Input
                  placeholder={editingProcessId ? "Edit process name..." : "Process name (e.g. Development)"}
                  value={newProcessName}
                  onChange={(e) => setNewProcessName(e.target.value)}
                  className={`flex-1 ${editingProcessId ? "ring-1 ring-primary/30" : ""}`}
                />
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-w-32"
                    onClick={() => {
                      const name = newProcessName.trim();
                      if (!name) return;

                      if (editingProcessId) {
                        const dup = processBlocks.some(
                          (b) =>
                            b.id !== editingProcessId &&
                            b.name.trim().toLowerCase() === name.toLowerCase()
                        );
                        if (dup) {
                          setSubmitError("A process with this name already exists.");
                          return;
                        }
                        setSubmitError(null);
                        setProcessBlocks((prev) =>
                          prev.map((b) => (b.id === editingProcessId ? { ...b, name } : b))
                        );
                        setEditingProcessId(null);
                        setNewProcessName("");
                        return;
                      }

                      if (
                        processBlocks.some((b) => b.name.trim().toLowerCase() === name.toLowerCase())
                      ) {
                        setSubmitError("A process with this name already exists.");
                        return;
                      }
                      setSubmitError(null);
                      setProcessBlocks((prev) => [...prev, { id: newBlockId(), name }]);
                      setNewProcessName("");
                    }}
                  >
                    {editingProcessId ? "Save changes" : "Add process"}
                  </Button>
                  {editingProcessId && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditingProcessId(null);
                        setNewProcessName("");
                        setSubmitError(null);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              {processBlocks.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <p className="text-sm font-semibold text-foreground">
                      {siteName.trim() || "Unnamed site"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {siteLocation.trim() || "No location"}
                    </p>
                  </div>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {processBlocks.map((block) => (
                      <li
                        key={block.id}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground"
                      >
                        <span>{block.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-6 rounded-full px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setSubmitError(null);
                            setEditingProcessId(block.id);
                            setNewProcessName(block.name);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-5 w-5 rounded-full p-0 text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${block.name}`}
                          onClick={() => {
                            setProcessBlocks((prev) => prev.filter((b) => b.id !== block.id));
                            if (editingProcessId === block.id) {
                              setEditingProcessId(null);
                              setNewProcessName("");
                            }
                          }}
                        >
                          ×
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">
            Additional setup (roles, inventory, security, KPI, notifications) can be configured later in Settings.
          </div>

          {submitError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {submitError}
            </div>
          )}

          <div className="flex justify-end items-center mt-6">
            <Button type="submit" variant="default" disabled={isSubmitting}>
              {isSubmitting ? "Creating Organization..." : "Create Organization"}
            </Button>
          </div>

        </form>
      </Form>
    </div>
  );
}
