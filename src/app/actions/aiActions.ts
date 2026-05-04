"use server";

import { queryOllama } from "@/lib/ai/ollama";
import { createClient } from "@/utils/supabase/server";

export async function matchActorsForBrief(brief: string) {
  const supabase = await createClient();
  
  // 1. Fetch relevant actor profiles
  // In a real production app, we would use vector search or better filtering first
  const { data: actors } = await supabase
    .from('profiles')
    .select('id, full_name, bio, archetypes, lumen_points, lumen_tier, location')
    .eq('role', 'ACTOR')
    .order('lumen_points', { ascending: false })
    .limit(20);
    
  if (!actors || actors.length === 0) return [];

  // 2. Prepare prompt for Qwen3-next
  const prompt = `
    DIRECTOR'S CHARACTER BRIEF:
    "${brief}"
    
    ACTOR CANDIDATES (RANKED BY LMN POTENTIAL):
    ${actors.map((a, i) => `${i+1}. [ID: ${a.id}] Name: ${a.full_name}, Bio: ${a.bio || 'N/A'}, Archetypes: ${a.archetypes?.join(', ') || 'N/A'}, Tier: ${a.lumen_tier}, Location: ${a.location}`).join('\n')}
    
    TASK:
    Analyze the candidates and select the TOP 3 who best fit the character brief.
    Consider semantic alignment between the bio/archetypes and the brief requirements.
    
    RESPONSE FORMAT (STRICT JSON ONLY):
    [
      {"id": "UUID", "match_score": 0-100, "reason": "Why they match"},
      ...
    ]
  `;

  const response = await queryOllama(prompt, "You are the MM8 AI Casting Engine. You provide highly accurate, semantic matching between Director requirements and Actor profiles. Return ONLY JSON.");
  
  try {
    // Extract JSON from response (handling potential markdown wrappers)
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("NO_JSON_FOUND");
    
    const matches = JSON.parse(jsonMatch[0]);
    
    // Fetch full profiles for the matches
    const matchedIds = matches.map((m: any) => m.id);
    const { data: matchedProfiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', matchedIds);

    return matches.map((m: any) => ({
      ...m,
      profile: matchedProfiles?.find(p => p.id === m.id)
    }));
  } catch (e) {
    console.error("MM8_AI_MATCHING_FAILURE:", e, "Response was:", response);
    return [];
  }
}

export async function analyzeProfileLumen(profileId: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', profileId).single();
  if (!profile) return null;

  const prompt = `
    Analyze this actor profile for production readiness:
    Name: ${profile.full_name}
    Bio: ${profile.bio}
    Archetypes: ${profile.archetypes?.join(', ')}
    Lumen Points: ${profile.lumen_points}
    
    Provide a professional assessment of their "Yield Potential" and areas for improvement.
  `;

  return await queryOllama(prompt, "You are the MM8 Talent Scout AI. You analyze profiles for production readiness.");
}
