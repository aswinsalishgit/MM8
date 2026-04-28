"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, CheckCircle2, ChevronRight, Trophy, Flame, PlayCircle, Star, Settings, X, Lock, ShieldCheck } from "lucide-react";
import BackgroundCanvas from "@/components/BackgroundCanvas";

import { supabase } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";


const ROLES_MOCK = [
  { id: 1, title: "LEAD ANTAGONIST", project: "SHADOWS OF KOCHI", match: 98, deadline: "24H", tags: ["INTENSE", "MALAYALAM"] },
  { id: 2, title: "SUPPORTING COP", project: "UNTITLED THRILLER", match: 84, deadline: "3D", tags: ["ACTION", "HINDI"] },
  { id: 3, title: "COMIC RELIEF", project: "CAMPUS DIARIES", match: 72, deadline: "1W", tags: ["FUNNY", "TAMIL"] },
];

const LEADERBOARD_MOCK = [
  { rank: 1, name: "ARJUN_M", score: 9400, trend: "up" },
  { rank: 2, name: "SNEHA_R", score: 9150, trend: "up" },
  { rank: 3, name: "YOU", score: 8900, trend: "up", isUser: true },
  { rank: 4, name: "RAHUL_K", score: 8750, trend: "down" },
];

const CHALLENGE_MOCK = {
  title: "THE ANGER MONOLOGUE",
  reward: "+500 VISIBILITY",
  timeLeft: "08:14:22",
  participants: 142
};

const useDashboardData = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push("/auth");
          return;
        }

        let { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        // If profile doesn't exist, try to create one or use default
        if (error || !profile) {
          console.warn("Profile not found, initializing default...", error);
          
          // Attempt to create profile if missing (trigger fallback)
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .upsert({ 
              id: session.user.id, 
              full_name: session.user.user_metadata?.full_name || "AGENT_X",
              status: "UNVERIFIED"
            })
            .select()
            .single();
          
          if (!createError && newProfile) {
            profile = newProfile;
          } else {
            // Fallback to minimal mock if DB fails
            profile = { full_name: "AGENT_X", status: "UNVERIFIED", visibility_score: 0, location: "UNKNOWN" };
          }
        }

        setData({
          profile: {
            name: profile.full_name || "AGENT_X",
            status: profile.status || "UNVERIFIED",
            visibilityScore: profile.visibility_score || 0,
            location: profile.location || "UNKNOWN",
            avatarUrl: profile.avatar_url_proxy || null
          }
        });
      } catch (error) {
        console.error("Dashboard critical error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  return { data, loading };
};

export default function AgenticDashboard() {
  const { data, loading } = useDashboardData();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const PASSWORD_RULES = [
    { label: "8+ CHARS", met: newPassword.length >= 8 },
    { label: "UPPERCASE", met: /[A-Z]/.test(newPassword) },
    { label: "NUMBER", met: /[0-9]/.test(newPassword) },
    { label: "SPECIAL", met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) }
  ];
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' | 'info' } | null>(null);

  const validateUsername = (username: string) => {
    return /^[a-z]+$/.test(username);
  };

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return minLength && hasUpper && hasNumber && hasSpecial;
  };

  const checkUsername = async (username: string) => {
    if (!username) {
      setUsernameStatus("idle");
      return;
    }
    if (!validateUsername(username)) {
      setUsernameStatus("invalid");
      return;
    }
    
    setUsernameStatus("checking");
    try {
      const { data: exists, error } = await supabase.rpc('check_username_exists', { p_username: username });
      if (error) throw error;
      setUsernameStatus(exists ? "taken" : "available");
    } catch (err) {
      console.error(err);
      setUsernameStatus("idle");
    }
  };

  const handleUpdateSettings = async () => {
    setMessage(null);
    if (newUsername && usernameStatus !== "available") {
      setMessage({ text: "CHOOSE A VALID AND AVAILABLE USERNAME.", type: 'error' });
      return;
    }
    if (newPassword && !validatePassword(newPassword)) {
      setMessage({ text: "PASSWORD PROTOCOL VIOLATION.", type: 'error' });
      return;
    }

    setSettingsLoading(true);
    try {
      if (newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      }

      if (newUsername) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase.from('profiles').update({ username: newUsername }).eq('id', user.id);
          if (error) throw error;
        }
      }


      setMessage({ text: "SYSTEM CONFIG UPDATED.", type: 'success' });
      setTimeout(() => setShowSettings(false), 2000);
    } catch (err: any) {
      setMessage({ text: `CRITICAL ERROR: ${err.message}`, type: 'error' });
    } finally {
      setSettingsLoading(false);
    }
  };

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
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error("Network Error during upload"));
          xhr.send(file);
        });

        setMessage({ text: "AUDITION SECURELY UPLOADED TO DRIVE.", type: 'success' });
      } catch (error: any) {
        console.error("Upload error:", error);
        setMessage({ text: `UPLOAD FAILED: ${error.message}`, type: 'error' });
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    };
    input.click();
  };

  if (loading || !data) {
    return (
      <main className="min-h-screen bg-black">
        <BackgroundCanvas />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-12 overflow-x-hidden relative selection:bg-brand-red-neon selection:text-white">
      <BackgroundCanvas />
      
      {/* Status Bar */}
      {message && (
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`fixed top-0 left-0 w-full z-[1000] p-4 text-center font-black uppercase tracking-[0.4em] text-[10px] border-b ${
            message.type === 'error' ? 'bg-red-500/10 border-brand-red-neon text-brand-red-neon' : 
            message.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-500' :
            'bg-brand-red-neon/10 border-brand-red-neon text-white'
          }`}
        >
          {message.text}
          <button 
            onClick={() => setMessage(null)}
            className="ml-8 text-zinc-500 hover:text-white"
          >
            [ DISMISS ]
          </button>
        </motion.div>
      )}

      {/* Header HUD */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-zinc-900 pb-12 mb-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-none text-white">
            MM8<span className="text-brand-red-neon drop-shadow-[0_0_15px_rgba(255,49,49,0.5)]">//</span>CMD
          </h1>
          <div className="flex items-center gap-4 mt-6">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`w-1 h-4 ${i < 3 ? 'bg-brand-red-neon' : 'bg-zinc-800'}`} />
              ))}
            </div>
            <p className="text-zinc-600 font-black tracking-[0.4em] uppercase text-[10px] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-red-neon animate-pulse" />
              SYSTEM_READY // NODE_ACTIVE
            </p>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          className="mt-8 md:mt-0 flex flex-col items-end"
        >
          <div className="glass-panel brutal-border-red px-8 py-4 clip-brutal-slant flex items-center gap-4">
            <span className="font-black uppercase tracking-[0.2em] text-[10px] text-zinc-500">ENCRYPTED_LINK:</span>
            <span className="font-black uppercase tracking-widest text-xs text-white tabular-nums">0x8A2...F92B</span>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <p className="text-[9px] font-black text-brand-red-deep uppercase tracking-widest">SECURE_HANDSHAKE_ESTABLISHED</p>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-zinc-900 transition-colors cursor-pointer group"
            >
              <Settings className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
            </button>
          </div>
        </motion.div>
      </header>

      <div className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10 pb-20">
        
        {/* LEFT COLUMN: IDENTITY & INTEL */}
        <div className="lg:col-span-4 flex flex-col gap-12">
          
          {/* Identity HUD */}
          <section className="glass-panel brutal-border-red p-10 relative overflow-hidden group clip-brutal-tl">
            <div className="absolute top-0 right-0 bg-brand-red-neon text-white font-black px-6 py-3 flex items-center gap-2 text-[10px] tracking-widest clip-brutal-tr">
              <CheckCircle2 className="w-4 h-4" />
              {data.profile.status}
            </div>
            
            <div className="flex items-center gap-8 mt-6 mb-12">
              <div className="w-32 h-32 bg-zinc-950 brutal-border-red flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-500 clip-brutal-slant overflow-hidden">
                {data.profile.avatarUrl ? (
                  <img 
                    src={data.profile.avatarUrl} 
                    alt="PFP" 
                    className="w-full h-full object-cover"
                    onError={(e: any) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                ) : null}
                <User className={`w-16 h-16 text-brand-red-deep group-hover:text-brand-red-neon transition-colors ${data.profile.avatarUrl ? 'opacity-0' : 'opacity-100'}`} />
              </div>
              <div>
                <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">{data.profile.name}</h2>
                <div className="flex flex-col gap-2 mt-3">
                  <p className="text-brand-red-neon font-black uppercase tracking-[0.3em] text-xs flex items-center gap-2">
                    <span className="w-2 h-[1px] bg-brand-red-neon" />
                    {data.profile.location}
                  </p>
                  <button 
                    onClick={() => router.push("/dashboard/auditions")}
                    className="text-zinc-600 hover:text-white font-black uppercase tracking-widest text-[9px] text-left transition-colors flex items-center gap-2 group/btn"
                  >
                    <div className="w-1 h-1 bg-zinc-800 group-hover/btn:bg-white transition-colors" />
                    VIEW_ACTIVE_AUDITIONS
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-900 pt-10">
              <div className="flex justify-between items-end mb-6">
                <h3 className="font-black text-zinc-600 uppercase tracking-[0.4em] text-[10px]">VISIBILITY_CORE</h3>
                <span className="text-6xl font-black tracking-tighter text-white tabular-nums">
                  {data.profile.visibilityScore}<span className="text-2xl text-brand-red-neon">%</span>
                </span>
              </div>
              <div className="w-full h-3 bg-zinc-950 relative overflow-hidden clip-brutal-slant">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${data.profile.visibilityScore}%` }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  className="absolute top-0 left-0 h-full bg-brand-red-neon shadow-[0_0_20px_rgba(255,49,49,0.8)]"
                />
              </div>
            </div>
          </section>

          {/* Mission Intel */}
          <section className="glass-panel-red p-10 hover:bg-brand-red-neon/10 transition-all cursor-pointer group relative overflow-hidden clip-brutal-br">
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <Flame className="w-6 h-6 text-brand-red-neon" />
                <h3 className="font-black uppercase tracking-[0.4em] text-[10px]">PRIORITY_MISSION</h3>
              </div>
              <h2 className="text-5xl font-black uppercase tracking-tighter mb-6 leading-[0.85] group-hover:text-white transition-colors">{CHALLENGE_MOCK.title}</h2>
              <div className="flex items-center gap-4 mb-10">
                <div className="px-3 py-1 bg-brand-red-neon text-white text-[9px] font-black uppercase tracking-widest">ACTIVE</div>
                <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">
                  TERMINATES: <span className="text-white tabular-nums">{CHALLENGE_MOCK.timeLeft}</span>
                </p>
              </div>
              
              <div className="flex justify-between items-center border-t border-brand-red-neon/20 pt-8">
                <span className="font-black uppercase text-brand-red-neon text-sm tracking-tighter">{CHALLENGE_MOCK.reward}</span>
                <span className="font-black text-[9px] tracking-[0.3em] text-zinc-600 uppercase">{CHALLENGE_MOCK.participants} SYNCED</span>
              </div>
            </div>
          </section>

          {/* Ranking Subsystem */}
          <section className="glass-panel p-10 brutal-border clip-brutal-bl">
            <div className="flex items-center gap-4 mb-10 border-b border-zinc-900 pb-8">
              <Trophy className="w-6 h-6 text-brand-red-neon" />
              <h3 className="font-black uppercase tracking-[0.4em] text-[10px]">GLOBAL_RANKINGS</h3>
            </div>
            <div className="flex flex-col gap-6">
              {LEADERBOARD_MOCK.map((actor: any) => (
                <div key={actor.rank} className={`flex items-center justify-between p-5 brutal-border transition-all group ${actor.isUser ? 'border-brand-red-neon bg-brand-red-neon/10 clip-brutal-slant' : 'border-zinc-900 bg-zinc-950/50 hover:border-zinc-700'}`}>
                  <div className="flex items-center gap-6">
                    <span className={`font-black text-3xl tabular-nums ${actor.rank === 1 ? 'text-brand-red-neon' : 'text-zinc-800 group-hover:text-zinc-600'}`}>
                      {actor.rank < 10 ? `0${actor.rank}` : actor.rank}
                    </span>
                    <span className={`font-black uppercase tracking-tighter text-lg ${actor.isUser ? 'text-white' : 'text-zinc-500'}`}>
                      {actor.name}
                    </span>
                  </div>
                  <span className="font-black tabular-nums text-brand-red-neon text-xl">{actor.score}</span>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN: OPERATIONS */}
        <div className="lg:col-span-8 flex flex-col gap-12">
          
          {/* Action Hub */}
          <section className="w-full">
            <button 
              onClick={handleUploadClick}
              disabled={uploading}
              className={`w-full relative group p-12 md:p-24 text-left overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-12 transition-all duration-700 cursor-pointer ${
                uploading ? 'bg-zinc-950 border-2 border-brand-red-deep' : 'bg-brand-red-neon text-white clip-brutal-hero-primary shadow-[0_0_60px_rgba(255,49,49,0.3)] hover:shadow-[0_0_100px_rgba(255,49,49,0.5)]'
              }`}
            >
              {uploading && (
                <div 
                  className="absolute top-0 left-0 h-full bg-brand-red-neon opacity-30 z-0 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              )}
              
              <div className="relative z-10 max-w-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-[2px] bg-white opacity-60" />
                  <p className="font-black uppercase tracking-[0.5em] text-[10px] text-white/70">
                    {uploading ? "UPLINK_ESTABLISHED" : "BYPASS_THE_GATEKEEPERS"}
                  </p>
                </div>
                <h2 className="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-[0.8] text-white">
                  {uploading ? `SYNCING ${uploadProgress}%` : "UPLOAD AUDITION"}
                </h2>
                <p className="font-black uppercase tracking-widest mt-8 text-sm text-white/80 max-w-lg">
                  {uploading ? "Transferring raw talent packets to the MM8 decentralized storage layer." : "Submit your latest performance. Our AI agents will match you directly to the pipeline."}
                </p>
              </div>

              {!uploading && (
                <div className="relative z-10 w-32 h-32 bg-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500 clip-brutal-tr shadow-2xl">
                  <PlayCircle className="w-16 h-16 text-brand-red-neon" />
                </div>
              )}
              
              <div className="absolute right-[-30px] bottom-[-30px] text-[20rem] font-black text-black opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity uppercase leading-none">
                RAW
              </div>
            </button>
          </section>

          {/* AI Matching Grid */}
          <section className="flex-1 flex flex-col min-h-0 mt-8">
            <div className="flex items-end justify-between mb-12 px-2">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-brand-red-neon/10 brutal-border-red clip-brutal-slant">
                  <Star className="w-8 h-8 text-brand-red-neon" />
                </div>
                <div>
                  <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">AGENTIC MATCHES</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 mt-2">REAL_TIME_PIPELINE_SYNC</p>
                </div>
              </div>
              <button className="text-zinc-600 hover:text-brand-red-neon font-black uppercase tracking-[0.3em] text-[10px] flex items-center gap-3 transition-all border-b border-transparent hover:border-brand-red-neon pb-2 cursor-pointer">
                FULL REGISTRY <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 w-full overflow-x-auto snap-x snap-mandatory hide-scrollbar flex gap-10 pb-12">
              {ROLES_MOCK.map((role: any, index: number) => (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`snap-center shrink-0 w-[350px] md:w-[480px] glass-panel brutal-border-red p-10 flex flex-col hover:bg-brand-red-neon/5 transition-all group cursor-pointer ${
                    index % 2 === 0 ? 'clip-brutal-tl' : 'clip-brutal-tr'
                  }`}
                >
                  <div className="flex justify-between items-start mb-10">
                    <div className="bg-brand-red-neon text-white font-black px-6 py-3 uppercase text-[10px] tracking-[0.2em] shadow-[0_0_20px_rgba(255,49,49,0.4)] clip-brutal-slant">
                      {role.match}% MATCH
                    </div>
                    <div className="text-right">
                      <p className="text-zinc-600 font-black uppercase tracking-widest text-[9px]">EXPIRES_IN</p>
                      <span className="text-white font-black uppercase tracking-widest text-xs tabular-nums">
                        {role.deadline}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-2 h-2 bg-brand-red-neon rounded-full" />
                      <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[10px]">{role.project}</p>
                    </div>
                    <h3 className="text-5xl font-black uppercase tracking-tighter leading-[0.9] mb-8 group-hover:text-brand-red-neon transition-colors">
                      {role.title}
                    </h3>
                    <div className="flex flex-wrap gap-3 mt-auto">
                      {role.tags.map((tag: string) => (
                        <span key={tag} className="border border-zinc-800 text-zinc-500 px-4 py-2 text-[9px] font-black uppercase tracking-widest group-hover:border-brand-red-neon/30 group-hover:text-brand-red-neon transition-colors">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-12 border-t border-zinc-900 pt-8 flex justify-between items-center group-hover:border-brand-red-neon/30 transition-all">
                    <span className="font-black text-[10px] uppercase tracking-[0.3em] text-zinc-600 group-hover:text-white transition-colors">ANALYZE_SPECIFICATIONS</span>
                    <div className="w-12 h-12 bg-zinc-950 brutal-border-red flex items-center justify-center group-hover:bg-brand-red-neon transition-all">
                      <ChevronRight className="w-6 h-6 text-brand-red-neon group-hover:text-white transition-all" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div 
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={() => setShowSettings(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl glass-panel brutal-border-red p-12 relative z-10"
          >
            <button 
              onClick={() => setShowSettings(false)}
              className="absolute top-8 right-8 text-zinc-500 hover:text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-4xl font-black uppercase tracking-tighter mb-8">SYSTEM CONFIG</h2>

            {message && message.type !== 'success' && (
              <div className={`mb-8 p-4 text-[9px] font-black uppercase tracking-widest border-l-2 ${
                message.type === 'error' ? 'bg-red-500/10 border-brand-red-neon text-brand-red-neon' : 'bg-brand-red-neon/10 border-brand-red-neon text-white'
              }`}>
                {message.text}
              </div>
            )}

            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-red-neon ml-2">UPDATE USERNAME</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="lowercaseonly" 
                    className={`w-full bg-zinc-950 text-white font-black text-xl px-8 py-5 border-2 outline-none transition-all uppercase clip-brutal-tl ${
                      usernameStatus === "available" ? "border-green-500" : 
                      usernameStatus === "taken" || usernameStatus === "invalid" ? "border-brand-red-neon" : "border-zinc-800"
                    }`}
                    value={newUsername}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase();
                      setNewUsername(val);
                      checkUsername(val);
                    }}
                  />
                  {usernameStatus !== "idle" && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-widest">
                      {usernameStatus === "checking" && <span className="text-zinc-500">CHECKING...</span>}
                      {usernameStatus === "available" && <span className="text-green-500">AVAILABLE</span>}
                      {usernameStatus === "taken" && <span className="text-brand-red-neon">TAKEN</span>}
                      {usernameStatus === "invalid" && <span className="text-brand-red-neon">INVALID_FORMAT</span>}
                    </div>
                  )}
                </div>
                <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest ml-2 italic">Lowercase letters only. No spaces or underscores.</p>
              </div>

              <div className="flex flex-col gap-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-red-neon ml-2">UPDATE PASSWORD</label>
                <div className="relative">
                  <input 
                    type="password" 
                    placeholder="********" 
                    className={`w-full bg-zinc-950 text-white font-black text-xl px-8 py-5 border-2 outline-none transition-all uppercase clip-brutal-br ${
                      newPassword && !validatePassword(newPassword) ? "border-brand-red-neon" : 
                      newPassword && validatePassword(newPassword) ? "border-green-500" : "border-zinc-800"
                    }`}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 ml-2">
                  {PASSWORD_RULES.map(rule => (
                    <div key={rule.label} className="flex items-center gap-2">
                      <div className={`w-1 h-1 rounded-full ${rule.met ? 'bg-green-500' : 'bg-zinc-800'}`} />
                      <span className={`text-[8px] font-black uppercase tracking-widest ${rule.met ? 'text-green-500' : 'text-zinc-600'}`}>{rule.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleUpdateSettings}
                disabled={settingsLoading || (newUsername.length > 0 && usernameStatus !== "available") || (newPassword.length > 0 && !validatePassword(newPassword))}
                className="mt-4 w-full py-6 bg-brand-red-neon text-white font-black text-2xl uppercase tracking-tighter hover:bg-white hover:text-black transition-all brutal-shadow disabled:opacity-20 cursor-pointer"
              >
                {settingsLoading ? "UPLOADING CONFIG..." : "SAVE CHANGES"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}
