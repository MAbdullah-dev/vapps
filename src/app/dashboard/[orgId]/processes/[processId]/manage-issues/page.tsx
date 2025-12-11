"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { issuesData } from "./data/issues-data";
import { DataTable } from "./data-table";
import { columns } from "./columns";

const ManageIssuesPage = () => {
  return (
    <div className="space-y-6 p-4">
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger className="p-4" value="all">
            All Issues
          </TabsTrigger>
          <TabsTrigger className="p-4" value="verification">
            Verification Required 
            <span className="text-[#8200DB] border border-[#DAB2FF] bg-[#F3E8FF] px-2 py-0.5 rounded-sm ms-1">
              (2)
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <DataTable columns={columns} data={issuesData} />
        </TabsContent>

        <TabsContent value="verification">
          <DataTable
            columns={columns}
            data={issuesData.filter((i) => i.status === "Pending Verification")}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManageIssuesPage;
