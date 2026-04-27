"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import BackgroundCanvas from "@/components/BackgroundCanvas";
import { supabase } from "@/utils/supabase/client";

const ROLES = [
  { id: "actor", label: "ACTOR", desc: "I want to be cast." },
  { id: "director", label: "DIRECTOR", desc: "I am building a vision." },
];

export default function RoleSelectionPage() {
  const router = useRouter();

  const handleSelect = async (id: string) => {
    if (id === "director") {
      alert("Director onboarding coming soon.");
      return;
    }

    // Update role in DB
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ location: id.toUpperCase() })
        .eq('id', user.id);
    }

    router.push(`/onboarding/${id}`);
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col py-12 md:py-24 relative overflow-hidden">
      <BackgroundCanvas />
      
      <div className="px-6 md:px-16 mb-16 relative z-10">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none"
        >
          INITIALIZE<br/><span className="text-brand-red-neon">PROTOCOL</span>
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
            className={`snap-center shrink-0 w-[320px] md:w-[450px] h-[450px] md:h-[600px] glass-panel brutal-border-red hover:border-brand-red-neon group relative flex flex-col justify-end p-12 text-left transition-all duration-500 overflow-hidden ${
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
                PROTOCOL: <span className="text-brand-red-neon">{role.desc}</span>
              </p>
            </div>
            
            {/* Animated Hover Background */}
            <div className="absolute inset-0 bg-gradient-to-t from-brand-red-neon/20 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-[0.22,1,0.36,1] z-0" />
            
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
          </motion.button>
        ))}
      </div>
    </main>
  );
}
