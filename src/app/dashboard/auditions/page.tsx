"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Play, Film, Loader2, X, Download, ShieldCheck, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import BackgroundCanvas from "@/components/BackgroundCanvas";
import { getAuditionVideos } from "@/app/actions/driveActions";
import { supabase } from "@/utils/supabase/client";

export default function AuditionsPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);

  useEffect(() => {
    async function loadVideos() {
      try {
        // 1. Fetch Supabase Videos (Optimized)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('audition_videos')
          .eq('id', user.id)
          .single();

        const supabaseVideos = (profile?.audition_videos || []).map((v: any) => ({
          ...v,
          source: 'SUPABASE'
        }));

        // 2. Fetch Legacy Drive Videos
        const driveFiles = await getAuditionVideos();
        const driveVideos = driveFiles.map((f: any) => ({
          id: f.id,
          name: f.name,
          url: f.webContentLink,
          previewUrl: `https://drive.google.com/file/d/${f.id}/preview`,
          thumbnail: f.thumbnailLink?.replace('=s220', '=s800'),
          source: 'DRIVE'
        }));

        // Combine (Supabase first for efficiency)
        setVideos([...supabaseVideos, ...driveVideos]);
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
            <p className="font-black uppercase tracking-[0.5em] text-[10px] text-brand-red-neon">CORE_TALENT_UPLINK</p>
          </div>
          <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-none">
            ACTIVE<br/><span className="text-brand-red-neon">AUDITIONS</span>
          </h1>
          <div className="flex items-center gap-6 mt-8">
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-950 border border-zinc-900 rounded-full">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">SECURE_ENCRYPTION_ACTIVE</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-950 border border-zinc-900 rounded-full">
              <Zap className="w-3 h-3 text-yellow-500" />
              <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">LOW_LATENCY_STREAMING</span>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <Loader2 className="w-12 h-12 text-brand-red-neon animate-spin" />
            <p className="font-black uppercase tracking-widest text-zinc-600 animate-pulse">Syncing with encrypted storage...</p>
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
                  {video.thumbnail || video.source === 'SUPABASE' ? (
                    <div className="w-full h-full relative">
                      {video.source === 'SUPABASE' ? (
                        <video 
                          src={video.url} 
                          className="w-full h-full object-cover"
                          muted
                          onMouseOver={(e) => e.currentTarget.play()}
                          onMouseOut={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                          }}
                        />
                      ) : (
                        <img 
                          src={video.thumbnail} 
                          alt={video.name} 
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-12 h-12 text-zinc-900" />
                    </div>
                  )}
                  <div 
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" 
                    onClick={() => setSelectedVideo(video)}
                  >
                    <div className="p-4 bg-brand-red-neon rounded-full hover:scale-110 transition-transform shadow-[0_0_30px_rgba(255,49,49,0.5)]">
                      <Play className="w-8 h-8 text-white fill-white" />
                    </div>
                  </div>
                </div>
                
                <div className="p-8 flex-1 flex flex-col justify-between relative bg-zinc-950/30">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-[1px] bg-brand-red-neon" />
                        <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                          {video.source === 'SUPABASE' ? 'HQ_STREAM' : 'LEGACY_LINK'}
                        </span>
                      </div>
                      <span className="text-[9px] font-black px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-600 rounded uppercase">
                        {video.type?.split('/')[1] || 'MP4'}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight group-hover:text-brand-red-neon transition-colors line-clamp-1">{video.name}</h3>
                  </div>
                  
                  <div className="mt-8 flex justify-between items-center">
                    <button 
                      onClick={() => setSelectedVideo(video)}
                      className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white flex items-center gap-2 transition-colors cursor-pointer group/link"
                    >
                      WATCH_ACTIVE_STREAM 
                      <div className="w-2 h-2 bg-brand-red-neon rounded-full animate-pulse group-hover/link:bg-white" />
                    </button>
                    <span className="text-zinc-800 font-black tabular-nums text-sm">#{idx + 1}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Extreme Efficiency Video Player Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/98 backdrop-blur-3xl p-4 md:p-12"
          >
            <div className="absolute top-8 right-8 z-[110] flex gap-4">
              <a 
                href={selectedVideo.url} 
                download 
                className="p-4 bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer rounded-full"
                title="Download Original Quality"
              >
                <Download className="w-8 h-8" />
              </a>
              <button 
                onClick={() => setSelectedVideo(null)}
                className="p-4 bg-white/10 hover:bg-brand-red-neon text-white transition-all cursor-pointer rounded-full"
              >
                <X className="w-8 h-8" />
              </button>
            </div>
            
            <div className="w-full max-w-6xl aspect-video bg-black brutal-border-red relative overflow-hidden shadow-[0_0_150px_rgba(255,49,49,0.3)]">
              {selectedVideo.source === 'SUPABASE' ? (
                <video 
                  src={selectedVideo.url} 
                  className="w-full h-full"
                  controls
                  autoPlay
                  controlsList="nodownload"
                />
              ) : (
                <iframe 
                  src={selectedVideo.previewUrl} 
                  className="w-full h-full border-0"
                  allow="autoplay"
                  allowFullScreen
                />
              )}
              
              <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black via-black/80 to-transparent">
                <div className="flex items-center gap-3 mb-2">
                   <div className="w-12 h-[2px] bg-brand-red-neon" />
                   <p className="font-black uppercase tracking-widest text-xs text-brand-red-neon">
                     {selectedVideo.source === 'SUPABASE' ? 'DIRECT_STREAMING_NODE_01' : 'LEGACY_PROXY_UPLINK'}
                   </p>
                </div>
                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white">{selectedVideo.name}</h2>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
