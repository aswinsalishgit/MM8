"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

const ROLES = [
  { id: "actor", label: "ACTOR", desc: "I want to be cast." },
  { id: "director", label: "DIRECTOR", desc: "I am building a vision." },
  { id: "producer", label: "PRODUCER", desc: "I am funding the vision." },
  { id: "writer", label: "WRITER", desc: "I have the script." },
  { id: "crew", label: "CREW", desc: "I make it happen." },
  { id: "fan_scout", label: "FAN SCOUT", desc: "I spot raw talent." },
  { id: "agency", label: "AGENCY", desc: "I represent the best." },
  { id: "exploring", label: "JUST EXPLORING", desc: "Let me see the network." },
];

export default function RoleSelectionPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelectedRole(id);
    // Aggressive timeout before push to allow animation to play
    setTimeout(() => {
      // In MVP, we only have actor flow built, but dynamically route it
      router.push(`/onboarding/${id}`);
    }, 800);
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col py-12 md:py-24 relative overflow-hidden">
      
      <div className="px-6 md:px-16 mb-12">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-4xl md:text-7xl font-black uppercase tracking-tighter"
        >
          WHAT BRINGS<br/>YOU HERE?
        </motion.h1>
        <motion.div 
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "100px" }}
          transition={{ delay: 0.2 }}
          className="h-2 bg-mm8-red mt-6"
        />
      </div>

      <AnimatePresence>
        {selectedRole && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-mm8-red flex flex-col items-center justify-center pointer-events-none"
          >
            <motion.h2 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="text-6xl md:text-9xl font-black text-black uppercase tracking-tighter"
            >
              LOCKED.
            </motion.h2>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 w-full overflow-x-auto snap-x snap-mandatory px-6 md:px-16 pb-12 hide-scrollbar flex items-center gap-6">
        {ROLES.map((role, index) => (
          <motion.button
            key={role.id}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handleSelect(role.id)}
            className="snap-center shrink-0 w-[280px] md:w-[400px] h-[400px] md:h-[500px] bg-zinc-900 border-4 border-zinc-800 hover:border-white hover:bg-white hover:text-black group relative flex flex-col justify-end p-8 text-left transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-6 right-6 text-xl font-black text-zinc-700 group-hover:text-zinc-300 transition-colors">
              0{index + 1}
            </div>
            
            <div className="relative z-10 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
              <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2 leading-[0.9]">
                {role.label}
              </h3>
              <p className="text-mm8-red font-bold uppercase tracking-widest text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                {role.desc}
              </p>
            </div>
            
            {/* Hover overlay effect */}
            <div className="absolute inset-0 bg-mm8-red translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[0.22,1,0.36,1] z-0 opacity-10" />
          </motion.button>
        ))}
      </div>

    </main>
  );
}
