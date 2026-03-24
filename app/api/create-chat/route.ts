import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import {
  getMainCodingPrompt,
  screenshotToCodePrompt,
  softwareArchitectPrompt,
} from "@/lib/prompts";
import { GoogleGenAI } from "@google/genai";
import { Mistral } from "@mistralai/mistralai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

async function geminiText(
  systemInstruction: string,
  userPrompt: string,
  model = "gemini-2.5-flash",
  maxTokens = 7500,
): Promise<string> {
  const response = await ai.models.generateContent({
    model,
    config: {
      systemInstruction,
      temperature: 0.3,
      maxOutputTokens: maxTokens,
    },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
  });
  return response.text ?? "";
}

async function mistralText(
  systemInstruction: string,
  userPrompt: string,
  model = "mistral-medium-latest",
  maxTokens = 16000,
): Promise<string> {
  const response = await mistral.chat.complete({
    model,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.3,
    maxTokens,
  });
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content;
  }
  return Array.isArray(content) ? content.map(c => (typeof c === "string" ? c : "text" in c ? c.text || "" : "")).join("") : "";
}

async function urlToBase64(
  imageUrl: string,
): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(imageUrl);
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return {
    data: btoa(binary),
    mimeType: res.headers.get("content-type") ?? "image/jpeg",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, model, quality, screenshotUrl } = body;

    console.log("[create-chat] Starting with model:", model, "quality:", quality);

    // ✅ STRICT VALIDATION: Reject Mixtral models immediately
    if (model?.toLowerCase().includes("mixtral")) {
      console.error("[create-chat] ❌ MIXTRAL IS NOT ALLOWED! Only Gemini and Mistral are permitted.");
      return NextResponse.json(
        { 
          error: "Mixtral is not allowed in this project",
          detail: "Only Google Gemini and Mistral AI libraries are permitted. Mixtral is strictly forbidden."
        },
        { status: 400 }
      );
    }

    // ✅ UPDATE: Added 'devstral' to the check
    const isMistral = model?.includes("mistral") || model?.includes("ministral") || model?.includes("devstral");
    const isGemini = model?.includes("gemini");

    if (isGemini && !process.env.GEMINI_API_KEY) {
      console.error("[create-chat] GEMINI_API_KEY is not set!");
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    if (isMistral && !process.env.MISTRAL_API_KEY) {
      console.error("[create-chat] MISTRAL_API_KEY is not set!");
      return NextResponse.json({ error: "MISTRAL_API_KEY not configured" }, { status: 500 });
    }

    if (!isGemini && !isMistral) {
      console.error("[create-chat] Unknown model:", model);
      return NextResponse.json({ error: "Unknown model" }, { status: 400 });
    }

    const prisma = getPrisma();
    const chat = await prisma.chat.create({
      data: { model, quality, prompt, title: "", shadcn: true },
    });

    console.log("[create-chat] Chat created:", chat.id);

    const textFn = isMistral ? mistralText : geminiText;

    // Fetch screenshot first (needed as input for architect plan)
    let fullScreenshotDescription: string | undefined;
    if (screenshotUrl) {
      try {
        const { data, mimeType } = await urlToBase64(screenshotUrl);
        const res = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          config: { temperature: 0.4, maxOutputTokens: 1000 },
          contents: [
            {
              role: "user",
              parts: [
                { text: screenshotToCodePrompt },
                { inlineData: { mimeType, data } },
              ],
            },
          ],
        });
        fullScreenshotDescription = res.text ?? undefined;
      } catch (e) {
        console.error("[create-chat] screenshot error:", e);
      }
    }

    const architectInput = fullScreenshotDescription
      ? fullScreenshotDescription + "\n\n" + prompt
      : prompt;

    // ✅ ALL AI calls in parallel — title, example, and architect plan at the same time
    const [title, mostSimilarExample, plan] = await Promise.all([
      textFn(
        "Create a succinct 3-5 word title for the user's app prompt. Return only the title, no punctuation.",
        prompt,
        isMistral ? "mistral-medium-latest" : "gemini-2.5-flash",
      ).catch((e) => { console.error("[create-chat] title error:", e); return prompt.slice(0, 40); }),

      textFn(
        `Match the app request to one example or return "none". ONLY reply with one of these OR "none":\n- landing page\n- blog app\n- quiz app\n- pomodoro timer`,
        prompt,
        isMistral ? "mistral-medium-latest" : "gemini-2.5-flash",
      ).catch((e) => { console.error("[create-chat] example error:", e); return "none"; }),

      quality === "high"
        ? textFn(
            softwareArchitectPrompt,
            architectInput,
            isMistral ? "mistral-medium-latest" : "gemini-2.5-flash",
            500,
          ).catch((e) => { console.error("[create-chat] architect error:", e); return null; })
        : Promise.resolve(null),
    ]);

    console.log("[create-chat] Title:", title, "| Example:", mostSimilarExample, "| Plan length:", plan?.length ?? 0);

    const userMessage =
      quality === "high" && plan
        ? plan
        : fullScreenshotDescription
          ? prompt + "\n\nRECREATE THIS APP AS CLOSELY AS POSSIBLE: " + fullScreenshotDescription
          : prompt;

    const newChat = await prisma.chat.update({
      where: { id: chat.id },
      data: {
        title: title.trim() || "New App",
        messages: {
          createMany: {
            data: [
              {
                role: "system",
                content: getMainCodingPrompt(),
                position: 0,
              },
              { role: "user", content: userMessage, position: 1 },
            ],
          },
        },
      },
      include: { messages: true },
    });

    const lastMessage = newChat.messages
      .sort((a: { position: number; }, b: { position: number; }) => a.position - b.position)
      .at(-1);
    if (!lastMessage) throw new Error("No new message");

    console.log("[create-chat] Done. chatId:", chat.id, "lastMessageId:", lastMessage.id);

    return NextResponse.json({ chatId: chat.id, lastMessageId: lastMessage.id });
  } catch (error) {
    console.error("[create-chat] FATAL ERROR:", error);
    return NextResponse.json(
      { error: "Failed to create chat", detail: String(error) },
      { status: 500 },
    );
  }
}