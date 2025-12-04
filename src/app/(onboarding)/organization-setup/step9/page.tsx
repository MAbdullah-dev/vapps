"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
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
import { useOnboardingStore } from "@/store/onboardingStore";
import { Button } from "@/components/ui/button";

export default function Step9() {
    const router = useRouter();
    const saved = useOnboardingStore((s) => s.data.step9);
    const updateStep = useOnboardingStore((s) => s.updateStep);

    const form = useForm<Step9Values>({
        resolver: zodResolver(step9Schema),
        defaultValues: saved || {
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
        updateStep("step9", values);
        router.push("/organization-setup/step10");
    };

    return (
        <>
            <h1 className="text-2xl font-bold mb-2">KPI & Reporting</h1>
            <p className="text-gray-600 mb-8">Configure your KPI & reporting settings</p>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">

                    {/* --- Widget Selection --- */}
                    <section>
                        <h3 className="text-xl font-semibold mb-1">Select Dashboard Widgets</h3>
                        <p className="text-gray-600 mb-5">
                            Choose the KPIs and metrics to display on your dashboard
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* LEFT COLUMN */}
                            <div className="space-y-4">
                                {renderCheckboxField(form, "widgets.tasksCompleted", "Tasks Completed Over Time")}
                                {renderCheckboxField(form, "widgets.complianceScore", "Compliance Health Score")}
                                {renderCheckboxField(form, "widgets.workloadByUser", "Workload by User")}
                                {renderCheckboxField(form, "widgets.overdueTasks", "Overdue Tasks Alert")}
                            </div>

                            {/* RIGHT COLUMN */}
                            <div className="space-y-4">
                                {renderCheckboxField(form, "widgets.issueDistribution", "Issue Distribution by Status")}
                                {renderCheckboxField(form, "widgets.auditTrend", "Audit Completion Trend")}
                                {renderCheckboxField(form, "widgets.projectProgress", "Project Progress Overview")}
                                {renderCheckboxField(form, "widgets.documentVersion", "Document Version Control")}
                            </div>
                        </div>
                    </section>

                    {/* --- Report Frequency --- */}
                    <section>
                        <h3 className="text-lg font-semibold mb-3">Report Generation Frequency</h3>

                        <FormField
                            control={form.control}
                            name="reportFrequency"
                            render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <FormLabel>Automated Report Schedule</FormLabel>
                                    <FormControl>
                                        <Select onValueChange={field.onChange} value={field.value}>
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
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </section>

                    {/* Summary */}
                    <section>
                        <div className="bg-[#EFF6FF] p-4 rounded-2xl">
                            <p className="text-base font-medium mb-4">
                                Selected Widgets: {selectedCount}
                            </p>
                            <p className="text-gray-500 text-sm">
                                You can add or customize widgets later from Dashboard settings.
                            </p>
                        </div>
                    </section>

                    <div className="flex justify-between gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push("/organization-setup/step8")}
                        >
                            Previous
                        </Button>

                        <div className="flex gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push("/organization-setup/step10")}
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
        </>
    );
}

/** Helper for Checkbox Fields */
function renderCheckboxField(form: any, name: any, label: string) {
    return (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem className="flex items-center space-x-3">
                    <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel>{label}</FormLabel>
                </FormItem>
            )}
        />
    );
}
