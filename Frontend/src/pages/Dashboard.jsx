import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  CloudFog,
  Trash2,
  Video,
  Activity,
  Upload,
  RefreshCw
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { analyticsApi } from '../services/api';
import { toast } from '../components/ui/sonner';
import { SimpleTooltip } from '../components/ui/tooltip';

export default function Dashboard() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const sumRes = await analyticsApi.getSummary();
      setSummary(sumRes.data);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalInc = summary?.total_incidents || 0;
  const fireInc = summary?.fire_incidents || 0;
  const smokeInc = summary?.smoke_incidents || 0;
  const wasteInc = summary?.waste_bin_incidents || 0;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
              Dashboard
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Real-time urban surveillance and automated incident triage.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <SimpleTooltip content="Refresh data">
            <button
              onClick={() => {
                fetchData();
                toast.info('Metrics refreshed.');
              }}
              disabled={refreshing}
              className="btn-outline text-xs sm:text-sm py-2 px-3"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </SimpleTooltip>

          <button
            onClick={() => navigate('/upload-video')}
            className="btn-outline text-xs sm:text-sm py-2 px-3.5"
          >
            <Upload size={15} />
            <span>Upload Video</span>
          </button>

          <button
            onClick={() => navigate('/live-monitoring')}
            className="btn-primary text-xs sm:text-sm py-2 px-4 shadow-sm"
          >
            <Video size={15} />
            <span>Live Monitor</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
          subtitle="Public sanitation alerts"
          icon={Trash2}
          color="#10b981"
          bgGradient="var(--waste-bg)"
          glowColor="rgba(16, 185, 129, 0.15)"
        />
      </div>
    </div>
  );
}
