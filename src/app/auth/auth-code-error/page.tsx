"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronLeft } from "lucide-react";

export default function AuthErrorPage() {
  const router = useRouter();

  return (
    <main className="h-screen bg-black text-white flex flex-col justify-center items-center px-6 relative overflow-hidden">

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="z-10 text-center max-w-xl"
      >
        <div className="flex justify-center mb-12">
          <div className="p-8 bg-brand-red-neon/10 border-4 border-brand-red-neon clip-brutal-slant animate-pulse">
            <AlertTriangle className="w-16 h-16 text-brand-red-neon" />
          </div>
        </div>

        <h1 className="text-7xl md:text-9xl font-black uppercase tracking-tighter leading-[0.8] mb-8">
          AUTH<br/><span className="text-brand-red-neon drop-shadow-[0_0_20px_rgba(255,49,49,0.4)]">ERROR</span>
        </h1>

        <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-sm mb-12">
          The authentication handshake failed or the secure token was invalid. 
          <br /><span className="text-white">Protocol termination initiated.</span>
        </p>

        <button 
          onClick={() => router.push("/auth")}
          className="group flex items-center justify-center gap-3 w-full p-10 bg-brand-red-neon text-white font-black uppercase tracking-tighter text-3xl clip-brutal-hero-primary hover:bg-white hover:text-black transition-all duration-500 shadow-[0_0_50px_rgba(255,49,49,0.3)]"
        >
          <ChevronLeft className="w-8 h-8 group-hover:-translate-x-2 transition-transform" />
          RETRY_ACCESS
        </button>
      </motion.div>
    </main>
  );
}
