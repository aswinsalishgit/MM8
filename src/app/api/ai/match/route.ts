import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const { prompt, history = [] } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
    const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";

    // 1. Ask Ollama to extract search criteria from the prompt
    // 1. System Prompt with MM8 Knowledge and Agent Protocol
    const systemPrompt = `
      PROTOCOL_NAME: MM8_CORE_ORACLE
      ROLE: EXPERT_CASTING_DIRECTOR_AGENT
      
      KNOWLEDGE_BASE (MM8):
      - MM8 is a decentralized talent acquisition platform ("SYSTEM").
      - Mission: "Talent is Broken. Gatekeepers Lose Today."
      - Philosophy: Eliminate traditional industry gatekeepers using AI matching and transparent "LUMEN" (LMN) economy.
      - Features: Talent Nodes (profiles), Audition Pipelines, AI Matching Engine, Decentralized Reputation.
      - Currency: LUMEN (LMN) used for missions, rewards, and staking.
      
      AGENT_PERSONALITY: 
      - Brutal, professional, efficient, and direct. 
      - Use cyberpunk/system terminology (Nodes, Protocols, Pipelines, Uplinks).
      - Do not use flowery language. Stay sharp.

      TASK:
      Analyze the USER_UPLINK. 
      1. If searching for talent: Identify criteria.
      2. If asking about a specific talent: Extract their NAME/USERNAME.
      3. If asking about MM8: Provide system intel.
      4. If general chat: Respond according to personality.

      OUTPUT_FORMAT (STRICT_JSON):
      {
        "reply": "Conversational response in MM8 persona.",
        "search_criteria": {
          "gender": "MALE/FEMALE/NON-BINARY/OTHER",
          "age_min": number,
          "age_max": number,
          "location": "string",
          "personality": "INTENSE/FUNNY/VILLAIN/ROMANTIC/VERSATILE/ACTION/INNOCENT/EMOTIONAL",
          "physical_traits": ["string"],
          "specific_user": "string (name or username if mentioned)"
        }
      }
    `;

    // Format history for context
    const conversationContext = history.map((m: any) => `${m.type === 'user' ? 'USER' : 'AGENT'}: ${m.text}`).join('\n');

    const ollamaResponse = await fetch(`${OLLAMA_HOST}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(OLLAMA_API_KEY ? { "Authorization": `Bearer ${OLLAMA_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: `System: ${systemPrompt}\n\nCONVERSATION_HISTORY:\n${conversationContext}\n\nUser: ${prompt}`,
        stream: false,
        format: "json",
      }),
    });

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error("Ollama Error Output:", errorText);
      return NextResponse.json({ 
        error: "AI_COMMUNICATION_FAILED", 
        details: errorText,
        status: ollamaResponse.status 
      }, { status: ollamaResponse.status });
    }

    const aiData = await ollamaResponse.json();
    let aiResponse;
    try {
      let text = aiData.response || aiData.message?.content || "{}";
      text = text.replace(/```json\n?|```/g, "").trim();
      aiResponse = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse AI response:", aiData);
      return NextResponse.json({ error: "INVALID_AI_PROTOCOL", details: aiData.response || aiData.message?.content }, { status: 500 });
    }

    const criteria = aiResponse.search_criteria || {};
    const reply = aiResponse.reply || "PROTOCOL_STABLE. NO_REPLY_GENERATED.";

    // 2. Query Supabase profiles
    const supabase = await createClient();
    let query = supabase.from("profiles").select("*").eq("role", "ACTOR");

    // Handle specific user search
    if (criteria.specific_user) {
      query = query.or(`full_name.ilike.%${criteria.specific_user}%,username.ilike.%${criteria.specific_user}%`);
    } else {
      if (criteria.gender) query = query.eq("gender", criteria.gender);
      if (criteria.age_min) query = query.gte("age", criteria.age_min);
      if (criteria.age_max) query = query.lte("age", criteria.age_max);
      if (criteria.personality) query = query.contains("archetypes", [criteria.personality]);
      if (criteria.physical_traits && criteria.physical_traits.length > 0) {
        const searchTerms = criteria.physical_traits.join(" | ");
        query = query.or(`bio.ilike.%${searchTerms}%,distinct_features.ilike.%${searchTerms}%,overall_build.ilike.%${searchTerms}%`);
      }
    }

    const { data: matches, error } = await query.limit(criteria.specific_user ? 1 : 10);

    if (error) {
      console.error("Supabase Query Error:", error);
      throw error;
    }

    // 3. Return results
    return NextResponse.json({
      reply,
      matches: matches || [],
    });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
