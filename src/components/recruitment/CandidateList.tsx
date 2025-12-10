import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, UserCheck, UserX, Trash2 } from "lucide-react";
import { Candidate } from "./mockData";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CandidateListProps {
  candidates: Candidate[];
  selectedCandidate: Candidate | null;
  onSelect: (candidate: Candidate) => void;
  onDelete?: (candidateId: string) => void;
  isHROrAdmin?: boolean;
}

export function CandidateList({ 
  candidates, 
  selectedCandidate, 
  onSelect, 
  onDelete,
  isHROrAdmin = false 
}: CandidateListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredCandidates = candidates.filter(candidate =>
    candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    candidate.currentRole.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "bg-green-500 hover:bg-green-500";
    if (score >= 50) return "bg-orange-500 hover:bg-orange-500";
    return "bg-red-500 hover:bg-red-500";
  };

  const getStatusIcon = (status: Candidate['status']) => {
    if (status === 'hired' || status === 'selected') return <UserCheck className="h-4 w-4 text-green-600" />;
    if (status === 'rejected') return <UserX className="h-4 w-4 text-red-500" />;
    return null;
  };

  const handleDeleteClick = (e: React.MouseEvent, candidateId: string) => {
    e.stopPropagation();
    setDeleteConfirm(candidateId);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm && onDelete) {
      onDelete(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Candidate List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredCandidates.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No candidates found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCandidates.map((candidate) => (
              <div
                key={candidate.id}
                onClick={() => onSelect(candidate)}
                className={cn(
                  "p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white hover:shadow-md group",
                  selectedCandidate?.id === candidate.id
                    ? "bg-white shadow-md border-2 border-recruitment-primary"
                    : "bg-transparent border-2 border-transparent"
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-sm font-medium">
                      {candidate.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">
                        {candidate.name}
                      </span>
                      {getStatusIcon(candidate.status)}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {candidate.currentRole}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-white text-xs", getScoreBadgeColor(candidate.matchScore))}>
                      {candidate.matchScore}%
                    </Badge>
                    {isHROrAdmin && onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDeleteClick(e, candidate.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div className="p-4 border-t bg-white">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Total: {candidates.length}</span>
          <span>Hired: {candidates.filter(c => c.status === 'hired').length}</span>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Candidate?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this candidate and all their evaluations. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
