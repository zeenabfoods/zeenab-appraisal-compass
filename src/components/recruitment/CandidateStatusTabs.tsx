import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX, Clock, Briefcase } from "lucide-react";

interface CandidateStatusTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: {
    all: number;
    pending: number;
    under_review: number;
    selected: number;
    rejected: number;
    hired: number;
  };
}

export function CandidateStatusTabs({ activeTab, onTabChange, counts }: CandidateStatusTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid grid-cols-5 w-full h-auto p-1 bg-muted/50">
        <TabsTrigger value="all" className="text-xs py-2 flex items-center gap-1">
          <Users className="h-3 w-3" />
          All
          <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
            {counts.all}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="pending" className="text-xs py-2 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
          <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
            {counts.pending}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="under_review" className="text-xs py-2 flex items-center gap-1">
          <Briefcase className="h-3 w-3" />
          Review
          <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
            {counts.under_review}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="selected" className="text-xs py-2 flex items-center gap-1">
          <UserCheck className="h-3 w-3" />
          Selected
          <Badge className="ml-1 px-1.5 py-0 text-[10px] bg-green-500">
            {counts.selected + counts.hired}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="rejected" className="text-xs py-2 flex items-center gap-1">
          <UserX className="h-3 w-3" />
          Rejected
          <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
            {counts.rejected}
          </Badge>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
