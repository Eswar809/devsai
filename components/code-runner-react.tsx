"use client";

import {
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from "@codesandbox/sandpack-react/unstyled";
import { useEffect, useRef } from "react";
import { getSandpackConfig } from "@/lib/sandpack-config";

export default function ReactCodeRunner({
  files,
  onRequestFix,
}: {
  files: Array<{ path: string; content: string }>;
  onRequestFix?: (e: string) => void;
}) {
  const filesKey = files.map((f) => f.path + f.content).join("");
  return (
    <SandpackProvider
      key={filesKey}
      className="relative h-full w-full [&_.sp-preview-container]:flex [&_.sp-preview-container]:h-full [&_.sp-preview-container]:w-full [&_.sp-preview-container]:grow [&_.sp-preview-container]:flex-col [&_.sp-preview-container]:justify-center [&_.sp-preview-iframe]:grow"
      {...getSandpackConfig(files)}
    >
      <SandpackPreview
        showNavigator={false}
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
        showRestartButton={false}
        showOpenNewtab={false}
        className="h-full w-full"
      />
      {onRequestFix && <AutoFixDetector onRequestFix={onRequestFix} />}
    </SandpackProvider>
  );
}

function AutoFixDetector({ onRequestFix }: { onRequestFix: (e: string) => void }) {
  const { sandpack } = useSandpack();
  const lastErrorRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (sandpack.error) {
      const errorMsg = sandpack.error.message;

      // Only auto-fix if this is a new/different error (prevents re-triggering same fix)
      if (errorMsg !== lastErrorRef.current) {
        lastErrorRef.current = errorMsg;

        // Clear any pending timer
        if (timerRef.current) clearTimeout(timerRef.current);

        // Wait 1.5s for sandbox to stabilize, then auto-trigger fix
        timerRef.current = setTimeout(() => {
          onRequestFix(errorMsg);
        }, 1500);
      }
    } else {
      // Error resolved — reset tracking
      lastErrorRef.current = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sandpack.error, onRequestFix]);

  // Show a subtle auto-fix indicator instead of the big error dialog
  if (!sandpack.error) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6 shadow-xl border border-gray-100 max-w-xs text-center">
        <div className="relative flex items-center justify-center">
          <div className="h-10 w-10 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-gray-800">Auto-fixing error...</p>
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-3 font-mono">
          {sandpack.error.message.slice(0, 120)}
        </p>
      </div>
    </div>
  );
}
