"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  CheckCircle,
  Download,
  FileText,
  Plus,
  Save,
  Search,
  Upload,
} from "lucide-react";
import { getDashboardPath } from "@/lib/subdomain";
import { cn } from "@/lib/utils";

type EvidenceDocument = {
  documentRef: string;
  natureOfDocument: string;
  title: string;
  type: string;
  site: string;
  process: string;
  standardClause: string;
  subclause: string;
  docCategory: string;
  version: string;
  planDate: string;
  releaseDate: string;
  review: string;
};

const MOCK_DOCUMENTS: EvidenceDocument[] = [
  {
    documentRef: "Doc/2025/01/P1/P/0/D1/v1",
    natureOfDocument: "New Document",
    title: "Environment Policy",
    type: "P",
    site: "S001",
    process: "P1-Quality",
    standardClause: "14001",
    subclause: "4.2 Interested Parties",
    docCategory: "D1",
    version: "v1",
    planDate: "05-09-2025",
    releaseDate: "05-09-2025",
    review: "-",
  },
  {
    documentRef: "Doc/2025/01/P2/F/D6/v3",
    natureOfDocument: "Revision",
    title: "Production Schedule",
    type: "F",
    site: "S2",
    process: "P2-Manufacturing",
    standardClause: "9001",
    subclause: "8.5 Production Planning",
    docCategory: "D6",
    version: "v3",
    planDate: "11-09-2025",
    releaseDate: "11-09-2025",
    review: "11-09-2025",
  },
  {
    documentRef: "Doc/2025/01/P1/F/D9/v2",
    natureOfDocument: "New Document",
    title: "Parts Inspection",
    type: "F",
    site: "S1",
    process: "P1-Quality",
    standardClause: "9001",
    subclause: "8.0 Planning",
    docCategory: "D9",
    version: "v2",
    planDate: "15-09-2025",
    releaseDate: "15-09-2025",
    review: "-",
  },
  {
    documentRef: "Doc/2025/01/P4/F/D11/v4",
    natureOfDocument: "Revision",
    title: "Supplier Evaluation",
    type: "F",
    site: "S1",
    process: "P5-Supply Chain",
    standardClause: "9001",
    subclause: "8.0 Improvement",
    docCategory: "D11",
    version: "v4",
    planDate: "20-08-2025",
    releaseDate: "20-08-2025",
    review: "20-09-2025",
  },
];

export default function DocumentsContent() {
  const params = useParams();
  const orgId = (params?.orgId as string) || "";
  const createDocumentHref = orgId ? getDashboardPath(orgId, "documents/create") : "#";
  const [selectedTable, setSelectedTable] = useState<string>("Master Document List");
  const [search, setSearch] = useState("");
  const [workflowStep, setWorkflowStep] = useState<1 | 2 | 3>(1);

  const documentsForTable = useMemo(() => {
    switch (selectedTable) {
      case "Master Document List (P & F)":
        return MOCK_DOCUMENTS;
      case "Master Document List":
        // Simple demo split: show only Type P when user selects “Master Document List”
        return MOCK_DOCUMENTS.filter((d) => d.type === "P");
      case "Document Register":
        // For now we re-use the same mock data.
        return MOCK_DOCUMENTS;
      default:
        return MOCK_DOCUMENTS;
    }
  }, [selectedTable]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return documentsForTable;
    return documentsForTable.filter((d) => {
      const haystack = [
        d.documentRef,
        d.natureOfDocument,
        d.title,
        d.type,
        d.site,
        d.process,
        d.standardClause,
        d.subclause,
        d.docCategory,
        d.version,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [documentsForTable, search]);

  return (
    <div className="space-y-6">
      {/* Workflow header (same concept as audit) */}
      <div className="bg-[#0A0A0A] rounded-xl px-6 py-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-white" />
            <h1 className="text-xl sm:text-2xl font-semibold text-white">
              Documentary Evidence Records
            </h1>
          </div>
          <p className="text-sm text-[#9CA3AF] mt-1">
            View and manage documents across different categories
          </p>
        </div>
        <Button asChild className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white flex items-center gap-2">
          <Link href={createDocumentHref}>
            <Plus size={16} />
            Create Document
          </Link>
        </Button>
      </div>

      {/* Select table */}
      <Card className="py-4">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="w-full sm:w-auto">
            <p className="text-xs text-[#6A7282] mb-2">Select Table</p>
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger className="w-full sm:w-[340px] border border-[#0000001A] rounded-xl bg-white px-3 py-2 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Master Document List">
                  Master Document List
                </SelectItem>
                <SelectItem value="Master Document List (P & F)">
                  Master Document List (P &amp; F)
                </SelectItem>
                <SelectItem value="Document Register">
                  Document Register
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main list */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#0A0A0A]">
                {selectedTable}
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-[#6A7282]"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 border-none bg-[#F3F3F5] w-[260px]"
                  placeholder="Search..."
                />
              </div>

              <Button variant="outline" className="flex items-center gap-2">
                <Download size={16} />
                Download Excel Sheet
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-[#0000001A] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Ref.</TableHead>
                  <TableHead>Nature of Document</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Process</TableHead>
                  <TableHead>Standard Clause</TableHead>
                  <TableHead>Subclause</TableHead>
                  <TableHead>Doc#</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Plan Date</TableHead>
                  <TableHead>Release Date</TableHead>
                  <TableHead>Review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((doc) => (
                  <TableRow key={doc.documentRef}>
                    <TableCell className="font-medium text-[#0A0A0A]">
                      {doc.documentRef}
                    </TableCell>
                    <TableCell>{doc.natureOfDocument}</TableCell>
                    <TableCell>{doc.title}</TableCell>
                    <TableCell>
                      <span className="text-xs font-semibold bg-[#ECEEF2] px-2 py-1 rounded-3xl">
                        {doc.type}
                      </span>
                    </TableCell>
                    <TableCell>{doc.site}</TableCell>
                    <TableCell>{doc.process}</TableCell>
                    <TableCell>{doc.standardClause}</TableCell>
                    <TableCell>{doc.subclause}</TableCell>
                    <TableCell>{doc.docCategory}</TableCell>
                    <TableCell>{doc.version}</TableCell>
                    <TableCell>{doc.planDate}</TableCell>
                    <TableCell>{doc.releaseDate}</TableCell>
                    <TableCell>{doc.review}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Action strip (purely visual until backend exists) */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button variant="outline" className="flex items-center gap-2">
              <Upload size={16} />
              Upload
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Document Classification */}
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-base font-semibold text-[#0A0A0A]">
            Document Classification
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#0000001A] p-4">
              <h3 className="font-semibold text-sm mb-3">
                Category 1 - Maintained Documents <span className="text-[#22B323]">(Type P)</span>
              </h3>
              <div className="text-sm text-[#6A7282] space-y-1">
                <div>Policy</div>
                <div>Procedure</div>
                <div>SOP</div>
                <div>Work Instruction</div>
                <div>
                  <span className="font-medium text-[#0A0A0A]">Lifecycle:</span> Draft -&gt; Create -&gt; Review -&gt; Approve -&gt; Obsolete
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#0000001A] p-4">
              <h3 className="font-semibold text-sm mb-3">
                Category 2 - Retained Records <span className="text-[#0EA5E9]">(Type F)</span>
              </h3>
              <div className="text-sm text-[#6A7282] space-y-1">
                <div>Templates</div>
                <div>Forms</div>
                <div>Checklists</div>
                <div>
                  <span className="font-medium text-[#0A0A0A]">Lifecycle:</span>{" "}
                  Draft + Capture -&gt; Verify -&gt; Archive -&gt; Dispose
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Status Logic */}
      <Card>
        <CardContent className="space-y-3">
          <h2 className="text-base font-semibold text-[#0A0A0A]">KPI Status Logic</h2>

          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-2 text-sm text-[#0A0A0A]">
              <span className="w-3 h-3 rounded-sm bg-[#22C55E]" />
              Success &lt;=30 days → Green (Consistent)
            </div>
            <div className="flex items-center gap-2 text-sm text-[#0A0A0A]">
              <span className="w-3 h-3 rounded-sm bg-[#F59E0B]" />
              In-Progress &lt;=30 days → Yellow
            </div>
            <div className="flex items-center gap-2 text-sm text-[#0A0A0A]">
              <span className="w-3 h-3 rounded-sm bg-[#EF4444]" />
              Pending &gt;30 days → Red
            </div>
            <div className="flex items-center gap-2 text-sm text-[#0A0A0A]">
              <span className="w-3 h-3 rounded-sm bg-[#DC2626]" />
              Fail &gt;40 days → Red (Inconsistent)
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

