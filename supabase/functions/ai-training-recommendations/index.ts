// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { employeeName, position, gaps, overallScore } = await req.json();

    if (!gaps || !Array.isArray(gaps) || gaps.length === 0) {
      return new Response(
        JSON.stringify({ recommendations: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const gapSummary = gaps
      .map(
        (g: any) =>
          `- Section: "${g.section}" | Manager Score: ${g.mgrScore}/5 | Employee Score: ${g.empScore}/5 | Gap Type: ${g.gapType}`,
      )
      .join("\n");

    const prompt = `You are an HR Learning & Development advisor for Zeenab Foods Limited.

Employee: ${employeeName || "N/A"}
Position: ${position || "N/A"}
Overall Appraisal Score: ${overallScore ?? "N/A"}/100

Weak areas identified from the appraisal gap analysis:
${gapSummary}

For EACH weak area, recommend ONE targeted training. Return ONLY a valid JSON array (no markdown, no prose) with this exact shape:
[
  {
    "section": "<the section name>",
    "title": "<short training title, max 8 words>",
    "priority": "High" | "Medium" | "Low",
    "rationale": "<one sentence, max 25 words, why this training addresses the gap>",
    "format": "<e.g. Workshop, E-learning, Coaching, On-the-job>",
    "duration": "<e.g. 2 hours, 1 day, 4 weeks>"
  }
]
Priority rules: manager score < 2.5 => High; < 3.5 => Medium; otherwise Low.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a precise HR training recommender. Reply with valid JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please top up in Settings → Plans & credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: `AI gateway error: ${errText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await aiRes.json();
    const raw = data?.choices?.[0]?.message?.content ?? "[]";
    // Strip potential code fences
    const cleaned = raw.replace(/```json\s*|```/g, "").trim();

    let recommendations: any[] = [];
    try {
      recommendations = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        try { recommendations = JSON.parse(match[0]); } catch { recommendations = []; }
      }
    }

    return new Response(
      JSON.stringify({ recommendations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});