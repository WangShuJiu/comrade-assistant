import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Square,
  Paperclip,
  Image,
  Zap,
  PanelLeft,
  Menu,
  Loader2,
  Wand2,
  Download,
  RefreshCw,
  ScanEye,
  Brain,
  ChevronDown,
} from "lucide-react";
import type { AppConfig, ChatMessage, StreamStage } from "../types";
import { generateImage } from "../lib/api";
import MessageBubble from "./MessageBubble";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

interface ChatAreaProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  streamingThinking: string;
  visionDescription: string | null;
  error: string | null;
  onSend: (content: string, imageBase64?: string, mimeType?: string) => void;
  onCancel: () => void;
  config: AppConfig;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onMobileMenu: () => void;
  onChatComplete: () => void;
  currentId: string;
  stage: StreamStage;
  onRetry: () => void;
}

export default function ChatArea({
  messages,
  isStreaming,
  streamingContent,
  streamingThinking,
  visionDescription,
  error,
  onSend,
  onCancel,
  config,
  sidebarOpen,
  onToggleSidebar,
  onMobileMenu,
  onChatComplete,
  currentId,
  stage,
  onRetry,
}: ChatAreaProps) {
  const [input, setInput] = useState("");
  const [uploadedImage, setUploadedImage] = useState<{
    base64: string;
    mimeType: string;
    previewUrl: string;
  } | null>(null);
  const [showImageGen, setShowImageGen] = useState(false);
  const [genPrompt, setGenPrompt] = useState("");
  const [genResult, setGenResult] = useState<string[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showVisionDesc, setShowVisionDesc] = useState(false);

  const scrollToBottom = useCallback(() => {
    if (containerRef.current && isNearBottom) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [isNearBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, streamingThinking, scrollToBottom]);

  // Track scroll position
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 100;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsNearBottom(atBottom);
  }, []);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed && !uploadedImage) return;
    if (isStreaming) return;

    // Check for /draw command
    const drawMatch = trimmed.match(/^\/draw\s+(.+)/i);
    if (drawMatch) {
      setGenPrompt(drawMatch[1]);
      setShowImageGen(true);
      setInput("");
      setTimeout(() => handleGenerate(drawMatch[1]), 100);
      return;
    }

    if (uploadedImage) {
      onSend(trimmed || "请分析这张图片", uploadedImage.base64, uploadedImage.mimeType);
      setUploadedImage(null);
    } else {
      onSend(trimmed);
    }
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("请上传图片文件（JPEG, PNG, GIF, WebP）");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("图片大小不能超过 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setUploadedImage({ base64, mimeType: file.type, previewUrl: base64 });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleGenerate = async (prompt?: string) => {
    const p = prompt || genPrompt.trim();
    if (!p || genLoading) return;
    setGenLoading(true);
    setGenError("");
    setGenResult([]);
    try {
      const res = await generateImage({ apiKey: config.qwenApiKey, prompt: p });
      setGenResult(res.images);
      onChatComplete();
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setGenLoading(false);
    }
  };

  const handleDownloadImage = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `comrade-generated-${Date.now()}-${index}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  const visibleMessages = messages.filter((m) => m.role !== "system");
  const lastAssistantMsg = [...visibleMessages].reverse().find(m => m.role === "assistant");
  const hasError = lastAssistantMsg?.content?.startsWith("❌");

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0"
        style={{
          backgroundColor: 'var(--glass-bg)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-color)',
        }}>
        {!sidebarOpen && (
          <button onClick={onToggleSidebar}
            className="p-1.5 rounded-lg transition-colors hidden lg:block"
            style={{ color: 'var(--text-muted)' }}>
            <PanelLeft size={16} />
          </button>
        )}
        <button onClick={onMobileMenu}
          className="p-1.5 rounded-lg transition-colors lg:hidden"
          style={{ color: 'var(--text-muted)' }}>
          <Menu size={16} />
        </button>
        <div>
          <h1 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Comrade <span className="gradient-text">Assistant</span>
          </h1>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {config.deepseekModel}
            {config.qwenApiKey ? " + Vision" : ""}
            {isStreaming && <StreamingIndicator stage={stage} />}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">  
        {visibleMessages.length === 0 && !isStreaming && !streamingContent && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
              <Zap size={28} className="text-white" />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              开始对话
            </h2>
            <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
              输入你的编程问题，支持多轮上下文传递和图片分析。
              <br />使用 <code>/draw 描述</code> 指令生成图片。
            </p>
            <div className="flex gap-2 mt-4 flex-wrap justify-center">
              <QuickPrompt text="解释这段代码" onClick={setInput} />
              <QuickPrompt text="帮我调试一个 bug" onClick={setInput} />
              <QuickPrompt text="/draw 一只猫" onClick={setInput} />
            </div>
          </div>
        )}

        {visibleMessages.map((msg, i) => (
          <MessageBubble key={`${currentId}-${i}`} message={msg} isLast={i === visibleMessages.length - 1} />
        ))}

        {/* Staged loading indicator */}
        {isStreaming && stage !== "idle" && (
          <div className="flex items-center gap-3 animate-slide-up">
            <div className="p-3 rounded-xl" style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
            }}>
              <div className="flex items-center gap-2">
                {stage === "vision" ? (
                  <>
                    <ScanEye size={16} className="text-emerald-400 animate-pulse" />
                    <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                      正在提取图像特征...
                    </span>
                  </>
                ) : stage === "reasoning" ? (
                  <>
                    <Brain size={16} className="text-purple-400 animate-pulse" />
                    <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                      正在深度思考...
                    </span>
                  </>
                ) : null}
                <span className="flex gap-1 ml-1">
                  <span className="typing-dot inline-block w-1 h-1 rounded-full bg-indigo-400" />
                  <span className="typing-dot inline-block w-1 h-1 rounded-full bg-indigo-400" />
                  <span className="typing-dot inline-block w-1 h-1 rounded-full bg-indigo-400" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Vision description display - collapsed by default, markdown rendered */}
        {visionDescription && (
          <div className="flex gap-3 animate-slide-up">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "color-mix(in srgb, var(--success) 20%, transparent)" }}
            >
              <Image size={14} style={{ color: "var(--success)" }} />
            </div>
            <div className="flex-1">
              <button
                onClick={() => setShowVisionDesc(!showVisionDesc)}
                className="w-full rounded-xl rounded-tl-sm px-4 py-3 text-left cursor-pointer transition-colors"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--success) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--success) 20%, transparent)",
                }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium" style={{ color: "var(--success)" }}>
                    👁 Qwen-VL 图片描述
                  </p>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {showVisionDesc ? "▾ 收起" : "▸ 展开"}
                  </span>
                </div>
                {showVisionDesc && (
                  <div
                    className="markdown-body text-sm mt-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {visionDescription}
                    </ReactMarkdown>
                  </div>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Streaming message */}
        {(streamingContent || streamingThinking) && (
          <MessageBubble
            message={{ role: "assistant", content: streamingContent, reasoning_content: streamingThinking }}
            isStreaming
          />
        )}

        {/* Error retry */}
        {hasError && !isStreaming && (
          <div className="flex justify-center animate-fade-in">
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: "color-mix(in srgb, var(--danger) 15%, transparent)",
                color: "var(--danger)",
                border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)",
              }}
            >
              <RefreshCw size={12} />
              重试请求
            </button>
          </div>
        )}

        {/* Scroll to bottom FAB */}
        {!isNearBottom && (
          <div className="sticky bottom-0 flex justify-center pb-1">
            <button
              onClick={() => {
                if (containerRef.current) {
                  containerRef.current.scrollTo({
                    top: containerRef.current.scrollHeight,
                    behavior: "smooth",
                  });
                }
                setIsNearBottom(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg transition-all hover:scale-105"
              style={{
                backgroundColor: "var(--accent)",
                color: "white",
              }}
            >
              <ChevronDown size={14} />
              回到底部
            </button>
          </div>
        )}
      </div>

      {/* Image generation panel */}
      {showImageGen && (
        <div className="px-4 pb-2 animate-slide-up">
          <div className="rounded-xl p-3" style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
          }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                <Wand2 size={13} className="text-purple-400" />
                图片生成（Wanx-v1）
              </span>
              <button onClick={() => setShowImageGen(false)} className="text-xs"
                style={{ color: 'var(--text-muted)' }}>
                收起
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                placeholder="描述要生成的图片..."
                className="flex-1 px-3 py-1.5 rounded-lg text-xs focus:outline-none"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
              <button onClick={() => handleGenerate()} disabled={genLoading || !genPrompt.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-30 transition-colors"
                style={{
                  backgroundColor: 'color-mix(in srgb, #a855f7 20%, transparent)',
                  color: '#c084fc',
                  border: '1px solid color-mix(in srgb, #a855f7 30%, transparent)',
                }}>
                {genLoading ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                生成
              </button>
            </div>
            {genError && <p className="text-xs mt-2" style={{ color: 'var(--danger)' }}>{genError}</p>}
            {genResult.length > 0 && (
              <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                {genResult.map((url, i) => (
                  <div key={i} className="relative group flex-shrink-0">
                    <img src={url} alt={`生成图片 ${i + 1}`}
                      className="max-h-48 rounded-lg border object-contain"
                      style={{ borderColor: 'var(--border-color)' }} />
                    <button
                      onClick={() => handleDownloadImage(url, i)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: 'white' }}
                      title="高清下载"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image preview */}
      {uploadedImage && (
        <div className="px-4 pb-1">
          <div className="relative inline-block">
            <img src={uploadedImage.previewUrl} alt="上传预览" className="max-h-24 rounded-lg"
              style={{ border: '1px solid var(--border-color)' }} />
            <button onClick={() => setUploadedImage(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs text-white"
              style={{ backgroundColor: 'var(--danger)' }}>
              ×
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="flex items-end gap-2">
          <div className="flex gap-1">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg transition-colors" title="上传图片分析"
              style={{ color: 'var(--text-muted)' }}>
              <Paperclip size={17} />
            </button>
            <button onClick={() => setShowImageGen(!showImageGen)}
              className="p-2 rounded-lg transition-colors" title="图片生成 (/draw)"
              style={showImageGen ? {
                backgroundColor: 'color-mix(in srgb, #a855f7 20%, transparent)',
                color: '#c084fc',
              } : { color: 'var(--text-muted)' }}>
              <Wand2 size={17} />
            </button>
          </div>

          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={uploadedImage ? "输入关于图片的问题..." : "输入问题，Enter发送 · /draw 生成图片 · Shift+Enter换行"}
              rows={1}
              className="w-full px-4 py-2.5 rounded-xl text-sm resize-none focus:outline-none"
              style={{
                backgroundColor: 'var(--input-bg)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                minHeight: "44px",
                maxHeight: "120px",
              }}
              onInput={(e) => {
                const el = e.target as HTMLTextAreaElement;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
              }}
            />
          </div>

          {isStreaming ? (
            <button onClick={onCancel}
              className="p-2.5 rounded-xl transition-all flex-shrink-0"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--danger) 20%, transparent)',
                color: 'var(--danger)',
                border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
              }}
              title="停止生成">
              <Square size={17} fill="currentColor" />
            </button>
          ) : (
            <button onClick={handleSubmit}
              disabled={!input.trim() && !uploadedImage}
              className="p-2.5 rounded-xl transition-all flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 20%, transparent)',
                color: 'var(--accent)',
                border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
              }}>
              <Send size={17} />
            </button>
          )}
        </div>
        <p className="text-[10px] mt-1.5 text-center" style={{ color: 'var(--text-muted)' }}>
          Comrade Assistant · DeepSeek V4 Pro + Qwen Vision · AI 可能出错，请验证重要信息
        </p>
      </div>
    </div>
  );
}

function StreamingIndicator({ stage }: { stage: StreamStage }) {
  const label = stage === "vision" ? "视觉解析中" : stage === "reasoning" ? "思考中" : "";
  return (
    <span className="ml-2 text-indigo-400">
      {label && <span className="mr-1 text-[10px] opacity-70">{label}</span>}
      <span className="typing-dot inline-block w-1 h-1 rounded-full bg-indigo-400 mr-0.5" />
      <span className="typing-dot inline-block w-1 h-1 rounded-full bg-indigo-400 mr-0.5" />
      <span className="typing-dot inline-block w-1 h-1 rounded-full bg-indigo-400" />
    </span>
  );
}

function QuickPrompt({ text, onClick }: { text: string; onClick: (t: string) => void }) {
  return (
    <button onClick={() => onClick(text)}
      className="px-3 py-1.5 rounded-full text-xs transition-all"
      style={{
        backgroundColor: 'var(--input-bg)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-muted)',
      }}>
      {text}
    </button>
  );
}
