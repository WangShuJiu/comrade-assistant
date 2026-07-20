import { useState, useCallback, useRef } from "react";
import type { ChatMessage, StreamEvent, StreamStage } from "../types";
import { streamChat, streamVision, saveHistory } from "../lib/api";

interface UseChatOptions {
  provider: string;
  apiKeys: Record<string, string>;
  deepseekApiKey: string;
  qwenApiKey: string;
  deepseekModel: string;
  qwenModel: string;
  models: Record<string, string>;
  useAutoDetect: boolean;
  temperature: number;
  systemPrompt: string;
  maxTokens: number;
  maxRounds: number;
  currentId: string;
}

export function useChat(options: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingThinking, setStreamingThinking] = useState("");
  const [visionDescription, setVisionDescription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<StreamStage>("idle");
  const abortRef = useRef<AbortController | null>(null);

  const lastRequestRef = useRef<{
    content: string;
    images?: { base64: string; mimeType: string }[];
  } | null>(null);

  const getProviderApiKey = useCallback(
    (providerId: string): string => {
      return options.apiKeys[providerId] || options.deepseekApiKey || "";
    },
    [options.apiKeys, options.deepseekApiKey]
  );

  const getProviderModel = useCallback(
    (providerId: string): string => {
      return options.models[providerId] || options.deepseekModel || "";
    },
    [options.models, options.deepseekModel]
  );

  const resetMessages = useCallback(() => {
    setMessages([]);
    setStreamingContent("");
    setStreamingThinking("");
    setVisionDescription(null);
    setError(null);
    setStage("idle");
  }, []);

  const loadMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages(msgs);
  }, []);

  const saveCurrent = useCallback(async () => {
    if (messages.length <= 1) return;
    const hasUserMsg = messages.some((m) => m.role === "user");
    if (!hasUserMsg) return;
    try {
      const title = messages
        .filter((m) => m.role === "user")
        .map((m) => m.content.slice(0, 30))
        .join(" | ")
        .slice(0, 60) || "新对话";
      await saveHistory({
        id: options.currentId,
        title,
        model: getProviderModel(options.provider),
        messages,
      });
    } catch {}
  }, [messages, options, getProviderModel]);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setStage("idle");
  }, []);

  const retryLast = useCallback(() => {
    const last = lastRequestRef.current;
    if (last && !isStreaming) {
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.role === "assistant" && lastMsg.content.startsWith("❌")) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      sendMessage(last.content, last.images);
    }
  }, [isStreaming]);

  const sendMessage = useCallback(
    async (content: string, images?: { base64: string; mimeType: string }[]) => {
      setError(null);
      setStreamingContent("");
      setStreamingThinking("");
      setVisionDescription(null);
      setStage("idle");

      lastRequestRef.current = { content, images };

      const abort = new AbortController();
      abortRef.current = abort;

      let newMessages = [...messages];

      if (images && images.length > 0) {
        const hasPdf = images.some((img) => img.mimeType === "application/pdf");
        newMessages.push({
          role: "user",
          content: content || (hasPdf ? "请分析这份PDF文档" : "请分析这张图片"),
          images,
        });
      } else if (content) {
        newMessages.push({ role: "user", content });
      }

      setMessages(newMessages);
      setIsStreaming(true);

      try {
        let fullContent = "";
        let fullThinking = "";

        const onEvent = (event: StreamEvent) => {
          if (event.type === "delta") {
            if (event.reasoning) {
              fullThinking += event.reasoning;
              setStreamingThinking(fullThinking);
            }
            if (event.content) {
              fullContent += event.content;
              setStreamingContent(fullContent);
            }
          } else if (event.type === "status") {
            if (event.stage) setStage(event.stage);
          } else if (event.type === "vision_done") {
            setVisionDescription(event.description || null);
            setStage("reasoning");
          } else if (event.type === "error") {
            setError(event.error || "Unknown error");
            fullContent = event.error || "Unknown error";
            setStreamingContent(fullContent);
            setStage("idle");
          }
        };

        if (images && images.length > 0) {
          const historyMessages = messages.filter((m) => m.role !== "system");
          const hasPdf = images.some((img) => img.mimeType === "application/pdf");
          setStage("vision");
          await streamVision(
            {
              deepseekApiKey: options.deepseekApiKey,
              qwenApiKey: options.qwenApiKey,
              deepseekModel: options.deepseekModel,
              qwenModel: options.qwenModel,
              provider: options.provider,
              apiKey: getProviderApiKey(options.provider),
              apiKeys: options.apiKeys,
              images,
              userQuestion: content || (hasPdf ? "请分析这份PDF文档" : "请分析这张图片"),
              messages: historyMessages,
              useAutoDetect: options.useAutoDetect,
              temperature: options.temperature,
              maxTokens: options.maxTokens,
            },
            onEvent,
            abort.signal
          );
        } else {
          setStage("reasoning");
          await streamChat(
            {
              provider: options.provider,
              apiKey: getProviderApiKey(options.provider),
              model: getProviderModel(options.provider),
              messages: newMessages.filter((m) => m.role !== "system"),
              apiKeys: options.apiKeys,
              useAutoDetect: options.useAutoDetect,
              temperature: options.temperature,
              systemPrompt: options.systemPrompt,
              maxTokens: options.maxTokens,
              maxRounds: options.maxRounds,
            },
            onEvent,
            abort.signal
          );
        }

        setStage("idle");

        if (fullContent || fullThinking) {
          const assistantMsg: ChatMessage = {
            role: "assistant",
            content: fullContent,
            reasoning_content: fullThinking,
          };
          const finalMessages = [...newMessages, assistantMsg];
          setMessages(finalMessages);

          try {
            const title = newMessages
              .filter((m) => m.role === "user")
              .map((m) => m.content.slice(0, 30))
              .join(" | ")
              .slice(0, 60) || "新对话";

            await saveHistory({
              id: options.currentId,
              title,
              model: getProviderModel(options.provider),
              messages: finalMessages,
            });
          } catch {}
        }

        setStreamingContent("");
        setStreamingThinking("");
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStage("idle");
        const errorMsg: ChatMessage = { role: "assistant", content: `❌ 请求失败：${msg}` };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, options, getProviderApiKey, getProviderModel]
  );

  return {
    messages,
    isStreaming,
    streamingContent,
    streamingThinking,
    visionDescription,
    error,
    stage,
    sendMessage,
    cancelStream,
    resetMessages,
    loadMessages,
    retryLast,
    saveCurrent,
  };
}
