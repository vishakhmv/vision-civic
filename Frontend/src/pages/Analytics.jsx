import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Flame,
  CloudFog,
  Trash2,
  Video,
  FileVideo,
  Activity,
  Layers,
  RefreshCw,
  PieChart,
  ShieldCheck
} from 'lucide-react';
import { analyticsApi } from '../services/api';
import StatCard from '../components/StatCard';
import { toast } from '../components/ui/sonner';
import { SimpleTooltip } from '../components/ui/tooltip';

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [overTimeData, setOverTimeData] = useState([]);
  const [distribution, setDistribution] = useState(null);
  const [loading, setLoading] = useState(true);

  const [groupBy, setGroupBy] = useState('day');
  const [timeRange, setTimeRange] = useState(30);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [sumRes, timeRes, distRes] = await Promise.all([
        analyticsApi.getSummary(),
        analyticsApi.getOverTime({ group_by: groupBy, days: timeRange }),
        analyticsApi.getDistribution(),
      ]);
      setSummary(sumRes.data);
      setOverTimeData(timeRes.data || []);
      setDistribution(distRes.data || {});
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [groupBy, timeRange]);

  const maxCount = Math.max(1, ...overTimeData.map((d) => d.total || 0));

  const totalInc = summary?.total_incidents || 0;
  const fireInc = summary?.fire_incidents || 0;
  const smokeInc = summary?.smoke_incidents || 0;
  const wasteInc = summary?.waste_bin_incidents || 0;
  const avgConf = Math.round((summary?.avg_confidence || 0.88) * 100);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
            Analytics
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Historical incident volume, hazard frequency, and detection telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setGroupBy('day')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                groupBy === 'day'
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setGroupBy('week')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                groupBy === 'week'
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setGroupBy('month')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                groupBy === 'month'
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Monthly
            </button>
          </div>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="text-xs sm:text-sm py-2 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-main)] cursor-pointer"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>

          <SimpleTooltip content="Reload analytics data">
            <button
              onClick={() => {
                fetchAnalytics();
                toast.info('Analytics refreshed.');
              }}
              disabled={loading}
              className="btn-outline text-xs sm:text-sm py-2 px-3"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </SimpleTooltip>
        </div>
      </div>

      {/* Spacious 4-Card Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Incidents"
          value={totalInc}
          subtitle="All confirmed detections"
          icon={Activity}
          color="var(--accent-teal)"
          bgGradient="rgba(8, 145, 178, 0.12)"
          glowColor="rgba(8, 145, 178, 0.15)"
        />
        <StatCard
          title="Fire Incidents"
          value={fireInc}
          subtitle="Active flame alerts"
          icon={Flame}
          color="#ef4444"
          bgGradient="var(--fire-bg)"
          glowColor="rgba(239, 68, 68, 0.15)"
        />
        <StatCard
          title="Smoke Incidents"
          value={smokeInc}
          subtitle="Atmospheric smoke clouds"
          icon={CloudFog}
          color="#94a3b8"
          bgGradient="var(--smoke-bg)"
          glowColor="rgba(148, 163, 184, 0.15)"
        />
        <StatCard
          title="Waste Bin Overflows"
          value={wasteInc}
          subtitle="Sanitation overflow events"
          icon={Trash2}
          color="#10b981"
          bgGradient="var(--waste-bg)"
          glowColor="rgba(16, 185, 129, 0.15)"
        />
      </div>

      {/* Incidents Timeline Chart (Clean & Spacious) */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-base font-bold text-[var(--text-main)]">
              Incident Frequency Over Time
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Detection timeline aggregated by {groupBy} over the last {timeRange} days
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-[var(--text-muted)]">Fire</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span className="text-[var(--text-muted)]">Smoke</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[var(--text-muted)]">Waste</span>
            </span>
          </div>
        </div>

        {overTimeData.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-dim)]">
            <BarChart3 size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No incident events recorded in this time range.</p>
          </div>
        ) : (
          <div className="h-56 flex items-end gap-2.5 pt-4 border-b border-[var(--border-subtle)] overflow-x-auto pb-4">
            {overTimeData.map((d, idx) => {
              const heightPct = Math.max(10, Math.round((d.total / maxCount) * 100));
              const fireH = Math.round((d.FIRE / (d.total || 1)) * 100);
              const smokeH = Math.round((d.SMOKE / (d.total || 1)) * 100);
              const wasteH = 100 - fireH - smokeH;

              return (
                <div
                  key={idx}
                  className="flex-1 min-w-[32px] h-full flex flex-col justify-end items-center group relative cursor-pointer"
                >
                  {/* Hover Tooltip */}
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 bg-[var(--bg-surface)] text-[var(--text-main)] text-[11px] font-semibold py-1 px-2 rounded border border-[var(--border-subtle)] shadow-lg whitespace-nowrap">
                    {d.date}: {d.total} events
                  </div>

                  <span className="text-[10px] font-bold text-[var(--text-dim)] mb-1">
                    {d.total > 0 ? d.total : ''}
                  </span>

                  <div
                    className="w-full max-w-[28px] rounded-t-md overflow-hidden flex flex-col-reverse bg-[var(--border-subtle)] group-hover:opacity-90 transition-opacity"
                    style={{ height: `${heightPct}%` }}
                  >
                    {d.FIRE > 0 && <div style={{ height: `${fireH}%` }} className="bg-red-500" />}
                    {d.SMOKE > 0 && <div style={{ height: `${smokeH}%` }} className="bg-slate-400" />}
                    {d.WASTE_BIN_OVERFLOW > 0 && <div style={{ height: `${wasteH}%` }} className="bg-emerald-500" />}
                  </div>

                  <span className="text-[10px] text-[var(--text-dim)] mt-2 whitespace-nowrap truncate max-w-[38px] text-center">
                    {d.date.length > 5 ? d.date.slice(5) : d.date}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Distribution & Source Insights (Clean 2-Column Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incident Type Distribution */}
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-5 pb-2 border-b border-[var(--border-subtle)]">
            <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
              <PieChart size={16} className="text-[var(--primary)]" />
              <span>Incident Category Breakdown</span>
            </h3>
            <span className="text-xs text-[var(--text-dim)] font-medium">
              {totalInc} Total Logged
            </span>
          </div>

          <div className="space-y-4">
            {(distribution?.by_type || []).map((item) => {
              const pct = totalInc > 0 ? Math.round((item.count / totalInc) * 100) : 0;
              const isFire = item.type === 'FIRE';
              const isSmoke = item.type === 'SMOKE';
              const color = isFire ? '#ef4444' : isSmoke ? '#94a3b8' : '#10b981';

              return (
                <div key={item.type} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-[var(--text-main)] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      {item.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[var(--text-muted)] font-semibold">
                      {item.count} <span className="text-[var(--text-dim)] font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%`, background: color }}
                      className="h-full rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Source Telemetry & Operational Health */}
        <div className="glass-panel p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5 pb-2 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                <Layers size={16} className="text-[var(--primary)]" />
                <span>Detection Source Breakdown</span>
              </h3>
              <span className="text-xs text-[var(--text-dim)] font-medium">
                Live vs Uploads
              </span>
            </div>

            <div className="space-y-4">
              {(distribution?.by_source || []).map((item) => {
                const pct = totalInc > 0 ? Math.round((item.count / totalInc) * 100) : 0;
                const isLive = item.source === 'LIVE_CAMERA';
                const color = isLive ? 'var(--live-color)' : 'var(--upload-color)';
                const Icon = isLive ? Video : FileVideo;

                return (
                  <div key={item.source} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-[var(--text-main)] flex items-center gap-2">
                        <Icon size={14} className="text-[var(--text-muted)]" />
                        {isLive ? 'Live Surveillance Stream' : 'Uploaded Video Analysis'}
                      </span>
                      <span className="text-[var(--text-muted)] font-semibold">
                        {item.count} <span className="text-[var(--text-dim)] font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%`, background: color }}
                        className="h-full rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Model Confidence Metric Pill */}
          <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)] font-medium flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500" />
              Average Model Confidence
            </span>
            <span className="font-bold text-emerald-500 text-sm">
              {avgConf}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
