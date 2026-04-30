"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { ensureUserFolder } from "@/app/actions/driveActions";

const ROLES = [
  { id: "actor", label: "ACTOR", desc: "I want to be cast." },
  { id: "director", label: "DIRECTOR", desc: "I am building a vision." },
];

export default function RoleSelectionPage() {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    if (id === "director") {
      alert("Director onboarding coming soon.");
      return;
    }

    setProcessingId(id);
    // Transition happens instantly, the animation shows the "processing" state during the navigation lag
    router.push(`/onboarding/${id}`);
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col py-12 md:py-24 relative overflow-hidden">
      
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
                    animate={{ 
                      scale: [1, 1.1, 1],
                      opacity: [1, 0.7, 1]
                    }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-white font-black text-4xl md:text-6xl uppercase tracking-tighter leading-tight"
                  >
                    INITIALIZING<br />SYSTEM
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

            {/* Scanner Line Animation */}
            {processingId === role.id && (
              <motion.div 
                className="absolute inset-x-0 h-[2px] bg-white z-[60] shadow-[0_0_15px_#fff]"
                animate={{ top: ["0%", "100%", "0%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            )}

            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
          </motion.button>
        ))}
      </div>
    </main>
  );
}
