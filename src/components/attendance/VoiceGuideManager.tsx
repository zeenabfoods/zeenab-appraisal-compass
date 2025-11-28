import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Play, Volume2, Check } from 'lucide-react';
import { useVoiceGuides } from '@/hooks/useVoiceGuides';
import { cn } from '@/lib/utils';

const categoryLabels: Record<string, string> = {
  clock_events: 'Clock-in/Clock-out',
  geofence: 'Geofence Alerts',
  breaks: 'Break Management',
  time_management: 'Time Management',
  field_work: 'Field Work',
  financial: 'Financial & Compliance',
  system: 'System & Sync',
  quick_actions: 'Quick Actions',
};

export function VoiceGuideManager() {
  const { voiceGuides, isLoading, uploadVoice, isUploading, playVoiceGuide } = useVoiceGuides();
  const [activeCategory, setActiveCategory] = useState('clock_events');

  const handleFileSelect = (eventType: string, file: File | null) => {
    if (file) {
      uploadVoice({ eventType, file });
    }
  };

  const categories = voiceGuides?.reduce((acc, guide) => {
    if (!acc[guide.event_category]) {
      acc[guide.event_category] = [];
    }
    acc[guide.event_category].push(guide);
    return acc;
  }, {} as Record<string, typeof voiceGuides>);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">Loading voice guides...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Voice Guide Manager
        </CardTitle>
        <CardDescription>
          Upload MP3 voice guides for all 35 attendance events. Each voice guide will play when its corresponding event occurs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid grid-cols-4 w-full mb-6">
            {Object.keys(categoryLabels).slice(0, 4).map(cat => (
              <TabsTrigger key={cat} value={cat} className="text-xs">
                {categoryLabels[cat]}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsList className="grid grid-cols-4 w-full mb-6">
            {Object.keys(categoryLabels).slice(4).map(cat => (
              <TabsTrigger key={cat} value={cat} className="text-xs">
                {categoryLabels[cat]}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(categories || {}).map(([category, guides]) => (
            <TabsContent key={category} value={category} className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4 mb-4">
                <h3 className="font-semibold mb-2">{categoryLabels[category]}</h3>
                <p className="text-sm text-muted-foreground">
                  Upload voice guides for {guides.length} events in this category
                </p>
              </div>

              <div className="space-y-4">
                {guides.map(guide => (
                  <div
                    key={guide.id}
                    className={cn(
                      "border rounded-lg p-4 transition-all hover:shadow-md",
                      guide.audio_file_url ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800" : "bg-background"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="font-semibold text-base">
                            {guide.event_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </Label>
                          {guide.audio_file_url && (
                            <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                              <Check className="h-3 w-3 mr-1" />
                              Uploaded
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground italic">
                          "{guide.phrase_text}"
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {guide.audio_file_url && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => playVoiceGuide(guide.event_type)}
                            title="Play voice guide"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <div className="relative">
                          <Input
                            id={`upload-${guide.event_type}`}
                            type="file"
                            accept="audio/*"
                            onChange={(e) => handleFileSelect(guide.event_type, e.target.files?.[0] || null)}
                            disabled={isUploading}
                            className="hidden"
                          />
                          <Button
                            variant={guide.audio_file_url ? "outline" : "default"}
                            size="icon"
                            onClick={() => document.getElementById(`upload-${guide.event_type}`)?.click()}
                            disabled={isUploading}
                            title={guide.audio_file_url ? "Replace voice guide" : "Upload voice guide"}
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">Upload Instructions</h4>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
            <li>Supported formats: MP3, WAV, OGG (Max 5MB per file)</li>
            <li>Each voice guide will automatically play when its event occurs</li>
            <li>You can test each voice guide using the play button</li>
            <li>Replace uploaded files anytime by uploading a new file</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}