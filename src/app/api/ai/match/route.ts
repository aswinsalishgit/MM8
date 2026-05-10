import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
    const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;

    // 1. Ask Ollama to extract search criteria from the prompt
    const systemPrompt = `
      You are an expert casting assistant for MM8. 
      Your task is to extract search criteria from a director's request.
      Extract the following fields if mentioned:
      - gender (MALE, FEMALE, NON-BINARY, OTHER)
      - age_min (number)
      - age_max (number)
      - location (string)
      - personality (one of: INTENSE, FUNNY, VILLAIN, ROMANTIC, VERSATILE, ACTION, INNOCENT, EMOTIONAL)
      - archetypes (list of strings)
      - physical_traits (list of keywords like 'tall', 'athletic', 'fair', etc.)
      
      Return ONLY a JSON object. Do not include any explanation.
      Example Output:
      {
        "gender": "MALE",
        "age_min": 25,
        "age_max": 35,
        "personality": "INTENSE",
        "physical_traits": ["tall", "athletic"]
      }
    `;

    const ollamaResponse = await fetch(`${OLLAMA_HOST}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(OLLAMA_API_KEY ? { "Authorization": `Bearer ${OLLAMA_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: "llama3",
        prompt: `System: ${systemPrompt}\nUser: ${prompt}`,
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
    let criteria;
    try {
      // Ollama returns { response: "..." } for /generate
      criteria = JSON.parse(aiData.response || aiData.message?.content || "{}");
    } catch (e) {
      console.error("Failed to parse AI response:", aiData);
      return NextResponse.json({ error: "INVALID_AI_PROTOCOL", details: aiData.response }, { status: 500 });
    }

    // 2. Query Supabase profiles
    const supabase = await createClient();
    let query = supabase.from("profiles").select("*").eq("role", "ACTOR");

    if (criteria.gender) {
      query = query.eq("gender", criteria.gender);
    }
    if (criteria.age_min) {
      query = query.gte("age", criteria.age_min);
    }
    if (criteria.age_max) {
      query = query.lte("age", criteria.age_max);
    }
    if (criteria.personality) {
      query = query.contains("archetypes", [criteria.personality]);
    }
    
    // For physical traits and keywords, we use a simple text search or ilike on bio/distinct_features
    // This is a basic implementation. For better results, use pgvector.
    if (criteria.physical_traits && criteria.physical_traits.length > 0) {
      const searchTerms = criteria.physical_traits.join(" | ");
      query = query.or(`bio.ilike.%${searchTerms}%,distinct_features.ilike.%${searchTerms}%,overall_build.ilike.%${searchTerms}%`);
    }

    const { data: matches, error } = await query.limit(10);

    if (error) {
      console.error("Supabase Query Error:", error);
      throw error;
    }

    // 3. Return results
    return NextResponse.json({
      criteria,
      matches: matches || [],
    });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
