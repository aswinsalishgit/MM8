"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronLeft, Camera, Mic, HardDrive, MapPin, Bell } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { ensureUserFolder } from "@/app/actions/driveActions";

import { useEffect } from "react";

const ROLES = [
  { id: "actor", label: "ACTOR", desc: "I want to be cast." },
  { id: "director", label: "DIRECTOR", desc: "I am building a vision." },
];

const PERMISSIONS = [
  { id: 'av', label: 'CAMERA & MICROPHONE', desc: 'Required for audition captures', icon: Camera },
  { id: 'storage', label: 'STORAGE & FILES', desc: 'Secure Drive portfolio access', icon: HardDrive },
  { id: 'location', label: 'LOCATION (GPS)', desc: 'Intelligent casting proximity', icon: MapPin },
  { id: 'notifications', label: 'NOTIFICATIONS', desc: 'Instant casting alerts', icon: Bell },
];

export default function RoleSelectionPage() {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showPermissions, setShowPermissions] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('status, role')
        .eq('id', user.id)
        .single();

      if (profile?.status === 'VERIFIED' || profile?.role) {
        router.push('/dashboard');
      }
    };
    checkUser();
  }, [router]);

  const requestPermissions = async () => {
    try {
      // 1. Camera & Mic
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    } catch (e) { console.warn("AV_DENIED", e); }

    try {
      // 2. Geolocation
      navigator.geolocation.getCurrentPosition(() => {});
    } catch (e) { console.warn("LOC_DENIED", e); }

    try {
      // 3. Notifications
      if ("Notification" in window) {
        await Notification.requestPermission();
      }
    } catch (e) { console.warn("NOTIF_DENIED", e); }

    setShowPermissions(false);
  };
  const handleSelect = (id: string) => {
    setProcessingId(id);
    // Transition happens instantly, the animation shows the "processing" state during the navigation lag
    router.push(`/onboarding/${id}`);
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col py-12 md:py-24 relative overflow-hidden">
      
      <AnimatePresence>
        {showPermissions && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <div className="max-w-xl w-full">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="glass-panel brutal-border-red p-10 md:p-16"
              >
                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-8 leading-none">
                  SYSTEM<br/><span className="text-brand-red-neon">PERMISSIONS</span>
                </h2>
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-12 border-l-2 border-brand-red-neon pl-4">
                  MM8 requires the following protocols to initialize your talent profile and secure your digital assets.
                </p>

                <div className="space-y-8 mb-16">
                  {PERMISSIONS.map((perm) => (
                    <div key={perm.id} className="flex items-start gap-6 group">
                      <div className="p-3 bg-zinc-900 brutal-border border-zinc-800 text-zinc-500 group-hover:border-brand-red-neon group-hover:text-brand-red-neon transition-colors">
                        <perm.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black uppercase tracking-widest text-xs text-white">{perm.label}</h3>
                        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">{perm.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={requestPermissions}
                  className="w-full py-8 bg-brand-red-neon text-white font-black text-2xl md:text-3xl uppercase tracking-tighter hover:bg-white hover:text-black transition-all duration-500 brutal-shadow cursor-pointer"
                >
                  INITIALIZE PROTOCOLS
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => router.push("/")}
        className="absolute top-8 left-8 md:top-12 md:left-16 z-20 flex items-center gap-2 text-zinc-500 hover:text-white font-black uppercase tracking-widest text-xs transition-colors group cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        BACK
      </button>

      <div className="px-6 md:px-16 mb-16 relative z-10">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none"
        >
          INITIALIZE<br/><span className="text-brand-red-neon">YOUR ROLE</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-zinc-500 font-bold uppercase tracking-widest text-sm mt-6 border-l-4 border-brand-red-dark pl-4"
        >
          Choose how you want to rise in the MM8 ecosystem.
        </motion.p>
      </div>

      <div className="flex-1 w-full overflow-x-auto snap-x snap-mandatory px-6 md:px-16 pb-12 hide-scrollbar flex items-center gap-10 relative z-10">
        {ROLES.map((role, index) => (
          <motion.button
            key={role.id}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handleSelect(role.id)}
            className={`snap-center shrink-0 w-[320px] md:w-[450px] h-[450px] md:h-[600px] glass-panel brutal-border-red hover:border-brand-red-neon group relative flex flex-col justify-end p-12 text-left transition-all duration-500 overflow-hidden cursor-pointer ${
              index % 2 === 0 ? 'clip-brutal-tl' : 'clip-brutal-tr'
            }`}
          >
            <div className="absolute top-10 right-10 text-3xl font-black text-brand-red-deep group-hover:text-brand-red-neon transition-colors tabular-nums">
              {index < 9 ? `0${index + 1}` : index + 1}
            </div>
            
            <div className="relative z-10 translate-y-8 group-hover:translate-y-0 transition-transform duration-500">
              <div className="w-12 h-1 bg-brand-red-neon mb-6 opacity-0 group-hover:opacity-100 transition-opacity" />
              <h3 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6 leading-[0.8]">
                {role.label}
              </h3>
              <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px] opacity-0 group-hover:opacity-100 transition-all duration-300 delay-100">
                <span className="text-brand-red-neon">{role.desc}</span>
              </p>
            </div>
            
            {/* Processing Overlay */}
            <AnimatePresence>
              {processingId === role.id && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 z-50 bg-brand-red-neon/90 flex flex-col items-center justify-center p-8 text-center backdrop-blur-md"
                >
                  <motion.div
                    className="text-white font-black text-4xl md:text-6xl uppercase tracking-tighter leading-tight"
                  >
                    CREATING<br />ACCOUNT
                  </motion.div>
                  <div className="mt-8 w-full max-w-[200px] h-1 bg-white/20 relative overflow-hidden">
                    <motion.div 
                      className="absolute inset-0 bg-white"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
          </motion.button>
        ))}
      </div>
    </main>
  );
}
