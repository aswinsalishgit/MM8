"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, CheckCircle2, ChevronRight, Trophy, Flame, PlayCircle, Star } from "lucide-react";

// Mock Supabase fetch logic
const useDashboardData = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // Simulate Supabase network request
    const fetchData = async () => {
      // const { data, error } = await supabase.from('profiles').select('*').single();
      setTimeout(() => {
        setData({
          profile: {
            name: "ACTOR_01",
            status: "VERIFIED",
            visibilityScore: 72,
            location: "KOCHI",
          },
          roles: [
            { id: 1, title: "LEAD ANTAGONIST", project: "SHADOWS OF KOCHI", match: 98, deadline: "24H", tags: ["INTENSE", "MALAYALAM"] },
            { id: 2, title: "SUPPORTING COP", project: "UNTITLED THRILLER", match: 84, deadline: "3D", tags: ["ACTION", "HINDI"] },
            { id: 3, title: "COMIC RELIEF", project: "CAMPUS DIARIES", match: 72, deadline: "1W", tags: ["FUNNY", "TAMIL"] },
          ],
          leaderboard: [
            { rank: 1, name: "ARJUN_M", score: 9400, trend: "up" },
            { rank: 2, name: "SNEHA_R", score: 9150, trend: "up" },
            { rank: 3, name: "YOU", score: 8900, trend: "up", isUser: true },
            { rank: 4, name: "RAHUL_K", score: 8750, trend: "down" },
          ],
          challenge: {
            title: "THE ANGER MONOLOGUE",
            reward: "+500 VISIBILITY",
            timeLeft: "08:14:22",
            participants: 142
          }
        });
        setLoading(false);
      }, 800);
    };
    fetchData();
  }, []);

  return { data, loading };
};

export default function AgenticDashboard() {
  const { data, loading } = useDashboardData();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUploadClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      setUploading(true);
      setUploadProgress(0);

      try {
        // 1. Get Resumable URL from our secure Next.js backend
        const initRes = await fetch("/api/drive/init-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, mimeType: file.type }),
        });

        if (!initRes.ok) {
            const errorData = await initRes.json();
            throw new Error(`Failed to initialize upload: ${errorData.details || errorData.error}`);
        }
        
        const { uploadUrl } = await initRes.json();

        // 2. Upload directly to Google Drive via PUT (bypasses Vercel limit)
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", uploadUrl, true);
          xhr.setRequestHeader("Content-Type", file.type);
          
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percentComplete = Math.floor((e.loaded / e.total) * 100);
              setUploadProgress(percentComplete);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(xhr.responseText);
            } else {
              console.error("Google Drive PUT Error Response:", xhr.responseText);
              reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
            }
          };

          xhr.onerror = () => reject(new Error("Network Error during upload"));
          xhr.send(file);
        });

        alert("AUDITION SECURELY UPLOADED TO DRIVE.");
      } catch (error) {
        console.error("Upload error:", error);
        alert("UPLOAD FAILED. Check console for details.");
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    };
    input.click();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <h1 className="text-[#ff0000] text-5xl font-black uppercase animate-pulse tracking-widest">
          SYNCING...
        </h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8 overflow-x-hidden">
      
      {/* Header */}
      <header className="flex justify-between items-end border-b-4 border-zinc-900 pb-6 mb-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none text-[#ff0000]">
            MM8 // CMD
          </h1>
          <p className="text-zinc-500 font-bold tracking-widest uppercase text-sm mt-2">
            Actor Subsystem Online
          </p>
        </div>
        <div className="hidden md:flex items-center gap-4 border-4 border-zinc-800 px-6 py-3">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
          <span className="font-bold uppercase tracking-widest">NETWORK ACTIVE</span>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Identity & Gamification */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          
          {/* Identity Card */}
          <section className="border-4 border-[#ff0000] bg-zinc-900 p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 bg-[#ff0000] text-black font-black px-4 py-1 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              {data.profile.status}
            </div>
            
            <div className="flex items-center gap-6 mt-4 mb-8">
              <div className="w-24 h-24 bg-zinc-800 border-4 border-white flex items-center justify-center">
                <User className="w-10 h-10 text-zinc-500" />
              </div>
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">{data.profile.name}</h2>
                <p className="text-[#ff0000] font-bold uppercase tracking-widest text-sm">{data.profile.location}</p>
              </div>
            </div>

            <div className="border-t-4 border-zinc-800 pt-6">
              <div className="flex justify-between items-end mb-2">
                <h3 className="font-black text-zinc-500 uppercase tracking-widest">Visibility Score</h3>
                <span className="text-4xl font-black tracking-tighter text-white">{data.profile.visibilityScore}<span className="text-xl text-zinc-500">%</span></span>
              </div>
              <div className="w-full h-3 bg-black relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${data.profile.visibilityScore}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="absolute top-0 left-0 h-full bg-green-500"
                ></motion.div>
              </div>
            </div>
          </section>

          {/* Gamification: Challenge */}
          <section className="border-4 border-zinc-800 bg-black p-6 hover:border-white transition-colors cursor-pointer group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#ff0000] group-hover:w-full transition-all duration-300 z-0"></div>
            <div className="relative z-10 group-hover:text-black transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <Flame className="w-6 h-6 text-[#ff0000] group-hover:text-black" />
                <h3 className="font-black uppercase tracking-widest">Daily Challenge</h3>
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">{data.challenge.title}</h2>
              <p className="text-zinc-500 font-bold group-hover:text-black uppercase tracking-tight mb-6">
                Ends in: <span className="text-white group-hover:text-black">{data.challenge.timeLeft}</span>
              </p>
              
              <div className="flex justify-between items-center border-t-2 border-zinc-800 pt-4 group-hover:border-black">
                <span className="font-black uppercase">{data.challenge.reward}</span>
                <span className="font-bold text-sm tracking-widest">{data.challenge.participants} ACTORS</span>
              </div>
            </div>
          </section>

          {/* Gamification: Leaderboard */}
          <section className="border-4 border-zinc-800 p-6">
            <div className="flex items-center gap-3 mb-6 border-b-4 border-zinc-800 pb-4">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <h3 className="font-black uppercase tracking-widest text-xl">Local Rank</h3>
            </div>
            <div className="flex flex-col gap-4">
              {data.leaderboard.map((actor: any) => (
                <div key={actor.rank} className={`flex items-center justify-between p-3 border-l-4 ${actor.isUser ? 'border-[#ff0000] bg-zinc-900' : 'border-zinc-800'}`}>
                  <div className="flex items-center gap-4">
                    <span className={`font-black text-2xl ${actor.rank === 1 ? 'text-yellow-500' : 'text-zinc-500'}`}>
                      {actor.rank < 10 ? `0${actor.rank}` : actor.rank}
                    </span>
                    <span className={`font-black uppercase tracking-tighter ${actor.isUser ? 'text-[#ff0000]' : 'text-white'}`}>
                      {actor.name}
                    </span>
                  </div>
                  <span className="font-black tabular-nums">{actor.score}</span>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN: AI Matches & Actions */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Action Center */}
          <section className="w-full">
            <button 
              onClick={handleUploadClick}
              disabled={uploading}
              className={`w-full relative group border-4 p-8 md:p-12 text-left overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors duration-300 ${uploading ? 'bg-black border-zinc-800' : 'bg-[#ff0000] border-[#ff0000] hover:bg-black'}`}
            >
              {uploading && (
                <div 
                  className="absolute top-0 left-0 h-full bg-[#ff0000] opacity-20 z-0 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              )}
              <div className="relative z-10 transition-colors">
                <h2 className={`text-4xl md:text-6xl font-black uppercase tracking-tighter ${uploading ? 'text-[#ff0000]' : 'text-black group-hover:text-[#ff0000]'}`}>
                  {uploading ? `UPLOADING... ${uploadProgress}%` : "Upload Audition"}
                </h2>
                <p className={`font-bold uppercase tracking-widest mt-2 ${uploading ? 'text-zinc-500' : 'text-black group-hover:text-zinc-500'}`}>
                  {uploading ? "DIRECT SECURE UPLOAD TO DRIVE" : "Override gatekeepers. Show raw talent."}
                </p>
              </div>
              {!uploading && (
                <div className="relative z-10 w-20 h-20 bg-black group-hover:bg-[#ff0000] rounded-full flex items-center justify-center shrink-0 transition-colors">
                  <PlayCircle className="w-10 h-10 text-[#ff0000] group-hover:text-black" />
                </div>
              )}
              <div className={`absolute right-0 bottom-0 text-[10rem] font-black opacity-10 pointer-events-none transition-colors ${uploading ? 'text-zinc-800' : 'text-black group-hover:text-[#ff0000]'}`}>
                REC
              </div>
            </button>
          </section>

          {/* AI Recommended Roles (Swipeable Grid) */}
          <section className="flex-1 flex flex-col min-h-0">
            <div className="flex items-end justify-between mb-6">
              <div className="flex items-center gap-3">
                <Star className="w-8 h-8 text-[#ff0000]" />
                <h2 className="text-3xl font-black uppercase tracking-tighter">AI Matched Roles</h2>
              </div>
              <button className="text-zinc-500 hover:text-white font-bold uppercase tracking-widest flex items-center gap-1 transition-colors">
                View All <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 w-full overflow-x-auto snap-x snap-mandatory hide-scrollbar flex gap-6 pb-4">
              {data.roles.map((role: any, index: number) => (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="snap-center shrink-0 w-[300px] md:w-[380px] bg-zinc-900 border-4 border-zinc-800 p-6 flex flex-col hover:border-[#ff0000] hover:bg-black transition-colors group cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-6">
                    <span className="bg-[#ff0000] text-black font-black px-3 py-1 uppercase text-sm">
                      {role.match}% MATCH
                    </span>
                    <span className="text-zinc-500 font-bold uppercase tracking-widest text-sm group-hover:text-[#ff0000] transition-colors">
                      CLOSES: {role.deadline}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm mb-1">{role.project}</p>
                    <h3 className="text-3xl font-black uppercase tracking-tighter leading-tight mb-4 group-hover:text-[#ff0000] transition-colors">
                      {role.title}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {role.tags.map((tag: string) => (
                        <span key={tag} className="border-2 border-zinc-700 text-zinc-400 px-2 py-1 text-xs font-bold uppercase group-hover:border-zinc-500">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 border-t-4 border-zinc-800 pt-4 group-hover:border-[#ff0000] transition-colors flex justify-between items-center">
                    <span className="font-black text-zinc-500 group-hover:text-white transition-colors">REVIEW SPECS</span>
                    <ChevronRight className="w-6 h-6 text-zinc-500 group-hover:text-[#ff0000] transition-colors" />
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
