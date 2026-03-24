import { getPrisma } from "@/lib/prisma";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { Mistral } from "@mistralai/mistralai";

function optimizeMessagesForTokens(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
) {
  const assistantIndices: number[] = [];
  for (let i = messages.length - 1; i >= 0 && assistantIndices.length < 2; i--) {
    if (messages[i].role === "assistant") assistantIndices.push(i);
  }
  return messages.map((msg, index) => {
    if (msg.role === "assistant" && !assistantIndices.includes(index)) {
      return { ...msg, content: msg.content.replace(/```[\s\S]*?```/g, "").trim() };
    }
    return msg;
  });
}

const VALID_GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-pro",
];

const VALID_MISTRAL_MODELS = [
  "mistral-large-latest",
  "mistral-medium-latest",
  "mistral-small-latest",
];

export async function POST(req: Request) {
  const prisma = getPrisma();
  const { messageId, model } = await req.json();

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) return new Response(null, { status: 404 });

  const messagesRes = await prisma.message.findMany({
    where: { chatId: message.chatId, position: { lte: message.position } },
    orderBy: { position: "asc" },
  });

  let messages = z
    .array(z.object({ role: z.enum(["system", "user", "assistant"]), content: z.string() }))
    .parse(messagesRes);

  messages = optimizeMessagesForTokens(messages);
  if (messages.length > 10) {
    messages = [messages[0], messages[1], messages[2], ...messages.slice(-7)];
  }

  const systemMessage = messages.find((m) => m.role === "system");
  const conversation = messages.filter((m) => m.role !== "system");

  const isMistral = VALID_MISTRAL_MODELS.includes(model) || model.includes("ministral") || model.includes("devstral");
  const isGemini = VALID_GEMINI_MODELS.includes(model);

  const encoder = new TextEncoder();

  if (isMistral) {
    // Mistral streaming
    const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
    // Fallback to a default if model is somehow missing, but use the requested model
    const mistralModel = model || "mistral-medium-latest";

    const mistralMessages = conversation.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Add system message to the first user message if it exists
    if (systemMessage && mistralMessages.length > 0) {
      const firstUserIndex = mistralMessages.findIndex((m) => m.role === "user");
      if (firstUserIndex !== -1) {
        mistralMessages[firstUserIndex].content = `${systemMessage.content}\n\n${mistralMessages[firstUserIndex].content}`;
      }
    }

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = await mistral.chat.stream({
            model: mistralModel,
            messages: mistralMessages,
            temperature: 0.3,
            maxTokens: 32000,
          });

          for await (const chunk of stream) {
            const text = chunk.data.choices?.[0]?.delta?.content;
            if (text) {
              const payload = JSON.stringify({
                choices: [{ delta: { content: text }, index: 0 }],
              });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          console.error("[stream] Mistral stream error:", err);
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } else {
    // Gemini streaming
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const geminiModel = VALID_GEMINI_MODELS.includes(model) ? model : "gemini-2.5-flash";

    // Gemini uses "model" role instead of "assistant"
    const geminiContents = conversation.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const geminiStream = await ai.models.generateContentStream({
      model: geminiModel,
      config: {
        systemInstruction: systemMessage?.content,
        temperature: 0.3,
        maxOutputTokens: 16000,
      },
      contents: geminiContents,
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of geminiStream) {
            const text = chunk.text;
            if (text) {
              const payload = JSON.stringify({
                choices: [{ delta: { content: text }, index: 0 }],
              });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          console.error("[stream] Gemini stream error:", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }
}