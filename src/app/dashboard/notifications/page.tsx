"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronLeft, Bell, AlertTriangle, Info, Check } from "lucide-react";
import { supabase } from "@/utils/supabase/client";

interface Notification {
  id: string;
  title: string;
  body: string;
  priority: string;
  read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth"); return; }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!error && data) setNotifications(data);
      setLoading(false);
    };
    fetchNotifications();
  }, [router]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", session.user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const filteredNotifications = filter === "UNREAD" 
    ? notifications.filter(n => !n.read) 
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "VERY IMPORTANT": return { color: "border-brand-red-neon bg-brand-red-neon/10", icon: AlertTriangle, iconColor: "text-brand-red-neon", badge: "bg-brand-red-neon" };
      case "IMPORTANT": return { color: "border-yellow-500/50 bg-yellow-500/5", icon: AlertTriangle, iconColor: "text-yellow-500", badge: "bg-yellow-500" };
      default: return { color: "border-zinc-800 bg-zinc-950/50", icon: Info, iconColor: "text-zinc-500", badge: "bg-zinc-600" };
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}M AGO`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}H AGO`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}D AGO`;
  };

  if (loading) {
    return <main className="min-h-screen bg-black" />;
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-12 relative selection:bg-brand-red-neon selection:text-white">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-zinc-900 pb-12 mb-16">
        <div>
          <button 
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-zinc-500 hover:text-white font-black uppercase tracking-widest text-xs transition-colors group cursor-pointer mb-8"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            BACK TO CMD
          </button>
          <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-none">
            NOTIF<span className="text-brand-red-neon drop-shadow-[0_0_15px_rgba(255,49,49,0.5)]">//</span>CENTER
          </h1>
          <div className="flex items-center gap-4 mt-6">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`w-1 h-4 ${i < unreadCount ? 'bg-brand-red-neon' : 'bg-zinc-800'}`} />
              ))}
            </div>
            <p className="text-zinc-600 font-black tracking-[0.4em] uppercase text-[10px] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-red-neon animate-pulse" />
              {unreadCount} UNREAD_SIGNALS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-8 md:mt-0">
          <div className="flex items-center gap-0">
            {(["ALL", "UNREAD"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-3 font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer ${
                  filter === f ? 'bg-brand-red-neon text-white' : 'bg-zinc-950 text-zinc-500 hover:text-white brutal-border border-zinc-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button 
              onClick={markAllRead}
              className="px-6 py-3 glass-panel brutal-border-red text-brand-red-neon font-black uppercase tracking-widest text-[10px] hover:bg-brand-red-neon hover:text-white transition-all cursor-pointer flex items-center gap-2"
            >
              <Check className="w-3 h-3" /> MARK ALL READ
            </button>
          )}
        </div>
      </header>

      {/* Notification List */}
      <div className="max-w-5xl mx-auto space-y-6">
        <AnimatePresence>
          {filteredNotifications.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="text-center py-32"
            >
              <Bell className="w-16 h-16 text-zinc-800 mx-auto mb-8" />
              <p className="text-zinc-600 font-black uppercase tracking-[0.5em] text-sm">
                {filter === "UNREAD" ? "ALL SIGNALS PROCESSED" : "NO TRANSMISSIONS YET"}
              </p>
            </motion.div>
          ) : (
            filteredNotifications.map((notif, index) => {
              const config = getPriorityConfig(notif.priority);
              const PriorityIcon = config.icon;
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => !notif.read && markAsRead(notif.id)}
                  className={`p-8 md:p-10 brutal-border transition-all cursor-pointer group relative overflow-hidden ${config.color} ${
                    !notif.read ? 'hover:border-brand-red-neon' : 'opacity-60 hover:opacity-80'
                  }`}
                >
                  {/* Unread indicator */}
                  {!notif.read && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-brand-red-neon shadow-[0_0_10px_rgba(255,49,49,0.5)]" />
                  )}

                  <div className="flex items-start gap-6 md:gap-8">
                    <div className={`p-3 ${notif.priority === 'VERY IMPORTANT' ? 'bg-brand-red-neon/20' : 'bg-zinc-900'} shrink-0`}>
                      <PriorityIcon className={`w-5 h-5 ${config.iconColor}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-4 mb-3 flex-wrap">
                        <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest text-white ${config.badge}`}>
                          {notif.priority}
                        </span>
                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest tabular-nums">
                          {formatTime(notif.created_at)}
                        </span>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-brand-red-neon animate-pulse" />
                        )}
                      </div>
                      
                      <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter mb-4 group-hover:text-brand-red-neon transition-colors leading-tight">
                        {notif.title}
                      </h3>
                      <p className="text-zinc-400 font-medium text-sm leading-relaxed">
                        {notif.body}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
