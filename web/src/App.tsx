import { useState, useEffect, useCallback } from "react";
import type { AppConfig, Conversation, CostSummary } from "./types";
import { fetchConfig, saveConfig as saveConfigApi, fetchUsage, fetchHistories, fetchHistory, deleteHistory, togglePin } from "./lib/api";
import { useChat } from "./hooks/useChat";
import { useTheme } from "./hooks/useTheme";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import Dashboard from "./components/Dashboard";
import CostPanel from "./components/CostPanel";

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [config, setConfig] = useState<AppConfig>({
    deepseekApiKey: "",
    qwenApiKey: "",
    deepseekModel: "deepseek-v4-pro",
    qwenModel: "qwen-vl-plus",
    useAutoDetect: true,
    temperature: 0.3,
    systemPrompt: "你是一位全能AI助手，请用中文回答。",
    maxTokens: 8192,
    maxRounds: 10,
    budget: 100,
  });
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [histories, setHistories] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentId, setCurrentId] = useState<string>(genId());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [view, setView] = useState<"chat" | "dashboard">("chat");

  const {
    messages,
    isStreaming,
    streamingContent,
    streamingThinking,
    visionDescription,
    error,
    sendMessage,
    cancelStream,
    resetMessages,
    loadMessages,
    retryLast,
    stage,
    saveCurrent,
  } = useChat({
    deepseekApiKey: config.deepseekApiKey,
    qwenApiKey: config.qwenApiKey,
    deepseekModel: config.deepseekModel,
    qwenModel: config.qwenModel,
    useAutoDetect: config.useAutoDetect,
    temperature: config.temperature,
    systemPrompt: config.systemPrompt,
    maxTokens: config.maxTokens,
    maxRounds: config.maxRounds,
    currentId,
  });

  useEffect(() => {
    fetchConfig().then(setConfig).catch(() => {});
    refreshUsage();
    refreshHistories();
  }, []);

  const refreshUsage = useCallback(async () => {
    try {
      const usage = await fetchUsage();
      setCostSummary(usage);
    } catch {}
  }, []);

  const refreshHistories = useCallback(async (search?: string) => {
    try {
      const data = await fetchHistories(search);
      setHistories(data.histories);
    } catch {}
  }, []);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    refreshHistories(q || undefined);
  }, [refreshHistories]);

  const handleTogglePin = useCallback(async (id: string) => {
    await togglePin(id);
    refreshHistories(searchQuery || undefined);
  }, [refreshHistories, searchQuery]);

  const handleSaveConfig = async (updates: Partial<AppConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    await saveConfigApi(updates);
  };

  const handleNewChat = () => {
    saveCurrent().catch(() => {});
    const id = genId();
    setCurrentId(id);
    resetMessages();
    setMobileSidebarOpen(false);
    setView("chat");
    refreshHistories();
  };

  const handleLoadHistory = async (id: string) => {
    try {
      const conv = await fetchHistory(id);
      setCurrentId(conv.id);
      loadMessages(conv.messages);
      setMobileSidebarOpen(false);
      setView("chat");
    } catch {}
  };

  const handleDeleteHistory = async (id: string) => {
    await deleteHistory(id);
    if (id === currentId) handleNewChat();
    refreshHistories();
  };

  const handleChatComplete = () => {
    refreshUsage();
    refreshHistories();
  };

  return (
    <div className="h-full flex" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <Sidebar
        open={sidebarOpen}
        mobileOpen={mobileSidebarOpen}
        config={config}
        onSaveConfig={handleSaveConfig}
        histories={histories}
        currentId={currentId}
        onNewChat={handleNewChat}
        onLoadHistory={handleLoadHistory}
        onDeleteHistory={handleDeleteHistory}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onMobileClose={() => setMobileSidebarOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
        view={view}
        onViewChange={setView}
        searchQuery={searchQuery}
        onSearch={handleSearch}
        onTogglePin={handleTogglePin}
      />

      <div className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {view === "dashboard" ? (
          costSummary && (
            <Dashboard
              costSummary={costSummary}
              budget={config.budget}
              onRefresh={refreshUsage}
            />
          )
        ) : (
          <>
            <ChatArea
              messages={messages}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
              streamingThinking={streamingThinking}
              visionDescription={visionDescription}
              error={error}
              onSend={sendMessage}
              onCancel={cancelStream}
              config={config}
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              onMobileMenu={() => setMobileSidebarOpen(true)}
              onChatComplete={handleChatComplete}
              currentId={currentId}
              stage={stage}
              onRetry={retryLast}
            />
            {costSummary && (
              <CostPanel
                costSummary={costSummary}
                budget={config.budget}
                onRefresh={refreshUsage}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
