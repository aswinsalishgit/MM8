"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, Users, MessageSquare, Bell, Star, Zap, Search, 
  ChevronRight, ChevronLeft, MoreVertical, ShieldCheck, 
  Flame, Trophy, Target, Home, PlusSquare, Rss
} from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import "./stangab.css";

// STANGAB UI: Realtime Community Hub
export default function StangabHub() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"FEED" | "COMMUNITY" | "MESSAGES">("FEED");
  const [messages, setMessages] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [news, setNews] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Auth & Profile Sync
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth");
        return;
      }
      setUser(session.user);
      
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      setProfile(prof);
      setLoading(false);
    };
    fetchUser();
  }, [router]);

  // 2. Realtime Subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('stangab-realtime')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `recipient_id=eq.${user.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        // Sound notification or toast would go here
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'news'
      }, () => {
        fetchNews();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNews = async () => {
    const { data } = await supabase.from('news').select('*').order('created_at', { ascending: false }).limit(10);
    if (data) setNews(data);
  };

  useEffect(() => {
    fetchNews();
  }, []);

  // 3. Chat Logic
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    const msg = {
      sender_id: user.id,
      recipient_id: selectedChat.id,
      content: newMessage.trim(),
    };

    const { error } = await supabase.from('messages').insert(msg);
    if (!error) {
      setMessages(prev => [...prev, { ...msg, created_at: new Date().toISOString() }]);
      setNewMessage("");
    }
  };

  if (loading) return (
    <div className="h-screen bg-black flex items-center justify-center">
       <h1 className="text-4xl font-black text-white animate-pulse">SYNCHRONIZING_SIGNAL...</h1>
    </div>
  );

  return (
    <main className="h-screen bg-[var(--bg-primary)] text-white flex overflow-hidden selection:bg-[var(--accent-primary)] selection:text-white">
      
      {/* LEFT NAVIGATION: GLOBAL CONTROL */}
      <nav className="w-24 border-r border-white/10 flex flex-col items-center py-10 gap-8 shrink-0 bg-black/40 backdrop-blur-xl">
        <div className="w-12 h-12 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full flex items-center justify-center shadow-[0_0_20px_var(--accent-glow)]">
          <span className="font-black text-xl">M</span>
        </div>
        
        <div className="flex flex-col gap-4 mt-10">
          {[
            { id: 'FEED', icon: Rss },
            { id: 'COMMUNITY', icon: Users },
            { id: 'MESSAGES', icon: MessageSquare }
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`p-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-[var(--accent-primary)] text-white shadow-[0_0_20px_var(--accent-glow)]' : 'text-zinc-600 hover:text-white'}`}
            >
              <item.icon className="w-6 h-6" />
            </button>
          ))}
        </div>

        <button onClick={() => router.push("/dashboard")} className="mt-auto p-4 text-zinc-600 hover:text-white transition-all">
          <Home className="w-6 h-6" />
        </button>
      </nav>

      {/* CENTRAL HUB: THE SIGNAL FEED */}
      <section className="flex-1 flex flex-col border-r border-white/10 overflow-hidden relative">
        <header className="h-24 border-b border-white/10 flex items-center justify-between px-10 shrink-0">
          <div className="flex items-center gap-4">
             <h1 className="text-4xl font-black uppercase tracking-tighter">STANGAB</h1>
             <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest text-green-500">LIVE_SIGNAL</span>
             </div>
          </div>
          <div className="flex items-center gap-6">
            <Search className="w-5 h-5 text-zinc-500" />
            <Bell className="w-5 h-5 text-zinc-500" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {activeTab === 'FEED' && (
            <div className="max-w-3xl mx-auto flex flex-col gap-12">
               {news.map((item, idx) => (
                 <motion.article 
                   key={item.id}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: idx * 0.1 }}
                   className="glass-panel-premium p-8 border border-white/10 rounded-3xl group cursor-pointer hover:border-[var(--accent-primary)]/50 transition-all"
                 >
                   <div className="flex justify-between items-start mb-6">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--accent-primary)]">{item.category}</span>
                      <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">{new Date(item.created_at).toLocaleDateString()}</span>
                   </div>
                   <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-6 group-hover:text-[var(--accent-primary)] transition-colors">{item.title}</h2>
                   <p className="text-zinc-400 text-sm leading-relaxed mb-8">{item.content}</p>
                   <div className="flex items-center gap-6 pt-6 border-t border-white/5">
                      <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                         <MessageSquare className="w-4 h-4" /> 24 SIGNALS
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                         <Flame className="w-4 h-4 text-orange-500" /> 156 INTENSITY
                      </div>
                   </div>
                 </motion.article>
               ))}
            </div>
          )}

          {activeTab === 'MESSAGES' && (
            <div className="h-full flex flex-col">
               {selectedChat ? (
                 <div className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4">
                       {messages.filter(m => (m.sender_id === user.id && m.recipient_id === selectedChat.id) || (m.sender_id === selectedChat.id && m.recipient_id === user.id)).map((msg, i) => (
                         <div key={i} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] p-4 rounded-2xl font-medium text-sm ${msg.sender_id === user.id ? 'bg-[var(--accent-primary)] text-white' : 'bg-zinc-900 text-zinc-300'}`}>
                               {msg.content}
                            </div>
                         </div>
                       ))}
                       <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={sendMessage} className="p-6 border-t border-white/10 flex gap-4">
                       <input 
                         value={newMessage}
                         onChange={(e) => setNewMessage(e.target.value)}
                         placeholder="TYPE_MESSAGE..." 
                         className="flex-1 bg-zinc-900 border border-white/10 px-6 py-4 rounded-2xl outline-none focus:border-[var(--accent-primary)] transition-all uppercase font-black text-xs tracking-widest"
                       />
                       <button type="submit" className="p-4 bg-[var(--accent-primary)] rounded-2xl hover:scale-105 transition-transform shadow-[0_0_20px_var(--accent-glow)]">
                          <Send className="w-5 h-5" />
                       </button>
                    </form>
                 </div>
               ) : (
                 <div className="flex-1 flex flex-col items-center justify-center opacity-20">
                    <MessageSquare className="w-24 h-24 mb-6" />
                    <h2 className="text-2xl font-black uppercase tracking-[0.5em]">Select Node to Establish Uplink</h2>
                 </div>
               )}
            </div>
          )}
        </div>
      </section>

      {/* RIGHT SIDEBAR: ACTIVE NODES */}
      <aside className="w-96 hidden xl:flex flex-col bg-black/20 backdrop-blur-md">
        <header className="h-24 border-b border-white/10 flex items-center px-10">
           <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500">ACTIVE_NODES</h3>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 custom-scrollbar">
           {/* Direct Messages List */}
           <div className="flex flex-col gap-2">
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-2">DIRECT_CHANNELS</span>
              {/* Mock active users for now */}
              {[
                { id: 'u1', name: 'DIRECTOR_KARTHIK', status: 'ONLINE', avatar: 'K' },
                { id: 'u2', name: 'AGENT_X_SYSTEM', status: 'AWAY', avatar: 'A' },
                { id: 'u3', name: 'STANGAB_ADMIN', status: 'ONLINE', avatar: 'S' }
              ].map(node => (
                <button 
                  key={node.id}
                  onClick={() => { setSelectedChat(node); setActiveTab('MESSAGES'); }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-all rounded-2xl group border border-transparent hover:border-white/10"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-black text-xs border border-white/10 group-hover:border-[var(--accent-primary)]/50 transition-all">
                    {node.avatar}
                  </div>
                  <div className="flex-1 text-left">
                     <p className="text-[10px] font-black uppercase tracking-widest group-hover:text-[var(--accent-primary)] transition-colors">{node.name}</p>
                     <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${node.status === 'ONLINE' ? 'text-green-500' : 'text-zinc-600'}`}>{node.status}</p>
                  </div>
                </button>
              ))}
           </div>
        </div>

        <div className="p-8 border-t border-white/10 bg-black/40">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] p-[1px]">
                 <div className="w-full h-full bg-black rounded-full flex items-center justify-center font-black">
                    {profile?.username?.[0] || 'U'}
                 </div>
              </div>
              <div>
                 <p className="text-[10px] font-black uppercase tracking-widest">@{profile?.username || 'ANONYMOUS'}</p>
                 <div className="flex items-center gap-1 mt-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    <span className="text-[8px] font-black text-zinc-500 uppercase">ENCRYPTED_SESSION</span>
                 </div>
              </div>
           </div>
        </div>
      </aside>

      {/* Background Noise Simulation */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-50 mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
    </main>
  );
}
