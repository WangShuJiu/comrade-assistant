import {
  ChartColumn,
  DollarSign,
  Database,
  Eye,
  Image,
  BarChart3,
  Activity,
  Clock,
  Zap,
  TrendingUp,
} from "lucide-react";
import type { CostSummary } from "../types";

interface DashboardProps {
  costSummary: CostSummary;
  budget: number;
  onRefresh: () => void;
}

export default function Dashboard({ costSummary, budget, onRefresh }: DashboardProps) {
  const remaining = Math.max(0, budget - costSummary.totalCost);
  const usedPercent = Math.min(100, (costSummary.totalCost / budget) * 100);

  // 计算近期趋势（最近7天）
  const now = Date.now();
  const recent7d = costSummary.recentEntries?.filter(
    (e) => now - (e.timestamp || 0) < 7 * 24 * 3600 * 1000
  ) || [];

  const totalDeepSeek = recent7d
    .filter((e) => e.provider === "deepseek")
    .reduce((s, e) => s + e.cost, 0);
  const totalQwen = recent7d
    .filter((e) => e.provider === "qwen")
    .reduce((s, e) => s + e.cost, 0);

  const barMax = Math.max(totalDeepSeek, totalQwen, 0.001);
  const dsBarWidth = Math.min(100, (totalDeepSeek / barMax) * 100);
  const qwBarWidth = Math.min(100, (totalQwen / barMax) * 100);

  return (
    <div className="flex-1 overflow-y-auto p-6 animate-fade-in"
      style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            监控大盘
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            API 调用统计与费用分析
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor: 'var(--input-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
          }}
        >
          <Activity size={13} className="inline mr-1" />
          刷新数据
        </button>
      </div>

      {/* Budget overview */}
      <div className="rounded-xl p-5 mb-4"
        style={{
          background: `linear-gradient(135deg, ${usedPercent > 80 ? '#7f1d1d30' : usedPercent > 50 ? '#78350f30' : '#064e3b30'}, transparent)`,
          border: '1px solid var(--border-color)',
        }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DollarSign size={18} style={{ color: 'var(--success)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              总预算使用
            </span>
          </div>
          <span className="text-lg font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
            ${costSummary.totalCost.toFixed(4)}
            <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-muted)' }}>
              / ${budget.toFixed(0)}
            </span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 rounded-full mb-2 overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${usedPercent}%`,
              background: usedPercent > 80
                ? 'linear-gradient(90deg, #f87171, #dc2626)'
                : usedPercent > 50
                ? 'linear-gradient(90deg, #fbbf24, #d97706)'
                : 'linear-gradient(90deg, #34d399, #059669)',
            }}
          />
        </div>
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>已用 ${costSummary.totalCost.toFixed(2)}</span>
          <span>剩余 ${remaining.toFixed(2)}</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard
          icon={<Database size={16} className="text-indigo-400" />}
          title="DeepSeek 调用"
          value={costSummary.deepseek.calls}
          subtitle={`${(costSummary.deepseek.inputTokens / 1000).toFixed(1)}K / ${(costSummary.deepseek.outputTokens / 1000).toFixed(1)}K tokens`}
          cost={costSummary.deepseek.cost}
        />
        <StatCard
          icon={<Eye size={16} className="text-emerald-400" />}
          title="Qwen 调用"
          value={costSummary.qwen.calls}
          subtitle={`${(costSummary.qwen.inputTokens / 1000).toFixed(1)}K tokens · ${costSummary.qwen.imagesGenerated || 0} 图片`}
          cost={costSummary.qwen.cost}
        />
        <StatCard
          icon={<Zap size={16} className="text-amber-400" />}
          title="7日内 DeepSeek"
          value={`$${totalDeepSeek.toFixed(3)}`}
          subtitle={`${recent7d.filter(e => e.provider === "deepseek").length} 次`}
          cost={0}
        />
        <StatCard
          icon={<ChartColumn size={16} className="text-purple-400" />}
          title="7日内 Qwen"
          value={`$${totalQwen.toFixed(3)}`}
          subtitle={`${recent7d.filter(e => e.provider === "qwen").length} 次`}
          cost={0}
        />
      </div>

      {/* Comparison chart */}
      <div className="rounded-xl p-4 mb-4" style={{ border: '1px solid var(--border-color)' }}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <BarChart3 size={15} className="text-indigo-400" />
          7日费用对比
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <Database size={11} className="text-indigo-400" /> DeepSeek
              </span>
              <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                ${totalDeepSeek.toFixed(4)}
              </span>
            </div>
            <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${dsBarWidth}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <Eye size={11} className="text-emerald-400" /> Qwen
              </span>
              <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                ${totalQwen.toFixed(4)}
              </span>
            </div>
            <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${qwBarWidth}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent calls */}
      <div className="rounded-xl p-4" style={{ border: '1px solid var(--border-color)' }}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Clock size={15} className="text-gray-400" />
          最近调用记录
        </h3>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {(costSummary.recentEntries || []).slice(0, 30).map((entry, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-1.5 px-2 rounded text-xs"
              style={{ backgroundColor: i % 2 === 0 ? 'var(--card-bg)' : 'transparent' }}
            >
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  entry.provider === "deepseek" ? "bg-indigo-400" : "bg-emerald-400"
                }`} />
                <span style={{ color: 'var(--text-secondary)' }}>
                  {entry.provider === "deepseek" ? "DeepSeek" : "Qwen"} - {entry.action}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ color: 'var(--text-muted)' }}>
                  {entry.inputTokens + entry.outputTokens} tokens
                </span>
                <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                  ${entry.cost.toFixed(5)}
                </span>
              </div>
            </div>
          ))}
          {(!costSummary.recentEntries || costSummary.recentEntries.length === 0) && (
            <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>
              暂无调用记录
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
  cost,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  cost: number;
}) {
  return (
    <div className="rounded-xl p-3.5"
      style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{title}</span>
      </div>
      <p className="text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
      {cost > 0 && (
        <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-secondary)' }}>
          ${cost.toFixed(4)}
        </p>
      )}
    </div>
  );
}
