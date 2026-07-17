import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GraduationCap, Sparkles, Loader2, CheckCircle, Send, ExternalLink, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GapItem {
  section: string;
  empScore: number;
  mgrScore: number;
  gapType: string;
  severity: number;
}

interface Props {
  gaps: GapItem[];
  employeeName?: string;
  position?: string;
  overallScore?: number;
  onApply?: (payload: {
    rec: any;
    mode: 'internal' | 'external';
    platform?: { name: string; url: string };
    recommendationSource: 'rule' | 'ai';
  }) => void;
}

// ---------- Rule-based recommendation engine ----------
function ruleBasedRecommendations(gaps: GapItem[]) {
  const lib: Array<{ match: RegExp; title: string; format: string; duration: string }> = [
    { match: /operation|efficien|process|productivity/i, title: 'Operational Excellence & Process Improvement', format: 'Workshop', duration: '2 days' },
    { match: /conduct|communicat|behaviour|behavior|interpersonal|team/i, title: 'Effective Workplace Communication & Conduct', format: 'E-learning + Coaching', duration: '3 weeks' },
    { match: /leader|manage|supervis/i, title: 'Leadership & People Management Fundamentals', format: 'Blended Learning', duration: '4 weeks' },
    { match: /financ|budget|cost/i, title: 'Financial Awareness & Cost Discipline', format: 'Workshop', duration: '1 day' },
    { match: /safety|hse|hazard/i, title: 'Workplace Safety & HSE Refresher', format: 'On-the-job', duration: '4 hours' },
    { match: /custom|service|client/i, title: 'Customer Service Excellence', format: 'Workshop', duration: '1 day' },
    { match: /technical|skill|tool|system/i, title: 'Role-Specific Technical Skills Refresher', format: 'On-the-job Coaching', duration: '2 weeks' },
  ];

  return gaps.slice(0, 5).map((g) => {
    const found = lib.find((l) => l.match.test(g.section));
    const priority: 'High' | 'Medium' | 'Low' =
      g.mgrScore < 2.5 ? 'High' : g.mgrScore < 3.5 ? 'Medium' : 'Low';
    return {
      section: g.section,
      title: found?.title ?? `Targeted Skill-Building: ${g.section}`,
      priority,
      format: found?.format ?? 'Coaching',
      duration: found?.duration ?? '2 weeks',
      rationale:
        g.gapType === 'performance'
          ? `Manager rated ${g.mgrScore.toFixed(1)}/5 — below the 3.5 competency threshold.`
          : g.gapType === 'overconfidence'
          ? `Self-rating (${g.empScore.toFixed(1)}) exceeds manager rating (${g.mgrScore.toFixed(1)}); training will align perception with performance.`
          : `Manager sees higher capability (${g.mgrScore.toFixed(1)}) than employee (${g.empScore.toFixed(1)}); training builds confidence.`,
    };
  });
}

const priorityColor = (p: string) =>
  p === 'High'
    ? 'bg-red-100 text-red-800 border-red-200'
    : p === 'Medium'
    ? 'bg-orange-100 text-orange-800 border-orange-200'
    : 'bg-blue-100 text-blue-800 border-blue-200';

const EXTERNAL_PLATFORMS = [
  { name: 'NEXHUB Academy', search: 'https://nexhub.academy/search?q=' },
  { name: 'Coursera', search: 'https://www.coursera.org/search?query=' },
  { name: 'Udemy', search: 'https://www.udemy.com/courses/search/?q=' },
  { name: 'LinkedIn Learning', search: 'https://www.linkedin.com/learning/search?keywords=' },
  { name: 'edX', search: 'https://www.edx.org/search?q=' },
];

export function TrainingRecommendationsCard({ gaps, employeeName, position, overallScore, onApply }: Props) {
  const [mode, setMode] = useState<'rules' | 'ai'>('rules');
  const [aiRecs, setAiRecs] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [appliedKeys, setAppliedKeys] = useState<Record<string, string>>({});

  const ruleRecs = ruleBasedRecommendations(gaps);

  const runAI = async () => {
    if (gaps.length === 0) {
      toast.info('No performance gaps detected — no AI training suggestions needed.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-training-recommendations', {
        body: { employeeName, position, overallScore, gaps },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiRecs(Array.isArray(data?.recommendations) ? data.recommendations : []);
      setMode('ai');
      toast.success('AI training recommendations generated');
    } catch (e: any) {
      toast.error(e?.message || 'AI recommendation failed');
    } finally {
      setLoading(false);
    }
  };

  const recs = mode === 'ai' && aiRecs ? aiRecs : ruleRecs;
  const recSource: 'rule' | 'ai' = mode === 'ai' && aiRecs ? 'ai' : 'rule';

  const applyInternal = (rec: any, idx: number) => {
    onApply?.({ rec, mode: 'internal', recommendationSource: recSource });
    setAppliedKeys((s) => ({ ...s, [`${recSource}-${idx}`]: 'Internal' }));
    toast.success('Prefilled Training Recommendation tab');
  };
  const applyExternal = (rec: any, idx: number, platform: { name: string; search: string }) => {
    const url = platform.search + encodeURIComponent(rec.title);
    onApply?.({ rec, mode: 'external', platform: { name: platform.name, url }, recommendationSource: recSource });
    setAppliedKeys((s) => ({ ...s, [`${recSource}-${idx}`]: platform.name }));
    toast.success(`Prefilled with ${platform.name} referral`);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            Training Needs & Recommendations
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={mode === 'rules' ? 'default' : 'outline'}
              onClick={() => setMode('rules')}
            >
              Rule-Based
            </Button>
            <Button
              size="sm"
              variant={mode === 'ai' ? 'default' : 'outline'}
              onClick={aiRecs ? () => setMode('ai') : runAI}
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Thinking…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-1" /> {aiRecs ? 'AI View' : 'Generate with AI'}</>
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {mode === 'ai'
            ? 'AI-generated (Lovable AI Gateway). Uses workspace credits — review before applying.'
            : 'Automated rules — no AI credits used. Based on section name + manager score threshold.'}
        </p>
      </CardHeader>
      <CardContent>
        {gaps.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-700">No training needs identified</p>
            <p className="text-xs text-gray-600 mt-1">Performance is well-aligned across all sections.</p>
          </div>
        ) : recs.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No recommendations returned.</p>
        ) : (
          <div className="space-y-3">
            {recs.map((r: any, i: number) => (
              <div key={i} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{r.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Gap area: {r.section}</p>
                  </div>
                  <Badge className={priorityColor(r.priority)}>{r.priority}</Badge>
                </div>
                <p className="text-xs text-gray-700 mt-2">{r.rationale}</p>
                <div className="flex flex-wrap gap-2 mt-2 text-[11px] text-gray-600">
                  {r.format && <span className="px-2 py-0.5 bg-white border rounded">Format: {r.format}</span>}
                  {r.duration && <span className="px-2 py-0.5 bg-white border rounded">Duration: {r.duration}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyInternal(r, i)}>
                      <Send className="h-3 w-3 mr-1" /> Assign Internally
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          <ExternalLink className="h-3 w-3 mr-1" /> Refer External
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {EXTERNAL_PLATFORMS.map((p) => (
                          <DropdownMenuItem key={p.name} onClick={() => applyExternal(r, i, p)}>
                            {p.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {appliedKeys[`${recSource}-${i}`] && (
                      <Badge variant="secondary" className="text-[10px]">
                        <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                        Sent to Training tab • {appliedKeys[`${recSource}-${i}`]}
                      </Badge>
                    )}
                </div>
              </div>
            ))}
            <p className="text-[11px] text-gray-400 italic pt-1">
              Suggestions only — use <strong>Assign Internally</strong> to prefill the Training Recommendation tab for the internal Training module, or <strong>Refer External</strong> to prefill a link to an online learning platform. Committee still submits it to HR.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}