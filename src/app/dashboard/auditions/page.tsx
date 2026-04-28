"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Play, ExternalLink, Film, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import BackgroundCanvas from "@/components/BackgroundCanvas";
import { getAuditionVideos } from "@/app/actions/driveActions";

export default function AuditionsPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVideos() {
      try {
        const files = await getAuditionVideos();
        setVideos(files);
      } catch (e) {
        console.error("MM8_VIDEOS_LOAD_FAILURE:", e);
      } finally {
        setLoading(false);
      }
    }
    loadVideos();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-16 relative overflow-x-hidden">
      <BackgroundCanvas />
      
      <button 
        onClick={() => router.push("/dashboard")}
        className="fixed top-8 left-8 md:top-12 md:left-16 z-50 flex items-center gap-2 text-zinc-500 hover:text-white font-black uppercase tracking-widest text-xs transition-colors group cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        BACK TO DASHBOARD
      </button>

      <div className="max-w-7xl mx-auto mt-20 relative z-10">
        <header className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-[2px] bg-brand-red-neon" />
            <p className="font-black uppercase tracking-[0.5em] text-[10px] text-brand-red-neon">INTEL_DATABASE</p>
          </div>
          <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-none">
            UPLOADED<br/><span className="text-brand-red-neon">AUDITIONS</span>
          </h1>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <Loader2 className="w-12 h-12 text-brand-red-neon animate-spin" />
            <p className="font-black uppercase tracking-widest text-zinc-600 animate-pulse">Retrieving talent packets...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="py-32 brutal-border-red bg-zinc-950/50 flex flex-col items-center justify-center gap-8 clip-brutal-slant">
            <Film className="w-20 h-20 text-zinc-800" />
            <div className="text-center">
              <h2 className="text-3xl font-black uppercase tracking-tight text-zinc-500 mb-2">NO AUDITIONS FOUND</h2>
              <p className="font-black uppercase tracking-widest text-xs text-zinc-700">Initialize your uplink from the dashboard to begin.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
            {videos.map((video, idx) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="glass-panel brutal-border-red group overflow-hidden relative flex flex-col clip-brutal-tr"
              >
                <div className="aspect-video bg-zinc-950 relative overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-700">
                  {video.thumbnailLink ? (
                    <img src={video.thumbnailLink.replace('=s220', '=s600')} alt={video.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-12 h-12 text-zinc-900" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a 
                      href={video.webViewLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-4 bg-brand-red-neon rounded-full hover:scale-110 transition-transform"
                    >
                      <Play className="w-8 h-8 text-white fill-white" />
                    </a>
                  </div>
                </div>
                
                <div className="p-8 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-[1px] bg-brand-red-neon" />
                      <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">PACKET_{idx + 1}</span>
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight group-hover:text-brand-red-neon transition-colors line-clamp-1">{video.name}</h3>
                  </div>
                  
                  <div className="mt-8 flex justify-between items-center">
                    <a 
                      href={video.webViewLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white flex items-center gap-2 transition-colors"
                    >
                      VIEW SOURCE <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="text-zinc-800 font-black tabular-nums text-sm">#{video.id.slice(-4).toUpperCase()}</span>
                  </div>
                </div>
                
                <div className="absolute top-0 right-0 w-12 h-12 bg-brand-red-neon/10 pointer-events-none" style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
