// step7.tsx (updated)
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { step7Schema, Step7Values } from "@/schemas/onboarding/step7Schema";

import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useRouter } from "next/navigation";

import { useOnboardingStore } from "@/store/onboardingStore";

const Step7 = () => {
  const router = useRouter();
  const saved = useOnboardingStore((s) => s.data.step7);
  const updateStep = useOnboardingStore((s) => s.updateStep);

  const form = useForm<Step7Values>({
    resolver: zodResolver(step7Schema),
    defaultValues: saved || { activeTab: "customers", customers: [{ name: "", email: "", phone: "", address: "" }], vendors: [{ name: "", email: "", phone: "", address: "" }] },
  });

  const { fields: customerFields, append: addCustomer, remove: removeCustomer } = useFieldArray({ control: form.control, name: "customers" });
  const { fields: vendorFields, append: addVendor, remove: removeVendor } = useFieldArray({ control: form.control, name: "vendors" });

  const tab = form.watch("activeTab");

  const onSubmit = (values: Step7Values) => {
    updateStep("step7", values);
    console.log("Step 7 saved:", values);
    router.push("/organization-setup/step8");
  };

  return (
    <>
      <h1 className="text-2xl font-bold mb-2">Customers & Vendors</h1>
      <p className="text-gray-600 mb-8">Configure your customers & vendors settings</p>

      <div className="flex mb-6">
        <div className="flex gap-3 p-1 bg-gray-100 border rounded-full">
          <Button type="button" variant={tab === "customers" ? "default" : "ghost"} className={`rounded-full px-4 ${tab === "customers" ? "bg-primary text-white" : ""}`} onClick={() => form.setValue("activeTab", "customers")}>Customers</Button>
          <Button type="button" variant={tab === "vendors" ? "default" : "ghost"} className={`rounded-full px-4 ${tab === "vendors" ? "bg-primary text-white" : ""}`} onClick={() => form.setValue("activeTab", "vendors")}>Vendors</Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
          {tab === "customers" && (
            <>
              <h3 className="text-xl font-semibold">Add Customer</h3>
              {customerFields.map((field, index) => (
                <div key={field.id} className="">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name={`customers.${index}.name`} render={({ field }) => (
                      <FormItem><FormLabel>Customer Name *</FormLabel><FormControl><Input placeholder="ABC Corp" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name={`customers.${index}.email`} render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="contact@abccorp.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name={`customers.${index}.phone`} render={({ field }) => (
                      <FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="+1 555-0100" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name={`customers.${index}.address`} render={({ field }) => (
                      <FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="123 Main St" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>

                  <div className="mt-4 flex justify-end">
                    {customerFields.length > 1 && <Button variant="destructive" type="button" onClick={() => removeCustomer(index)}>Remove</Button>}
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={() => addCustomer({ name: "", email: "", phone: "", address: "" })}>+ Add Customer</Button>
            </>
          )}

          {tab === "vendors" && (
            <>
              <h3 className="text-xl font-semibold">Add Vendor</h3>
              {vendorFields.map((field, index) => (
                <div key={field.id} className="">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name={`vendors.${index}.name`} render={({ field }) => (
                      <FormItem><FormLabel>Vendor Name *</FormLabel><FormControl><Input placeholder="ABC Corp" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name={`vendors.${index}.email`} render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="contact@abccorp.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name={`vendors.${index}.phone`} render={({ field }) => (
                      <FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="+1 555-0100" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name={`vendors.${index}.address`} render={({ field }) => (
                      <FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="123 Main St" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>

                  <div className="mt-4 flex justify-end">
                    {vendorFields.length > 1 && <Button variant="destructive" type="button" onClick={() => removeVendor(index)}>Remove</Button>}
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={() => addVendor({ name: "", email: "", phone: "", address: "" })}>+ Add Vendor</Button>
            </>
          )}

          <div className="flex justify-end">
            <Button type="submit">Save & Continue</Button>
          </div>
        </form>
      </Form>
    </>
  );
};

export default Step7;
