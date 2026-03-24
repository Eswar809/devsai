// ✅ FILE: app/(main)/layout.tsx
import Providers from "@/app/(main)/providers";
import { Toaster } from "@/components/ui/toaster";
import Sidebar from "@/components/sidebar"; // ✅ Sidebar ని ఇంపోర్ట్ చేశాం

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <body className="flex h-screen w-full overflow-hidden bg-[#FDFDF9] text-gray-900 antialiased">

        <Sidebar />

        <main className="relative flex flex-1 min-w-0 flex-col overflow-hidden border-l border-stone-200/50">
          {children}
        </main>

        <Toaster />
      </body>
    </Providers>
  );
}