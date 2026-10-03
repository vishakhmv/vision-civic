import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  Upload,
  RefreshCw,
  Cpu,
  Eye,
  Radio,
  Zap,
  HardDrive
} from 'lucide-react';
import { toast } from '../components/ui/sonner';
import { SimpleTooltip } from '../components/ui/tooltip';

export default function Dashboard() {
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      toast.info('Dashboard metrics updated.');
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
              Dashboard
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Real-time urban surveillance, automated incident detection, and IoT alerts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">

          <SimpleTooltip content="Upload video for AI analysis">
            <button
              onClick={() => navigate('/upload-video')}
              className="btn-outline text-xs sm:text-sm py-2 px-3.5"
            >
              <Upload size={15} />
              <span>Upload Video</span>
            </button>
          </SimpleTooltip>

          <SimpleTooltip content="Start live stream monitoring">
            <button
              onClick={() => navigate('/live-monitoring')}
              className="btn-primary text-xs sm:text-sm py-2 px-4 shadow-sm"
            >
              <Video size={15} />
              <span>Live Monitor</span>
            </button>
          </SimpleTooltip>
        </div>
      </div>

      {/* Project Explanation & Core Features Banner */}
      <div className="glass-panel p-6 border border-[var(--border-subtle)] relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
              <Cpu size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-main)] tracking-tight">
                About VisionCivic
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                AI-Powered Urban Issue Detection & IoT Alert System
              </p>
            </div>
          </div>
        </div>

        {/* Standard Project Explanation Text */}
        <p className="text-xs sm:text-sm text-[var(--text-main)] leading-relaxed mb-5">
          VisionCivic is an intelligent urban monitoring platform combining <strong>Artificial Intelligence (AI)</strong>, <strong>Computer Vision</strong>, and the <strong>Internet of Things (IoT)</strong> to automatically detect civic infrastructure issues from live camera feeds and uploaded videos. A deep learning model analyzes video in real time to identify overflowing garbage bins, fire or smoke hazards. Detected incidents trigger physical alerts via an <strong>ESP32 hardware module</strong> (Buzzer/LED) while logging event details to a centralized dashboard for rapid municipal response.
        </p>

        {/* Core Project Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--bg-surface)] p-3.5 rounded-xl border border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 mb-1.5 text-cyan-400 font-bold text-xs">
              <Eye size={16} />
              <span>Real-Time Detection</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Automated visual AI tracking for garbage overflow and fire/smoke hazards.
            </p>
          </div>

          <div className="bg-[var(--bg-surface)] p-3.5 rounded-xl border border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 mb-1.5 text-emerald-400 font-bold text-xs">
              <Radio size={16} />
              <span>ESP32 Hardware Alert</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Instant physical alarm triggers (Buzzer & LED indicator) linked directly to detection events.
            </p>
          </div>

          <div className="bg-[var(--bg-surface)] p-3.5 rounded-xl border border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 mb-1.5 text-amber-400 font-bold text-xs">
              <Zap size={16} />
              <span>Municipal Response</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Replaces continuous manual oversight, enabling faster emergency triage and lower operating costs.
            </p>
          </div>

          <div className="bg-[var(--bg-surface)] p-3.5 rounded-xl border border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 mb-1.5 text-sky-400 font-bold text-xs">
              <HardDrive size={16} />
              <span>Proof & Media Archive</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Cloud retention of keyframe snapshots and incident video clips for audit and verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
