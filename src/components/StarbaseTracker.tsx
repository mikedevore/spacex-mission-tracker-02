import { useEffect, useState } from 'react';
import { Map, Rocket, AlertTriangle, Compass, MonitorPlay, Zap } from 'lucide-react';

export function StarbaseTracker() {
  const [data, setData] = useState<any>(null);
  const [pastData, setPastData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [upRes, pastRes] = await Promise.all([
          fetch("https://lldev.thespacedevs.com/2.3.0/launches/upcoming/?search=Starship&limit=1&mode=detailed"),
          fetch("https://lldev.thespacedevs.com/2.3.0/launches/previous/?search=Starship&limit=1&mode=detailed")
        ]);
        const upJson = await upRes.json();
        const pastJson = await pastRes.json();

        if (upJson.results && upJson.results.length > 0) {
          setData(upJson.results[0]);
        }
        if (pastJson.results && pastJson.results.length > 0) {
          setPastData(pastJson.results[0]);
        }
      } catch(e) {
        console.error("Starbase tracker error", e);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <section className="panel mt-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/10 to-transparent animate-pulse" />
        <div className="panel-title relative z-10">
          <div>
            <small>Facility Status</small>
            <h2>Starbase Tracker</h2>
          </div>
          <span className="badge">SYNCING...</span>
        </div>
        <div className="p-8 text-center text-cyan-400 font-mono text-xs animate-pulse">ESTABLISHING CONNECTION TO STARBASE API...</div>
      </section>
    );
  }

  // Safe destructuring
  const upcoming = data || pastData;
  if (!upcoming) return null;

  const launchName = upcoming.name;
  const tbd = upcoming.status?.id === 2;
  const netDate = upcoming.net ? new Date(upcoming.net).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "TBD";
  const statusName = upcoming.status?.name || "Unknown";
  
  // Extract Ship and Booster if present
  const boosterStr = upcoming.rocket?.launcher_stage?.[0]?.launcher?.serial_number || "Super Heavy Booster";
  const shipStr = upcoming.rocket?.spacecraft_stage?.[0]?.spacecraft?.serial_number || "Starship Upper Stage";
  const description = upcoming.mission?.description || "Awaiting mission parameters...";

  return (
    <section className="panel mt-4 overflow-hidden relative border-t-2 border-t-cyan-500/50">
      {upcoming.image?.image_url && (
        <div 
          className="absolute right-0 top-0 w-1/2 h-full opacity-10 pointer-events-none mix-blend-screen"
          style={{
             backgroundImage: `url(${upcoming.image.image_url})`,
             backgroundSize: 'cover',
             backgroundPosition: 'right center',
             maskImage: 'linear-gradient(to left, black 20%, transparent)',
             WebkitMaskImage: 'linear-gradient(to left, black 20%, transparent)'
          }}
        />
      )}

      <div className="panel-title relative z-10 border-b border-cyan-500/20 pb-3 mb-4">
        <div>
          <small className="text-cyan-400 flex items-center gap-1.5"><Map className="w-3.5 h-3.5" /> Boca Chica, Texas</small>
          <h2>Starbase Live Tracker</h2>
        </div>
        <span className="badge flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400" /> {tbd ? "DEVELOPMENT" : "ACTIVE CAMPAIGN"}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        
        <div className="md:col-span-2 space-y-4">
          <div className="bg-black/40 border border-slate-800 rounded-xl p-5 w-full text-left">
            <h3 className="font-space text-lg text-white mb-2 uppercase tracking-wide flex items-center gap-2">
              <Rocket className="w-5 h-5 text-cyan-400" />
              {launchName}
            </h3>
            <p className="text-slate-300 font-sans text-sm leading-relaxed mb-4">
              {description}
            </p>

            <div className="flex gap-4">
               <div>
                  <span className="block text-[10px] text-cyan-500 font-mono tracking-widest uppercase mb-1">Target Launch</span>
                  <span className="font-mono text-white text-sm bg-slate-900 border border-slate-700 px-2.5 py-1 rounded">
                    {tbd ? "NET " + netDate : netDate}
                  </span>
               </div>
               <div>
                  <span className="block text-[10px] text-cyan-500 font-mono tracking-widest uppercase mb-1">Status</span>
                  <span className="font-mono text-amber-400 text-sm bg-amber-950/30 border border-amber-900/50 px-2.5 py-1 rounded uppercase">
                    {statusName}
                  </span>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="bg-slate-900/50 border border-cyan-900/40 rounded-xl p-4 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-16 h-full bg-gradient-to-l from-slate-800/30 to-transparent pointer-events-none" />
              <strong className="block text-cyan-200 font-space uppercase text-sm mb-1 z-10 relative">Flight Vehicle 1</strong>
              <div className="font-mono text-xl text-white tracking-tight z-10 relative">{boosterStr}</div>
              <small className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mt-2 block z-10 relative">Main Booster Stage</small>
            </div>
            
            <div className="bg-slate-900/50 border border-blue-900/40 rounded-xl p-4 relative overflow-hidden">
               <div className="absolute right-0 top-0 w-16 h-full bg-gradient-to-l from-slate-800/30 to-transparent pointer-events-none" />
               <strong className="block text-blue-200 font-space uppercase text-sm mb-1 z-10 relative">Flight Vehicle 2</strong>
               <div className="font-mono text-xl text-white tracking-tight z-10 relative">{shipStr}</div>
               <small className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mt-2 block z-10 relative">Orbital Ship Layout</small>
            </div>
          </div>
        </div>

        <div className="col-span-1 flex flex-col gap-4 text-left">
          <div className="bg-black/60 border border-red-900/30 rounded-xl p-4">
             <div className="font-mono text-[10px] text-red-400 flex items-center gap-2 mb-2 uppercase tracking-widest">
               <AlertTriangle className="w-3.5 h-3.5" />
               Highway Restrictions
             </div>
             <p className="text-white text-sm font-sans">
               Check local Cameron County road closures for HWY 4 access to Boca Chica Beach. Expected restrictions leading up to tests.
             </p>
          </div>
          
          <div className="bg-black/60 border border-slate-800 rounded-xl p-4 flex-1 flex flex-col justify-between">
             <div>
               <div className="font-mono text-[10px] text-slate-400 flex items-center gap-2 mb-2 uppercase tracking-widest">
                 <Compass className="w-3.5 h-3.5" />
                 Launch Site
               </div>
               <strong className="text-white block font-space text-lg mb-1">Orbital Launch Mount</strong>
               <div className="text-slate-500 font-mono text-xs border-b border-slate-800 pb-3 mb-3">Starbase, Texas</div>
             </div>
             
             {upcoming.pad?.map_url && (
               <a href={upcoming.pad.map_url} target="_blank" rel="noopener noreferrer" className="bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-slate-300 p-2.5 rounded text-center text-xs font-mono tracking-wider transition-colors inline-flex justify-center items-center gap-2">
                 <MonitorPlay className="w-4 h-4" />
                 Open Map View
               </a>
             )}
          </div>
        </div>

      </div>
    </section>
  );
}
