// ✅ FILE: components/sidebar.tsx
import { getPrisma } from '@/lib/prisma';
import SidebarClient from '@/components/sidebar-client';

export default async function Sidebar() {
  const prisma = getPrisma();
  let recentChats: { id: string; title: string; isPinned: boolean }[] = [];
  
  try {
    // Fetch actual real chats from the Database!
    recentChats = await prisma.chat.findMany({
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 30,
      select: { id: true, title: true, isPinned: true },
    });
  } catch (error) {
    console.error("Failed to load chats", error);
  }

  // Pass the fetched chats to the Client Component
  return <SidebarClient recentChats={recentChats} />;
}