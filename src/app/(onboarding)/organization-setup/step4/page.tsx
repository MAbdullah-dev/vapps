"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { step4Schema, Step4Values, TeamMember } from "@/schemas/onboarding/step4Schema";

import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/store/onboardingStore";

const Step4 = () => {
    const router = useRouter();
    const saved = useOnboardingStore((s) => s.data.step4);
    const updateStep = useOnboardingStore((s) => s.updateStep);

    const form = useForm<Step4Values>({
        resolver: zodResolver(step4Schema),
        defaultValues: {
            teamMembers: saved.teamMembers?.length
                ? saved.teamMembers
                : [
                    {
                        fullName: "John Doe",
                        email: "john@acme.com",
                        role: "",
                        ssoMethod: "Email/Password",
                    },
                ],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "teamMembers",
    });

    const onSubmit = (values: Step4Values) => {
        updateStep("step4", { teamMembers: values.teamMembers });
        router.push("/organization-setup/step5");
    };

    return (
        <>
            <h1 className="text-2xl font-bold mb-2">User & Role Management</h1>
            <p className="text-gray-600 mb-8">Configure your user & role management settings</p>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <h3 className="text-xl font-semibold mb-4">Add Team Members</h3>

                    {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
                            {/* Full Name */}
                            <FormField
                                control={form.control}
                                name={`teamMembers.${index}.fullName`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Full Name *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Email */}
                            <FormField
                                control={form.control}
                                name={`teamMembers.${index}.email`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="john@acme.com" type="email" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Role */}
                            <FormField
                                control={form.control}
                                name={`teamMembers.${index}.role`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Role *</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Admin">Admin</SelectItem>
                                                    <SelectItem value="Manager">Manager</SelectItem>
                                                    <SelectItem value="User">User</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* SSO Method */}
                            <FormField
                                control={form.control}
                                name={`teamMembers.${index}.ssoMethod`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SSO Method</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Email/Password" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Email/Password">Email/Password</SelectItem>
                                                    <SelectItem value="SSO">SSO</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Remove */}
                            {fields.length > 1 && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => remove(index)}
                                    className="mt-2"
                                >
                                    Remove
                                </Button>
                            )}
                        </div>
                    ))}

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                            append({
                                fullName: "",
                                email: "",
                                role: "",
                                ssoMethod: "Email/Password",
                            } as TeamMember)
                        }
                    >
                        Add User
                    </Button>

                    <div className="flex justify-between gap-3">
                               <Button
                                 type="button"
                                 variant="outline"
                                 onClick={() => router.push("/organization-setup/step3")}
                               >
                                 Previous
                               </Button>
                   
                               <Button type="submit" variant="default">
                                 Next
                               </Button>
                             </div>
                </form>
            </Form>
        </>
    );
};

export default Step4;