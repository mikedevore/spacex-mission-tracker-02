import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rocket, Clock, MapPin, Info, ArrowRight } from 'lucide-react';

interface AnimatedMissionHeroProps {
  mission: any;
  onSelect: (mission: any) => void;
}

export default function AnimatedMissionHero({ mission, onSelect }: AnimatedMissionHeroProps) {
  const [hovered, setHovered] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!mission?.date_utc) return;
    const targetDate = new Date(mission.date_utc).getTime();
    
    const calculateTimeLeft = () => {
      const now = Date.now();
      const diff = targetDate - now;
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [mission]);

  if (!mission) return null;

  const title = mission.name || "Unknown Mission";
  const patchImg = mission.links?.patch?.large || mission.links?.patch?.small;
  const site = mission.launchpad ? "LC-39A (Assumed)" : "TBD"; // We'll just use a fallback if not quickly available

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="w-full relative mt-6 mb-8 group cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(mission)}
    >
      {/* Dynamic Background Glow */}
      <div className="absolute inset-0 bg-[#00e7ff]/5 blur-xl group-hover:bg-[#00e7ff]/20 transition-all duration-700 ease-out rounded-3xl" />
      
      <div className="relative border border-[#00e7ff]/20 bg-[#0b101a]/80 backdrop-blur-md rounded-2xl p-6 sm:p-10 overflow-hidden shadow-[0_0_30px_rgba(0,231,255,0.05)] group-hover:shadow-[0_0_50px_rgba(0,231,255,0.15)] transition-all duration-700">
        
        {/* Subtle grid pattern background */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#00e7ff]/30 to-transparent" />
        
        {/* Animated Accent Line */}
        <motion.div 
          initial={{ scaleX: 0 }}
          animate={{ scaleX: hovered ? 1 : 0.3 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute top-0 left-0 h-[2px] bg-[#00e7ff] origin-left rounded-tr-full w-full"
        />

        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          
          {/* Mission Patch / Image Container */}
          <motion.div 
            animate={{ scale: hovered ? 1.05 : 1, rotate: hovered ? 2 : 0 }}
            transition={{ duration: 0.5 }}
            className="w-32 h-32 md:w-48 md:h-48 shrink-0 rounded-full border border-white/5 bg-black/40 flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]"
          >
            {patchImg ? (
              <img src={patchImg} alt={title} className="w-[85%] h-[85%] object-contain" />
            ) : (
              <Rocket className="w-16 h-16 text-[#00e7ff]/30" />
            )}
          </motion.div>

          <div className="flex flex-col flex-1 w-full text-center md:text-left">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center md:justify-start gap-3 mb-2"
            >
              <span className="px-3 py-1 bg-[#00e7ff]/10 border border-[#00e7ff]/30 rounded text-[#00e7ff] text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
                <Rocket size={12} /> Next Mission
              </span>
              <span className="text-slate-400 text-xs font-mono tracking-wider flex items-center gap-1">
                <MapPin size={12} /> Pending Site
              </span>
            </motion.div>
            
            <h2 className="text-3xl md:text-5xl font-mono text-white font-bold tracking-tighter mb-4 shadow-sm" style={{ textShadow: "0 0 20px rgba(255,255,255,0.1)" }}>
              {title}
            </h2>
            
            {/* Countdown Grid */}
            <div className="flex justify-center md:justify-start gap-3 md:gap-5 mb-6">
              {[
                { label: 'Days', value: timeLeft.days },
                { label: 'Hours', value: timeLeft.hours },
                { label: 'Minutes', value: timeLeft.minutes },
                { label: 'Seconds', value: timeLeft.seconds }
              ].map((item, idx) => (
                <div key={item.label} className="flex flex-col items-center">
                  <div className="bg-[#121826]/80 border border-white/10 px-3 py-2 md:px-4 md:py-3 rounded bg-gradient-to-b from-[#1a2235] to-[#0b101a] min-w-[50px] md:min-w-[70px]">
                    <span className="block text-xl md:text-3xl font-mono text-white text-center tracking-tight">
                      {String(item.value).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="text-[9px] md:text-[10px] text-slate-500 uppercase tracking-widest mt-2">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button className="flex items-center gap-2 px-6 py-3 bg-[#00e7ff]/10 hover:bg-[#00e7ff]/20 border border-[#00e7ff]/40 text-[#00e7ff] rounded uppercase font-space text-[11px] tracking-widest font-bold transition-all shadow-[0_0_15px_rgba(0,231,255,0.1)] hover:shadow-[0_0_25px_rgba(0,231,255,0.2)]">
                <Info size={14} /> Mission Details
              </button>
              
              <div className="text-slate-500 font-mono text-xs flex items-center gap-2">
                <motion.div
                  animate={{ x: hovered ? 5 : 0 }}
                  transition={{ repeat: Infinity, duration: 1, repeatType: "reverse" }}
                >
                  <ArrowRight size={14} className="text-[#00e7ff]/50" />
                </motion.div>
                Click to explore core data
              </div>
            </div>

          </div>
        </div>
      </div>
    </motion.div>
  );
}
