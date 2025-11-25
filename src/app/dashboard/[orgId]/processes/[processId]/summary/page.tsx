import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock } from "lucide-react";

export default function SummaryPage() {
  return (
    <>
      <div className="summary-progress-cards grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card border border-[#0000001A] rounded-lg p-4 flex flex-col justify-between">
          <p className="text-[#717182] text-base">To Do</p>
          <div>
            <span className="text-base font-semibold">6</span>
            <Progress value={50} color="#6A7282" trackColor="#E5E7EB" />
          </div>
        </div>
        <div className="card border border-[#0000001A] rounded-lg p-4 flex flex-col justify-between">
          <p className="text-[#717182] text-base">In-progress</p>
          <div>
            <span className="text-base font-semibold">4</span>
            <Progress value={50} color="#2B7FFF" trackColor="#E5E7EB" />
          </div>
        </div>
        <div className="card border border-[#0000001A] rounded-lg p-4 flex flex-col justify-between">
          <p className="text-[#717182] text-base">Completed</p>
          <div>
            <span className="text-base font-semibold">2</span>
            <Progress value={50} color="#FB2C36" trackColor="#E5E7EB" />
          </div>

        </div>
        <div className="card border border-[#0000001A] rounded-lg p-4 flex flex-col justify-between">
          <p className="text-[#717182] text-base">Completed</p>
          <div>
            <span className="text-base font-semibold">0 %</span>
            <Progress value={50} className="mt-2" />
          </div>
        </div>
      </div>
      <div>
        <div className="w-1/2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates from your team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4].map((item) => (
                <ul key={item} className="flex items-start gap-3 border-b border-[#0000001A] pb-4">
                  <li>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-[#E5E7EB] text-[#364153]">MT</AvatarFallback>
                    </Avatar>
                  </li>
                  <li className="flex flex-col">
                    <p className="text-[#6A7282]">
                      <span className="text-[#0A0A0A] me-2">Mike Chen</span>
                      uploaded Document: Q4 Report
                    </p>
                    <span className="text-[#6A7282] text-xs flex items-center"><Clock /> 2 minutes ago</span>
                  </li>
                </ul>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="w-1/2"></div>
      </div>
    </>
  );
}
