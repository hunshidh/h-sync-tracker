import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is missing" }, { status: 500 });
    }

    const prompt = `You are a strict nutritional calculator API. Analyze the following meal description: "${text}".
Estimate the total calories, protein (g), carbs (g), and fat (g) as accurately as possible for typical Indian and standard global foods.
Respond strictly in JSON format matching this exact schema:
{
  "foodName": "A short, clean summary name for the meal",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number
}
Do not include markdown backticks (\`\`\`json), explanations, or any other text outside the JSON object.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return NextResponse.json({ error: "Failed to parse meal from Gemini" }, { status: 500 });
    }

    // Clean potential markdown quotes if Gemini wraps it
    const cleanJsonString = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedData = JSON.parse(cleanJsonString);

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error("AI Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}