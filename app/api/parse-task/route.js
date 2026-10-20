import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { speechText, audioBase64, mimeType } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing Gemini API Key" }, { status: 500 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const systemPrompt = `You are a personal task management assistant.
Today's date is ${todayStr}.
Analyze the user's spoken voice command and extract structured task fields into a strict JSON object.

GUARDRAIL RULE:
If the user's audio is silent, unintelligible, or does not contain an actual task command, DO NOT invent or hallucinate any task, names, or dates. Instead, output strictly: {"error": "no_speech_detected"}

Required fields when a real task is present:
- title: string (short, concise action title)
- description: string (any notes, specs, phone numbers, or context, or empty string)
- project: string (e.g. "Project One", "Project Two", "Work", "Personal")
- dueDate: string (convert relative terms like "today", "tomorrow", "Friday" into readable dates like "Today", "Tomorrow", "Jul 24" or "YYYY-MM-DD")
- client: string (e.g. "NMP", "Worden & W", "Personal", "General")
- priority: string ("High", "Medium", or "Low")
- stage: string ("Not Started", "In Progress", or "Review")

Output valid JSON only. Do not wrap in markdown quotes.`;

    const parts = [{ text: systemPrompt }];

    if (audioBase64) {
      const cleanMimeType = (mimeType || 'audio/webm').split(';')[0];
      parts.push({
        inlineData: {
          mimeType: cleanMimeType,
          data: audioBase64,
        },
      });
      parts.push({ text: "Extract the task from the attached audio recording." });
    } else if (speechText) {
      parts.push({ text: `Extract the task from this text: "${speechText}"` });
    } else {
      return NextResponse.json({ error: "No audio or text provided" }, { status: 400 });
    }

    const modelsToTry = [
      process.env.GEMINI_MODEL,
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.6-flash',
    ].filter(Boolean);

    const uniqueModels = [...new Set(modelsToTry)];
    let lastError = null;

    for (const model of uniqueModels) {
      try {
        // Enforce 15-second timeout so it never hangs
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ role: "user", parts }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
              },
            }),
          }
        );

        clearTimeout(timeoutId);
        const data = await response.json();

        if (data?.error) {
          const errMsg = data.error.message || '';
          if (data.error.code === 503 || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE')) {
            console.warn(`Model ${model} busy. Trying next...`);
            lastError = data.error.message;
            continue;
          }
          throw new Error(data.error.message);
        }

        const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textOutput) {
          const parsed = JSON.parse(textOutput);
          if (parsed.error === 'no_speech_detected') {
            return NextResponse.json({ error: "No voice detected. Microphone may be muted or silent." }, { status: 400 });
          }
          return NextResponse.json({ task: parsed, modelUsed: model });
        }
      } catch (err) {
        lastError = err.name === 'AbortError' ? 'Request timed out after 15s' : err.message;
        console.warn(`Model ${model} failed: ${lastError}`);
      }
    }

    throw new Error(lastError || "Gemini service temporarily busy. Please try again.");
  } catch (error) {
    console.error("Task parse error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}