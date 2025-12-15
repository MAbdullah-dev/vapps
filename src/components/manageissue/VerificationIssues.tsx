"use client"

import { useState, useMemo, ReactNode } from "react"
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
} from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>First Dialog</DialogTitle>
                        <DialogDescription>
                            Choose what you want to do
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex justify-end gap-2">
                        <Button
                            onClick={() => {
                                setOpenFirst(false)
                                setOpenSubmit(true)
                            }}
                        >
                            Submit
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => {
                                setOpenFirst(false)
                                setOpenNoSubmit(true)
                            }}
                        >
                            No Submit
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={openSubmit} onOpenChange={setOpenSubmit}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Submit Dialog</DialogTitle>
                        <DialogDescription>
                            This dialog opens after clicking Submit
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex justify-end">
                        <Button onClick={() => setOpenSubmit(false)}>Close</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={openNoSubmit} onOpenChange={setOpenNoSubmit}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>No Submit Dialog</DialogTitle>
                        <DialogDescription>
                            This dialog opens after clicking No Submit
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex justify-end">
                        <Button onClick={() => setOpenNoSubmit(false)}>Close</Button>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    )
}
