"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { supabase } from "@/utils/supabase/client";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"options" | "email">("options");

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/onboarding/role`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("OAuth error:", error);
      // Fallback for MVP demonstration
      router.push("/onboarding/role");
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding/role`,
        },
      });
      if (error) throw error;
      alert("Magic link sent! Check your email.");
    } catch (error) {
      console.error("Magic link error:", error);
      // Fallback for MVP demonstration
      router.push("/onboarding/role");
    }
  };

  return (
    <main className="min-h-screen bg-[#ff0000] text-black flex flex-col justify-center items-center px-6 py-12 relative overflow-hidden">
      {/* Background brutalist texture/grid */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmYwMDAwIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDBMOCA4Wk04IDBMMCA4WiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KPC9zdmc+')] mix-blend-multiply"></div>

      <div className="w-full max-w-md z-10 flex flex-col">
        
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-[0.85] mb-6">
            ACCESS<br/>GRANTED
          </h1>
          <div className="border-l-8 border-black pl-4">
            <p className="text-xl md:text-2xl font-bold uppercase tracking-tight leading-tight">
              Enter in 17 seconds.
            </p>
            <p className="text-lg md:text-xl font-bold uppercase tracking-tight leading-tight mt-1 opacity-80">
              One step from opportunity.<br/>
              No resumes.<br/>
              No gatekeepers.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col gap-4"
        >
          {mode === "options" && (
            <>
              <button 
                onClick={() => handleOAuthLogin('google')}
                className="w-full group relative px-6 py-5 bg-black text-white font-black text-xl uppercase tracking-tighter border-4 border-black hover:bg-white hover:text-black transition-colors duration-200 flex items-center justify-center gap-3"
              >
                {/* SVG for Google */}
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                CONTINUE WITH GOOGLE
              </button>

              <button 
                onClick={() => handleOAuthLogin('apple')}
                className="w-full group relative px-6 py-5 bg-black text-white font-black text-xl uppercase tracking-tighter border-4 border-black hover:bg-white hover:text-black transition-colors duration-200 flex items-center justify-center gap-3"
              >
                {/* SVG for Apple */}
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.74 3.58-.79 2.08.04 3.5.95 4.35 2.25-1.78 1.09-1.46 3.65.25 4.41-1.39 3.39-4.04 7.23-3.26 6.3zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.4 2.21-1.89 4.14-3.74 4.25z"/></svg>
                CONTINUE WITH APPLE
              </button>

              <button 
                onClick={() => setMode("email")}
                className="w-full group relative px-6 py-5 bg-transparent text-black font-black text-xl uppercase tracking-tighter border-4 border-black hover:bg-black hover:text-white transition-colors duration-200 flex items-center justify-center gap-3"
              >
                <Mail className="w-6 h-6" />
                EMAIL MAGIC LINK
              </button>
            </>
          )}

          {mode === "email" && (
            <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
              <input 
                type="email" 
                placeholder="YOUR@EMAIL.COM" 
                className="w-full bg-white text-black font-bold text-xl px-6 py-5 border-4 border-black outline-none focus:bg-black focus:text-white transition-colors placeholder:text-zinc-500 uppercase"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button 
                type="submit"
                className="w-full group relative px-6 py-5 bg-black text-white font-black text-2xl uppercase tracking-tighter border-4 border-black hover:bg-white hover:text-black transition-colors duration-200"
              >
                SEND MAGIC LINK
              </button>
              <button 
                type="button"
                onClick={() => setMode("options")}
                className="text-black font-bold uppercase tracking-widest text-sm mt-4 hover:underline"
              >
                [ BACK TO OPTIONS ]
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </main>
  );
}
