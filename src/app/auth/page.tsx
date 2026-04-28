"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Mail, ChevronLeft } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import BackgroundCanvas from "@/components/BackgroundCanvas";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"options" | "email" | "password" | "check_user">("options");
  const [password, setPassword] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' | 'info' } | null>(null);

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("OAuth error:", error);
    }
  };

  const handleCheckUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      setMessage(null);
      const cleanEmail = email.toLowerCase();
      // Check what identities this user has
      const { data: identities, error } = await supabase.rpc('get_user_identities', { 
        email_to_check: cleanEmail 
      });

      if (error) throw error;

      if (!identities || identities.length === 0) {
        // Truly new user
        setIsNewUser(true);
      } else {
        // User exists. Check if they have an email/password identity
        const hasEmailProvider = identities.some((id: any) => id.provider === 'email');
        const hasGoogleProvider = identities.some((id: any) => id.provider === 'google');

        if (!hasEmailProvider && hasGoogleProvider) {
          // Exists via Google but no password set
          setMessage({ text: "GOOGLE ACCOUNT DETECTED. PLEASE SIGN IN WITH GOOGLE, THEN SET PASSWORD IN DASHBOARD.", type: 'info' });
          setMode("options");
          setLoading(false);
          return;
        } else {
          // Has email provider (password exists)
          setIsNewUser(false);
        }
      }
      setMode("password");
    } catch (error: any) {
      console.error("User check error:", error);
      setMessage({ text: error.message || "USER CHECK FAILED", type: 'error' });
      setMode("password");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let identifier = email.toLowerCase();
      
      // If it's not an email, try to resolve as username
      if (!identifier.includes("@")) {
        const { data: resolvedEmail, error: rpcError } = await supabase.rpc('get_email_from_username', { 
          p_username: identifier 
        });

        if (rpcError || !resolvedEmail) {
          setMessage({ text: "USERNAME NOT FOUND. INITIALIZE WITH EMAIL.", type: 'error' });
          setMode("email");
          return;
        }
        identifier = resolvedEmail;
      }

      if (isNewUser) {
        // Sign up logic
        const { data, error } = await supabase.auth.signUp({
          email: identifier,
          password,
        });
        
        if (error) {
          if (error.message.includes("already registered")) {
            setMessage({ text: "ACCOUNT EXISTS. PLEASE SIGN IN OR USE GOOGLE AUTHENTICATION.", type: 'error' });
          } else {
            throw error;
          }
        } else if (data.user && data.user.identities && data.user.identities.length === 0) {
            setMessage({ text: "ACCOUNT EXISTS. PLEASE SIGN IN OR USE GOOGLE AUTHENTICATION.", type: 'error' });
        } else {
          // If email confirmations are disabled in Supabase, session is returned immediately
          if (data.session) {
            // Update profile with password (as requested)
            await supabase
              .from('profiles')
              .update({ password_encrypted: password }) // User requested this specifically
              .eq('id', data.session.user.id);

            router.push("/onboarding/role");
          } else {
            setMessage({ text: "ACCOUNT INITIALIZED. PLEASE PROCEED TO LOG IN.", type: 'success' });
            setIsNewUser(false);
            setMode("password");
          }
        }
      } else {
        // Sign in logic
        const { data, error } = await supabase.auth.signInWithPassword({
          email: identifier,
          password,
        });

        if (error) {
          if (error.message === "Invalid login credentials") {
            // Check if user actually exists
            const cleanEmail = identifier.toLowerCase();
            const { data: identities } = await supabase.rpc('get_user_identities', { 
              email_to_check: cleanEmail 
            });

            if (!identities || identities.length === 0) {
              setMessage({ text: "ACCOUNT NOT FOUND. ENTER A PASSWORD TO INITIALIZE.", type: 'info' });
              setIsNewUser(true);
              return;
            } else {
              setMessage({ text: "ACCESS DENIED: INVALID CREDENTIALS. CHECK PASSWORD.", type: 'error' });
            }
          } else {
            throw error;
          }
        }

        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('status')
            .eq('id', data.user.id)
            .single();

          if (profile?.status === 'VERIFIED') {
            router.push("/dashboard");
          } else {
            router.push("/onboarding/role");
          }
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      if (error.message === "Invalid login credentials") {
        setMessage({ text: "ACCESS DENIED: INVALID CREDENTIALS. CHECK PASSWORD.", type: 'error' });
      } else {
        setMessage({ text: error.message || "AUTHENTICATION FAILED", type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="h-screen bg-black text-white flex flex-col justify-center items-center px-6 py-12 relative overflow-hidden">
      <BackgroundCanvas />

      <div className="w-full max-w-2xl z-10">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-16"
        >
          <button 
            onClick={() => router.push("/")}
            className="group flex items-center gap-2 text-zinc-600 hover:text-white transition-all font-black uppercase tracking-[0.2em] text-[10px] mb-12 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </button>
          
          <h1 className="text-7xl md:text-9xl font-black uppercase tracking-tighter leading-[0.8] mb-8">
            VERIFY<br/><span className="text-brand-red-neon drop-shadow-[0_0_20px_rgba(255,49,49,0.4)]">IDENTITY</span>
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-10 md:p-16 brutal-border-red relative"
        >
          {/* Decorative Corner */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-brand-red-neon/10 clip-brutal-tr" />
          
          {message && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={`mb-8 p-4 text-[10px] font-black uppercase tracking-widest border-l-4 ${
                message.type === 'error' ? 'bg-red-500/10 border-brand-red-neon text-brand-red-neon' : 
                message.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-500' :
                'bg-blue-500/10 border-blue-500 text-blue-500'
              }`}
            >
              {message.text}
            </motion.div>
          )}

          {mode === "options" && (
            <div className="flex flex-col gap-6">
              <button 
                onClick={() => handleOAuthLogin('google')}
                className="w-full group relative px-8 py-6 bg-white text-black font-black text-2xl uppercase tracking-tighter hover:bg-brand-red-neon hover:text-white transition-all duration-500 flex items-center justify-center gap-4 clip-brutal-tl cursor-pointer"
              >
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                SIGN IN WITH GOOGLE
              </button>

              <button 
                onClick={() => setMode("email")}
                className="w-full group relative px-8 py-6 bg-zinc-900 text-white font-black text-2xl uppercase tracking-tighter border-2 border-zinc-800 hover:border-brand-red-neon transition-all duration-500 flex items-center justify-center gap-4 clip-brutal-tr cursor-pointer"
              >
                <Mail className="w-7 h-7" />
                SIGN IN WITH EMAIL
              </button>

              <div className="flex items-center gap-6 my-6">
                <div className="h-px bg-zinc-800 flex-1" />
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em]">OR</span>
                <div className="h-px bg-zinc-800 flex-1" />
              </div>

              <button 
                onClick={() => setMode("password")}
                className="w-full group relative px-8 py-6 bg-transparent text-zinc-400 font-black text-2xl uppercase tracking-tighter border-2 border-zinc-800 hover:text-white hover:border-white transition-all duration-500 flex items-center justify-center gap-4 clip-brutal-bl cursor-pointer"
              >
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                USERNAME AND PASSWORD
              </button>
            </div>
          )}

          {mode === "email" && (
            <form onSubmit={handleCheckUser} className="flex flex-col gap-10">
              <div className="flex flex-col gap-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-red-neon ml-2">Sign in with email</label>
                <input 
                  type="email" 
                  placeholder="USER@DOMAIN.COM" 
                  className="w-full bg-zinc-950 text-white font-black text-2xl px-8 py-6 border-2 border-zinc-800 outline-none focus:border-brand-red-neon transition-all placeholder:text-zinc-800 uppercase clip-brutal-tl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full group relative px-8 py-8 bg-brand-red-neon text-white font-black text-3xl uppercase tracking-tighter hover:bg-white hover:text-black transition-all duration-500 shadow-[0_0_40px_rgba(255,49,49,0.3)] clip-brutal-hero-primary cursor-pointer disabled:opacity-50"
              >
                {loading ? "PROCESSING..." : "VERIFY EMAIL"}
              </button>
              <button 
                type="button"
                onClick={() => setMode("options")}
                className="text-zinc-600 font-black uppercase tracking-[0.3em] text-[10px] hover:text-white transition-colors text-center cursor-pointer"
              >
                Go Back
              </button>
            </form>
          )}

          {mode === "password" && (
            <form onSubmit={handleAuth} className="flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-red-neon ml-2">Sign in with username or email</label>
                <input 
                  type="text" 
                  placeholder="USERNAME / EMAIL" 
                  className="w-full bg-zinc-950 text-white font-black text-2xl px-8 py-6 border-2 border-zinc-800 outline-none focus:border-brand-red-neon transition-all placeholder:text-zinc-800 uppercase clip-brutal-tl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={!isNewUser && mode === "password" && email.includes("@") && mode !== "password"} // Only readonly if coming from email check
                  required
                />
              </div>
              <div className="flex flex-col gap-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-red-neon ml-2">
                  {isNewUser ? "CREATE PASSWORD" : "Input password"}
                </label>
                <input 
                  type="password" 
                  placeholder="********" 
                  className="w-full bg-zinc-950 text-white font-black text-2xl px-8 py-6 border-2 border-zinc-800 outline-none focus:border-brand-red-neon transition-all placeholder:text-zinc-800 uppercase clip-brutal-br"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full group relative px-8 py-8 bg-brand-red-neon text-white font-black text-3xl uppercase tracking-tighter hover:bg-white hover:text-black transition-all duration-500 shadow-[0_0_40px_rgba(255,49,49,0.3)] clip-brutal-hero-primary cursor-pointer disabled:opacity-50"
              >
                {loading ? "AUTHORIZING..." : isNewUser ? "INITIALIZE ACCOUNT" : "Verify Access"}
              </button>
              <button 
                type="button"
                onClick={() => {
                  setMode("email");
                  setPassword("");
                }}
                className="text-zinc-600 font-black uppercase tracking-[0.3em] text-[10px] hover:text-white transition-colors text-center cursor-pointer"
              >
                Use Different Email
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </main>
  );
}
