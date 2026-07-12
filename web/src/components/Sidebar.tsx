import {
  Settings,
  MessageSquarePlus,
  Trash2,
  History,
  PanelLeftClose,
  X,
  Key,
  SlidersHorizontal,
  MessageSquareText,
  Sun,
  Moon,
  BarChart3,
  Pin,
  Search,
} from "lucide-react";
import type { AppConfig, Conversation } from "../types";
import type { Theme } from "../hooks/useTheme";
import { useState } from "react";

interface SidebarProps {
  open: boolean;
  mobileOpen: boolean;
  config: AppConfig;
  onSaveConfig: (updates: Partial<AppConfig>) => void;
  histories: Conversation[];
  currentId: string;
  onNewChat: () => void;
  onLoadHistory: (id: string) => void;
  onDeleteHistory: (id: string) => void;
  onToggle: () => void;
  onMobileClose: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  view: "chat" | "dashboard";
  onViewChange: (v: "chat" | "dashboard") => void;
  searchQuery: string;
  onSearch: (q: string) => void;
  onTogglePin: (id: string) => void;
}

type TabType = "history" | "settings";

export default function Sidebar(props: SidebarProps) {
  const [tab, setTab] = useState<TabType>("history");

  const sidebarContent = (
    <div
      className="h-full flex flex-col"
      style={{
        backgroundColor: "var(--glass-bg)",
        backdropFilter: "blur(12px)",
        borderRight: "1px solid var(--border-color)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-color)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}
          >
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Comrade
            </h2>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              AI Assistant
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={props.onToggleTheme}
            className="p-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ color: "var(--text-muted)" }}
            title={props.theme === "dark" ? "切换浅色主题" : "切换深色主题"}
          >
            {props.theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            onClick={props.onToggle}
            className="p-1.5 rounded-lg transition-colors hidden lg:block"
            style={{ color: "var(--text-muted)" }}
          >
            <PanelLeftClose size={16} />
          </button>
          <button
            onClick={props.onMobileClose}
            className="p-1.5 rounded-lg transition-colors lg:hidden"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* View nav */}
      <div className="flex flex-shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
        <button
          onClick={() => {
            props.onViewChange("chat");
            props.onMobileClose();
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors"
          style={
            props.view === "chat"
              ? {
                  color: "var(--accent)",
                  borderBottom: "2px solid var(--accent)",
                  backgroundColor: "color-mix(in srgb, var(--accent) 5%, transparent)",
                }
              : { color: "var(--text-muted)" }
          }
        >
          <MessageSquareText size={14} />
          对话
        </button>
        <button
          onClick={() => {
            props.onViewChange("dashboard");
            props.onMobileClose();
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors"
          style={
            props.view === "dashboard"
              ? {
                  color: "var(--accent)",
                  borderBottom: "2px solid var(--accent)",
                  backgroundColor: "color-mix(in srgb, var(--accent) 5%, transparent)",
                }
              : { color: "var(--text-muted)" }
          }
        >
          <BarChart3 size={14} />
          监控
        </button>
      </div>

      {/* Tab nav */}
      <div className="flex flex-shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
        <button
          onClick={() => setTab("history")}
          className="flex-1 py-2.5 text-xs font-medium transition-colors"
          style={
            tab === "history"
              ? {
                  color: "var(--accent)",
                  borderBottom: "2px solid var(--accent)",
                  backgroundColor: "color-mix(in srgb, var(--accent) 5%, transparent)",
                }
              : { color: "var(--text-muted)" }
          }
        >
          历史
        </button>
        <button
          onClick={() => setTab("settings")}
          className="flex-1 py-2.5 text-xs font-medium transition-colors"
          style={
            tab === "settings"
              ? {
                  color: "var(--accent)",
                  borderBottom: "2px solid var(--accent)",
                  backgroundColor: "color-mix(in srgb, var(--accent) 5%, transparent)",
                }
              : { color: "var(--text-muted)" }
          }
        >
          设置
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "history" ? <HistoryTab {...props} /> : <SettingsTab {...props} />}
      </div>
    </div>
  );

  return (
    <>
      <div
        className={`hidden lg:block flex-shrink-0 transition-all duration-300 ${
          props.open ? "w-72" : "w-0 overflow-hidden"
        }`}
      >
        <div className="w-72 h-full">{sidebarContent}</div>
      </div>
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-40 w-72 transition-transform duration-300 ${
          props.mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}

function HistoryTab(props: SidebarProps) {
  return (
    <div className="py-2">
      {/* Search */}
      <div className="px-2 mb-2">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            type="text"
            value={props.searchQuery}
            onChange={(e) => props.onSearch(e.target.value)}
            placeholder="搜索对话..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs focus:outline-none"
            style={{
              backgroundColor: "var(--input-bg)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
            }}
          />
          {props.searchQuery && (
            <button
              onClick={() => props.onSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* New chat */}
      <button
        onClick={props.onNewChat}
        className="w-full mx-2 px-3 py-2 mb-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
        style={{
          border: "1px solid var(--border-color)",
          backgroundColor: "var(--input-bg)",
          color: "var(--text-secondary)",
        }}
      >
        <MessageSquarePlus size={15} />
        新建对话
      </button>

      {/* List */}
      <div className="px-2">
        {props.histories.length === 0 ? (
          <div className="text-center py-8">
            <History
              size={32}
              style={{ color: "var(--text-muted)", opacity: 0.3 }}
              className="mx-auto mb-2"
            />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {props.searchQuery ? "未找到匹配的对话" : "暂无历史记录"}
            </p>
          </div>
        ) : (
          props.histories.map((h) => (
            <div
              key={h.id}
              className="group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all mb-1"
              style={
                h.id === props.currentId
                  ? {
                      backgroundColor: "color-mix(in srgb, var(--accent) 10%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
                    }
                  : { border: "1px solid transparent" }
              }
              onClick={() => props.onLoadHistory(h.id)}
            >
              {/* Pin button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  props.onTogglePin(h.id);
                }}
                className="flex-shrink-0 p-0.5 rounded transition-colors"
                style={{
                  color: h.pinned ? "var(--accent)" : "var(--text-muted)",
                  opacity: h.pinned ? 1 : 0,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  if (!h.pinned)
                    (e.currentTarget as HTMLElement).style.opacity = "0";
                }}
                title={h.pinned ? "取消置顶" : "置顶"}
              >
                <Pin size={13} fill={h.pinned ? "currentColor" : "none"} />
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>
                  {h.title}
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {h.updatedAt
                    ? new Date(h.updatedAt).toLocaleDateString("zh-CN")
                    : ""}
                  <span className="ml-2" style={{ color: "var(--text-muted)" }}>
                    {h.model}
                  </span>
                </p>
              </div>

              {/* Delete */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  props.onDeleteHistory(h.id);
                }}
                className="flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-all"
                style={{ color: "var(--text-muted)" }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SettingsTab({
  config,
  onSaveConfig,
}: {
  config: AppConfig;
  onSaveConfig: (updates: Partial<AppConfig>) => void;
}) {
  const [local, setLocal] = useState(config);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSaveConfig(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputStyle = {
    background: "var(--input-bg)",
    border: "1px solid var(--border-color)",
    color: "var(--text-primary)",
  };

  return (
    <div className="py-2 px-3 space-y-4 text-sm">
      <div>
        <div className="flex items-center gap-1.5 mb-2" style={{ color: "var(--text-muted)" }}>
          <Key size={13} />
          <span className="text-xs font-medium">API 密钥 (.env优先)</span>
        </div>
        <label className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          DeepSeek API Key
        </label>
        <input
          type="password"
          value={local.deepseekApiKey}
          onChange={(e) => setLocal({ ...local, deepseekApiKey: e.target.value })}
          placeholder="sk-... or set DEEPSEEK_API_KEY in .env"
          className="w-full mt-1 px-3 py-1.5 rounded-md text-xs focus:outline-none"
          style={{ ...inputStyle, borderColor: "var(--accent)", opacity: 0.5, borderWidth: "1px" }}
        />
        <label className="text-[10px] block mt-2" style={{ color: "var(--text-muted)" }}>
          Qwen API Key
        </label>
        <input
          type="password"
          value={local.qwenApiKey}
          onChange={(e) => setLocal({ ...local, qwenApiKey: e.target.value })}
          placeholder="sk-... or set QWEN_API_KEY in .env"
          className="w-full mt-1 px-3 py-1.5 rounded-md text-xs focus:outline-none"
          style={{ ...inputStyle, borderColor: "var(--accent)", opacity: 0.5, borderWidth: "1px" }}
        />
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2" style={{ color: "var(--text-muted)" }}>
          <SlidersHorizontal size={13} />
          <span className="text-xs font-medium">模型配置</span>
        </div>
        <label className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          DeepSeek 模型
        </label>
        <select
          value={local.deepseekModel}
          onChange={(e) => setLocal({ ...local, deepseekModel: e.target.value })}
          className="w-full mt-1 px-3 py-1.5 rounded-md text-xs focus:outline-none"
          style={inputStyle}
        >
          <option value="deepseek-v4-pro">V4 Pro（深度思考）</option>
          <option value="deepseek-v4-flash">V4 Flash（极速版）</option>
        </select>
        <label className="text-[10px] block mt-2" style={{ color: "var(--text-muted)" }}>
          Qwen 视觉模型
        </label>
        <select
          value={local.qwenModel}
          onChange={(e) => setLocal({ ...local, qwenModel: e.target.value })}
          className="w-full mt-1 px-3 py-1.5 rounded-md text-xs focus:outline-none"
          style={inputStyle}
        >
          <option value="qwen-vl-plus">VL Plus</option>
          <option value="qwen-vl-max">VL Max</option>
        </select>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2" style={{ color: "var(--text-muted)" }}>
          <SlidersHorizontal size={13} />
          <span className="text-xs font-medium">生成参数</span>
        </div>
        <label className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          温度：{local.temperature.toFixed(1)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={local.temperature}
          onChange={(e) => setLocal({ ...local, temperature: parseFloat(e.target.value) })}
          className="w-full mt-1 accent-indigo-500"
        />
        <label className="text-[10px] block mt-2" style={{ color: "var(--text-muted)" }}>
          最大 Token：{local.maxTokens}
        </label>
        <input
          type="range"
          min="512"
          max="8192"
          step="512"
          value={local.maxTokens}
          onChange={(e) => setLocal({ ...local, maxTokens: parseInt(e.target.value) })}
          className="w-full mt-1 accent-indigo-500"
        />
        <label className="text-[10px] block mt-2" style={{ color: "var(--text-muted)" }}>
          历史轮次：{local.maxRounds}
        </label>
        <input
          type="range"
          min="1"
          max="20"
          step="1"
          value={local.maxRounds}
          onChange={(e) => setLocal({ ...local, maxRounds: parseInt(e.target.value) })}
          className="w-full mt-1 accent-indigo-500"
        />
        <label className="text-[10px] block mt-2" style={{ color: "var(--text-muted)" }}>
          预算：${local.budget.toFixed(0)}
        </label>
        <input
          type="range"
          min="10"
          max="1000"
          step="10"
          value={local.budget}
          onChange={(e) => setLocal({ ...local, budget: parseInt(e.target.value) })}
          className="w-full mt-1 accent-indigo-500"
        />
      </div>

      <div>
        <label className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          系统提示词
        </label>
        <textarea
          value={local.systemPrompt}
          onChange={(e) => setLocal({ ...local, systemPrompt: e.target.value })}
          rows={3}
          className="w-full mt-1 px-3 py-1.5 rounded-md text-xs focus:outline-none resize-none"
          style={inputStyle}
        />
      </div>

      <button
        onClick={handleSave}
        className="w-full py-2 rounded-lg font-medium text-xs transition-all"
        style={
          saved
            ? {
                backgroundColor: "color-mix(in srgb, var(--success) 20%, transparent)",
                color: "var(--success)",
                border: "1px solid color-mix(in srgb, var(--success) 30%, transparent)",
              }
            : {
                backgroundColor: "color-mix(in srgb, var(--accent) 20%, transparent)",
                color: "var(--accent)",
                border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
              }
        }
      >
        {saved ? "✓ 已保存" : "保存设置"}
      </button>
    </div>
  );
}
