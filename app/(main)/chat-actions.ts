"use server";

import { getPrisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function renameChat(chatId: string, newTitle: string) {
  try {
    const prisma = getPrisma();
    const title = newTitle.trim() || "Untitled";
    await (prisma.chat as any).update({
      where: { id: chatId },
      data: { title },
    });
    revalidatePath("/");
    revalidatePath(`/chats/${chatId}`);
  } catch (error) {
    console.error("[renameChat] error:", error);
    throw error;
  }
}

export async function deleteChat(chatId: string) {
  try {
    const prisma = getPrisma();
    // Use raw SQL for safety — delete messages first, then chat
    await prisma.$executeRawUnsafe(`DELETE FROM "Message" WHERE "chatId" = '${chatId.replace(/'/g, "''")}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Chat" WHERE "id" = '${chatId.replace(/'/g, "''")}'`);
    revalidatePath("/");
  } catch (error) {
    console.error("[deleteChat] error:", error);
    throw error;
  }
}

export async function pinChat(chatId: string, isPinned: boolean) {
  try {
    const prisma = getPrisma();
    const val = isPinned ? "true" : "false";
    await prisma.$executeRawUnsafe(`UPDATE "Chat" SET "isPinned" = ${val} WHERE "id" = '${chatId.replace(/'/g, "''")}'`);
    revalidatePath("/");
  } catch (error) {
    console.error("[pinChat] error:", error);
    throw error;
  }
}
