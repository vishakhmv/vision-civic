import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  Radio,
  Trash2,
  Flame,
  CloudFog,
  Video,
  UploadCloud,
  ArrowRight,
  CheckCircle2,
  Leaf,
  Building2,
  Activity,
  HeartHandshake,
  Sparkles,
  ShieldCheck,
  Zap,
  PlayCircle,
  LogIn,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SimpleTooltip } from '../components/ui/tooltip';

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/live-monitoring');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="space-y-10 pb-10">
      {/* Hero Section */}
      <div className="relative overflow-hidden glass-panel p-8 sm:p-12 border border-[var(--border-subtle)] rounded-3xl bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-surface)] to-[var(--bg-primary)] shadow-2xl">
        {/* Glow ambient circle background */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 shadow-sm">
              <Sparkles size={14} />
              <span>Smart City & Urban Intelligence Platform</span>
            </div>

            {!isAuthenticated && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/login')}
                  className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <LogIn size={13} />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <UserPlus size={13} />
                  <span>Create Account</span>
                </button>
              </div>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[var(--text-main)] tracking-tight leading-tight">
            AI-Powered Urban Monitoring & Civic Safety System
          </h1>

          <p className="text-sm sm:text-lg text-[var(--text-muted)] leading-relaxed max-w-3xl">
            VisionCivic combines <strong>Artificial Intelligence (AI)</strong>, <strong>Computer Vision</strong>, and the <strong>Internet of Things (IoT)</strong> to automatically detect public sanitation issues and fire hazards from live camera feeds. Powered by deep learning and ESP32 hardware alarms, we enable rapid municipal triage and foster urban civic sense.
          </p>

          {/* Action CTAs */}
          <div className="flex items-center gap-4 flex-wrap pt-2">
            <button
              onClick={handleGetStarted}
              className="btn-primary py-3.5 px-6 text-sm sm:text-base font-bold shadow-lg flex items-center gap-2.5 group cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/upload-video')}
              className="btn-outline py-3.5 px-5 text-sm font-semibold flex items-center gap-2 cursor-pointer"
            >
              <UploadCloud size={18} />
              <span>Upload Video</span>
            </button>
          </div>
        </div>
      </div>

      {/* Civic Sense & Public Responsibility Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <div className="flex items-center gap-2 text-[var(--primary)] font-bold text-xs uppercase tracking-wider mb-1">
              <HeartHandshake size={16} />
              <span>Building Eco-Conscious Communities</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)] tracking-tight">
              Understanding Civic Sense & Smart Infrastructure
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-md">
            Civic sense is the unspoken social contract that keeps public spaces clean, safe, and functional for everyone.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1: Waste Management */}
          <div className="glass-panel p-6 border border-[var(--border-subtle)] hover:border-[var(--border-hover)] transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">
                Public Sanitation & Waste Bin Control
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                Overflowing garbage bins pose severe public health risks, breeding bacteria and pests. VisionCivic uses computer vision to detect full bins instantly, alerting municipal sanitation crews before litter spills into streets.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <CheckCircle2 size={14} />
              <span>Automated Overflow Detection</span>
            </div>
          </div>

          {/* Pillar 2: Fire Hazard Prevention */}
          <div className="glass-panel p-6 border border-[var(--border-subtle)] hover:border-[var(--border-hover)] transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Flame size={24} />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">
                Fire Hazard & Smoke Early Warning
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                Uncontrolled open fires and smoke clouds in urban sectors present immediate life-safety emergencies. VisionCivic flags early flames in real time, giving first responders crucial lead time.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center gap-2 text-xs font-semibold text-red-400">
              <CheckCircle2 size={14} />
              <span>Real-Time Flame & Smoke AI</span>
            </div>
          </div>

          {/* Pillar 3: IoT Hardware Integration */}
          <div className="glass-panel p-6 border border-[var(--border-subtle)] hover:border-[var(--border-hover)] transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Radio size={24} />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">
                ESP32 IoT Physical Hardware Alerts
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                When a visual AI model detects a violation, it triggers a connected ESP32 microcontroller module to activate physical buzzers and alert status LEDs in municipal control rooms instantly.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center gap-2 text-xs font-semibold text-cyan-400">
              <CheckCircle2 size={14} />
              <span>Buzzer & LED Microcontroller Sync</span>
            </div>
          </div>
        </div>
      </div>

      {/* How VisionCivic Works Workflow Section */}
      <div className="glass-panel p-8 border border-[var(--border-subtle)] rounded-3xl space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-main)]">
            How VisionCivic Operates
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            A seamless pipeline connecting optical sensors, deep neural networks, IoT hardware, and Cloud storage.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] relative">
            <span className="text-2xl font-black text-[var(--primary)] mb-2 block">01</span>
            <h4 className="font-bold text-sm text-[var(--text-main)] mb-1">Stream Capture</h4>
            <p className="text-xs text-[var(--text-muted)]">
              Input live camera feeds or upload pre-recorded video files for analysis.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] relative">
            <span className="text-2xl font-black text-[var(--primary)] mb-2 block">02</span>
            <h4 className="font-bold text-sm text-[var(--text-main)] mb-1">Deep Learning Vision</h4>
            <p className="text-xs text-[var(--text-muted)]">
              AI model classifies garbage overflow levels and flags flame or smoke hazards.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] relative">
            <span className="text-2xl font-black text-[var(--primary)] mb-2 block">03</span>
            <h4 className="font-bold text-sm text-[var(--text-main)] mb-1">ESP32 IoT Alarm</h4>
            <p className="text-xs text-[var(--text-muted)]">
              Hardware microcontrollers trigger physical buzzers and status LEDs upon positive detection.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] relative">
            <span className="text-2xl font-black text-[var(--primary)] mb-2 block">04</span>
            <h4 className="font-bold text-sm text-[var(--text-main)] mb-1">Cloud Proof Archive</h4>
            <p className="text-xs text-[var(--text-muted)]">
              Keyframe snapshots and short video clips are securely retained in Cloud storage for audit.
            </p>
          </div>
        </div>
      </div>

      {/* Getting Started Call-To-Action Banner */}
      <div className="glass-panel p-8 sm:p-10 border border-[var(--border-subtle)] rounded-3xl bg-gradient-to-r from-cyan-950/40 via-[var(--bg-surface)] to-teal-950/40 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <h3 className="text-2xl font-black text-[var(--text-main)]">
            Ready to Start Smart Monitoring?
          </h3>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-xl">
            Launch live camera surveillance or upload video clips now to test VisionCivic's automated AI detection & IoT alerting system.
          </p>
        </div>

        <button
          onClick={() => navigate('/live-monitoring')}
          className="btn-primary py-3.5 px-7 text-sm font-bold shadow-xl shrink-0 flex items-center gap-2 cursor-pointer"
        >
          <PlayCircle size={18} />
          <span>Launch Live Monitor</span>
        </button>
      </div>
    </div>
  );
}
