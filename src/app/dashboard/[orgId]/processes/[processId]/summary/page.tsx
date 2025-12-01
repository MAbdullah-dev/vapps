import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock } from "lucide-react";

export default function SummaryPage() {
  return (
    <div className="space-y-6 p-4">
      {/* Top Progress Cards */}
      <div className="summary-progress-cards grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: "To Do", value: "6", progress: 50, color: "#6A7282" },
          { title: "In Progress", value: "4", progress: 50, color: "#2B7FFF" },
          { title: "Completed", value: "2", progress: 50, color: "#FB2C36" },
          { title: "Completion", value: "0%", progress: 0, color: "#A3A3A3" },
        ].map((card, idx) => (
          <div
            key={idx}
            className="card border border-[#0000001A] rounded-lg p-4 flex flex-col justify-between"
          >
            <p className="text-[#717182] text-sm">{card.title}</p>
            <div className="mt-2">
              <span className="text-base font-semibold">{card.value}</span>
              <Progress
                value={card.progress}
                color={card.color}
                trackColor="#E5E7EB"
                className="mt-2"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Cards */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left Column */}
        <div className="flex-1 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates from your team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4].map((item) => (
                <ul
                  key={item}
                  className="flex items-start gap-3 border-b border-[#0000001A] pb-4"
                >
                  <li>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-[#E5E7EB] text-[#364153]">MT</AvatarFallback>
                    </Avatar>
                  </li>
                  <li className="flex flex-col">
                    <p className="text-[#6A7282]">
                      <span className="text-[#0A0A0A] me-2 font-medium">Mike Chen</span>
                      uploaded Document: Q4 Report
                    </p>
                    <span className="text-[#6A7282] text-xs flex items-center gap-1">
                      <Clock size={12} /> 2 minutes ago
                    </span>
                  </li>
                </ul>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Milestones</CardTitle>
              <CardDescription>Key dates and deliverables</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4].map((item) => (
                <ul
                  key={item}
                  className="flex items-center justify-between gap-3 border-b border-[#0000001A] pb-4"
                >
                  <div className="flex items-start gap-3">
                    <li>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-[#E5E7EB] text-[#364153]">MT</AvatarFallback>
                      </Avatar>
                    </li>
                    <li className="flex flex-col">
                      <p className="text-[#6A7282]">
                        <span className="text-[#0A0A0A] me-2 font-medium">Mike Chen</span>
                        uploaded Document: Q4 Report
                      </p>
                      <span className="text-[#6A7282] text-xs flex items-center gap-1">
                        <Calendar size={12} /> Nov 1, 2026
                      </span>
                    </li>
                  </div>
                  <li>
                    <Button variant="dark" size="sm">
                      On Track
                    </Button>
                  </li>
                </ul>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="flex-1 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Active team members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4].map((item) => (
                <ul key={item} className="flex items-center gap-3 ">
                  <li>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-[#E5E7EB] text-[#364153]">MT</AvatarFallback>
                    </Avatar>
                  </li>
                  <li className="flex flex-col">
                    <p className="text-[#0A0A0A] font-medium">Mike Chen</p>
                    <span className="text-[#6A7282] text-xs">Member</span>
                  </li>
                </ul>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Space Statistics</CardTitle>
              <CardDescription>Overall progress</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress
                value={70}
                color="#364153"
                trackColor="#E5E7EB"
                className="mb-4"
              />
              <div className="flex justify-between text-xs text-[#6A7282]">
                <span>Total tasks</span>
                <span>45</span>
              </div>
              <div className="flex justify-between text-xs text-[#6A7282]">
                <span>Open tasks</span>
                <span>18</span>
              </div>
              <div className="flex justify-between text-xs text-[#6A7282]">
                <span>Sync Status</span>
                <Badge variant="outline">Synced</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
