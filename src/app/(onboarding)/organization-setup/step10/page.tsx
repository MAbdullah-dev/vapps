"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { step10Schema, Step10Values } from "@/schemas/onboarding/step10Schema";

import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from "@/components/ui/form";

import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";


const step10 = () => {
    const form = useForm<Step10Values>({
        resolver: zodResolver(step10Schema),
        defaultValues: {
            require2FA: false,
            ipWhitelisting: false,
            sessionTimeout: false,

            passwordPolicy: "",
            sessionDuration: "",

            logAllActions: false,
            logRetention: "",

            backupFrequency: "",
            backupRetention: "",
        },
    });

    const onSubmit = (values: Step10Values) => {
        console.log("Step 10:", values);
    };

    return (
        <>
            <h1 className="text-2xl font-bold mb-2">Security Settings</h1>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">

                    {/* Security Toggles */}
                    <section>
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="require2FA"
                                render={({ field }) => (
                                    <FormItem className="flex justify-between items-center ">
                                        <FormLabel>Require 2FA for all users</FormLabel>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="ipWhitelisting"
                                render={({ field }) => (
                                    <FormItem className="flex justify-between items-center ">
                                        <FormLabel>Restrict access to specific IP addresses</FormLabel>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="sessionTimeout"
                                render={({ field }) => (
                                    <FormItem className="flex justify-between items-center ">
                                        <FormLabel>Auto logout after inactivity</FormLabel>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </section>

                    {/* Access Control */}
                    <section>
                        <h3 className="text-xl font-semibold mb-3">Access Control</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="passwordPolicy"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password Policy</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Standard (10+ chars, mixed case)" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="sessionDuration"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Session Duration (minutes)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="60" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </section>

                    {/* Audit Logging */}
                    <section>
                        <h3 className="text-xl font-semibold mb-3">Audit Logging</h3>

                        <p className="text-gray-600 mb-3">Log All User Actions</p>

                        <FormField
                            control={form.control}
                            name="logAllActions"
                            render={({ field }) => (
                                <FormItem className="flex justify-between items-center  mb-4">
                                    <FormLabel>Enable Logging</FormLabel>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="logRetention"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Log Retention Period (days)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="365" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </section>

                    {/* Backup Configuration */}
                    <section>
                        <h3 className="text-xl font-semibold mb-3">Backup Configuration</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Backup Frequency */}
                            <FormField
                                control={form.control}
                                name="backupFrequency"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Backup Frequency</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select frequency" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="daily">Daily</SelectItem>
                                                    <SelectItem value="weekly">Weekly</SelectItem>
                                                    <SelectItem value="monthly">Monthly</SelectItem>
                                                    <SelectItem value="quarterly">Quarterly</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Backup Retention */}
                            <FormField
                                control={form.control}
                                name="backupRetention"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Backup Retention (days)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="30" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                    </section>

                    {/* Security Best Practices */}
                    <section className="border p-4 rounded-md bg-[#FEFCE8]">
                        <h3 className="text-lg font-semibold mb-2">Security Best Practices</h3>
                        <ul className=" list-inside space-y-1 text-gray-700 text-sm">
                            <li>Enable 2FA for enhanced security</li>
                            <li>Use strict password policies for sensitive data</li>
                            <li>Regularly review audit logs for suspicious activity</li>
                            <li>Maintain multiple backup copies in different locations</li>
                        </ul>
                    </section>

                    {/* Submit */}
                    {/* <div className="flex justify-end">
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white rounded-md"
                        >
                            Save & Continue
                        </button>
                    </div> */}

                </form>
            </Form>
        </>
    );
}

export default step10