import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Bot, User, Brain, Copy, Check, Clipboard } from "lucide-react";
import { useState, useCallback } from "react";
import type { ChatMessage } from "../types";

import "katex/dist/katex.min.css";

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  return Promise.resolve();
}

function preprocessMath(text: string): string {
  return text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `$$\n${math.trim()}\n$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`);
}

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  isLast?: boolean;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="relative group">
      <div
        className="flex items-center justify-between px-3 py-1.5 rounded-t-lg"
        style={{
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderBottom: 0,
        }}
      >
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-all"
          style={{ color: "var(--text-muted)" }}
        >
          {copied ? (
            <Check size={12} style={{ color: "var(--success)" }} />
          ) : (
            <Copy size={12} />
          )}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language || "text"}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: 8,
          borderBottomRightRadius: 8,
          fontSize: "0.8rem",
          padding: "0.75rem 1rem",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export default function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [thinkingOpen, setThinkingOpen] = useState(isStreaming);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopyAll = useCallback(async () => {
    const parts: string[] = [];
    if (message.reasoning_content) {
      parts.push(message.reasoning_content);
    }
    parts.push(message.content);
    await copyToClipboard(parts.join("\n\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }, [message.reasoning_content, message.content]);

  if (message.role === "system") return null;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""} animate-slide-up`}>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={
          isUser
            ? { backgroundColor: "color-mix(in srgb, var(--accent) 20%, transparent)" }
            : { background: "linear-gradient(135deg, #6366f1, #a855f7)" }
        }
      >
        {isUser ? (
          <User size={14} style={{ color: "var(--accent)" }} />
        ) : (
          <Bot size={14} className="text-white" />
        )}
      </div>

      <div className={`flex-1 min-w-0 ${isUser ? "flex justify-end" : ""}`}>
        <div
          className="rounded-2xl px-4 py-3 max-w-[85%]"
          style={
            isUser
              ? {
                  borderRadius: "1rem 1rem 0.25rem 1rem",
                  backgroundColor: "color-mix(in srgb, var(--accent) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
                }
              : {
                  borderRadius: "1rem 1rem 1rem 0.25rem",
                  backgroundColor: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                }
          }
        >
          {/* User image display */}
          {isUser && message.image && (
            <div className="mb-2">
              <img
                src={message.image.base64}
                alt="上传的图片"
                className="max-w-[280px] max-h-[240px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-contain"
                style={{ border: "1px solid var(--border-color)" }}
                onClick={() => setImageModalOpen(true)}
              />
            </div>
          )}

          {/* Image modal */}
          {imageModalOpen && message.image && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-pointer"
              onClick={() => setImageModalOpen(false)}
            >
              <img
                src={message.image.base64}
                alt="图片预览"
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
              />
            </div>
          )}

          {/* User message text */}
          {isUser && (
            <p className="text-sm whitespace-pre-wrap break-words" style={{ color: "var(--text-primary)" }}>
              {message.content}
            </p>
          )}

          {/* Assistant message */}
          {!isUser && (
            <div>
              {message.reasoning_content && (
                <div className="mb-2">
                  <button
                    onClick={() => setThinkingOpen(!thinkingOpen)}
                    className="flex items-center gap-1.5 text-[10px] transition-colors"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Brain size={12} className={isStreaming ? "text-purple-400 animate-pulse" : ""} />
                    <span>思考过程</span>
                    <span style={{ color: "var(--text-muted)" }}>{thinkingOpen ? "▾" : "▸"}</span>
                  </button>
                  {thinkingOpen && (
                    <pre
                      className="mt-1 p-3 rounded-lg text-xs whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto"
                      style={{
                        backgroundColor: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {message.reasoning_content}
                    </pre>
                  )}
                </div>
              )}

              <div className="markdown-body text-sm" style={{ color: "var(--text-primary)" }}>
                {isStreaming && !message.content ? (
                  <span
                    className="typing-dot inline-block w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: "var(--accent)" }}
                  />
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkMath, remarkGfm]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        const codeStr = String(children).replace(/\n$/, "");
                        const isInline = !match && !className;

                        if (isInline) {
                          return (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        }

                        return <CodeBlock language={match?.[1] || ""} code={codeStr} />;
                      },
                    }}
                  >
                    {preprocessMath(message.content)}
                  </ReactMarkdown>
                )}
              </div>
              {!isStreaming && message.content && (
                <div className="flex justify-end mt-2 pt-2" style={{ borderTop: "1px solid var(--border-color)" }}>
                  <button
                    onClick={handleCopyAll}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors hover:opacity-80"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {copiedAll ? (
                      <>
                        <Check size={12} style={{ color: "var(--success)" }} />
                        <span style={{ color: "var(--success)" }}>已复制</span>
                      </>
                    ) : (
                      <>
                        <Clipboard size={12} />
                        <span>复制全部</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
