
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

interface EmployeeFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterRole: string;
  setFilterRole: (role: string) => void;
}

export default function EmployeeFilters({
  searchTerm,
  setSearchTerm,
  filterRole,
  setFilterRole
}: EmployeeFiltersProps) {
  return (
    <div className="flex gap-4 items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input 
          placeholder="Search employees..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <Select value={filterRole} onValueChange={setFilterRole}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          <SelectItem value="staff">Staff</SelectItem>
          <SelectItem value="manager">Manager</SelectItem>
          <SelectItem value="hr">HR</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
