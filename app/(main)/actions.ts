"use server";

import { getPrisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export async function createMessage(
  chatId: string,
  text: string,
  role: "assistant" | "user",
  files?: any[],
) {
  const prisma = getPrisma();
  
  // ✅ OPTIMIZATION: Don't load all messages. Just get the last position.
  const lastMessage = await prisma.message.findFirst({
    where: { chatId },
    orderBy: { position: 'desc' },
    select: { position: true }
  });

  const nextPosition = (lastMessage?.position ?? 0) + 1;

  const newMessage = await prisma.message.create({
    data: {
      role,
      content: text,
      // Use structuredClone or simple assignment if safe
      files: files ? JSON.parse(JSON.stringify(files)) : null, 
      position: nextPosition,
      chatId,
    },
  });

  return newMessage;
}