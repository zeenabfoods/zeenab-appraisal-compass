import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, User as UserIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface EmployeeRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  position: string | null;
  role: string | null;
  department?: { name: string } | null;
}

export function GlobalEmployeeSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EmployeeRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { profile } = useAuth();

  const canManage = profile?.role === 'hr' || profile?.role === 'admin' || profile?.role === 'manager';

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      const like = `%${q}%`;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, position, role, department:departments!profiles_department_id_fkey(name)')
        .eq('is_active', true)
        .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},position.ilike.${like}`)
        .order('first_name')
        .limit(15);
      if (cancelled) return;
      if (!error) setResults((data || []) as any);
      setLoading(false);
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  const placeholder = useMemo(
    () => (canManage ? 'Search employee by name, email…' : 'Search employees…'),
    [canManage]
  );

  const handleSelect = (emp: EmployeeRow) => {
    setOpen(false);
    setQuery('');
    if (canManage) {
      navigate(`/employee-questions?employee=${emp.id}`);
    } else {
      navigate('/employee-management');
    }
  };

  return (
    <div ref={wrapRef} className="relative hidden md:block" data-testid="integrated-search">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      <Input
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        placeholder={placeholder}
        className="pl-10 w-48 lg:w-64 xl:w-80 backdrop-blur-sm bg-white/70 border-white/40"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute right-0 mt-2 w-80 lg:w-96 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-auto z-50">
          {loading && (
            <div className="p-3 text-sm text-gray-500">Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="p-3 text-sm text-gray-500">No employees found.</div>
          )}
          {!loading && results.map((emp) => (
            <button
              key={emp.id}
              onClick={() => handleSelect(emp)}
              className="w-full text-left px-3 py-2 hover:bg-orange-50 border-b border-gray-100 last:border-0 flex items-start gap-2"
            >
              <UserIcon className="h-4 w-4 text-gray-400 mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-gray-800 truncate">
                    {emp.first_name} {emp.last_name}
                  </span>
                  {emp.role && (
                    <Badge variant="outline" className="text-[10px] uppercase">{emp.role}</Badge>
                  )}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {emp.position || '—'}{emp.department?.name ? ` · ${emp.department.name}` : ''}
                </div>
                {emp.email && (
                  <div className="text-xs text-gray-400 truncate">{emp.email}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}