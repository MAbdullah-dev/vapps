"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { step1Schema, Step1Values } from "@/schemas/onboarding/step1Schema";
import { useOnboardingStore } from "@/store/onboardingStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Step1() {
  const router = useRouter();
  const { data, updateStep } = useOnboardingStore();

  const form = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      orgName: data.step1.orgName || "",
    },
  });

  const onSubmit = (values: Step1Values) => {
    updateStep("step1", values);
    router.push("/organization-setup/step2");
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="w-full space-y-6"
    >
      <div>
        <label className="block mb-2 font-medium">Organization Name</label>
        <Input
          {...form.register("orgName")}
          placeholder="Enter your organization name"
        />
        {form.formState.errors.orgName && (
          <p className="text-red-500 text-sm mt-1">
            {form.formState.errors.orgName.message}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit">Next</Button>
      </div>
    </form>
  );
}
