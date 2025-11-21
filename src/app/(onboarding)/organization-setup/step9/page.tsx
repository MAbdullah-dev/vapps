"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { step9Schema, Step9Values } from "@/schemas/onboarding/step9Schema";

import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from "@/components/ui/form";

import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
const step9 = () => {
    const form = useForm<Step9Values>({
        resolver: zodResolver(step9Schema),
        defaultValues: {
            widgets: {
                tasksCompleted: false,
                complianceScore: false,
                workloadByUser: false,
                overdueTasks: false,

                issueDistribution: false,
                auditTrend: false,
                projectProgress: false,
                documentVersion: false,
            },

            reportFrequency: "",
        },
    });

    const selectedCount = Object.values(form.watch("widgets")).filter(Boolean).length;

    const onSubmit = (values: Step9Values) => {
        console.log("Step 9:", values);
    };

    return (
        <>
            <h1 className="text-2xl font-bold mb-2">KPI & Reporting</h1>
            <p className="text-gray-600 mb-8">Configure your KPI & reporting settings</p>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">

                    {/* Select Dashboard Widgets */}
                    <section>
                        <h3 className="text-xl font-semibold mb-1">Select Dashboard Widgets</h3>
                        <p className="text-gray-600 mb-5">
                            Choose which KPIs and metrics you want to display on your dashboard
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/** Left Column */}
                            <div className="space-y-4">
                                {/* Tasks Completed */}
                                <FormField
                                    control={form.control}
                                    name="widgets.tasksCompleted"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormLabel>Tasks Completed Over Time</FormLabel>
                                        </FormItem>
                                    )}
                                />

                                {/* Compliance Health */}
                                <FormField
                                    control={form.control}
                                    name="widgets.complianceScore"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormLabel>Compliance Health Score</FormLabel>
                                        </FormItem>
                                    )}
                                />

                                {/* Workload by User */}
                                <FormField
                                    control={form.control}
                                    name="widgets.workloadByUser"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormLabel>Workload by User</FormLabel>
                                        </FormItem>
                                    )}
                                />

                                {/* Overdue Tasks Alert */}
                                <FormField
                                    control={form.control}
                                    name="widgets.overdueTasks"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormLabel>Overdue Tasks Alert</FormLabel>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/** Right Column */}
                            <div className="space-y-4">
                                {/* Issue Distribution */}
                                <FormField
                                    control={form.control}
                                    name="widgets.issueDistribution"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormLabel>Issue Distribution by Status</FormLabel>
                                        </FormItem>
                                    )}
                                />

                                {/* Audit Completion Trend */}
                                <FormField
                                    control={form.control}
                                    name="widgets.auditTrend"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormLabel>Audit Completion Trend</FormLabel>
                                        </FormItem>
                                    )}
                                />

                                {/* Project Progress */}
                                <FormField
                                    control={form.control}
                                    name="widgets.projectProgress"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormLabel>Project Progress Overview</FormLabel>
                                        </FormItem>
                                    )}
                                />

                                {/* Document Version Control */}
                                <FormField
                                    control={form.control}
                                    name="widgets.documentVersion"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormLabel>Document Version Control</FormLabel>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Report Generation Frequency */}
                    <section>
                        <h3 className="text-lg font-semibold mb-3">Report Generation Frequency</h3>

                        <FormField
                            control={form.control}
                            name="reportFrequency"
                            render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <FormLabel>Automated Report Schedule</FormLabel>
                                    <FormControl>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select frequency" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="weekly">Weekly</SelectItem>
                                                <SelectItem value="monthly">Monthly</SelectItem>
                                                <SelectItem value="quarterly">Quarterly</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormControl>

                                    <p className="text-gray-600 text-sm">
                                        Reports will be automatically generated and sent to administrators
                                    </p>

                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                    </section>

                    <section>
                        <div className="bg-[#EFF6FF] p-4 rounded-2xl">
                            <p className="mt-4 text-base font-medium mb-4">
                                Selected Widgets: {selectedCount}
                            </p>
                            <p className="text-gray-500 text-sm">
                                You can customize and add more widgets after setup from the Dashboard settings
                            </p>
                        </div>
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

export default step9