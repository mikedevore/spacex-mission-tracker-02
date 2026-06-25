
import React from "react";
import { Shield, Star, Gauge, Target, Rocket, Globe, Twitter, Youtube, Instagram, Camera, DownloadCloud } from "lucide-react";
import { TrajectoryChart } from "./TrajectoryChart";

interface LowerFeaturesProps {
  lowerTab: string;
  news: any[];
  giveawayName: string;
  setGiveawayName: (v: string) => void;
  giveawayEmail: string;
  setGiveawayEmail: (v: string) => void;
  giveawayEntries: any[];
  currentWinner: string;
  handleGiveawaySubmit: (e: any) => void;
  handleDrawWinner: () => void;
  needsAuth: boolean;
  isLoggingIn: boolean;
  isBackingUp: boolean;
  handleLogin: () => void;
  handleBackupToDrive: () => void;
}

export default function LowerFeaturesArea({
  lowerTab,
  news,
  giveawayName,
  setGiveawayName,
  giveawayEmail,
  setGiveawayEmail,
  giveawayEntries,
  currentWinner,
  handleGiveawaySubmit,
  handleDrawWinner,
  needsAuth,
  isLoggingIn,
  isBackingUp,
  handleLogin,
  handleBackupToDrive
}: LowerFeaturesProps) {
  return (
    <>
      <div id="lower-features-area">
        {lowerTab === 'news' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <section className="mission-intel-news">
              <div className="flex border-b border-cyan-500/18 pb-2 mt-[-5px] mb-4 gap-3 items-start justify-between">
                <div>
                  <h2 className="m-0 text-base tracking-[0.16em] uppercase text-white shadow-none" style={{ fontFamily: '"Space Grotesk", sans-serif', textShadow: '0 0 12px rgba(127, 220, 255, 0.5)' }}>Spaceflight News API Feed</h2>
                  <p className="m-0 mt-1.5 text-[#88a7b8] text-[13px] leading-[1.45]" style={{ fontFamily: 'Inter, sans-serif' }}>Filtered for SpaceX, Starship, Falcon, Raptor, and Starlink mission intelligence.</p>
                </div>
                <a className="whitespace-nowrap px-[14px] py-[6px] shrink-0 border border-[rgba(0,231,255,0.3)] bg-transparent text-[#00e7ff] hover:bg-[rgba(0,231,255,0.1)] hover:text-[#fff] text-[11px] uppercase tracking-[0.15em] font-semibold transition-colors duration-200 uppercase inline-block rounded" href="https://www.spacex.com/updates/" target="_blank" rel="noopener noreferrer">SpaceX Updates ↗</a>
              </div>
              <div id="intelNewsGrid" className="news-intel-grid">
                {news.slice(0, 9).map((article) => {
                  const site = article.news_site || "NASA Spaceflight";
                  const title = article.title || "Spaceflight Mission Highlight";
                  const date = new Date(article.published_at || article.publishedAt || article.updated_at || article.published || Date.now()).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
                  const infoRaw = article.summary || "Latest development notes on SpaceX Falcon booster recoveries and launchpad operations.";
                  const info = infoRaw.length > 150 ? infoRaw.substring(0, 150) + "…" : infoRaw;
                  const imageUrl = article.image_url || article.imageUrl;
                  return (
                    <div key={article.id} className="news-intel-card" style={{ padding: imageUrl ? "12px" : "16px" }}>
                      {imageUrl && (
                        <a href={article.url || "https://www.spacex.com/"} target="_blank" rel="noopener noreferrer" className="news-intel-card-image mb-3 block overflow-hidden rounded-lg border border-white/10 opacity-80 hover:opacity-100 transition-opacity">
                          <img src={imageUrl} alt={title} className="w-full h-[140px] object-cover" loading="lazy" />
                        </a>
                      )}
                      <div className="flex-1 flex flex-col justify-between" style={{ padding: imageUrl ? "0 4px" : "0" }}>
                        <div>
                          <h3>{title}</h3>
                          <div className="news-meta">{site} • {date}</div>
                          <p style={{ color: "var(--muted)", fontSize: "13px", lineHeight: "1.45" }}>{info}</p>
                        </div>
                        <a href={article.url || "https://www.spacex.com/"} target="_blank" rel="noopener noreferrer" style={{ marginTop: imageUrl ? "12px" : "0" }}>
                          Read Article
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Ad Placeholders for Future Monetization */}
            <section className="ad-placeholders-section">
              <div className="ad-placeholders-grid">
                <div className="ad-cell">
                  <span>Future Advertising Block</span>
                </div>
                <div className="ad-cell">
                  <span>Future Advertising Block</span>
                </div>
                <div className="ad-cell">
                  <span>Future Advertising Block</span>
                </div>
              </div>
            </section>
          </div>
        )}

        {lowerTab === 'giveaway' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Falcon Heavy die-cast giveaway module */}
            <section className="weekly-giveaway">
              <div className="weekly-giveaway-title">
                <div>
                  <h2>Falcon Heavy Desktop Mockup Giveaway</h2>
                  <p>Submit your transmission credentials to enter the queue for our monthly hand-crafted aerospace display drawing. Completely offline persistent state storage.</p>
                </div>
              </div>
              <form id="giveawayForm" className="giveaway-form" onSubmit={handleGiveawaySubmit}>
                <div>
                  <label htmlFor="gwName">Transmission Name</label>
                  <input 
                    type="text" 
                    id="gwName" 
                    placeholder="Contestant Identifier" 
                    required 
                    value={giveawayName}
                    onChange={(e) => setGiveawayName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="gwEmail">Datalink Address</label>
                  <input 
                    type="email" 
                    id="gwEmail" 
                    placeholder="you@domain.com" 
                    required 
                    value={giveawayEmail}
                    onChange={(e) => setGiveawayEmail(e.target.value)}
                  />
                </div>
                <button type="submit">Add Contestant</button>
              </form>

              {/* Winner Draw Display box */}
              <div className="last-winner-box">
                <div>
                  <span>Latest Monthly Drawing Winner</span>
                  <strong id="winnerDisplay">{currentWinner}</strong>
                  {giveawayEntries.length > 0 && (
                    <small style={{ color: "var(--muted)", fontStyle: "italic", marginTop: "2px", display: "inline-block" }}>
                      Active queue has {giveawayEntries.length} registrants inside.
                    </small>
                  )}
                </div>
                <button 
                  type="button" 
                  onClick={handleDrawWinner} 
                  style={{ width: "auto", padding: "11px 18px" }}
                >
                  Draw Winner
                </button>
              </div>
              <p className="giveaway-note">* Winners are chosen directly from the local entries list. Records persist in the browser Cache.</p>
            </section>
          </div>
        )}

        {lowerTab === 'premium' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 w-full max-w-5xl mx-auto px-4 sm:px-6 mt-8">
            <div className="bg-[#0b101a] border border-[#ff6b2b]/30 shadow-[0_0_40px_rgba(255,107,43,0.05)] rounded-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Shield size={200} />
              </div>
              <div className="p-8 sm:p-12 relative z-10 border-b border-white/5 bg-gradient-to-br from-[#121826] to-transparent">
                <div className="flex items-center gap-3 mb-4 text-[#ff6b2b] font-space tracking-widest text-sm uppercase font-bold">
                  <Star size={18} className="animate-pulse" />
                  Premium Subscription Tier
                </div>
                <h2 className="text-3xl sm:text-5xl font-mono tracking-tighter text-white font-bold mb-4">
                  Mission Tracker <span className="text-[#ff6b2b]">Pro</span>
                </h2>
                <p className="text-slate-400 text-base sm:text-lg max-w-2xl leading-relaxed">
                  A premium tier designed for hardcore space enthusiasts, aerospace students, and industry professionals. Unlock deep technical data, real-time advanced telemetry, and personalized tracking features.
                </p>
                <div className="mt-8">
                  <button className="bg-[#ff6b2b]/10 hover:bg-[#ff6b2b]/20 text-[#ff6b2b] border border-[#ff6b2b]/50 px-6 py-3 rounded uppercase font-space text-sm tracking-widest font-bold transition-colors">
                    Join Waiting List
                  </button>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-px bg-white/5">
                <div className="bg-[#0b101a] p-8 sm:p-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-blue-500/10 rounded border border-blue-500/20 text-blue-400">
                      <Gauge size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Advanced Control Center</h3>
                  </div>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <Target size={16} className="text-slate-500 mt-1 shrink-0" />
                      <span className="text-slate-300"><strong className="text-white">Custom Layouts:</strong> Draggable, resizable widgets allowing users to build their own personalized Mission Control view.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Target size={16} className="text-slate-500 mt-1 shrink-0" />
                      <span className="text-slate-300"><strong className="text-white">Multi-Mission:</strong> Ability to track multiple simultaneous historical or upcoming missions side-by-side.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Target size={16} className="text-slate-500 mt-1 shrink-0" />
                      <span className="text-slate-300"><strong className="text-white">Ad-Free Experience:</strong> A clean, premium environment without advertising interruptions.</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-[#0b101a] p-8 sm:p-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-purple-500/10 rounded border border-purple-500/20 text-purple-400">
                      <Globe size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Trajectory Projections</h3>
                  </div>
                  
                  {/* Trajectory Simulation Widget for Pro Showcase */}
                  <div className="mb-6 pointer-events-none opacity-80" style={{ filter: 'grayscale(0.5)' }}>
                    <TrajectoryChart id="pro_preview" flightNumber={100} />
                  </div>

                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <Target size={16} className="text-slate-500 mt-1 shrink-0" />
                      <span className="text-slate-300"><strong className="text-white">Trajectory Simulations:</strong> Accurate flight path predictions and post-launch trajectory analysis.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Target size={16} className="text-slate-500 mt-1 shrink-0" />
                      <span className="text-slate-300"><strong className="text-white">Mission Timelines:</strong> Advanced sequence of events estimations for future launches.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Target size={16} className="text-slate-500 mt-1 shrink-0" />
                      <span className="text-slate-300"><strong className="text-white">Historical Profiling:</strong> Visual breakdowns and charts of past flight profiles.</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-[#0b101a] p-8 sm:p-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-emerald-500/10 rounded border border-emerald-500/20 text-emerald-400">
                      <Rocket size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Deep Analytics</h3>
                  </div>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <Target size={16} className="text-slate-500 mt-1 shrink-0" />
                      <span className="text-slate-300"><strong className="text-white">Rocket Metrics:</strong> Deep dives into booster reusability history, turnaround times, and payload capacity.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Target size={16} className="text-slate-500 mt-1 shrink-0" />
                      <span className="text-slate-300"><strong className="text-white">Proactive Alerts:</strong> SMS/email notifications for specific mission events (e.g., T-10 mins, weather changes).</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Target size={16} className="text-slate-500 mt-1 shrink-0" />
                      <span className="text-slate-300"><strong className="text-white">Launch Weather:</strong> Advanced localized forecasting modeling for targeted launch windows.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        </div>

        {/* SpaceX Media & Social Network hub */}
        <section className="social-hub">
          <div className="social-hub-title">
            <h2>Mission Social Network</h2>
            <span className="badge">CHANNELS</span>
          </div>
          <div id="socialHubGrid" className="social-grid social-logo-grid">
            <a className="social-card social-logo-card space-x-logo" href="https://www.spacex.com/" target="_blank" rel="noopener noreferrer" style={{ justifyContent: "center" }}>
              <Globe style={{ width: "24px", height: "auto" }} />
            </a>
            <a className="social-card social-logo-card x-logo" href="https://x.com/SpaceX" target="_blank" rel="noopener noreferrer" style={{ justifyContent: "center" }}>
              <Twitter style={{ width: "24px", height: "auto" }} />
            </a>
            <a className="social-card social-logo-card youtube-logo" href="https://www.youtube.com/@SpaceX" target="_blank" rel="noopener noreferrer" style={{ justifyContent: "center" }}>
              <Youtube style={{ width: "24px", height: "auto" }} />
            </a>
            <a className="social-card social-logo-card instagram-logo" href="https://www.instagram.com/spacex/" target="_blank" rel="noopener noreferrer" style={{ justifyContent: "center" }}>
              <Instagram style={{ width: "24px", height: "auto" }} />
            </a>
            <a className="social-card social-logo-card flickr-logo" href="https://www.flickr.com/photos/spacex/" target="_blank" rel="noopener noreferrer" style={{ justifyContent: "center" }}>
              <Camera style={{ width: "24px", height: "auto" }} />
            </a>
          </div>
        </section>

        {/* Drive Data Sync Section */}
        <section className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 md:p-8 mt-12 w-[min(1400px,94vw)] mx-auto shadow-lg relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-cyan-400 to-blue-600 shadow-[0_0_10px_rgba(0,231,255,0.4)]"></div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex-1">
              <h2 className="text-xl font-space font-medium text-white mb-2 flex items-center gap-2">
                <DownloadCloud className="w-5 h-5 text-cyan-400" />
                System Source Backup
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
                Securely stream a local working copy of the current Mission Control transmission directly to your Google Drive ecosystem. Data transfers require active Google Workspace credentials to proceed.
              </p>
            </div>
            <div className="flex-shrink-0 w-full md:w-auto">
              {needsAuth ? (
                 <button 
                   onClick={handleLogin}
                   disabled={isLoggingIn}
                   className="w-full md:w-auto gsi-material-button bg-white hover:bg-slate-50 transition-colors rounded-md shadow-md border border-slate-200 p-1 flex items-center pr-4 disabled:opacity-50"
                 >
                   <div className="p-2 bg-white rounded-l-md mr-3">
                     <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 block">
                       <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                       <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                       <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                       <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                       <path fill="none" d="M0 0h48v48H0z"></path>
                     </svg>
                   </div>
                   <span className="font-roboto text-sm font-medium text-slate-600 tracking-wide">
                     {isLoggingIn ? "Authenticating..." : "Sign in with Google"}
                   </span>
                 </button>
              ) : (
                 <button 
                   onClick={handleBackupToDrive}
                   disabled={isBackingUp}
                   className="w-full md:w-auto bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(0,231,255,0.2)] hover:shadow-[0_0_25px_rgba(0,231,255,0.4)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                 >
                   <DownloadCloud className={`w-4 h-4 ${isBackingUp ? 'animate-bounce' : ''}`} />
                   {isBackingUp ? "Transmitting..." : "Push to Google Drive"}
                 </button>
              )}
            </div>
          </div>
        </section>

        {/* Dynamic Vector One Labs© subtler branding footer */}
        <footer className="vector-footer-logo-row pb-8">
          <img 
            src={`/vector_labs_logo.png?v=${Date.now()}`}
            alt="Vector One Labs AI Logo" 
            referrerPolicy="no-referrer"
          />
        </footer>
      </>
  );
}
