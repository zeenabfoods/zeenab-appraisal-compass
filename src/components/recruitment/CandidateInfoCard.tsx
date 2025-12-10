import { useState } from "react";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Mail, Phone, Briefcase, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface CandidateInfoCardProps {
  name: string;
  email: string;
  phone: string;
  currentRole: string;
  yearsOfExperience?: number;
  location?: string;
  linkedIn?: string;
  education?: string;
}

interface InfoItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
  fullValue?: string;
}

function InfoItem({ icon: Icon, label, value, fullValue }: InfoItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const displayValue = fullValue || value;
  const isTruncated = value !== displayValue;

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-2 cursor-pointer">
        <div className="p-2 rounded-lg bg-orange-50 shrink-0">
          <Icon className="h-4 w-4 text-recruitment-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-medium text-sm truncate max-w-[120px]">{value}</p>
        </div>
      </div>

      <AnimatePresence>
        {isHovered && isTruncated && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-50 left-0 top-full mt-2 p-3 bg-white rounded-lg shadow-xl border border-border min-w-[200px] max-w-[300px]"
          >
            <div className="flex items-start gap-2">
              <div className="p-2 rounded-lg bg-orange-50 shrink-0">
                <Icon className="h-4 w-4 text-recruitment-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className="font-medium text-sm break-all">{displayValue}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CandidateInfoCard({
  name,
  email,
  phone,
  currentRole,
  yearsOfExperience,
  location,
  linkedIn,
  education
}: CandidateInfoCardProps) {
  // Truncate helper
  const truncate = (str: string, length: number) => {
    if (str.length <= length) return str;
    return str.slice(0, length) + "...";
  };

  return (
    <Card className="shadow-sm">
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <InfoItem
            icon={FileText}
            label="Name"
            value={truncate(name, 10)}
            fullValue={name}
          />
          <InfoItem
            icon={Mail}
            label="Email"
            value={truncate(email, 12)}
            fullValue={email}
          />
          <InfoItem
            icon={Phone}
            label="Phone"
            value={phone}
          />
          <InfoItem
            icon={Briefcase}
            label="Current Role"
            value={truncate(currentRole, 12)}
            fullValue={currentRole}
          />
          <InfoItem
            icon={Calendar}
            label="Experience"
            value={yearsOfExperience ? `${yearsOfExperience}+ years` : "N/A"}
          />
        </div>
      </div>
    </Card>
  );
}
