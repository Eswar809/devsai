"use client";

import type { Chat, Message } from "./page";
import {
  parseReplySegments,
  extractFirstCodeBlock,
  extractAllCodeBlocks,
  toTitleCase,
} from "@/lib/utils";
import { Fragment } from "react";
import { Streamdown } from "streamdown";
import { StickToBottom } from "use-stick-to-bottom";
import { AppVersionButton } from "@/components/app-version-button";

export default function ChatLog({
  chat,
  activeMessage,
  streamText,
  onMessageClick,
}: {
  chat: Chat;
  activeMessage?: Message;
  streamText: string;
  onMessageClick: (v: Message) => void;
}) {
  const assistantMessages = chat.messages.filter(
    (m) =>
      m.role === "assistant" &&
      (extractFirstCodeBlock(m.content) ||
        extractAllCodeBlocks(m.content).length > 0),
  );

  return (
    <StickToBottom
      className="relative grow overflow-hidden"
      resize="smooth"
      initial="smooth"
    >
      <StickToBottom.Content className="mx-auto flex w-full max-w-prose flex-col gap-8 py-8 pl-4 pr-2">
        {/* Inline styles for animations */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes taskSpin {
            to { transform: rotate(360deg); }
          }
          @keyframes taskCheckPop {
            0% { transform: scale(0); opacity: 0; }
            60% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes taskFadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes taskPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .task-spin { animation: taskSpin 1s linear infinite; }
          .task-check-pop { animation: taskCheckPop 0.35s ease both; }
          .task-fade-in { animation: taskFadeIn 0.25s ease both; }
          .task-pulse { animation: taskPulse 1.5s ease-in-out infinite; }
        `}} />

        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              "linear-gradient(to bottom, #FDFDF9 0%, rgba(253,253,249,0) 20px, rgba(253,253,249,0) calc(100% - 20px), #FDFDF9 100%)",
            transform: "translateY(-1px)",
          }}
        />
        <UserMessage content={chat.prompt} />

        {chat.totalMessages > chat.messages.length && (
          <div className="py-2 text-center text-sm text-gray-500">
            Only last messages loaded. Full history not available.
          </div>
        )}

        {chat.messages.slice(2).map((message) => (
          <Fragment key={message.id}>
            {message.role === "user" ? (
              <UserMessage content={message.content} />
            ) : (
              <AssistantMessage
                content={message.content}
                model={chat.model}
                version={
                  (chat.assistantMessagesCountBefore || 0) +
                  assistantMessages.map((m) => m.id).indexOf(message.id) +
                  1
                }
                message={message}
                previousMessage={(() => {
                  const idx = assistantMessages
                    .map((m) => m.id)
                    .indexOf(message.id);
                  return idx > 0 ? assistantMessages[idx - 1] : undefined;
                })()}
                isActive={!streamText && activeMessage?.id === message.id}
                onMessageClick={onMessageClick}
                isStreaming={!!streamText}
                isCurrentlyStreaming={false}
              />
            )}
          </Fragment>
        ))}

        {streamText && (
          <AssistantMessage
            content={streamText}
            model={chat.model}
            version={
              (chat.assistantMessagesCountBefore || 0) +
              assistantMessages.length +
              1
            }
            isActive={true}
            previousMessage={assistantMessages.at(-1)}
            isCurrentlyStreaming={true}
          />
        )}
      </StickToBottom.Content>
    </StickToBottom>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="relative inline-flex max-w-[80%] items-end gap-3 self-end">
      <div className="whitespace-pre-wrap break-words rounded bg-[#FDFDF9] px-4 py-2 text-gray-600 shadow">
        {content}
      </div>
    </div>
  );
}

// ─── Model display name helper ─────────────────────────────────────────────

function getModelDisplayName(model: string): string {
  const map: Record<string, string> = {
    "gpt-4o": "GPT-4o",
    "gpt-4o-mini": "GPT-4o Mini",
    "gpt-4-turbo": "GPT-4 Turbo",
    "gpt-3.5-turbo": "GPT-3.5 Turbo",
    "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet",
    "claude-3-opus": "Claude 3 Opus",
    "gemini-pro": "Gemini Pro",
    "gemini-2.0-flash": "Gemini 2.0 Flash",
  };
  if (map[model]) return map[model];
  // Fallback: capitalize and clean up
  return model
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Spinner SVG ────────────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="task-spin">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      <path d="M14.5 8a6.5 6.5 0 0 0-6.5-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ─── Check icon SVG ─────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="task-check-pop">
      <circle cx="8" cy="8" r="7" fill="#22c55e" />
      <path d="M5 8.2l2 2 4-4.4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Assistant Message ──────────────────────────────────────────────────────

function AssistantMessage({
  content,
  model,
  version,
  message,
  isActive,
  onMessageClick = () => {},
  previousMessage,
  isStreaming = false,
  isCurrentlyStreaming = false,
}: {
  content: string;
  model: string;
  version: number;
  message?: Message;
  isActive?: boolean;
  onMessageClick?: (v: Message) => void;
  previousMessage?: Message;
  isStreaming?: boolean;
  isCurrentlyStreaming?: boolean;
}) {
  const allFiles = extractAllCodeBlocks(content);
  const segments = parseReplySegments(content);
  const fileSegments = segments.filter((s) => s.type === "file");

  // Generate app title for multiple files
  const generateAppTitle = (files: typeof allFiles) => {
    const mainFile = files.find(
      (f) => f.path === "App.tsx" || f.path.endsWith("App.tsx"),
    );
    if (mainFile) {
      const appMatch = mainFile.code.match(
        /function\s+(\w+App|\w+Component|\w+)/,
      );
      if (appMatch) {
        return toTitleCase(appMatch[1].replace(/(App|Component)$/, ""));
      }
    }
    const firstFile = files[0];
    if (firstFile) {
      const name =
        firstFile.path
          .split("/")
          .pop()
          ?.replace(/\.\w+$/, "") || "App";
      return toTitleCase(name.replace(/(App|Component)$/, ""));
    }
    return "App";
  };

  const appTitle = generateAppTitle(
    allFiles.length > 0
      ? allFiles
      : (fileSegments.map((f) => ({
          code: f.code,
          language: f.language,
          path: f.path,
          fullMatch: "",
        })) as any),
  );

  const displayFileCount = fileSegments.length;
  const modelName = getModelDisplayName(model);

  // Determine task label from first text segment
  const firstTextSeg = segments.find((s) => s.type === "text");
  const taskLabel = firstTextSeg
    ? firstTextSeg.content.split("\n")[0].replace(/^#+\s*/, "").trim().slice(0, 60) || "Generating code"
    : "Generating code";

  if (displayFileCount > 0) {
    return (
      <div className="task-fade-in">
        {/* ── Model header ── */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-semibold text-gray-400 tracking-wide">
            {modelName}
          </span>
          {isCurrentlyStreaming && (
            <>
              <span className="text-gray-300">•</span>
              <span className="text-[11px] text-gray-400 task-pulse">Running</span>
            </>
          )}
        </div>

        {/* ── Task title with spinner / done ── */}
        <div className="flex items-center gap-2 mb-3">
          {isCurrentlyStreaming ? (
            <span className="text-violet-500"><SpinnerIcon /></span>
          ) : (
            <span className="text-green-500">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" fill="#22c55e" />
                <path d="M5 8.2l2 2 4-4.4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
          <span className="text-[13px] font-medium text-gray-700">{taskLabel}</span>
        </div>

        {/* ── File task list ── */}
        <div
          className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-3"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
        >
          {fileSegments.map((seg, i) => {
            const isPartial = seg.isPartial;
            return (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-2.5 task-fade-in"
                style={{
                  borderBottom: i < fileSegments.length - 1 ? "1px solid #f3f4f6" : "none",
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <span className="text-[13px] text-gray-700 font-mono truncate">{seg.path}</span>
                <span className="flex-shrink-0 ml-3">
                  {isCurrentlyStreaming && isPartial ? (
                    <span className="text-violet-400"><SpinnerIcon /></span>
                  ) : (
                    <CheckIcon />
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Inline text segments (explanations) ── */}
        {segments.map((seg, i) => {
          if (seg.type === "text") {
            return (
              <div key={`txt-${i}`}>
                <Streamdown className="prose break-words">
                  {seg.content}
                </Streamdown>
              </div>
            );
          }
          return null;
        })}

        {/* ── Version button ── */}
        <AppVersionButton
          version={version}
          fileCount={displayFileCount}
          appTitle={appTitle}
          generating={false}
          disabled={!message || isStreaming}
          onClick={message ? () => onMessageClick(message) : undefined}
          isActive={isActive}
        />
      </div>
    );
  } else {
    // No code blocks, just show text with model header
    return (
      <div className="task-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-semibold text-gray-400 tracking-wide">
            {modelName}
          </span>
          {isCurrentlyStreaming && (
            <>
              <span className="text-gray-300">•</span>
              <span className="text-[11px] text-gray-400 task-pulse">Running</span>
            </>
          )}
        </div>
        <Streamdown className="prose break-words">{content}</Streamdown>
      </div>
    );
  }
}
