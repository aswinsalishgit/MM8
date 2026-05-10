"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, User, Bot, Sparkles, ChevronRight, PlayCircle, Star, Search, Loader2 } from "lucide-react";

interface Message {
  id: string;
  type: "user" | "bot";
  text: string;
  matches?: any[];
}

export default function DirectorChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      text: "WELCOME TO MM8_MATCH. DESCRIBE YOUR CASTING REQUIREMENTS AND I WILL FILTER THE BEST TALENT NODES INSTANTLY.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      text: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(`${data.error}: ${data.details || 'NO_DETAILS_PROVIDED'}`);
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        text: data.matches.length > 0 
          ? `I HAVE FOUND ${data.matches.length} MATCHING NODES BASED ON YOUR PROTOCOL.` 
          : "NO DIRECT MATCHES FOUND IN THE DATABASE. TRY ADJUSTING YOUR PARAMETERS.",
        matches: data.matches,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        text: `PROTOCOL_ERROR: ${error.message}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-6">
      {/* Chat History */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar pr-4 flex flex-col gap-8 min-h-[400px]"
      >
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col gap-4 ${msg.type === "user" ? "items-end" : "items-start"}`}
            >
              <div className={`flex items-center gap-3 mb-1 ${msg.type === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border border-[var(--accent-primary)]/30 ${msg.type === "bot" ? "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]" : "bg-[var(--bg-tertiary)]"}`}>
                  {msg.type === "bot" ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-zinc-500" />}
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">
                  {msg.type === "bot" ? "MM8_AGENT" : "DIRECTOR"}
                </span>
              </div>

              <div className={`max-w-[80%] p-6 rounded-3xl border border-[var(--border-main)] ${msg.type === "bot" ? "bg-[var(--bg-secondary)]/50 text-white rounded-tl-none" : "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/10 text-white rounded-tr-none border-[var(--accent-primary)]/30"}`}>
                <p className="text-sm font-black uppercase tracking-tight leading-relaxed">{msg.text}</p>
              </div>

              {msg.matches && msg.matches.length > 0 && (
                <div className="w-full overflow-x-auto flex gap-6 pb-4 mt-4 snap-x hide-scrollbar">
                  {msg.matches.map((actor: any) => (
                    <motion.div
                      key={actor.id}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="snap-center shrink-0 w-[300px] glass-panel-premium border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl p-6 flex flex-col hover:bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/5 transition-all group cursor-pointer clip-brutal-tr"
                    >
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-main)] overflow-hidden shrink-0">
                          {actor.avatar_url_proxy ? (
                            <img src={actor.avatar_url_proxy} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-8 h-8 text-zinc-800 m-auto mt-4" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-black uppercase tracking-tighter text-white">{actor.full_name}</h4>
                          <p className="text-[8px] font-black text-[var(--accent-primary)] uppercase tracking-widest mt-1">@{actor.username || 'ANONYMOUS'}</p>
                        </div>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-zinc-600">
                          <span>AGE / GENDER</span>
                          <span className="text-white">{actor.age || '?' } / {actor.gender || '?' }</span>
                        </div>
                        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-zinc-600">
                          <span>LOCATION</span>
                          <span className="text-white">{actor.location || 'UNKNOWN'}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-6">
                        {actor.archetypes?.slice(0, 3).map((tag: string) => (
                          <span key={tag} className="text-[7px] font-black uppercase tracking-widest px-2 py-1 border border-[var(--border-main)] text-zinc-500">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <button className="mt-auto w-full py-3 bg-[var(--bg-tertiary)] border border-[var(--border-main)] text-[8px] font-black uppercase tracking-[0.3em] hover:bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] hover:text-white transition-all">
                        ANALYZE_PROFILE
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <Loader2 className="w-4 h-4 text-[var(--accent-primary)] animate-spin" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">SYNCING_PIPELINE...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] opacity-20 blur group-focus-within:opacity-40 transition-opacity rounded-[2.5rem]" />
        <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-[2.5rem] p-2 flex items-center gap-4 pr-6">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="DESCRIBE YOUR CASTING REQUIREMENTS..."
            className="flex-1 bg-transparent border-none outline-none text-sm font-black uppercase tracking-tight p-4 text-white placeholder:text-zinc-700"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-white hover:scale-110 transition-transform disabled:opacity-30 disabled:scale-100"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
