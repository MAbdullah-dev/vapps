"use client"

import { useState, useMemo, ReactNode, useRef } from "react"
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Search,
    FileText,
    AlertCircle,
    CheckCircle2,
    Clock,
    Eye,
    MoreVertical,
    Link2,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    CircleX,
    NotebookText,
    Info,
    Upload,
    Check,
    ChevronsUpDown,
    CalendarIcon,
} from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { cn } from "@/lib/utils"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from "@/components/ui/command"


type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

const allIssues = [
    { ref: "Issue/2025/S1/P1/QI/Issue#1", title: "Missing ISO documentation for compliance review", tag: "Quality Issue", tagVariant: "default" as BadgeVariant, source: "Internal Audit", issuer: "John Doe", assignee: "Mary Chen", planDate: "11/15/2024", actualDate: "12/1/2024", dueDate: "12/15/2024", status: "Success", kpi: 3, jira: true },
    { ref: "Issue/2025/S1/P1/PI/Issue#2", title: "Process workflow needs optimization", tag: "Process Improvement", tagVariant: "secondary" as BadgeVariant, source: "Management Review", issuer: "Sarah Jones", assignee: "Eric Davis", planDate: "12/1/2024", actualDate: "—", dueDate: "01/15/2025", status: "Pending", kpi: 0, jira: false },
    { ref: "Issue/2025/S1/P1/RM/Issue#3", title: "Security vulnerability identified in access control", tag: "Risk Mitigation", tagVariant: "destructive" as BadgeVariant, source: "External Audit", issuer: "Ali Hamed", assignee: "John Doe", planDate: "10/1/2024", actualDate: "—", dueDate: "12/20/2024", status: "Pending", kpi: 0, jira: true },
]

const pendingIssues = [
    { id: "Issue/2025/S1/P1/QI/Issue#1", title: "Missing ISO documentation for compliance review", tag: "Quality Issue", tagVariant: "default" as BadgeVariant, assignee: "Mary Chen", assigned: "11/15/2024", due: "12/15/2024", completed: "12/1/2024", kpi: 3 },
    { id: "Issue/2025/S1/P1/RM/Issue#3", title: "Security vulnerability identified in access control", tag: "Risk Mitigation", tagVariant: "destructive" as BadgeVariant, assignee: "John Doe", assigned: "10/1/2024", due: "12/20/2024", completed: "12/8/2024", kpi: 0 },
    { id: "Issue/2025/S1/P1/CC/Issue#5", title: "Customer complaint about delayed shipment", tag: "Customer Concern", tagVariant: "secondary" as BadgeVariant, assignee: "Eric Davis", assigned: "11/20/2024", due: "12/30/2024", completed: "12/9/2024", kpi: 3 },
]

const assignees = [
    { value: "john", label: "John Doe" },
    { value: "mary", label: "Mary Collins" },
    { value: "alex", label: "Alex Smith" },
]

export default function IssuesDashboard() {
    const [search, setSearch] = useState("")
    const [tag, setTag] = useState("all")
    const [status, setStatus] = useState("all")
    const [sortKey, setSortKey] = useState<string | null>(null)
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

    const [pageSize, setPageSize] = useState(10)
    const [pageAll, setPageAll] = useState(1)
    const [pagePending, setPagePending] = useState(1)

    const [openFirst, setOpenFirst] = useState(false)
    const [openSubmit, setOpenSubmit] = useState(false)
    const [openNoSubmit, setOpenNoSubmit] = useState(false)

    const [closeOutDate, setCloseOutDate] = useState(new Date())
    const [verificationDate, setVerificationDate] = useState(new Date())

    const [signature, setSignature] = useState("")

    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])

    const [dueDate, setDueDate] = useState<Date | undefined>()


    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return
        const files = Array.from(e.target.files)
        console.log("Selected files:", files)
    }

    const sortBy = (key: string) => {
        if (sortKey === key) {
            setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
        } else {
            setSortKey(key)
            setSortDir("asc")
        }
    }

    const SortHeader = ({ field, children }: { field: string; children: ReactNode }) => (
        <TableHead
            className="cursor-pointer select-none hover:bg-muted/50"
            onClick={() => sortBy(field)}
        >
            <div className="flex items-center gap-1">
                {children}
                <ArrowUpDown className="h-4 w-4" />
            </div>
        </TableHead>
    )

    // ---------------- FILTERING + SORTING ---------------- //
    const applySorting = (data: any[]) => {
        if (!sortKey) return data
        return [...data].sort((a, b) => {
            const aVal = (a as any)[sortKey]
            const bVal = (b as any)[sortKey]
            if (aVal < bVal) return sortDir === "asc" ? -1 : 1
            if (aVal > bVal) return sortDir === "asc" ? 1 : -1
            return 0
        })
    }

    const filteredAll = useMemo(() => {
        let data = allIssues

        if (search)
            data = data.filter(
                (i) =>
                    i.title.toLowerCase().includes(search.toLowerCase()) ||
                    i.ref.includes(search)
            )

        if (tag !== "all") data = data.filter((i) => i.tag === tag)
        if (status !== "all")
            data = data.filter((i) =>
                status === "success" ? i.status === "Success" : i.status === "Pending"
            )

        return applySorting(data)
    }, [search, tag, status, sortKey, sortDir])

    const filteredPending = useMemo(() => {
        let data = pendingIssues

        if (search)
            data = data.filter(
                (i) =>
                    i.title.toLowerCase().includes(search.toLowerCase()) ||
                    i.id.includes(search)
            )

        if (tag !== "all") data = data.filter((i) => i.tag === tag)

        return applySorting(data)
    }, [search, tag, sortKey, sortDir])

    // ---------------- PAGINATION ---------------- //
    const paginatedAll = useMemo(
        () => filteredAll.slice((pageAll - 1) * pageSize, pageAll * pageSize),
        [filteredAll, pageAll, pageSize]
    )

    const paginatedPending = useMemo(
        () =>
            filteredPending.slice(
                (pagePending - 1) * pageSize,
                pagePending * pageSize
            ),
        [filteredPending, pagePending, pageSize]
    )

    const Pagination = ({
        page,
        total,
        setPage,
    }: {
        page: number
        total: number
        setPage: (p: number) => void
    }) => {
        const totalPages = Math.ceil(total / pageSize) || 1

        return (
            <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
                <div className="text-sm text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
                </div>

                <div className="flex items-center gap-3">
                    <Select
                        value={pageSize.toString()}
                        onValueChange={(v) => {
                            setPageSize(Number(v))
                            setPage(1)
                        }}
                    >
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="5">5 per page</SelectItem>
                            <SelectItem value="10">10 per page</SelectItem>
                            <SelectItem value="20">20 per page</SelectItem>
                            <SelectItem value="50">50 per page</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <span className="text-sm font-medium px-3">
                            Page {page} / {totalPages}
                        </span>

                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === totalPages}
                            onClick={() => setPage(page + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full">
            <Tabs defaultValue="all" className="w-full">
                {/* ---------------- TABS ---------------- */}
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-10">
                    <TabsTrigger value="all">All Issues</TabsTrigger>

                    <TabsTrigger value="verification">
                        Verification Required
                        <Badge className="text-[#8200DB] bg-[#F3E8FF] border-[#DAB2FF] rounded-md ml-2">
                            {filteredPending.length}
                        </Badge>
                    </TabsTrigger>
                </TabsList>

                {/* ---------------- ALL ISSUES TAB ---------------- */}
                <TabsContent value="all" className="space-y-8">
                    {/* Search + Filters */}
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                            <Input
                                placeholder="Search by title or reference..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Select value={tag} onValueChange={setTag}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="All Tags" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Tags</SelectItem>
                                    <SelectItem value="Quality Issue">Quality Issue</SelectItem>
                                    <SelectItem value="Process Improvement">Process Improvement</SelectItem>
                                    <SelectItem value="Risk Mitigation">Risk Mitigation</SelectItem>
                                    <SelectItem value="Customer Concern">Customer Concern</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="success">Success</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button variant="outline">Export</Button>
                        </div>
                    </div>

                    {/* Cards */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Card className="border-l-4 border-l-blue-500">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Total Issues</p>
                                        <p className="text-2xl font-bold mt-2">{filteredAll.length}</p>
                                    </div>
                                    <FileText className="h-8 w-8 text-blue-500" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-orange-500">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Open Issues</p>
                                        <p className="text-2xl font-bold mt-2">
                                            {filteredAll.filter((i) => i.status === "Pending").length}
                                        </p>
                                    </div>
                                    <Clock className="h-8 w-8 text-orange-500" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-green-500">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Closed Issues</p>
                                        <p className="text-2xl font-bold mt-2">
                                            {filteredAll.filter((i) => i.status === "Success").length}
                                        </p>
                                    </div>
                                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-purple-500">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Avg. KPI Score</p>
                                        <p className="text-2xl font-bold mt-2">2.3</p>
                                    </div>
                                    <AlertCircle className="h-8 w-8 text-purple-500" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Full Table */}
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <SortHeader field="ref">Issue Ref</SortHeader>
                                            <SortHeader field="title">Title</SortHeader>
                                            <SortHeader field="tag">TAG</SortHeader>
                                            <SortHeader field="source">Source</SortHeader>
                                            <SortHeader field="issuer">Issuer</SortHeader>
                                            <SortHeader field="assignee">Assignee</SortHeader>
                                            <SortHeader field="planDate">Plan Date</SortHeader>
                                            <SortHeader field="actualDate">Actual Date</SortHeader>
                                            <SortHeader field="dueDate">Due Date</SortHeader>
                                            <SortHeader field="status">Status</SortHeader>
                                            <SortHeader field="kpi">KPI</SortHeader>
                                            <TableHead>JIRA</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {paginatedAll.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                                                    No issues found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paginatedAll.map((issue) => (
                                                <TableRow key={issue.ref}>
                                                    <TableCell className="font-mono text-sm">{issue.ref}</TableCell>
                                                    <TableCell className="font-medium max-w-md">{issue.title}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={issue.tagVariant}>{issue.tag}</Badge>
                                                    </TableCell>
                                                    <TableCell>{issue.source}</TableCell>
                                                    <TableCell>{issue.issuer}</TableCell>
                                                    <TableCell>{issue.assignee}</TableCell>
                                                    <TableCell>{issue.planDate}</TableCell>
                                                    <TableCell>{issue.actualDate}</TableCell>
                                                    <TableCell>{issue.dueDate}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={issue.status === "Success" ? "default" : "destructive"}>
                                                            {issue.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{issue.kpi}</TableCell>

                                                    <TableCell>
                                                        {issue.jira ? (
                                                            <Badge variant="outline">
                                                                <Link2 className="h-3 w-3 mr-1" /> Linked
                                                            </Badge>
                                                        ) : (
                                                            "—"
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <Pagination page={pageAll} total={filteredAll.length} setPage={setPageAll} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ---------------- VERIFICATION TAB ---------------- */}
                <TabsContent value="verification" className="space-y-8">
                    {/* Search + Filters */}
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                            <Input
                                placeholder="Search by title or ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <div className="flex gap-3">
                            <Select value={tag} onValueChange={setTag}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="All Tags" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Tags</SelectItem>
                                    <SelectItem value="Quality Issue">Quality Issue</SelectItem>
                                    <SelectItem value="Risk Mitigation">Risk Mitigation</SelectItem>
                                    <SelectItem value="Customer Concern">Customer Concern</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline">Export</Button>
                        </div>
                    </div>

                    {/* Cards */}
                    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
                        <Card className="border-l-4 border-l-purple-500">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Pending Verification</p>
                                        <p className="text-2xl font-bold mt-2">{filteredPending.length}</p>
                                    </div>
                                    <Clock className="h-8 w-8 text-purple-500" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-green-500">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Avg. Resolution Time</p>
                                        <p className="text-2xl font-bold mt-2">22 days</p>
                                    </div>
                                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-blue-500">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Expected KPI</p>
                                        <p className="text-2xl font-bold mt-2">2.7</p>
                                    </div>
                                    <FileText className="h-8 w-8 text-blue-500" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Verification Table */}
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <SortHeader field="id">Issue ID</SortHeader>
                                            <SortHeader field="title">Title</SortHeader>
                                            <SortHeader field="tag">Tag</SortHeader>
                                            <SortHeader field="assignee">Assignee</SortHeader>
                                            <SortHeader field="assigned">Assigned</SortHeader>
                                            <SortHeader field="due">Due</SortHeader>
                                            <SortHeader field="completed">Completed</SortHeader>
                                            <SortHeader field="kpi">KPI</SortHeader>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {paginatedPending.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                                                    No pending verification issues
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paginatedPending.map((issue) => (
                                                <TableRow key={issue.id}>
                                                    <TableCell className="font-mono text-sm">{issue.id}</TableCell>
                                                    <TableCell className="font-medium">{issue.title}</TableCell>

                                                    <TableCell>
                                                        <Badge variant={issue.tagVariant}>{issue.tag}</Badge>
                                                    </TableCell>

                                                    <TableCell>{issue.assignee}</TableCell>
                                                    <TableCell>{issue.assigned}</TableCell>
                                                    <TableCell>{issue.due}</TableCell>
                                                    <TableCell>{issue.completed}</TableCell>

                                                    <TableCell className="text-center">
                                                        <div
                                                            className={`inline-flex h-9 w-9 items-center justify-center rounded-full font-bold text-sm ${issue.kpi > 0
                                                                ? "bg-green-100 text-green-800"
                                                                : "bg-red-100 text-red-800"
                                                                }`}
                                                        >
                                                            {issue.kpi}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>
                                                        <Badge variant="outline">Pending Verification</Badge>
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            onClick={() => setOpenFirst(true)}
                                                        >
                                                            <Eye className="mr-1 h-4 w-4" /> Review
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <Pagination page={pagePending} total={filteredPending.length} setPage={setPagePending} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            <Dialog open={openFirst} onOpenChange={setOpenFirst}>
                <DialogContent className="max-w-3xl!">
                    {/* Header */}
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">
                            Verify Corrective Action Effectiveness
                        </DialogTitle>
                        <DialogDescription>
                            Review the corrective action and determine if it is effective or requires reassignment
                        </DialogDescription>
                    </DialogHeader>

                    {/* Issue Summary */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm">Issue Summary</h3>

                        <div className="space-y-2 text-sm">
                            <p>
                                <span className="text-muted-foreground block">Issue ID</span>
                                <span className="font-medium text-[#0A0A0A]">Issue/2025/S1/P1/QI/Issue#1</span>
                            </p>

                            <p>
                                <span className="text-muted-foreground block">Title</span>
                                <span className="font-medium text-[#0A0A0A]">
                                    Missing ISO documentation for compliance review
                                </span>
                            </p>

                            <p>
                                <span className="text-muted-foreground block mb-1">Tag Category</span>
                                <span className="inline-block rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs">
                                    Quality Issue
                                </span>
                            </p>
                        </div>

                        {/* Description */}
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Description</p>
                            <p className="text-sm text-[#0A0A0A]">
                                Critical ISO documentation missing from compliance folder
                            </p>
                        </div>

                        {/* Root Cause */}
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Root Cause Analysis</p>
                            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
                                Documentation process was not properly followed during Q3 review
                            </div>
                        </div>

                        {/* Containment Action */}
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Containment Action</p>
                            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm">
                                Temporary workaround: Used backup documentation from previous quarter
                            </div>
                        </div>

                        {/* Corrective Action */}
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Corrective Action Plan</p>
                            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm">
                                Created comprehensive documentation checklist and updated SOPs.
                                Trained all team members on new process.
                            </div>
                        </div>

                        {/* Attachments */}
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">Attachments</p>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between rounded-md border p-3 text-sm">
                                    <div className="flex items-center gap-1.5"><NotebookText /> ISO_Documentation_Checklist_v2.pdf</div>
                                    <span className="text-muted-foreground text-xs">245 KB</span>
                                </div>
                                <div className="flex items-center justify-between rounded-md border p-3 text-sm">
                                    <div className="flex items-center gap-1.5"><NotebookText /> Training_Certificate_MaryC.pdf</div>
                                    <span className="text-muted-foreground text-xs">128 KB</span>
                                </div>
                            </div>
                        </div>

                        {/* Decision */}
                        <div className="pt-2">
                            <p className="text-sm font-semibold mb-3 text-[#0A0A0A]">
                                Issuer Verification Decision
                            </p>

                            <div className="space-y-3">
                                {/* GREEN BUTTON */}
                                <Button
                                    className="w-full justify-start h-auto gap-3 bg-green-600 hover:bg-green-700"
                                    onClick={() => {
                                        setOpenFirst(false)
                                        setOpenSubmit(true)
                                    }}
                                >
                                    <CircleCheck />
                                    <div className="flex flex-col items-start">
                                        <span className="text-base">Mark as Effective and Close Issue</span>
                                        <span className="text-xs">Corrective action successfully resolved the issue</span>
                                    </div>
                                </Button>

                                {/* RED BUTTON */}
                                <Button
                                    variant="outline"
                                    className="w-full justify-start gap-3 h-auto border-red-500 text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                        setOpenFirst(false)
                                        setOpenNoSubmit(true)
                                    }}
                                >
                                    <CircleX />
                                    <div className="flex flex-col items-start">
                                        <span className="text-base">Mark as Ineffective & Reassign</span>
                                        <span className="text-xs">Corrective action did not adequately resolve the issue</span>
                                    </div>
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={openSubmit} onOpenChange={setOpenSubmit}>
                <DialogContent className="max-w-3xl! max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">
                            Effectiveness Verification & Closure
                        </DialogTitle>
                        <DialogDescription>
                            Review investigation details and verify corrective action effectiveness.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Assignee Investigation Summary */}
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-4">
                        <div className="flex items-center gap-2 font-semibold text-sm">
                            <Info className="text-[#155DFC]" /> Assignee Investigation Summary
                        </div>

                        <div className="space-y-2 text-sm">
                            <div>
                                <p className="text-muted-foreground mb-1">
                                    Containment / Immediate Correction:
                                </p>
                                <div className="rounded-md border bg-white p-2">fhgnxv</div>
                            </div>

                            <div>
                                <p className="text-muted-foreground mb-1">
                                    Root Cause of Problem:
                                </p>
                                <div className="rounded-md border bg-white p-2">fgxn</div>
                            </div>

                            <div>
                                <p className="text-muted-foreground mb-1">Action Plan:</p>
                                <div className="overflow-hidden rounded-md border bg-white">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Action</th>
                                                <th className="px-3 py-2 text-left">Responsible</th>
                                                <th className="px-3 py-2 text-left">Planned Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-t">
                                                <td className="px-3 py-2">gfxncb</td>
                                                <td className="px-3 py-2">Mary Chen</td>
                                                <td className="px-3 py-2">December 24th, 2025</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Effectiveness Verification */}
                    <div className="space-y-4 pt-4">
                        <h3 className="font-semibold text-sm">
                            Effectiveness Verification & Closure
                        </h3>

                        <p className="text-sm text-muted-foreground">
                            As the issuer, review the assignee's investigation and corrective actions.
                            Verify if the actions taken effectively resolved the issue and prevented
                            recurrence.
                        </p>

                        {/* Closure Comments */}
                        <div>
                            <Label className="text-sm font-medium">
                                Closure Comments <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                className="mt-1"
                                rows={4}
                                placeholder="Enter your effectiveness verification comments here..."
                            />
                        </div>

                        {/* Attachments */}
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-[#0A0A0A]">Attach Verification Evidence</p>
                                <p className="text-xs text-muted-foreground">
                                    Upload photos, documents, or test results proving effectiveness.
                                    Max 5 files, JPEG/JPG/PNG up to 2MB each.
                                </p>
                            </div>

                            <div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    multiple
                                    onChange={handleFileChange}
                                    accept=".jpg,.jpeg,.png,.pdf"
                                />

                                <Button variant="outline" onClick={handleClick}>
                                    <Upload className="mr-2 h-4 w-4" /> Upload Attachments
                                </Button>
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Issue Close Out Date */}
                            <div>
                                <Label className="text-sm font-medium">
                                    Issue Close Out Date <span className="text-red-500">*</span>
                                </Label>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start text-left font-normal"
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {closeOutDate
                                                ? format(closeOutDate, "MMMM do, yyyy")
                                                : "Pick a date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={closeOutDate}
                                            onSelect={setCloseOutDate}
                                            required
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Effectiveness Verification Date */}
                            <div>
                                <Label className="text-sm font-medium">
                                    Effectiveness Verification Date <span className="text-red-500">*</span>
                                </Label>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start text-left font-normal"
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {verificationDate
                                                ? format(verificationDate, "MMMM do, yyyy")
                                                : "Pick a date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={verificationDate}
                                            onSelect={setVerificationDate}
                                            required
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>


                        {/* Signature */}
                        <div>
                            <Label className="text-sm font-medium">
                                Issuer Signature <span className="text-red-500">*</span>
                            </Label>

                            <Input
                                type="text"
                                className="mt-1"
                                value={signature}
                                onChange={(e) => setSignature(e.target.value)}
                            />

                            <p className="text-xs text-muted-foreground mt-2">
                                Digital Signature Preview:
                            </p>

                            <div className="rounded-md border bg-white p-2 text-sm font-semibold font-times">
                                <i>{signature || "zxvvv"}</i>
                            </div>
                        </div>
                    </div>

                    {/* Decision */}
                    <p className="text-[#0A0A0A] font-semibold">Issuer Verification Decision</p>
                    <div className="rounded-lg border border-[#B9F8CF] bg-[#F0FDF4] p-4">
                        <div className="flex gap-2.5">
                            <CircleCheck className="text-[#00A63E]" size={20} />
                            <div>
                                <p className="font-semibold text-sm mb-1 text-[#00A63E]">
                                    Confirm Effectiveness
                                </p>
                                <p className="text-xs mb-3 text-[#00A63E]">
                                    This will close the issue, calculate the KPI score, and move it to
                                    Completed Issues.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button className="bg-green-600 hover:bg-green-700 w-[80%]">
                                Confirm & Close Issue
                            </Button>

                            <Button
                                className="w-[20%]"
                                variant="outline"
                                onClick={() => setOpenSubmit(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>


            <Dialog open={openNoSubmit} onOpenChange={setOpenNoSubmit}>
                <DialogContent className="max-w-3xl! max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">
                            Verify Corrective Action Effectiveness
                        </DialogTitle>
                        <DialogDescription>
                            Review the corrective action and determine if it is effective or requires reassignment
                        </DialogDescription>
                    </DialogHeader>
                    {/* Issue Summary */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm">Issue Summary</h3>
                        <div className="space-y-2 text-sm">
                            <p>
                                <span className="text-muted-foreground block">Issue ID</span>
                                <span className="font-medium text-[#0A0A0A]">Issue/2025/S1/P1/QI/Issue#1</span>
                            </p>
                            <p>
                                <span className="text-muted-foreground block">Title</span>
                                <span className="font-medium text-[#0A0A0A]">
                                    Missing ISO documentation for compliance review
                                </span>
                            </p>
                            <p>
                                <span className="text-muted-foreground block mb-1">Tag Category</span>
                                <span className="inline-block rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs">
                                    Quality Issue
                                </span>
                            </p>
                        </div>
                        {/* Description */}
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Description</p>
                            <p className="text-sm text-[#0A0A0A]">
                                Critical ISO documentation missing from compliance folder
                            </p>
                        </div>
                        {/* Root Cause */}
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Root Cause Analysis</p>
                            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
                                Documentation process was not properly followed during Q3 review
                            </div>
                        </div>
                        {/* Containment Action */}
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Containment Action</p>
                            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm">
                                Temporary workaround: Used backup documentation from previous quarter
                            </div>
                        </div>
                        {/* Corrective Action */}
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Corrective Action Plan</p>
                            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm">
                                Created comprehensive documentation checklist and updated SOPs.
                                Trained all team members on new process.
                            </div>
                        </div>
                        {/* Attachments */}
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">Attachments</p>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between rounded-md border p-3 text-sm">
                                    <div className="flex items-center gap-1.5"><NotebookText /> ISO_Documentation_Checklist_v2.pdf</div>
                                    <span className="text-muted-foreground text-xs">245 KB</span>
                                </div>
                                <div className="flex items-center justify-between rounded-md border p-3 text-sm">
                                    <div className="flex items-center gap-1.5"><NotebookText /> Training_Certificate_MaryC.pdf</div>
                                    <span className="text-muted-foreground text-xs">128 KB</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm font-semibold text-[#0A0A0A]">
                            Issuer Verification Decision
                        </p>
                        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 space-y-4">
                            {/* Header */}
                            <div className="flex items-start gap-2">
                                <AlertCircle className="text-red-700 mt-1" size={20} />
                                <div>
                                    <h3 className="font-semibold text-sm text-red-700">
                                        Reassignment Required
                                    </h3>
                                    <p className="text-sm text-red-600">
                                        Provide new instructions and reassign the issue for corrective action.
                                    </p>
                                </div>
                            </div>

                            {/* New Instructions */}
                            <div className="space-y-1">
                                <Label className="text-sm font-medium text-[#0A0A0A]">
                                    New Instructions <span className="text-red-600">*</span>
                                </Label>
                                <Textarea
                                    rows={3}
                                    placeholder="Explain why the corrective action was ineffective and provide new guidance..."
                                    className="w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                />
                            </div>

                            {/* New Assignee */}
                            <div className="space-y-1">
                                <Label className="text-sm font-medium text-[#0A0A0A]">
                                    New Assignee <span className="text-red-600">*</span>
                                </Label>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn(
                                                "w-full justify-between border-red-200 text-sm",
                                                selectedAssignees.length === 0 && "text-muted-foreground"
                                            )}
                                        >
                                            {selectedAssignees.length > 0
                                                ? assignees
                                                    .filter(a => selectedAssignees.includes(a.value))
                                                    .map(a => a.label)
                                                    .join(", ")
                                                : "Select assignee(s)"}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>

                                    <PopoverContent className="w-full p-0" align="start">
                                        <Command>
                                            <CommandEmpty>No assignee found.</CommandEmpty>
                                            <CommandGroup>
                                                {assignees.map((assignee) => (
                                                    <CommandItem
                                                        key={assignee.value}
                                                        onSelect={() => {
                                                            setSelectedAssignees((prev) =>
                                                                prev.includes(assignee.value)
                                                                    ? prev.filter((v) => v !== assignee.value)
                                                                    : [...prev, assignee.value]
                                                            )
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedAssignees.includes(assignee.value)
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                            )}
                                                        />
                                                        {assignee.label}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* New Due Date */}
                            <div className="space-y-1">
                                <Label className="text-sm font-medium text-[#0A0A0A]">
                                    New Due Date <span className="text-red-600">*</span>
                                </Label>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left text-sm border-red-200",
                                                !dueDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                                        </Button>
                                    </PopoverTrigger>

                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={dueDate}
                                            onSelect={setDueDate}
                                            disabled={(date) => date < new Date()}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Attachment */}
                            <div className="space-y-1">
                                <Label className="text-sm font-medium text-[#0A0A0A]">
                                    Attachment (Optional)
                                </Label>
                                <Input
                                    type="file"
                                    className="w-full text-sm text-muted-foreground"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    className="bg-red-600 hover:bg-red-700 text-white w-[80%]"
                                >
                                    Reassign Issue
                                </Button>

                                <Button
                                    className="w-[20%]"
                                    variant="outline"
                                    onClick={() => setOpenNoSubmit(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    )
}

