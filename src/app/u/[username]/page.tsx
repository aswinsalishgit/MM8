"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { 
  User, MapPin, Zap, MessageSquare, ChevronLeft, 
  ShieldCheck, Star, Trophy, Flame, CheckCircle2,
  Globe, Briefcase, Award, TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";

export default function PublicProfile() {
  const { username } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();
      
      if (data) setProfile(data);
      setLoading(false);
    };
    fetchProfile();
  }, [username]);

  const TIER_CONFIG: Record<string, { color: string; glow: string; label: string }> = {
    'NEW TALENT': { color: 'text-zinc-500', glow: '', label: 'NEW TALENT' },
    'RISING': { color: 'text-blue-400', glow: 'drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]', label: 'RISING' },
    'ACTIVE': { color: 'text-green-400', glow: 'drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]', label: 'ACTIVE' },
    'PRO TALENT': { color: 'text-yellow-400', glow: 'drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]', label: 'PRO TALENT' },
    'ELITE': { color: 'text-[var(--accent-primary)]', glow: 'drop-shadow-[0_0_15px_rgba(255,49,49,0.8)]', label: 'ELITE' },
  };

  if (loading) return (
    <div className="h-screen bg-black flex items-center justify-center">
       <h1 className="text-4xl font-black text-white animate-pulse">ESTABLISHING_IDENTITY_UPLINK...</h1>
    </div>
  );

  if (!profile) return (
    <div className="h-screen bg-black flex flex-col items-center justify-center p-12">
       <h1 className="text-8xl md:text-[15rem] font-black text-white mb-8 tracking-tighter">404</h1>
       <p className="text-zinc-600 font-black uppercase tracking-[0.5em] mb-12 text-center">NODE_NOT_FOUND: THE REQUESTED IDENTITY DOES NOT EXIST IN THE REGISTRY</p>
       <button onClick={() => router.push("/")} className="px-12 py-6 bg-[var(--accent-primary)] text-white font-black uppercase tracking-widest text-xs clip-brutal-tl hover:bg-white hover:text-black transition-all">TERMINATE_REQUEST</button>
    </div>
  );

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-white relative overflow-x-hidden">
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[var(--accent-primary)]/5 blur-[150px] rounded-full" />
         <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[var(--accent-secondary)]/5 blur-[150px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 md:py-24 relative z-10">
        
        {/* Navigation */}
        <button 
          onClick={() => router.back()}
          className="group flex items-center gap-4 text-zinc-600 hover:text-white transition-all font-black uppercase tracking-[0.3em] text-[10px] mb-16"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          DISCONNECT_NODE
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* Left Column: Visuals & Core Identity */}
          <div className="lg:col-span-4 flex flex-col gap-10">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="aspect-square glass-panel-premium border border-[var(--accent-primary)]/30 shadow-[0_0_50px_var(--accent-glow)] rounded-3xl overflow-hidden relative group"
             >
                {profile.avatar_url_proxy ? (
                  <img src={profile.avatar_url_proxy} alt="IDENTITY_IMAGE" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
                    <User className="w-32 h-32 text-zinc-900" />
                  </div>
                )}
                
                {/* Status Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
                   <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 w-fit rounded-full mb-3">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-green-500">LIVE_NODE</span>
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-400">@{profile.username}</p>
                </div>
             </motion.div>

             <div className="flex flex-col gap-4">
                <button 
                   onClick={() => router.push(`/stangab?chat=${profile.id}`)}
                   className="w-full py-8 bg-white text-black font-black text-2xl uppercase tracking-tighter hover:bg-[var(--accent-primary)] hover:text-white transition-all duration-500 clip-brutal-tr flex items-center justify-center gap-4"
                >
                   <MessageSquare className="w-6 h-6" /> ESTABLISH_UPLINK
                </button>
                <button className="w-full py-8 glass-panel-premium border border-white/10 text-white font-black text-2xl uppercase tracking-tighter hover:bg-white hover:text-black transition-all duration-500 clip-brutal-bl flex items-center justify-center gap-4">
                   <Award className="w-6 h-6" /> ENDORSE_TALENT
                </button>
             </div>
          </div>

          {/* Right Column: Detailed Intelligence */}
          <div className="lg:col-span-8 flex flex-col gap-12">
             
             <motion.div 
               initial={{ opacity: 0, x: 50 }}
               animate={{ opacity: 1, x: 0 }}
               className="border-b border-white/10 pb-12"
             >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                   <div>
                      <h1 className="text-7xl md:text-9xl font-black uppercase tracking-tighter leading-[0.8] mb-4">
                         {profile.full_name?.split(' ')[0]}<br/>
                         <span className="text-[var(--accent-primary)]">{profile.full_name?.split(' ').slice(1).join(' ')}</span>
                      </h1>
                      <div className="flex items-center gap-6">
                         <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-zinc-600" />
                            <span className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">{profile.location || 'ESTABLISHING_LOCATION...'}</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">{profile.status}</span>
                         </div>
                      </div>
                   </div>

                   <div className="text-right flex flex-col items-end">
                      <p className="text-zinc-600 font-black uppercase tracking-[0.4em] text-[10px] mb-2">LMN_PROTOCOL_LEVEL</p>
                      <div className={`flex items-center gap-3 ${TIER_CONFIG[profile.lumen_tier || 'NEW TALENT']?.color}`}>
                         <Zap className={`w-8 h-8 ${TIER_CONFIG[profile.lumen_tier || 'NEW TALENT']?.glow}`} />
                         <span className="text-5xl font-black italic tracking-tighter">{profile.lumen_tier || 'NEW TALENT'}</span>
                      </div>
                   </div>
                </div>

                <p className="text-2xl md:text-3xl font-black uppercase tracking-tight text-zinc-400 leading-snug max-w-4xl">
                   {profile.bio || "IDENTITY_DESCRIPTION_PENDING: THE USER HAS NOT YET INITIALIZED THEIR BIOGRAPHICAL PROTOCOL."}
                </p>
             </motion.div>

             {/* Intelligence Grid */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                <section className="glass-panel-premium p-10 border border-white/10 rounded-3xl">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 mb-8 border-b border-white/5 pb-4">BIOMETRIC_DATA</h3>
                   <div className="grid grid-cols-2 gap-8">
                      {[
                        { label: 'ROLE', value: profile.role },
                        { label: 'OBJECTIVE', value: profile.objective_preference },
                        { label: 'GENDER', value: profile.gender },
                        { label: 'HEIGHT', value: profile.height },
                        { label: 'BUILD', value: profile.overall_build },
                        { label: 'SKIN_TONE', value: profile.skin_tone }
                      ].map(item => (
                        <div key={item.label}>
                           <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-1">{item.label}</p>
                           <p className="text-xs font-black uppercase text-white tracking-widest">{item.value || 'N/A'}</p>
                        </div>
                      ))}
                   </div>
                </section>

                <section className="glass-panel-premium p-10 border border-white/10 rounded-3xl">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 mb-8 border-b border-white/5 pb-4">ARTISTIC_PROCOCOLS</h3>
                   <div className="flex flex-wrap gap-3">
                      {profile.archetypes?.map((arch: string) => (
                        <span key={arch} className="px-4 py-2 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] text-[10px] font-black uppercase tracking-widest rounded-full bg-[var(--accent-primary)]/5">
                           {arch}
                        </span>
                      ))}
                      {profile.languages?.map((lang: string) => (
                        <span key={lang} className="px-4 py-2 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-full bg-white/5">
                           {lang}
                        </span>
                      ))}
                   </div>
                   
                   <div className="mt-10 pt-10 border-t border-white/5 grid grid-cols-2 gap-8">
                      <div>
                         <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-2">LMN_SCORE</p>
                         <p className="text-4xl font-black text-[var(--accent-primary)] tabular-nums">{profile.lumen_points?.toLocaleString()}</p>
                      </div>
                      <div>
                         <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-2">RANKING</p>
                         <p className="text-4xl font-black text-white tabular-nums">#42</p>
                      </div>
                   </div>
                </section>

             </div>

             {/* Activity Timeline */}
             <section className="glass-panel-premium-red p-10 border border-[var(--accent-primary)]/20 rounded-3xl relative overflow-hidden">
                <div className="relative z-10">
                   <div className="flex items-center justify-between mb-8">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white">LATEST_TRANSMISSIONS</h3>
                      <button className="text-[8px] font-black text-zinc-600 uppercase tracking-widest hover:text-white transition-all">VIEW_ALL_LOGS</button>
                   </div>
                   <div className="flex flex-col gap-6">
                      {[
                        { icon: Globe, text: "Synchronized identity node with the global registry.", time: "2H AGO" },
                        { icon: TrendingUp, text: "Earned +50 LMN for profile optimization.", time: "1D AGO" },
                        { icon: ShieldCheck, text: "Biometric verification successful.", time: "3D AGO" }
                      ].map((log, i) => (
                        <div key={i} className="flex items-center gap-6 group">
                           <div className="w-10 h-10 border border-white/10 rounded-full flex items-center justify-center text-zinc-600 group-hover:border-[var(--accent-primary)] group-hover:text-[var(--accent-primary)] transition-all">
                              <log.icon className="w-4 h-4" />
                           </div>
                           <div className="flex-1">
                              <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">{log.text}</p>
                           </div>
                           <span className="text-[9px] font-black text-zinc-800 tabular-nums">{log.time}</span>
                        </div>
                      ))}
                   </div>
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                   <TrendingUp className="w-64 h-64 text-white" />
                </div>
             </section>

          </div>
        </div>
      </div>

      {/* Noise Overlay */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-50 mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
    </main>
  );
}
