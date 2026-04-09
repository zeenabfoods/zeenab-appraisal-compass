
import { useState, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useDepartmentRatingCycles,
  useRatingQuestions,
  useRatingAssignments,
  useAllDepartmentRatings
} from '@/hooks/useDepartmentRatings';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell
} from 'recharts';
import { Building2, TrendingUp, Users, Award, Star, BarChart3, Target, Download, Search, Filter } from 'lucide-react';

const COLORS = ['#F97316', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#F59E0B', '#06B6D4', '#EC4899'];
const BAND_COLORS: Record<string, string> = {
  'Excellent': '#10B981',
  'Good': '#F59E0B',
  'Fair': '#F97316',
  'Poor': '#EF4444'
};

function getBand(score: number) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

export default function DepartmentRatingScores() {
  const { data: cycles = [] } = useDepartmentRatingCycles();
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [raterSearch, setRaterSearch] = useState('');
  const [raterFilter, setRaterFilter] = useState<'all' | 'rated' | 'not_rated'>('all');
  const { data: questions = [] } = useRatingQuestions(selectedCycleId);
  const { data: assignments = [] } = useRatingAssignments(selectedCycleId);
  const { data: allRatings = [] } = useAllDepartmentRatings(selectedCycleId);

  const { data: departments = [] } = useQuery({
    queryKey: ['departments-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: allProfiles = [] } = useQuery({
    queryKey: ['all-profiles-for-rating-tracker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, department_id, position')
        .eq('is_active', true)
        .order('first_name');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: totalEmployees = 0 } = useQuery({
    queryKey: ['total-active-employees'],
    queryFn: async () => {
      const { count, error } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true);
      if (error) throw error;
      return count || 0;
    }
  });

  // Auto-select first cycle
  if (!selectedCycleId && cycles.length > 0) {
    setSelectedCycleId(cycles[0].id);
  }

  // Calculate department scores
  const departmentScores = useMemo(() => {
    const rateableDeptIds = [...new Set(assignments.map(a => a.department_id))];
    return rateableDeptIds.map(deptId => {
      const dept = departments.find(d => d.id === deptId);
      const deptRatings = allRatings.filter(r => r.department_id === deptId);
      const uniqueRaters = [...new Set(deptRatings.map(r => r.employee_id))].length;
      const avgRating = deptRatings.length > 0
        ? deptRatings.reduce((sum, r) => sum + r.rating, 0) / deptRatings.length
        : 0;
      const scorePercent = (avgRating / 5) * 100;
      return {
        id: deptId,
        name: dept?.name || 'Unknown',
        avgRating: Math.round(avgRating * 100) / 100,
        scorePercent: Math.round(scorePercent * 10) / 10,
        totalRatings: deptRatings.length,
        uniqueRaters,
        band: getBand(scorePercent)
      };
    }).sort((a, b) => b.scorePercent - a.scorePercent);
  }, [assignments, allRatings, departments]);

  // Overall aggregated score
  const overallScore = useMemo(() => {
    if (departmentScores.length === 0) return 0;
    return Math.round(departmentScores.reduce((sum, d) => sum + d.scorePercent, 0) / departmentScores.length * 10) / 10;
  }, [departmentScores]);

  // Response rate
  const responseRate = useMemo(() => {
    const uniqueRaters = [...new Set(allRatings.map(r => r.employee_id))].length;
    return totalEmployees > 0 ? Math.round((uniqueRaters / totalEmployees) * 100) : 0;
  }, [allRatings, totalEmployees]);

  // Heatmap data: questions x departments
  const heatmapData = useMemo(() => {
    return questions.map(q => {
      const row: any = { question: q.question_text.substring(0, 40) + (q.question_text.length > 40 ? '...' : '') };
      departmentScores.forEach(ds => {
        const qRatings = allRatings.filter(r => r.department_id === ds.id && r.question_id === q.id);
        row[ds.name] = qRatings.length > 0
          ? Math.round((qRatings.reduce((s, r) => s + r.rating, 0) / qRatings.length) * 100) / 100
          : 0;
      });
      return row;
    });
  }, [questions, departmentScores, allRatings]);

  // Radar data for top departments
  const radarData = useMemo(() => {
    const categories = [...new Set(questions.map(q => q.question_category))];
    return categories.map(cat => {
      const catQuestionIds = questions.filter(q => q.question_category === cat).map(q => q.id);
      const row: any = { category: cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) };
      departmentScores.slice(0, 5).forEach(ds => {
        const catRatings = allRatings.filter(r => r.department_id === ds.id && catQuestionIds.includes(r.question_id));
        row[ds.name] = catRatings.length > 0
          ? Math.round((catRatings.reduce((s, r) => s + r.rating, 0) / catRatings.length) * 20) // scale to 100
          : 0;
      });
      return row;
    });
  }, [questions, departmentScores, allRatings]);

  // Band distribution pie
  const bandDistribution = useMemo(() => {
    const bands: Record<string, number> = {};
    departmentScores.forEach(d => {
      bands[d.band] = (bands[d.band] || 0) + 1;
    });
    return Object.entries(bands).map(([name, value]) => ({ name, value }));
  }, [departmentScores]);

  // Rater tracking data
  const raterTrackingData = useMemo(() => {
    const raterIds = new Set(allRatings.map(r => r.employee_id));
    return allProfiles.map(p => {
      const dept = departments.find(d => d.id === p.department_id);
      const employeeRatings = allRatings.filter(r => r.employee_id === p.id);
      const deptRated = [...new Set(employeeRatings.map(r => r.department_id))].length;
      const lastRatedAt = employeeRatings.length > 0
        ? employeeRatings.reduce((latest, r) => r.created_at > latest ? r.created_at : latest, employeeRatings[0].created_at)
        : null;
      return {
        id: p.id,
        name: `${p.first_name} ${p.last_name}`.trim(),
        email: p.email || '',
        department: dept?.name || 'Unassigned',
        position: p.position || '',
        hasRated: raterIds.has(p.id),
        totalResponses: employeeRatings.length,
        departmentsRated: deptRated,
        lastRatedAt
      };
    });
  }, [allProfiles, allRatings, departments]);

  const filteredRaterData = useMemo(() => {
    return raterTrackingData.filter(r => {
      const matchesSearch = !raterSearch || 
        r.name.toLowerCase().includes(raterSearch.toLowerCase()) ||
        r.email.toLowerCase().includes(raterSearch.toLowerCase()) ||
        r.department.toLowerCase().includes(raterSearch.toLowerCase());
      const matchesFilter = raterFilter === 'all' || 
        (raterFilter === 'rated' && r.hasRated) ||
        (raterFilter === 'not_rated' && !r.hasRated);
      return matchesSearch && matchesFilter;
    });
  }, [raterTrackingData, raterSearch, raterFilter]);

  const selectedCycle = cycles.find(c => c.id === selectedCycleId);

  const exportRaterCSV = useCallback(() => {
    const headers = ['Name', 'Email', 'Department', 'Position', 'Status', 'Total Responses', 'Departments Rated', 'Last Rated'];
    const rows = filteredRaterData.map(r => [
      r.name,
      r.email,
      r.department,
      r.position,
      r.hasRated ? 'Rated' : 'Not Rated',
      r.totalResponses.toString(),
      r.departmentsRated.toString(),
      r.lastRatedAt ? new Date(r.lastRatedAt).toLocaleString() : 'N/A'
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rater-tracking-${selectedCycle?.name || 'cycle'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredRaterData, selectedCycle]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Department Rating Scores</h1>
            <p className="text-gray-600">View aggregated ratings and performance across departments</p>
          </div>
          <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Select cycle" /></SelectTrigger>
            <SelectContent>
              {cycles.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name} {c.status === 'active' && '✓'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedCycleId ? (
          <Card><CardContent className="py-16 text-center text-gray-400">Select a rating cycle to view scores</CardContent></Card>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overallScore}%</div>
                  <Badge className={`mt-1 ${BAND_COLORS[getBand(overallScore)] ? '' : ''}`} style={{ backgroundColor: BAND_COLORS[getBand(overallScore)] + '20', color: BAND_COLORS[getBand(overallScore)] }}>
                    {getBand(overallScore)}
                  </Badge>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Departments Rated</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{departmentScores.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{allRatings.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{responseRate}%</div>
                  <p className="text-xs text-muted-foreground">{[...new Set(allRatings.map(r => r.employee_id))].length} of {totalEmployees} employees</p>
                </CardContent>
              </Card>
            </div>

            {/* Department Rankings */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" /> Department Rankings</CardTitle></CardHeader>
              <CardContent>
                {departmentScores.length > 0 ? (
                  <div className="space-y-4">
                    {departmentScores.map((dept, idx) => (
                      <div key={dept.id} className="flex items-center gap-4">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-100 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'}`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm truncate">{dept.name}</span>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-bold">{dept.avgRating}/5</span>
                              </div>
                              <Badge variant="outline" style={{ backgroundColor: BAND_COLORS[dept.band] + '15', color: BAND_COLORS[dept.band], borderColor: BAND_COLORS[dept.band] }}>
                                {dept.band}
                              </Badge>
                            </div>
                          </div>
                          <Progress value={dept.scorePercent} className="h-2" />
                          <p className="text-xs text-gray-500 mt-1">{dept.uniqueRaters} raters · {dept.totalRatings} responses · {dept.scorePercent}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-400">No ratings submitted yet</div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Bar Chart */}
              <Card>
                <CardHeader><CardTitle>Score Comparison</CardTitle></CardHeader>
                <CardContent>
                  {departmentScores.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={departmentScores} margin={{ bottom: 80 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={11} interval={0} />
                          <YAxis domain={[0, 100]} />
                          <Tooltip formatter={(v: number) => [`${v}%`, 'Score']} />
                          <Bar dataKey="scorePercent" name="Score %" fill="#F97316" radius={[4, 4, 0, 0]}>
                            {departmentScores.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <div className="h-[300px] flex items-center justify-center text-gray-400">No data</div>}
                </CardContent>
              </Card>

              {/* Band Distribution */}
              <Card>
                <CardHeader><CardTitle>Performance Distribution</CardTitle></CardHeader>
                <CardContent>
                  {bandDistribution.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={bandDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {bandDistribution.map((entry) => (
                              <Cell key={entry.name} fill={BAND_COLORS[entry.name] || '#6B7280'} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <div className="h-[300px] flex items-center justify-center text-gray-400">No data</div>}
                </CardContent>
              </Card>
            </div>

            {/* Radar Chart */}
            {radarData.length > 0 && departmentScores.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Category Comparison (Top 5 Departments)</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="category" fontSize={11} />
                        <PolarRadiusAxis domain={[0, 100]} />
                        {departmentScores.slice(0, 5).map((ds, i) => (
                          <Radar key={ds.id} name={ds.name} dataKey={ds.name}
                            stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} />
                        ))}
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Heatmap Table */}
            {heatmapData.length > 0 && departmentScores.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Question × Department Heatmap</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 min-w-[200px]">Question</th>
                          {departmentScores.map(ds => (
                            <th key={ds.id} className="text-center p-2 min-w-[80px]">{ds.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {heatmapData.map((row, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="p-2 text-gray-700">{row.question}</td>
                            {departmentScores.map(ds => {
                              const val = row[ds.name] || 0;
                              const pct = (val / 5) * 100;
                              const bg = pct >= 80 ? 'bg-green-100 text-green-800' : pct >= 60 ? 'bg-yellow-100 text-yellow-800' : pct >= 40 ? 'bg-orange-100 text-orange-800' : val > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-50 text-gray-400';
                              return (
                                <td key={ds.id} className={`p-2 text-center font-medium ${bg}`}>
                                  {val > 0 ? val.toFixed(1) : '-'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rater Tracking Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Employee Rating Tracker
                    <Badge variant="outline" className="ml-2">
                      {raterTrackingData.filter(r => r.hasRated).length} rated / {raterTrackingData.length} total
                    </Badge>
                  </CardTitle>
                  <Button onClick={exportRaterCSV} variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or department..."
                      value={raterSearch}
                      onChange={e => setRaterSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={raterFilter} onValueChange={(v: 'all' | 'rated' | 'not_rated') => setRaterFilter(v)}>
                    <SelectTrigger className="w-[160px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
                      <SelectItem value="rated">Rated</SelectItem>
                      <SelectItem value="not_rated">Not Rated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-semibold">S/N</th>
                        <th className="text-left p-3 font-semibold">Name</th>
                        <th className="text-left p-3 font-semibold">Email</th>
                        <th className="text-left p-3 font-semibold">Department</th>
                        <th className="text-left p-3 font-semibold">Position</th>
                        <th className="text-center p-3 font-semibold">Status</th>
                        <th className="text-center p-3 font-semibold">Responses</th>
                        <th className="text-center p-3 font-semibold">Depts Rated</th>
                        <th className="text-left p-3 font-semibold">Last Rated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRaterData.map((r, idx) => (
                        <tr key={r.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 text-muted-foreground">{idx + 1}</td>
                          <td className="p-3 font-medium">{r.name}</td>
                          <td className="p-3 text-muted-foreground">{r.email}</td>
                          <td className="p-3">{r.department}</td>
                          <td className="p-3 text-muted-foreground">{r.position}</td>
                          <td className="p-3 text-center">
                            <Badge variant={r.hasRated ? 'default' : 'destructive'} className={r.hasRated ? 'bg-green-500' : ''}>
                              {r.hasRated ? 'Rated' : 'Not Rated'}
                            </Badge>
                          </td>
                          <td className="p-3 text-center font-medium">{r.totalResponses}</td>
                          <td className="p-3 text-center font-medium">{r.departmentsRated}</td>
                          <td className="p-3 text-muted-foreground text-xs">
                            {r.lastRatedAt ? new Date(r.lastRatedAt).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                      {filteredRaterData.length === 0 && (
                        <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No employees found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
