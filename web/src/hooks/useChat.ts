import { useState, useCallback, useRef } from "react";
import type { ChatMessage, StreamEvent, StreamStage } from "../types";
import { streamChat, streamVision, saveHistory } from "../lib/api";

interface UseChatOptions {
  deepseekApiKey: string;
  qwenApiKey: string;
  deepseekModel: string;
  qwenModel: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  currentId: string;
}

const COMMAND_PATTERNS = [/^\/draw\s+/i, /^\/draw$/i];

export function useChat(options: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "system", content: options.systemPrompt },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingThinking, setStreamingThinking] = useState("");
  const [visionDescription, setVisionDescription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<StreamStage>("idle");
  const abortRef = useRef<AbortController | null>(null);

  // Track the last request for retry
  const lastRequestRef = useRef<{
    content: string;
    imageBase64?: string;
    mimeType?: string;
  } | null>(null);

  const resetMessages = useCallback((sysPrompt: string) => {
    setMessages([{ role: "system", content: sysPrompt }]);
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
        model: options.deepseekModel,
        messages,
      });
    } catch {}
  }, [messages, options]);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setStage("idle");
  }, []);

  const retryLast = useCallback(() => {
    const last = lastRequestRef.current;
    if (last && !isStreaming) {
      // Remove the failed assistant message if any
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.role === "assistant" && lastMsg.content.startsWith("❌")) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      sendMessage(last.content, last.imageBase64, last.mimeType);
    }
  }, [isStreaming]);

  const sendMessage = useCallback(
    async (content: string, imageBase64?: string, mimeType?: string) => {
      setError(null);
      setStreamingContent("");
      setStreamingThinking("");
      setVisionDescription(null);
      setStage("idle");

      lastRequestRef.current = { content, imageBase64, mimeType };

      const abort = new AbortController();
      abortRef.current = abort;

      let newMessages = [...messages];

      if (imageBase64) {
        newMessages.push({
          role: "user",
          content: content || "请分析这张图片",
          image: { base64: imageBase64, mimeType: mimeType || "image/jpeg" },
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

        if (imageBase64) {
          const historyMessages = messages.filter((m) => m.role !== "system");
          setStage("vision");
          await streamVision(
            {
              deepseekApiKey: options.deepseekApiKey,
              qwenApiKey: options.qwenApiKey,
              deepseekModel: options.deepseekModel,
              qwenModel: options.qwenModel,
              imageBase64,
              mimeType: mimeType || "image/jpeg",
              userQuestion: content || "请分析这张图片",
              messages: historyMessages,
              temperature: options.temperature,
              maxTokens: options.maxTokens,
            },
            onEvent,
            abort.signal
          );
        } else {
          setStage("reasoning");
          const msgsForAPI = newMessages
            .filter((m) => m.role !== "system")
            .slice(-(options.maxRounds || 10) * 2);
          const apiMessages = [
            { role: "system", content: options.systemPrompt },
            ...msgsForAPI,
          ];

          await streamChat(
            {
              apiKey: options.deepseekApiKey,
              model: options.deepseekModel,
              messages: apiMessages,
              temperature: options.temperature,
              maxTokens: options.maxTokens,
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
              model: options.deepseekModel,
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
    [messages, options]
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
