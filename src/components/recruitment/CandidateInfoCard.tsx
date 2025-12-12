import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { FileText, Mail, Phone, Briefcase, Calendar, MapPin, GraduationCap, Linkedin, Pencil } from "lucide-react";
import { CandidateEditDialog } from "./CandidateEditDialog";

interface CandidateInfoCardProps {
  candidateId: string;
  name: string;
  email: string;
  phone: string;
  currentRole: string;
  appliedRole?: string;
  yearsOfExperience?: number;
  location?: string;
  linkedIn?: string;
  education?: string;
  isHROrAdmin?: boolean;
  onUpdate?: () => void;
}

interface InfoItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
  onClick?: () => void;
}

function InfoItem({ icon: Icon, label, value, onClick }: InfoItemProps) {
  return (
    <motion.div 
      className="flex items-center gap-2 cursor-pointer group"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 shrink-0 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors">
        <Icon className="h-4 w-4 text-recruitment-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-sm truncate max-w-[120px]">{value}</p>
      </div>
    </motion.div>
  );
}

export function CandidateInfoCard({
  candidateId,
  name,
  email,
  phone,
  currentRole,
  appliedRole,
  yearsOfExperience,
  location,
  linkedIn,
  education,
  isHROrAdmin = false,
  onUpdate
}: CandidateInfoCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Truncate helper
  const truncate = (str: string, length: number) => {
    if (!str) return "N/A";
    if (str.length <= length) return str;
    return str.slice(0, length) + "...";
  };

  const openModal = () => setIsModalOpen(true);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(false);
    setIsEditOpen(true);
  };

  const handleSaved = () => {
    if (onUpdate) onUpdate();
  };

  return (
    <>
      <Card 
        className="shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        onClick={openModal}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">Click to view full details</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <InfoItem
              icon={FileText}
              label="Name"
              value={truncate(name, 12)}
            />
            <InfoItem
              icon={Mail}
              label="Email"
              value={truncate(email, 14)}
            />
            <InfoItem
              icon={Phone}
              label="Phone"
              value={truncate(phone, 14)}
            />
            <InfoItem
              icon={Briefcase}
              label="Applied Role"
              value={truncate(appliedRole || currentRole, 12)}
            />
            <InfoItem
              icon={Briefcase}
              label="Current Role"
              value={truncate(currentRole, 12)}
            />
            <InfoItem
              icon={Calendar}
              label="Experience"
              value={yearsOfExperience ? `${yearsOfExperience}+ years` : "N/A"}
            />
          </div>
        </div>
      </Card>

      {/* Full Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-recruitment-primary" />
                Candidate Details
              </DialogTitle>
              {isHROrAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditClick}
                  className="gap-1 text-recruitment-primary border-recruitment-primary hover:bg-recruitment-primary/10"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </DialogHeader>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 pt-4"
          >
            {/* Name */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                <FileText className="h-5 w-5 text-recruitment-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Full Name</p>
                <p className="font-semibold text-foreground">{name || "Not provided"}</p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                <Mail className="h-5 w-5 text-recruitment-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Email Address</p>
                <p className="font-semibold text-foreground break-all">{email || "Not provided"}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                <Phone className="h-5 w-5 text-recruitment-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Phone Number</p>
                <p className="font-semibold text-foreground">{phone || "Not provided"}</p>
              </div>
            </div>

            {/* Applied Role */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50/50 border border-orange-200">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                <Briefcase className="h-5 w-5 text-recruitment-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Applied Role</p>
                <p className="font-semibold text-foreground">{appliedRole || currentRole || "Not specified"}</p>
              </div>
            </div>

            {/* Current Role */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                <Briefcase className="h-5 w-5 text-recruitment-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Current Role</p>
                <p className="font-semibold text-foreground">{currentRole || "Not provided"}</p>
              </div>
            </div>

            {/* Years of Experience */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                <Calendar className="h-5 w-5 text-recruitment-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Years of Experience</p>
                <p className="font-semibold text-foreground">
                  {yearsOfExperience ? `${yearsOfExperience}+ years` : "Not specified"}
                </p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                <MapPin className="h-5 w-5 text-recruitment-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Location</p>
                <p className="font-semibold text-foreground">{location || "Not provided"}</p>
              </div>
            </div>

            {/* Education */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                <GraduationCap className="h-5 w-5 text-recruitment-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Education</p>
                <p className="font-semibold text-foreground">{education || "Not provided"}</p>
              </div>
            </div>

            {/* LinkedIn */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                <Linkedin className="h-5 w-5 text-recruitment-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">LinkedIn</p>
                {linkedIn ? (
                  <a 
                    href={linkedIn} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-semibold text-recruitment-primary hover:underline"
                  >
                    View Profile
                  </a>
                ) : (
                  <p className="font-semibold text-foreground">Not provided</p>
                )}
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <CandidateEditDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        candidateId={candidateId}
        initialData={{
          name: name || '',
          email: email || '',
          phone: phone || '',
          appliedRole: appliedRole || '',
          currentRole: currentRole || '',
          yearsOfExperience: yearsOfExperience ?? null,
          location: location || '',
          education: education || '',
          linkedIn: linkedIn || ''
        }}
        onSaved={handleSaved}
      />
    </>
  );
}
