"use client";

import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Step3Values, step3Schema } from "@/schemas/onboarding/step3Schema";
import { useSiteStore } from "@/store/onboardingStore";

export default function Step3Page() {
  const { data, updateStep } = useSiteStore(); // Accessing the store

  const form = useForm<Step3Values>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      leaders: data.step3.leaders?.length > 0 ? data.step3.leaders : [{ name: "", role: "", level: "Executive", email: "" }], // Set default to one leader row
    },
  });

  const { fields, append } = useFieldArray({
    name: "leaders",
    control: form.control,
  });

  const addLeader = () => {
    append({
      name: "",
      role: "",
      level: "Executive", // Default to 'Executive' for level
      email: "",
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Leadership Structure</h2>
      <p className="text-gray-600">Configure your leadership structure settings</p>

      <h3 className="text-xl font-semibold mt-4">Add Leadership Roles</h3>

      <Form {...form}>
        <form className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="border rounded-lg p-4">
              <div className="grid grid-cols-4 gap-4">
                {/* NAME */}
                <FormField
                  control={form.control}
                  name={`leaders.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ROLE */}
                <FormField
                  control={form.control}
                  name={`leaders.${index}.role`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter role" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* LEVEL */}
                <FormField
                  control={form.control}
                  name={`leaders.${index}.level`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl className="w-full">
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Executive">Executive</SelectItem>
                          <SelectItem value="Senior">Senior</SelectItem>
                          <SelectItem value="Mid">Mid</SelectItem>
                          <SelectItem value="Junior">Junior</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* EMAIL */}
                <FormField
                  control={form.control}
                  name={`leaders.${index}.email`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="default"
            onClick={addLeader}
            className="mt-2"
          >
            + Add Leader
          </Button>
        </form>
      </Form>
    </div>
  );
}
