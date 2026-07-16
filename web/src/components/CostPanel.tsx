import { DollarSign, Database, Eye, RefreshCw, BarChart3 } from "lucide-react";
import { useState } from "react";
import type { CostSummary, ProviderStats } from "../types";

interface CostPanelProps {
  costSummary: CostSummary;
  budget: number;
  onRefresh: () => void;
}

const barColors: Record<string, string> = {
  deepseek: "bg-indigo-400",
  openai: "bg-emerald-400",
  anthropic: "bg-orange-400",
  qwen: "bg-cyan-400",
};

const textColors: Record<string, string> = {
  deepseek: "text-indigo-400",
  openai: "text-emerald-400",
  anthropic: "text-orange-400",
  qwen: "text-cyan-400",
};

export default function CostPanel({ costSummary, budget, onRefresh }: CostPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const remaining = Math.max(0, budget - costSummary.totalCost);
  const usedPercent = Math.min(100, (costSummary.totalCost / budget) * 100);

  const providers: Record<string, ProviderStats> = costSummary.providers || {};
  if (!providers || Object.keys(providers).length === 0) {
    if (costSummary.deepseek) providers.deepseek = costSummary.deepseek;
    if (costSummary.qwen) providers.qwen = costSummary.qwen;
  }
  const providerIds = Object.keys(providers);

  return (
    <div className="flex-shrink-0" style={{
      backgroundColor: 'var(--glass-bg)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--border-color)',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 flex items-center justify-between text-xs transition-colors"
        style={{ color: 'var(--text-primary)' }}
      >
        <div className="flex items-center gap-2">
          <DollarSign size={13} style={{ color: 'var(--success)' }} />
          <span style={{ color: 'var(--text-muted)' }}>费用追踪</span>
          <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
            ${costSummary.totalCost.toFixed(4)}
          </span>
          <span className="font-mono" style={{ color: remaining > 1 ? 'var(--success)' : 'var(--danger)' }}>
            剩余 ${remaining.toFixed(2)}
          </span>
        </div>
        <span style={{ color: 'var(--text-muted)' }}>{expanded ? "▾" : "▸"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 animate-slide-up">
          <div className="mb-3">
            <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
              <span>已用</span>
              <span>${budget.toFixed(0)}</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${usedPercent}%`,
                background: usedPercent > 80
                  ? 'linear-gradient(90deg, #f87171, #ef4444)'
                  : usedPercent > 50
                  ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                  : 'linear-gradient(90deg, #34d399, #10b981)',
              }} />
            </div>
          </div>

          <div className={`grid gap-2 ${providerIds.length <= 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
            {providerIds.map((pid) => {
              const stats = providers[pid];
              return (
                <div key={pid} className="rounded-lg p-2.5" style={{
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className={`w-2 h-2 rounded-full ${barColors[pid] || 'bg-gray-400'}`} />
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {pid.charAt(0).toUpperCase() + pid.slice(1)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <Row label="调用" value={stats.calls} />
                    <Row label="输入" value={`${(stats.inputTokens / 1000).toFixed(1)}K`} />
                    <Row label="输出" value={`${(stats.outputTokens / 1000).toFixed(1)}K`} />
                    {stats.imagesGenerated !== undefined && (
                      <Row label="图片" value={stats.imagesGenerated} />
                    )}
                    <div className="flex justify-between text-[10px] pt-1" style={{ borderTop: '1px solid var(--border-color)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>费用</span>
                      <span className={`font-mono font-medium ${textColors[pid] || ''}`}>
                        ${stats.cost.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>总计花费</span>
            <span className="text-xs font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
              ${costSummary.totalCost.toFixed(4)}
            </span>
          </div>

          <button onClick={onRefresh}
            className="w-full mt-2 py-1.5 rounded-lg text-[10px] transition-colors flex items-center justify-center gap-1.5"
            style={{
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
            }}>
            <RefreshCw size={11} />
            刷新费用
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-[10px]">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{value}</span>
    </div>
  );
}
