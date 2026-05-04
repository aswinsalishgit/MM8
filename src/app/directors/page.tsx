"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Search, Filter, MapPin, Star, User, 
  ChevronRight, ArrowUpRight, ShieldCheck, 
  Target, Zap, Flame, Trophy, Compass
} from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import Navbar from "@/components/Navbar";

export default function DirectorsDiscoveryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [directors, setDirectors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchDirectors = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'DIRECTOR')
        .eq('status', 'VERIFIED')
        .limit(20);

      if (!error && data) {
        setDirectors(data.map(d => ({
          id: d.id,
          name: d.full_name || "VISIONARY",
          username: d.username || "ANONYMOUS",
          avatar: d.avatar_url,
          location: d.location || "GLOBAL_INDEX",
          signature: d.archetypes?.[0] || "HYPER-REALISM",
          vision: d.objective_preference || "FINDING TALENT",
          strength: Math.floor(Math.random() * 20) + 80 // Mock strength for UI
        })));
      }
      setLoading(false);
    };
    fetchDirectors();
  }, []);

  return (
    <main className="min-h-screen bg-[#050000] text-white selection:bg-[var(--accent-primary)] selection:text-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-40 pb-32">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12 mb-20">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-7xl md:text-9xl font-black uppercase tracking-tighter leading-[0.8] mb-6">
              THE<br /><span className="gradient-text-blood">VISIONARIES</span>
            </h1>
            <p className="text-zinc-500 font-bold uppercase tracking-[0.4em] text-xs md:text-sm border-l-4 border-[var(--accent-primary)] pl-6">
              MM8 GLOBAL DIRECTORS INDEX // DECENTRALIZED CREATIVE MINDS
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full md:w-96 flex flex-col gap-4"
          >
            <div className="relative">
              <input 
                type="text" 
                placeholder="SEARCH_DIRECTOR_NODES..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950/50 border-2 border-white/5 p-6 font-black uppercase text-xs tracking-widest outline-none focus:border-[var(--accent-primary)] transition-all rounded-3xl"
              />
              <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-700" />
            </div>
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-600 px-2">
              <span>{directors.length} NODES_LOCATED</span>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                SYSTEM_LIVE
              </span>
            </div>
          </motion.div>
        </div>

        {/* Discovery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="h-[500px] glass-panel-premium border border-white/5 rounded-3xl animate-pulse" />
            ))
          ) : directors.length > 0 ? (
            directors.map((director, index) => (
              <motion.div
                key={director.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative h-[550px] glass-panel-premium border border-white/10 rounded-[2.5rem] overflow-hidden hover:border-[var(--accent-primary)]/50 transition-all duration-700 cursor-pointer clip-brutal-tl shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
              >
                {/* Background Image/Glow */}
                <div className="absolute inset-0 z-0">
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
                  {director.avatar ? (
                    <img src={director.avatar} alt={director.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 scale-110 group-hover:scale-100" />
                  ) : (
                    <div className="w-full h-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                      <User className="w-24 h-24 text-zinc-900" />
                    </div>
                  )}
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--accent-primary)]/10 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-0 z-20 p-10 flex flex-col justify-end translate-y-6 group-hover:translate-y-0 transition-transform duration-700">
                  <div className="flex justify-between items-start mb-10">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-[var(--accent-primary)] uppercase tracking-[0.3em]">RANK_STRENGTH</span>
                      <span className="text-4xl font-black text-white tabular-nums">{director.strength}<span className="text-xs text-[var(--accent-primary)]">%</span></span>
                    </div>
                    <div className="p-3 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <ArrowUpRight className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  <div className="space-y-2 mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] shadow-[0_0_10px_var(--accent-glow)]" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">@{director.username}</span>
                    </div>
                    <h3 className="text-4xl font-black uppercase tracking-tighter leading-none text-white">
                      {director.name}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-10 pt-8 border-t border-white/5">
                    <div>
                      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">SIGNATURE</p>
                      <p className="text-[11px] font-black text-white uppercase">{director.signature}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">LOCATION</p>
                      <p className="text-[11px] font-black text-white uppercase flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-[var(--accent-primary)]" />
                        {director.location.split(',')[0]}
                      </p>
                    </div>
                  </div>

                  <button className="w-full py-5 bg-white text-black font-black uppercase tracking-[0.3em] text-[10px] hover:bg-[var(--accent-primary)] hover:text-white transition-all shadow-2xl">
                    VIEW_MAINFRAME
                  </button>
                </div>
                
                {/* Decorative Elements */}
                <div className="absolute top-8 right-8 z-30 flex items-center gap-2 px-3 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl">
                   <ShieldCheck className="w-3 h-3 text-green-500" />
                   <span className="text-[8px] font-black uppercase tracking-widest text-zinc-300">VERIFIED</span>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full h-[400px] flex flex-col items-center justify-center text-center opacity-30">
              <Compass className="w-16 h-16 text-zinc-700 mb-6 animate-pulse" />
              <h3 className="text-2xl font-black uppercase tracking-widest text-zinc-500">NO_NODES_FOUND_IN_CURRENT_INDEX</h3>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
