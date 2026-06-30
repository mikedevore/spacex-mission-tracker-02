import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Shield, Star, Gauge, Target, Rocket, Globe, 
  Bell, Check, HelpCircle, Sparkles, CreditCard, Send, Lock, 
  Zap, Calendar, RefreshCw, BarChart2, TrendingUp, Compass, Award
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend
} from 'recharts';
import { SPACEX_BASE64_LOGO } from '../Logo';

interface TrackerProPageProps {
  onBack: () => void;
}

export default function TrackerProPage({ onBack }: TrackerProPageProps) {
  // --- STATE ---
  const [isSubscribed, setIsSubscribed] = useState(() => {
    return localStorage.getItem('tracker_pro_active') === 'true';
  });
  
  // Checkout modal
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Trajectory Simulator Slider State
  const [ascentAngle, setAscentAngle] = useState(45); // degrees
  const [fuelLoad, setFuelLoad] = useState(100); // percentage
  const [payloadMass, setPayloadMass] = useState(15); // metric tons

  // Proactive Alerts State
  const [alertEmail, setAlertEmail] = useState('');
  const [alertPhone, setAlertPhone] = useState('');
  const [alertsSaved, setAlertsSaved] = useState(false);
  const [alertTriggers, setAlertTriggers] = useState({
    launchImminent: true,
    boosterLanding: true,
    orbitInsertion: false,
    weatherAnomaly: true,
  });

  // Simulated live telemetry
  const [liveAlt, setLiveAlt] = useState(244);
  const [liveVel, setLiveVel] = useState(26900);
  const [liveProp, setLiveProp] = useState(84.5);

  // Active dashboard tab (for the interactive workspace)
  const [workspaceTab, setWorkspaceTab] = useState<'telemetry' | 'analytics' | 'alerts'>('telemetry');

  // --- LIVE SIMULATION LOOP ---
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveAlt(prev => {
        const delta = (Math.random() - 0.45) * 0.4;
        const next = prev + delta;
        return Number(next.toFixed(2));
      });
      setLiveVel(prev => {
        const delta = Math.round((Math.random() - 0.48) * 15);
        return prev + delta;
      });
      setLiveProp(prev => {
        if (prev <= 0.1) return 100;
        const next = prev - 0.02;
        return Number(next.toFixed(2));
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- TRAJECTORY CALCULATION (REACTIVE TO SLIDERS) ---
  const simulatedTrajectoryData = useMemo(() => {
    const points = [];
    const maxT = 600;
    const steps = 10;
    
    // Sliders factor calculations
    const angleRad = (ascentAngle * Math.PI) / 180;
    const fuelFactor = fuelLoad / 100;
    const payloadFactor = 1.5 - (payloadMass / 30); // Higher mass -> lower altitude/velocity

    for (let i = 0; i <= steps; i++) {
      const t = (maxT / steps) * i;
      
      // Calculate altitude (parabolic curve scaled by angle and fuel)
      const maxAlt = 260 * Math.sin(angleRad) * fuelFactor * payloadFactor;
      const alt = maxAlt * Math.sin((i / steps) * (Math.PI / 2));
      
      // Calculate velocity
      const maxVel = 28000 * Math.cos(angleRad * 0.5) * fuelFactor * payloadFactor;
      const vel = maxVel * (i / steps);

      points.push({
        time: `T+${Math.round(t)}s`,
        altitude: Math.round(alt),
        velocity: Math.round(vel),
      });
    }
    return points;
  }, [ascentAngle, fuelLoad, payloadMass]);

  // --- ANALYTICS DATA ---
  const boosterReuseData = [
    { name: 'B1058 (Lost)', launches: 19, success: 100 },
    { name: 'B1060 (Ret)', launches: 19, success: 100 },
    { name: 'B1062 (Act)', launches: 23, success: 100 },
    { name: 'B1061 (Act)', launches: 17, success: 100 },
    { name: 'B1067 (Act)', launches: 16, success: 100 },
    { name: 'B1073 (Act)', launches: 15, success: 100 },
  ];

  const turnaroundMetrics = [
    { year: '2020', avgDays: 54 },
    { year: '2021', avgDays: 38 },
    { year: '2022', avgDays: 27 },
    { year: '2023', avgDays: 19 },
    { year: '2024', avgDays: 12 },
    { year: '2026', avgDays: 9 },
  ];

  // --- HANDLERS ---
  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate payment processing delay
    setTimeout(() => {
      setIsProcessing(false);
      setIsSubscribed(true);
      setShowCheckout(false);
      localStorage.setItem('tracker_pro_active', 'true');
    }, 1800);
  };

  const handleCancelSubscription = () => {
    if (window.confirm("Are you sure you want to cancel your Tracker Pro access? You will lose real-time telemetry access.")) {
      setIsSubscribed(false);
      localStorage.removeItem('tracker_pro_active');
    }
  };

  const saveAlertSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setAlertsSaved(true);
    setTimeout(() => setAlertsSaved(false), 3000);
  };

  return (
    <div className="min-h-screen relative font-sans text-slate-100 bg-[#040814] selection:bg-[#ff6b2b]/30">
      {/* Dynamic Grid Overlay background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,107,43,0.08),rgba(255,255,255,0))] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:32px_32px] opacity-25 pointer-events-none z-0" />

      {/* Main Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col min-h-screen gap-6">
        
        {/* Navigation & Header with Prominent Header Cell */}
        <header className="flex flex-col lg:flex-row items-center justify-between border-b border-white/10 pb-8 gap-6 pt-2">
          {/* Back button and label */}
          <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-start">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900/90 border border-white/10 hover:border-[#ff6b2b] hover:text-[#ff6b2b] transition-all font-mono text-xs uppercase tracking-wider font-bold shadow-lg"
            >
              <ArrowLeft size={14} className="text-[#ff6b2b]" />
              Return to Console
            </button>
            <div className="h-6 w-px bg-white/10 hidden lg:block" />
            <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase lg:hidden">Tracker Pro Suite</span>
          </div>

          {/* Large Stylized Central Header Cell containing Logos */}
          <div className="flex flex-col md:flex-row items-center gap-5 md:gap-8 px-6 py-3.5 bg-slate-950/90 border border-[#ff6b2b]/30 rounded-xl shadow-[0_0_25px_rgba(255,107,43,0.06)] relative overflow-hidden group max-w-2xl w-full lg:w-auto">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-500/50 via-[#ff6b2b]/50 to-amber-500/50" />
            
            <div className="flex items-center justify-center">
              <img 
                src="/spacex_logo_v2.png" 
                alt="SpaceX Logo" 
                className="brightness-125 filter drop-shadow-[0_0_22px_rgba(0,231,255,0.3)]"
                referrerPolicy="no-referrer"
                style={{ width: 'min(450px, 75vw)', maxWidth: '450px', height: 'auto', objectFit: 'contain' }}
              />
            </div>
            
            <div className="hidden md:block h-8 w-px bg-white/10" />
            
            <div className="flex items-center gap-4 bg-slate-900/85 border border-cyan-500/40 px-5 py-2.5 rounded-lg shadow-inner">
              <img 
                src="/rockets.png" 
                alt="Active Rockets Fleet" 
                className="h-16 w-auto object-contain brightness-115 contrast-105 filter drop-shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                referrerPolicy="no-referrer"
                style={{ width: 'auto', maxWidth: '240px' }}
              />
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-[#ff6b2b] font-mono tracking-widest font-black uppercase leading-tight">FLEET ACTIVE</span>
                <span className="text-[8px] text-cyan-400 font-mono tracking-wider font-semibold uppercase leading-tight">LIVE MONITORING</span>
              </div>
            </div>
          </div>

          {/* Premium stats and badges */}
          <div className="flex items-center gap-4 w-full lg:w-auto justify-end">
            <div className="text-right hidden sm:block">
              <span className="text-[9px] text-[#ff6b2b] tracking-widest font-mono font-bold block uppercase animate-pulse">PREMIUM ACCESS PORTAL</span>
              <span className="text-[11px] text-slate-400 font-mono">NODE_US_EAST_PRO</span>
            </div>
            {isSubscribed ? (
              <span className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/10 to-orange-600/10 border border-[#ff6b2b]/50 px-4 py-2 rounded-full text-xs font-mono font-bold text-[#ff6b2b] shadow-[0_0_20px_rgba(255,107,43,0.15)] select-none">
                <Sparkles size={13} className="animate-pulse text-amber-400" />
                PRO ACTIVE
              </span>
            ) : (
              <span className="flex items-center gap-1.5 bg-slate-900 border border-white/10 px-4 py-2 rounded-full text-xs font-mono font-bold text-slate-400 select-none">
                <Lock size={12} className="text-slate-500" />
                FREE MODE
              </span>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative rounded-3xl bg-slate-950 border border-white/5 overflow-hidden shadow-2xl p-6 sm:p-10 flex flex-col md:flex-row items-center gap-8">
          <div className="absolute top-0 right-0 w-[45%] h-full bg-gradient-to-l from-[#ff6b2b]/5 to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-amber-500 to-orange-600" />
          
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-[#ff6b2b]/10 text-[#ff6b2b] font-mono text-[9px] font-bold uppercase tracking-widest border border-[#ff6b2b]/20">
                Aerospace Analytics Suite
              </span>
              <span className="text-xs text-slate-500 font-mono">v4.1.0</span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-mono tracking-tight font-black leading-none text-white">
              MISSION TRACKER <span className="text-[#ff6b2b] drop-shadow-[0_0_15px_rgba(255,107,43,0.2)]">PRO</span>
            </h1>
            
            <p className="text-slate-400 text-sm sm:text-base max-w-2xl leading-relaxed">
              Unlock our professional-grade telemetry playground, real-time trajectory simulation engines, custom aerospace database overlays, and SMS/Email notification alerts. Zero ads, unlimited high-fidelity telemetry syncs.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              {!isSubscribed ? (
                <button 
                  onClick={() => {
                    setSelectedPlan('annual');
                    setShowCheckout(true);
                  }}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-mono uppercase font-bold text-xs tracking-widest px-6 py-3.5 rounded-lg shadow-[0_4px_20px_rgba(255,107,43,0.3)] hover:shadow-[0_4px_25px_rgba(255,107,43,0.5)] transition-all flex items-center gap-2"
                >
                  <Sparkles size={14} />
                  Upgrade to Tracker Pro
                </button>
              ) : (
                <button 
                  onClick={handleCancelSubscription}
                  className="bg-transparent hover:bg-white/5 text-slate-400 hover:text-red-400 border border-white/10 hover:border-red-500/30 px-5 py-3.5 rounded-lg font-mono text-xs uppercase tracking-widest transition-all"
                >
                  Manage Subscription
                </button>
              )}
              <a 
                href="#interactive-suite"
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 px-5 py-3.5 rounded-lg font-mono text-xs uppercase tracking-widest transition-all flex items-center gap-2"
              >
                <Compass size={14} />
                Explore Demo Suite
              </a>
            </div>
          </div>

          <div className="flex-shrink-0 w-full md:w-80 space-y-3.5 bg-slate-900/40 p-5 rounded-2xl border border-white/10 relative overflow-hidden backdrop-blur-sm self-stretch flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-bl-full pointer-events-none" />
            
            <div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase font-semibold">LIVE ORBITAL FEEDS</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <div className="space-y-3.5 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">Alt (Orbit)</span>
                  <span className="font-mono text-xs text-cyan-300 font-bold">{liveAlt} km</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">Velocity</span>
                  <span className="font-mono text-xs text-amber-400 font-bold">{liveVel} km/h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">Prop Remaining</span>
                  <span className="font-mono text-xs text-white font-bold">{liveProp}%</span>
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-3 mt-4 text-[9px] text-slate-500 font-mono text-center">
              Real-time synchronization active for live operations.
            </div>
          </div>
        </section>

        {/* Pricing & Offer Options Grid (Hidden if Subscribed, but visible as plan information) */}
        {!isSubscribed && (
          <section className="grid md:grid-cols-2 gap-6 mt-2">
            <div className="bg-slate-950/80 border border-white/5 hover:border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all backdrop-blur-sm relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-mono font-bold text-white uppercase tracking-wider">Monthly Flight Plan</h3>
                    <p className="text-slate-400 text-xs mt-1">Flexible tracking for casual space buffs</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-mono font-bold text-white">$9.99</span>
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Monthly billing</span>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 space-y-3">
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <Check size={14} className="text-emerald-400 shrink-0" />
                    <span>Real-time custom drag-and-drop workspace layout</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <Check size={14} className="text-emerald-400 shrink-0" />
                    <span>Advanced launch telemetry & interactive trajectory simulation</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <Check size={14} className="text-emerald-400 shrink-0" />
                    <span>Personalized SMS & Email alerts for countdowns</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  setSelectedPlan('monthly');
                  setShowCheckout(true);
                }}
                className="mt-6 w-full py-2.5 rounded-lg border border-[#ff6b2b]/30 bg-transparent hover:bg-[#ff6b2b]/10 text-white font-mono uppercase font-bold text-xs tracking-wider transition-all"
              >
                Choose Monthly Plan
              </button>
            </div>

            <div className="bg-[#0b101a] border border-[#ff6b2b]/30 hover:border-[#ff6b2b]/50 rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all backdrop-blur-sm relative overflow-hidden shadow-[0_0_30px_rgba(255,107,43,0.05)]">
              <div className="absolute top-0 right-0 p-3 bg-gradient-to-l from-amber-500/20 to-orange-600/20 text-amber-400 font-mono text-[9px] uppercase font-black tracking-widest rounded-bl-xl border-l border-b border-white/10 select-none">
                Best Value Plan
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-mono font-bold text-[#ff6b2b] uppercase tracking-wider flex items-center gap-1.5">
                      Annual Commander
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">Deep analysis package for enthusiasts</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-mono font-bold text-white">$89.99</span>
                    <span className="text-[10px] text-[#ff6b2b] block uppercase font-mono font-bold">Save 25% annually</span>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 space-y-3">
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <Check size={14} className="text-amber-400 shrink-0" />
                    <span>Everything in Monthly Plan included</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <Check size={14} className="text-amber-400 shrink-0" />
                    <span>Premium booster turnaround and turnaround analysis datasets</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <Check size={14} className="text-amber-400 shrink-0" />
                    <span>Priority invitation slots to high-fidelity physical scale model giveaways</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  setSelectedPlan('annual');
                  setShowCheckout(true);
                }}
                className="mt-6 w-full py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-mono uppercase font-bold text-xs tracking-wider shadow-lg shadow-orange-600/10 transition-all"
              >
                Choose Annual Plan
              </button>
            </div>
          </section>
        )}

        {/* --- INTERACTIVE SUITE AREA --- */}
        <section id="interactive-suite" className="border-t border-white/5 pt-4 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-xl font-mono font-bold tracking-tight text-white uppercase">
                Interactive Playground Demo
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Experience high-fidelity, real-time calculations directly on your local simulation terminal.
              </p>
            </div>

            {/* Sub-tabs inside demo workspace */}
            <div className="flex rounded-lg bg-slate-950 p-1 border border-white/5">
              <button 
                onClick={() => setWorkspaceTab('telemetry')}
                className={`px-3.5 py-1.5 rounded-md font-mono text-[10px] uppercase tracking-wider font-bold transition-all ${
                  workspaceTab === 'telemetry' 
                    ? 'bg-gradient-to-r from-amber-500/10 to-orange-600/10 border border-[#ff6b2b]/30 text-[#ff6b2b]' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Trajectory Sim
              </button>
              <button 
                onClick={() => setWorkspaceTab('analytics')}
                className={`px-3.5 py-1.5 rounded-md font-mono text-[10px] uppercase tracking-wider font-bold transition-all ${
                  workspaceTab === 'analytics' 
                    ? 'bg-gradient-to-r from-amber-500/10 to-orange-600/10 border border-[#ff6b2b]/30 text-[#ff6b2b]' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Deep Analytics
              </button>
              <button 
                onClick={() => setWorkspaceTab('alerts')}
                className={`px-3.5 py-1.5 rounded-md font-mono text-[10px] uppercase tracking-wider font-bold transition-all ${
                  workspaceTab === 'alerts' 
                    ? 'bg-gradient-to-r from-amber-500/10 to-orange-600/10 border border-[#ff6b2b]/30 text-[#ff6b2b]' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Alert Dashboard
              </button>
            </div>
          </div>

          {/* Tab Content 1: Telemetry Trajectory Simulator */}
          {workspaceTab === 'telemetry' && (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Sliders Control Panel */}
              <div className="bg-slate-950 border border-white/5 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <Rocket className="text-[#ff6b2b] w-4 h-4" />
                    <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">Flight Simulator Controls</h3>
                  </div>

                  <div className="space-y-5 mt-5">
                    {/* Ascent Angle */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">Ascent Profile Angle</span>
                        <span className="text-cyan-400 font-bold">{ascentAngle}°</span>
                      </div>
                      <input 
                        type="range" 
                        min="20" 
                        max="85" 
                        value={ascentAngle} 
                        onChange={(e) => setAscentAngle(Number(e.target.value))}
                        className="w-full accent-[#ff6b2b] bg-slate-900 rounded-lg appearance-none h-1.5 cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                        <span>Low Trajectory (Flat)</span>
                        <span>High Trajectory (Vertical)</span>
                      </div>
                    </div>

                    {/* Fuel Load */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">Booster Fuel Mass</span>
                        <span className="text-amber-400 font-bold">{fuelLoad}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="50" 
                        max="100" 
                        value={fuelLoad} 
                        onChange={(e) => setFuelLoad(Number(e.target.value))}
                        className="w-full accent-[#ff6b2b] bg-slate-900 rounded-lg appearance-none h-1.5 cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                        <span>Min Reserve Load</span>
                        <span>Full Fuel Capacity</span>
                      </div>
                    </div>

                    {/* Payload Mass */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">Payload Delivery Weight</span>
                        <span className="text-white font-bold">{payloadMass} Tons</span>
                      </div>
                      <input 
                        type="range" 
                        min="2" 
                        max="30" 
                        value={payloadMass} 
                        onChange={(e) => setPayloadMass(Number(e.target.value))}
                        className="w-full accent-[#ff6b2b] bg-slate-900 rounded-lg appearance-none h-1.5 cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                        <span>Satellites (Light)</span>
                        <span>Heavy Cargo (Starship Tier)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 space-y-1 text-slate-400 font-mono text-[10px] mt-4">
                  <div className="text-[#ff6b2b] font-bold uppercase tracking-wider text-[11px] mb-1">Theoretical Limits</div>
                  <div>• Projected Max Alt: <strong className="text-white">{(simulatedTrajectoryData[simulatedTrajectoryData.length - 1].altitude * 1.08).toFixed(0)} km</strong></div>
                  <div>• Projected Orbit Speed: <strong className="text-white">{(simulatedTrajectoryData[simulatedTrajectoryData.length - 1].velocity * 1.04).toFixed(0)} km/h</strong></div>
                </div>
              </div>

              {/* Trajectory Plot Chart */}
              <div className="lg:col-span-2 bg-slate-950 border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="text-cyan-400 w-4 h-4" />
                      <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">Flight Trajectory Simulator</h3>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">CALCULATING RECURSIVE ODEs</span>
                  </div>

                  <div className="w-full h-64 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={simulatedTrajectoryData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorAlt" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00e7ff" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#00e7ff" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorVel" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ff7a18" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#ff7a18" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#121826" vertical={false} />
                        <XAxis 
                          dataKey="time" 
                          stroke="#475569" 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <YAxis 
                          yAxisId="left" 
                          stroke="#00e7ff" 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(v) => `${v}km`}
                        />
                        <YAxis 
                          yAxisId="right" 
                          orientation="right" 
                          stroke="#ff7a18" 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(v) => `${v}k`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', fontSize: '10px', color: '#f8fafc' }}
                          itemStyle={{ fontSize: '10px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />
                        <Area 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="altitude" 
                          name="Alt (km)" 
                          stroke="#00e7ff" 
                          fillOpacity={1} 
                          fill="url(#colorAlt)" 
                          strokeWidth={2}
                        />
                        <Area 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="velocity" 
                          name="Vel (km/h)" 
                          stroke="#ff7a18" 
                          fillOpacity={1} 
                          fill="url(#colorVel)" 
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/5 pt-4 text-xs text-slate-500 font-mono gap-2">
                  <span>🚀 Physics simulation models assume drag curves & standard gravity calculations.</span>
                  {!isSubscribed && (
                    <button 
                      onClick={() => setShowCheckout(true)}
                      className="text-amber-400 hover:text-[#ff6b2b] flex items-center gap-1 font-bold animate-pulse text-[11px] uppercase tracking-wider bg-transparent border-0 outline-none cursor-pointer"
                    >
                      Unlock Starship Heavy Presets ↗
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 2: Turnaround / Aerospace Metrics */}
          {workspaceTab === 'analytics' && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Booster Reuse Counts */}
              <div className="bg-slate-950 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="text-[#ff6b2b] w-4 h-4" />
                    <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">Top Falcon Booster Launches</h3>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">ACTIVE REUSABILITY DECOYS</span>
                </div>

                <div className="w-full h-64 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={boosterReuseData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#121826" vertical={false} />
                      <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', fontSize: '10px', color: '#f8fafc' }}
                      />
                      <Bar dataKey="launches" name="Total Launch Flights" fill="#ff6b2b" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 p-3 bg-slate-900/60 rounded-xl border border-white/5 text-slate-400 font-mono text-[10px] leading-relaxed">
                  Falcon 9 Block 5 booster <strong className="text-white">B1062</strong> currently holds the record for highest launches at <strong className="text-amber-400">23 successful missions</strong>, followed closely by veterans B1058 and B1060.
                </div>
              </div>

              {/* Turnaround Time Stats */}
              <div className="bg-slate-950 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="text-cyan-400 w-4 h-4" />
                    <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">Average Re-flight Turnaround</h3>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono font-bold text-cyan-400">DECREASED BY 83%</span>
                </div>

                <div className="w-full h-64 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={turnaroundMetrics} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorDays" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00e7ff" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#00e7ff" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#121826" vertical={false} />
                      <XAxis dataKey="year" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}d`} />
                      <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', fontSize: '10px' }} />
                      <Area type="monotone" dataKey="avgDays" name="Average Turnaround (Days)" stroke="#00e7ff" fillOpacity={1} fill="url(#colorDays)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 p-3 bg-slate-900/60 rounded-xl border border-white/5 text-slate-400 font-mono text-[10px] leading-relaxed">
                  Turnaround engineering improvements have crushed flight intervals from over 50 days in 2020 down to an average of just <strong className="text-cyan-400">9 days turnaround per launch pad cycle</strong> in 2026.
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 3: Alerts Dashboard Config */}
          {workspaceTab === 'alerts' && (
            <div className="bg-slate-950 border border-white/5 rounded-2xl p-6 max-w-2xl mx-auto w-full">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Bell className="text-[#ff6b2b] w-4.5 h-4.5" />
                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">Configure Telemetry Alerts</h3>
              </div>

              <form onSubmit={saveAlertSettings} className="space-y-5 mt-5">
                <p className="text-xs text-slate-400 leading-relaxed font-mono">
                  Enter your communication channels to sync telemetry alerts directly to your phone or desktop inbox.
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">Transmission Email Address</label>
                    <input 
                      type="email" 
                      placeholder="commander@spacex.com" 
                      value={alertEmail}
                      onChange={(e) => setAlertEmail(e.target.value)}
                      className="w-full bg-[#030712] border border-white/10 rounded-lg py-2 px-3 text-xs font-mono text-[#00e7ff] placeholder:text-slate-600 focus:border-cyan-400 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">Datalink Mobile Number</label>
                    <input 
                      type="tel" 
                      placeholder="+1 (555) 012-3456" 
                      value={alertPhone}
                      onChange={(e) => setAlertPhone(e.target.value)}
                      className="w-full bg-[#030712] border border-white/10 rounded-lg py-2 px-3 text-xs font-mono text-[#00e7ff] placeholder:text-slate-600 focus:border-cyan-400 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3.5 border-t border-white/5 pt-4">
                  <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold block">Active Watchlist Triggers</label>
                  
                  <div className="grid sm:grid-cols-2 gap-3.5">
                    <label className="flex items-center gap-2.5 p-2 rounded-lg bg-[#030712] border border-white/5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={alertTriggers.launchImminent}
                        onChange={(e) => setAlertTriggers(prev => ({ ...prev, launchImminent: e.target.checked }))}
                        className="rounded border-white/10 text-[#ff6b2b] focus:ring-0 w-3.5 h-3.5"
                      />
                      <span className="text-xs font-mono text-slate-300">T-5m Launch Countdown</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 rounded-lg bg-[#030712] border border-white/5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={alertTriggers.boosterLanding}
                        onChange={(e) => setAlertTriggers(prev => ({ ...prev, boosterLanding: e.target.checked }))}
                        className="rounded border-white/10 text-[#ff6b2b] focus:ring-0 w-3.5 h-3.5"
                      />
                      <span className="text-xs font-mono text-slate-300">Booster Re-entry Burn</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 rounded-lg bg-[#030712] border border-white/5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={alertTriggers.orbitInsertion}
                        onChange={(e) => setAlertTriggers(prev => ({ ...prev, orbitInsertion: e.target.checked }))}
                        className="rounded border-white/10 text-[#ff6b2b] focus:ring-0 w-3.5 h-3.5"
                      />
                      <span className="text-xs font-mono text-slate-300">Orbit Insertion Success</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2 rounded-lg bg-[#030712] border border-white/5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={alertTriggers.weatherAnomaly}
                        onChange={(e) => setAlertTriggers(prev => ({ ...prev, weatherAnomaly: e.target.checked }))}
                        className="rounded border-white/10 text-[#ff6b2b] focus:ring-0 w-3.5 h-3.5"
                      />
                      <span className="text-xs font-mono text-slate-300">Forecast / Pad Hold Alert</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  {alertsSaved ? (
                    <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 font-bold">
                      <Check size={14} />
                      Alert settings stored successfully!
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">
                      * Preferences are securely cached locally.
                    </span>
                  )}

                  <button 
                    type="submit"
                    className="bg-[#ff6b2b]/10 hover:bg-[#ff6b2b]/20 text-[#ff6b2b] border border-[#ff6b2b]/50 px-5 py-2 rounded font-mono text-[10px] uppercase tracking-wider font-bold transition-all flex items-center gap-1.5"
                  >
                    <Send size={11} />
                    Sync Preferences
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>

        {/* Footer with branding matches lower layouts */}
        <footer className="mt-auto border-t border-white/5 pt-6 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <Award size={14} className="text-[#ff6b2b]" />
            <span>SpaceX Telemetry Explorer Suite</span>
          </div>
          <div>
            <span>Vector One Labs AI Framework © 2026</span>
          </div>
        </footer>
      </div>

      {/* --- PAYMENT CHECKOUT MODAL SHOW --- */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0b101a] border border-[#ff6b2b]/40 rounded-2xl overflow-hidden w-full max-w-md shadow-[0_0_50px_rgba(255,107,43,0.15)] relative">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-amber-500 to-orange-600" />
            
            <div className="p-6">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="text-[#ff6b2b] w-4.5 h-4.5" />
                  <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">Secure Transmission Gateway</h3>
                </div>
                <button 
                  onClick={() => setShowCheckout(false)}
                  className="text-slate-400 hover:text-white bg-transparent border-0 outline-none text-xs uppercase font-mono tracking-widest font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 mt-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#ff6b2b] font-mono uppercase tracking-widest block font-bold">Selected Subscription Plan</span>
                  <span className="text-xs font-mono font-bold text-white mt-0.5 inline-block">
                    {selectedPlan === 'monthly' ? 'Tracker Pro Monthly Plan' : 'Tracker Pro Annual Commander'}
                  </span>
                </div>
                <span className="font-mono text-sm font-bold text-[#00e7ff]">
                  {selectedPlan === 'monthly' ? '$9.99' : '$89.99'}
                </span>
              </div>

              <form onSubmit={handleCheckoutSubmit} className="space-y-4 mt-4">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Commander Full Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Gene Kranz" 
                    value={checkoutName}
                    onChange={(e) => setCheckoutName(e.target.value)}
                    className="w-full bg-[#030712] border border-white/10 rounded-lg py-2 px-3 text-xs font-mono text-[#00e7ff] placeholder:text-slate-700 focus:border-cyan-400 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Datalink Email</label>
                  <input 
                    type="email" 
                    required
                    placeholder="kranz@houston.nasa.gov" 
                    value={checkoutEmail}
                    onChange={(e) => setCheckoutEmail(e.target.value)}
                    className="w-full bg-[#030712] border border-white/10 rounded-lg py-2 px-3 text-xs font-mono text-[#00e7ff] placeholder:text-slate-700 focus:border-cyan-400 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Card Number (Mock Security)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required
                      placeholder="4000 1234 5678 9010" 
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-[#030712] border border-white/10 rounded-lg py-2 px-3 text-xs font-mono text-[#00e7ff] placeholder:text-slate-700 focus:border-cyan-400 outline-none pr-8"
                    />
                    <CreditCard size={14} className="absolute right-2.5 top-2.5 text-slate-600" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Expiry Date</label>
                    <input 
                      type="text" 
                      required
                      placeholder="MM/YY" 
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full bg-[#030712] border border-white/10 rounded-lg py-2 px-3 text-xs font-mono text-[#00e7ff] placeholder:text-slate-700 focus:border-cyan-400 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">CVV (Secure Code)</label>
                    <input 
                      type="text" 
                      required
                      placeholder="321" 
                      maxLength={3}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full bg-[#030712] border border-white/10 rounded-lg py-2 px-3 text-xs font-mono text-[#00e7ff] placeholder:text-slate-700 focus:border-cyan-400 outline-none"
                    />
                  </div>
                </div>

                <div className="text-[9px] text-slate-500 font-mono flex items-start gap-1.5 leading-relaxed bg-slate-900/30 p-2.5 rounded-lg border border-white/5 mt-2">
                  <Shield size={12} className="text-[#ff6b2b] shrink-0 mt-0.5" />
                  <span>Secure mock SSL telemetry handshake active. Mock testing. No real money will be charged.</span>
                </div>

                <button 
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 mt-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-mono uppercase font-bold text-xs tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(255,107,43,0.2)]"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Securing Handshake...
                    </>
                  ) : (
                    <>
                      <Lock size={12} />
                      Complete Transmission Upgrade
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
