"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlayCircle, Star, Settings, Bell, LogOut, X,
  ChevronRight, Crown, Upload, Trash2, MapPin,
  ChevronDown, Check, User, CheckCircle2, Trophy, Flame, Lock, ShieldCheck, AlertTriangle, Zap,
  Menu, Home, Compass, PlusSquare, Briefcase, Target, Rss, Users
} from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { uploadProfilePicture, removeProfilePicture, uploadAuditionTape } from "@/app/actions/driveActions";
import { Country, State, City } from "country-state-city";
import "./dashboard.css";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/utils/cropImage";

const sanitizeAvatarUrl = (url: string | null) => {
  if (!url) return null;
  // If it's a legacy Google Drive link, extract ID and use our proxy
  if (url.includes('drive.google.com')) {
    const match = url.match(/[?&]id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
    if (match && match[1]) {
      return `/api/drive/stream/${match[1]}`;
    }
  }
  return url;
};

const LANGUAGES_LIST = ["MALAYALAM", "TAMIL", "HINDI", "TELUGU", "ENGLISH", "KANNADA"];
const PERSONALITIES_LIST = ["INTENSE", "FUNNY", "VILLAIN", "ROMANTIC", "VERSATILE", "ACTION", "INNOCENT", "EMOTIONAL"];
const AVAILABILITY_LABELS = ["IMMEDIATELY", "THIS MONTH", "IN 3 MONTHS"];
const DESIRE_LIST = ["FIRST BREAK", "LEAD ROLES", "OTT DEBUT", "COMMERCIALS", "SIDE ROLES", "BUILD PROFILES", "EARN INCOME", "OTHERS"];

const TIER_CONFIG: Record<string, { color: string; glow: string; label: string }> = {
  'NEW TALENT': { color: 'text-zinc-500', glow: '', label: 'NEW TALENT' },
  'RISING': { color: 'text-blue-400', glow: 'drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]', label: 'RISING' },
  'ACTIVE': { color: 'text-green-400', glow: 'drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]', label: 'ACTIVE' },
  'PRO TALENT': { color: 'text-yellow-400', glow: 'drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]', label: 'PRO TALENT' },
  'ELITE': { color: 'text-brand-red-neon', glow: 'drop-shadow-[0_0_15px_rgba(255,49,49,0.8)]', label: 'ELITE' },
};

const useDashboardData = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth");
        return;
      }

      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      // If profile doesn't exist, try to create one or use default
      if (error || !profile) {
        console.warn("Profile not found, initializing default...", error);
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name || "AGENT_X",
            status: "UNVERIFIED"
          })
          .select()
          .single();

        if (!createError && newProfile) {
          profile = newProfile;
        } else {
          profile = { full_name: "AGENT_X", status: "UNVERIFIED", lumen_points: 0, location: "UNKNOWN" };
        }
      }

      // --- LUMEN GRANT: +1000 on first dashboard entry ---
      if (!profile.lumen_granted) {
        await supabase.rpc('award_lumen', {
          p_user_id: session.user.id,
          p_amount: 1000,
          p_action: 'BASE_GRANT',
          p_reason: 'First dashboard entry — welcome to MM8'
        });

        await supabase.from('profiles').update({
          lumen_granted: true,
          last_active: new Date().toISOString(),
          streak_days: 1
        }).eq('id', session.user.id);

        // Refetch profile after grant
        const { data: refreshed } = await supabase
          .from('profiles').select('*').eq('id', session.user.id).single();
        if (refreshed) profile = refreshed;
      } else {
        // --- STREAK & DAILY LOGIN ---
        const lastActive = profile.last_active ? new Date(profile.last_active) : null;
        const now = new Date();
        const isNewDay = !lastActive ||
          (now.toDateString() !== lastActive.toDateString());

        if (isNewDay) {
          let streakDays = profile.streak_days || 0;
          const hoursSinceLast = lastActive ? (now.getTime() - lastActive.getTime()) / 3600000 : 999;

          if (hoursSinceLast <= 48) {
            streakDays += 1;
          } else {
            streakDays = 1; // Reset streak
          }

          // Daily login LMN
          let loginBonus = 10;
          if (streakDays >= 30) loginBonus = 300;
          else if (streakDays >= 7) loginBonus = 50;

          await supabase.rpc('award_lumen', {
            p_user_id: session.user.id,
            p_amount: loginBonus,
            p_action: 'DAILY_LOGIN',
            p_reason: `Day ${streakDays} streak — +${loginBonus} LMN`
          });

          // Consistency bonus: active 5+ days this week
          if (streakDays >= 5 && streakDays % 7 === 5) {
            await supabase.rpc('award_lumen', {
              p_user_id: session.user.id,
              p_amount: 150,
              p_action: 'CONSISTENCY_BONUS',
              p_reason: 'Active 5+ days this week'
            });
          }

          await supabase.from('profiles').update({
            streak_days: streakDays,
            last_active: now.toISOString()
          }).eq('id', session.user.id);

          // Refetch
          const { data: refreshed } = await supabase
            .from('profiles').select('*').eq('id', session.user.id).single();
          if (refreshed) profile = refreshed;
        }
      }

      // --- FETCH TODAY'S MISSIONS ---
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: todayLogs } = await supabase
        .from('lumen_log')
        .select('action')
        .eq('user_id', session.user.id)
        .gte('created_at', todayStart.toISOString());

      const missionActions = (todayLogs || []).map(l => l.action);

      const multiplier = profile.is_vip ? 1.3 : 1.0;

      // --- FETCH LEADERBOARD ---
      const { data: leaderboard } = await supabase
        .from('profiles')
        .select('id, mm8_id, full_name, username, avatar_url_proxy, lumen_points, lumen_tier, is_vip, streak_days')
        .gt('lumen_points', 0)
        .order('lumen_points', { ascending: false })
        .limit(10);

      // --- FETCH NOTIFICATIONS ---
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setData({
        profile: {
          id: profile.id,
          name: profile.full_name || "AGENT_X",
          username: profile.username || null,
          status: profile.status || "UNVERIFIED",
          lumenPoints: profile.lumen_points || 0,
          lumenTier: profile.lumen_tier || 'NEW TALENT',
          peakLumen: profile.peak_lumen || 0,
          streakDays: profile.streak_days || 0,
          location: profile.location || "UNKNOWN",
          avatarUrl: sanitizeAvatarUrl(profile.avatar_url_proxy),
          mm8Id: profile.mm8_id || null,
          isVip: profile.is_vip || false,
          multiplier: multiplier,
          objectivePreference: profile.objective_preference || "",
          languages: profile.languages || [],
          archetypes: profile.archetypes || [],
          experience: profile.experience || "",
          opportunityReadiness: profile.opportunity_readiness || "",
        },
        missions: [
          {
            label: 'UPLOAD AUDITION TAPE',
            reward: Math.floor(40 * multiplier),
            done: missionActions.includes('UPLOAD_TAPE') || missionActions.includes('AUDITION_UPLOAD')
          },
          {
            label: 'COMPLETE PROFILE FIELD',
            reward: Math.floor(10 * multiplier),
            done: missionActions.includes('PROFILE_UPDATE') || missionActions.includes('ONBOARDING_COMPLETE')
          },
          {
            label: 'DAILY LOGIN',
            reward: Math.floor(10 * multiplier),
            done: missionActions.includes('DAILY_LOGIN')
          },
        ],
        leaderboard: (leaderboard || []).map((u: any, i: number) => ({
          rank: i + 1,
          id: u.id,
          name: u.full_name || 'UNKNOWN',
          username: u.username || null,
          avatarUrl: sanitizeAvatarUrl(u.avatar_url_proxy),
          score: u.lumen_points,
          tier: u.lumen_tier,
          isVip: u.is_vip,
          streakDays: u.streak_days || 0,
          isUser: u.id === session.user.id,
        })),
        roles: [],
        notifications: notifs || [],
      });
    } catch (error) {
      console.error("Dashboard critical error:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();

    // --- REAL-TIME SUBSCRIPTION ---
    const channel = supabase
      .channel('dashboard-sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, () => {
        console.log("PROFILE_SYNC_TRIGGERED");
        fetchData();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'lumen_log'
      }, () => {
        console.log("LMN_LOG_SYNC_TRIGGERED");
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  return { data, loading, fetchData };
};

export default function AgenticDashboard() {
  const router = useRouter();
  const { data, loading, fetchData } = useDashboardData();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' | 'info' } | null>(null);

  // Navigation State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState("OVERVIEW");

  const NAVIGATION_ITEMS = [
    { id: 'CREATE', label: 'CREATE', icon: PlusSquare },
    { id: 'OVERVIEW', label: 'OVERVIEW', icon: Home },
    { id: 'ROLES', label: 'ROLES', icon: Briefcase },
    { id: 'MISSIONS', label: 'MISSIONS', icon: Target },
    { id: 'LEADERBOARD', label: 'LEADERBOARD', icon: Trophy },
    { id: 'FEED', label: 'FEED', icon: Rss },
    { id: 'LMN_REGISTER', label: 'LMN REGISTER', icon: Zap },
    { id: 'COMMUNITY', label: 'COMMUNITY', icon: Users },
  ];

  // Preference State
  const [prefDesire, setPrefDesire] = useState("");
  const [prefLanguages, setPrefLanguages] = useState<string[]>([]);
  const [prefArchetypes, setPrefArchetypes] = useState<string[]>([]);
  const [prefExperience, setPrefExperience] = useState("");
  const [prefAvailability, setPrefAvailability] = useState("");
  const [prefLocation, setPrefLocation] = useState("");

  const [isUploadingPFP, setIsUploadingPFP] = useState(false);

  // Cropping State
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  // Sync preferences when modal opens or data changes
  useEffect(() => {
    if (data?.profile) {
      setPrefDesire(data.profile.objectivePreference || "");
      setPrefLanguages(data.profile.languages || []);
      setPrefArchetypes(data.profile.archetypes || []);
      setPrefExperience(data.profile.experience || "");
      setPrefAvailability(data.profile.opportunityReadiness || "");
      setPrefLocation(data.profile.location || "");
    }
  }, [data, showSettings]);

  const validateUsername = (username: string) => {
    return /^[a-z]+$/.test(username);
  };

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return minLength && hasUpper && hasNumber && hasSpecial;
  };

  const completionProgress = useMemo(() => {
    if (!data?.profile) return 0;
    const fields = [
      data.profile.avatarUrl,
      data.profile.username,
      data.profile.location && data.profile.location !== 'UNKNOWN',
      data.profile.objectivePreference,
      data.profile.languages?.length > 0,
      data.profile.archetypes?.length > 0,
      data.profile.opportunityReadiness
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [data]);

  const checkUsername = async (username: string) => {
    if (!username) {
      setUsernameStatus("idle");
      return;
    }
    if (!validateUsername(username)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");
    try {
      const { data: exists, error } = await supabase.rpc('check_username_exists', { p_username: username });
      if (error) throw error;
      setUsernameStatus(exists ? "taken" : "available");
    } catch (err) {
      console.error(err);
      setUsernameStatus("idle");
    }
  };

  const handleUpdateSettings = async () => {
    setMessage(null);
    if (newUsername && usernameStatus !== "available") {
      setMessage({ text: "CHOOSE A VALID AND AVAILABLE USERNAME.", type: 'error' });
      return;
    }
    if (newPassword && !validatePassword(newPassword)) {
      setMessage({ text: "PASSWORD PROTOCOL VIOLATION.", type: 'error' });
      return;
    }

    setSettingsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      if (newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      }

      const profileUpdate: any = {
        objective_preference: prefDesire,
        languages: prefLanguages,
        archetypes: prefArchetypes,
        experience: prefExperience,
        opportunity_readiness: prefAvailability,
        location: prefLocation
      };

      if (newUsername) {
        profileUpdate.username = newUsername;
      }

      const { error } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id);

      if (error) throw error;

      setMessage({ text: "SYSTEM CONFIG UPDATED.", type: 'success' });
      // Refresh local data by just closing and letting the next open re-sync, 
      // or we could trigger a re-fetch. For now, let's just close.
      setTimeout(() => {
        setShowSettings(false);
        window.location.reload(); // Simple way to refresh all HUDs
      }, 1500);
    } catch (err: any) {
      setMessage({ text: `CRITICAL ERROR: ${err.message}`, type: 'error' });
    } finally {
      setSettingsLoading(false);
    }
  };

  const handlePFPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_area: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleApplyCrop = async () => {
    if (!cropImage || !croppedAreaPixels) return;

    setIsUploadingPFP(true);
    setShowCropModal(false);
    setMessage({ text: "PROCESSING BIOMETRIC UPLOAD...", type: 'info' });

    try {
      const croppedBlob = await getCroppedImg(cropImage, croppedAreaPixels);
      if (!croppedBlob) throw new Error("CROP_FAILURE");

      const formData = new FormData();
      formData.append('file', croppedBlob, 'pfp.jpg');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication failure");

      const profileUrl = await uploadProfilePicture(formData);
      if (profileUrl) {
        setMessage({ text: "IDENTITY HUD UPDATED.", type: 'success' });
        // Real-time will handle the refresh, but let's clear local state
        setCropImage(null);
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: "PFP_UPLOAD_FAILURE", type: 'error' });
    } finally {
      setIsUploadingPFP(false);
    }
  };

  const handleRemovePFP = async () => {
    if (!confirm("PERMANENTLY REMOVE IDENTITY IMAGE?")) return;
    try {
      await removeProfilePicture();
      setMessage({ text: "PFP REMOVED.", type: 'success' });
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setMessage({ text: "REMOVAL_FAILURE", type: 'error' });
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setMessage({ text: `LOGOUT_FAILURE: ${error.message}`, type: 'error' });
    } else {
      router.push("/");
    }
  };

  const handleUploadClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      setUploading(true);
      setUploadProgress(0);

      try {
        const initRes = await fetch("/api/drive/init-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, mimeType: file.type }),
        });

        if (!initRes.ok) {
          const errorData = await initRes.json();
          throw new Error(`Failed to initialize upload: ${errorData.details || errorData.error}`);
        }

        const { uploadUrl } = await initRes.json();

        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", uploadUrl, true);
          xhr.setRequestHeader("Content-Type", file.type);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percentComplete = Math.floor((e.loaded / e.total) * 100);
              setUploadProgress(percentComplete);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(xhr.responseText);
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error("Network Error during upload"));
          xhr.send(file);
        });

        setMessage({ text: "AUDITION SECURELY UPLOADED TO DRIVE. +40 LMN AWARDED.", type: 'success' });

        // Award LUMEN for upload
        const { data: { session: uploadSession } } = await supabase.auth.getSession();
        if (uploadSession) {
          await supabase.rpc('award_lumen', {
            p_user_id: uploadSession.user.id,
            p_amount: 40,
            p_action: 'UPLOAD_TAPE',
            p_reason: 'Audition tape uploaded'
          });

          // Force immediate re-fetch
          await fetchData();
        }
      } catch (error: any) {
        console.error("Upload error:", error);
        setMessage({ text: `UPLOAD FAILED: ${error.message}`, type: 'error' });
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    };
    input.click();
  };

  if (loading || !data) {
    return (
      <main className="min-h-screen bg-black">
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex overflow-hidden selection:bg-brand-red-neon selection:text-white">

      {/* Status Bar */}
      {message && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`fixed top-0 left-0 w-full z-[2000] p-4 text-center font-black uppercase tracking-[0.4em] text-[10px] border-b ${message.type === 'error' ? 'bg-red-500/10 border-brand-red-neon text-brand-red-neon' :
              message.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-500' :
                'bg-brand-red-neon/10 border-brand-red-neon text-white'
            }`}
        >
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="ml-8 text-zinc-500 hover:text-white"
          >
            [ DISMISS ]
          </button>
        </motion.div>
      )}

      {/* Sidebar Navigation */}
      <AnimatePresence>
        {(isSidebarOpen || (typeof window !== 'undefined' && window.innerWidth > 1024)) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ duration: 0.3, ease: "circOut" }}
            data-lenis-prevent
            className="fixed lg:static inset-y-0 left-0 w-72 bg-black border-r border-zinc-900 z-[150] flex flex-col overflow-y-auto custom-scrollbar shrink-0"
          >
            <div className="p-8 border-b border-zinc-900 flex justify-between items-center shrink-0">
              <h2 className="text-4xl font-black uppercase tracking-tighter">MM8</h2>
              <button className="lg:hidden p-2 hover:bg-zinc-900 transition-colors" onClick={() => setIsSidebarOpen(false)}>
                <X className="w-6 h-6 text-zinc-500 hover:text-white" />
              </button>
            </div>

            <div className="p-8 border-b border-zinc-900 shrink-0 flex flex-col items-center">
              <div className="w-32 h-32 brutal-border-red bg-zinc-900 mb-6 relative overflow-hidden rounded-full">
                {data.profile.avatarUrl ? (
                  <img src={data.profile.avatarUrl} alt="PFP" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-zinc-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                )}
              </div>
              <p className="font-black text-center text-sm uppercase tracking-widest text-zinc-500">@{data.profile.username || 'AGENT'}</p>
            </div>

            <nav className="flex-1 p-4 flex flex-col gap-2">
              {NAVIGATION_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    if (window.innerWidth <= 1024) setIsSidebarOpen(false);
                    if (item.id === 'SETTINGS') setShowSettings(true);
                    if (item.id === 'LOGOUT') handleLogout();
                  }}
                  className={`w-full flex items-center gap-4 p-4 text-left font-black uppercase tracking-widest text-[10px] transition-all ${currentView === item.id
                      ? 'bg-brand-red-neon/10 border-l-4 border-brand-red-neon text-white'
                      : 'border-l-4 border-transparent text-zinc-500 hover:bg-zinc-900 hover:text-white'
                    }`}
                >
                  <item.icon className={`w-4 h-4 ${currentView === item.id ? 'text-brand-red-neon' : ''}`} />
                  {item.label}
                </button>
              ))}
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Wrapper */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">

        {/* Top Header */}
        <header className="h-20 border-b border-zinc-900 bg-black flex items-center justify-between px-6 shrink-0 z-[100]">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-3 hover:bg-zinc-900 transition-colors lg:hidden"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>

          <div className="hidden lg:block" /> {/* Spacer */}

          <div className="flex items-center gap-6 md:gap-12 ml-auto">
            <div className="flex items-center gap-4 md:gap-8">
              <button onClick={() => setCurrentView('OVERVIEW')} className="p-2 hover:bg-zinc-900 rounded-full transition-colors group" title="HOME">
                <Home className="w-5 h-5 text-zinc-500 group-hover:text-white transition-all" />
              </button>
              <button className="p-2 hover:bg-zinc-900 rounded-full transition-colors group" title="DISCOVER">
                <Compass className="w-5 h-5 text-zinc-500 group-hover:text-white transition-all" />
              </button>
              <button onClick={() => router.push('/dashboard/notifications')} className="p-2 hover:bg-zinc-900 rounded-full transition-colors group relative" title="NOTIFICATIONS">
                <Bell className="w-5 h-5 text-zinc-500 group-hover:text-white transition-all" />
                {data.notifications?.filter((n: any) => !n.read).length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-brand-red-neon rounded-full" />
                )}
              </button>
              <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-zinc-900 rounded-full transition-colors group" title="SETTINGS">
                <Settings className="w-5 h-5 text-zinc-500 group-hover:text-white transition-all" />
              </button>
            </div>

            <div className="w-[1px] h-8 bg-zinc-900 hidden md:block" />

            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 brutal-border-red">
              {data.profile.avatarUrl ? (
                <img src={data.profile.avatarUrl} alt="PFP" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-zinc-700 m-auto mt-2" />
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div
          className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-12 relative z-10 w-full"
          data-lenis-prevent
        >

          {currentView === 'OVERVIEW' ? (
            <div className="animate-in fade-in duration-500 space-y-8">
              {/* Top Row: Tactical Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Identity Card */}
                <div className="lg:col-span-4 glass-panel p-6 brutal-border-red flex items-center gap-6 clip-brutal-tl">
                  <div className="w-20 h-20 bg-zinc-950 brutal-border-red rounded-full overflow-hidden shrink-0">
                    {data.profile.avatarUrl ? (
                      <img src={data.profile.avatarUrl} alt="PFP" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-zinc-800 m-auto mt-4" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">{data.profile.name}</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-red-neon mt-2">@{data.profile.username || 'AGENT'}</p>
                    <div className="mt-4 w-32 h-1.5 bg-zinc-950 relative overflow-hidden clip-brutal-slant">
                      <div className="absolute inset-0 bg-brand-red-neon" style={{ width: `${completionProgress}%` }} />
                    </div>
                  </div>
                </div>

                {/* Status HUD */}
                <div className="lg:col-span-4 glass-panel p-6 brutal-border flex items-center justify-between">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-600 mb-2">ACCOUNT_STATUS</p>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-black text-white tabular-nums">{data.profile.lumenPoints.toLocaleString()}</span>
                      <span className="text-sm font-black text-brand-red-neon mb-1">LMN</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-[9px] font-black uppercase tracking-widest ${TIER_CONFIG[data.profile.lumenTier]?.color || 'text-zinc-500'}`}>
                      {data.profile.lumenTier}
                    </p>
                    <div className="flex items-center gap-2 mt-2 justify-end">
                      <Zap className={`w-3 h-3 ${TIER_CONFIG[data.profile.lumenTier]?.glow || ''}`} />
                      <span className="text-[10px] font-black text-zinc-500">#{String(data.profile.mm8Id).padStart(4, '0')}</span>
                    </div>
                  </div>
                </div>

                {/* Compact Upload Action */}
                <div className="lg:col-span-4">
                  <button
                    onClick={handleUploadClick}
                    disabled={uploading}
                    className="w-full h-full bg-brand-red-neon p-6 flex items-center justify-between group clip-brutal-tr hover:bg-white hover:text-brand-red-neon transition-all duration-300"
                  >
                    <div className="text-left">
                      <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">
                        {uploading ? `${uploadProgress}%` : "UPLOAD AUDITION"}
                      </h3>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-80 mt-2">SECURE_TALENT_UPLINK</p>
                    </div>
                    <PlayCircle className="w-10 h-10 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Main Interaction Layer */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Missions Center */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="flex items-center gap-3 mb-2 px-2">
                    <Target className="w-4 h-4 text-brand-red-neon" />
                    <h3 className="font-black uppercase tracking-[0.4em] text-[10px]">DAILY_MISSIONS</h3>
                  </div>
                  {data.missions.map((mission: any) => (
                    <div key={mission.label} className={`p-4 brutal-border flex items-center justify-between transition-all ${mission.done ? 'border-green-500 bg-green-500/10' : 'border-zinc-900 bg-zinc-950/50'}`}>
                      <div className="flex items-center gap-3">
                        {mission.done ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <div className="w-3 h-3 border border-zinc-800" />}
                        <span className={`text-[9px] font-black uppercase tracking-widest ${mission.done ? 'text-green-500' : 'text-zinc-500'}`}>{mission.label}</span>
                      </div>
                      {!mission.done && <span className="text-[8px] font-black text-brand-red-neon">+{mission.reward} LMN</span>}
                    </div>
                  ))}
                </div>

                {/* Latest Updates (Signals) */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="flex items-center gap-3 mb-2 px-2">
                    <Bell className="w-4 h-4 text-brand-red-neon" />
                    <h3 className="font-black uppercase tracking-[0.4em] text-[10px]">LATEST_UPDATES</h3>
                  </div>
                  {data.notifications.slice(0, 3).map((notif: any) => (
                    <div key={notif.id} className="p-4 brutal-border border-zinc-900 bg-zinc-950/50 flex flex-col gap-2 hover:border-zinc-700 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <span className="bg-brand-red-neon text-white text-[6px] px-2 py-0.5 font-black uppercase">{notif.priority}</span>
                        <span className="text-[6px] text-zinc-700 font-black uppercase">{new Date(notif.created_at).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-[10px] font-black uppercase tracking-tighter line-clamp-1">{notif.title}</h4>
                    </div>
                  ))}
                </div>

                {/* Rankings Preview */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="flex items-center gap-3 mb-2 px-2">
                    <Trophy className="w-4 h-4 text-brand-red-neon" />
                    <h3 className="font-black uppercase tracking-[0.4em] text-[10px]">GLOBAL_RANKINGS</h3>
                  </div>
                  <div className="p-4 glass-panel border-zinc-900 bg-zinc-950/50 space-y-3">
                    {data.leaderboard.slice(0, 3).map((actor: any) => (
                      <div key={actor.id} className="flex items-center justify-between border-b border-zinc-900 pb-2 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-zinc-800 w-4">{actor.rank}</span>
                          <span className={`text-[10px] font-black uppercase ${actor.isUser ? 'text-brand-red-neon' : 'text-zinc-400'}`}>{actor.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-white">{actor.score.toLocaleString()}</span>
                      </div>
                    ))}
                    <button onClick={() => setCurrentView('LEADERBOARD')} className="w-full text-center py-2 text-[8px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors mt-2">FULL_REGISTRY // 100+ NODES</button>
                  </div>
                </div>
              </div>

              {/* Agentic Matches (Conditional) */}
              {data.roles.length > 0 && (
                <div className="pt-8 border-t border-zinc-900 animate-in slide-in-from-bottom duration-700">
                  <div className="flex items-center gap-4 mb-8">
                    <Star className="w-6 h-6 text-brand-red-neon" />
                    <h2 className="text-4xl font-black uppercase tracking-tighter">AGENTIC MATCHES</h2>
                  </div>
                  <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar snap-x">
                    {data.roles.map((role: any) => (
                      <div key={role.id} className="snap-start shrink-0 w-[300px] glass-panel p-6 brutal-border-red hover:bg-brand-red-neon/5 transition-all">
                        <div className="flex justify-between items-start mb-6">
                          <span className="bg-brand-red-neon text-white text-[8px] px-2 py-1 font-black">{role.match}% MATCH</span>
                          <span className="text-[8px] text-zinc-600 font-black">{role.deadline}</span>
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tighter leading-tight mb-4">{role.title}</h3>
                        <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mb-6">{role.project}</p>
                        <button className="w-full py-3 bg-zinc-950 border border-zinc-800 text-[9px] font-black uppercase tracking-widest hover:border-brand-red-neon hover:text-brand-red-neon transition-all">ANALYZE</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : currentView === 'MISSIONS' ? (
            <div className="animate-in fade-in duration-500 max-w-4xl mx-auto space-y-12 pb-20">
              <div className="border-b border-zinc-900 pb-8">
                <h2 className="text-7xl font-black uppercase tracking-tighter leading-none">DAILY MISSIONS</h2>
                <p className="text-xs font-black uppercase tracking-[0.5em] text-brand-red-neon mt-4">HARVEST_LMN // STRENGTHEN_PROFILE</p>
              </div>
              <div className="grid gap-6">
                {data.missions.map((mission: any) => (
                  <div key={mission.label} className={`p-10 brutal-border transition-all flex items-center justify-between ${mission.done ? 'border-green-500 bg-green-500/10' : 'border-zinc-800 bg-zinc-950/50'}`}>
                    <div className="flex items-center gap-8">
                      {mission.done ? <CheckCircle2 className="w-8 h-8 text-green-500" /> : <div className="w-8 h-8 border-2 border-zinc-800" />}
                      <div>
                        <h3 className={`text-3xl font-black uppercase tracking-tighter ${mission.done ? 'text-green-500' : 'text-white'}`}>{mission.label}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mt-2">STATUS: {mission.done ? 'VERIFIED' : 'PENDING_ACTION'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-4xl font-black tabular-nums ${mission.done ? 'text-green-500' : 'text-brand-red-neon'}`}>+{mission.reward}</span>
                      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">LMN_CREDIT</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : currentView === 'LEADERBOARD' ? (
            <div className="animate-in fade-in duration-500 max-w-5xl mx-auto space-y-12 pb-20">
              <div className="flex justify-between items-end border-b border-zinc-900 pb-8">
                <div>
                  <h2 className="text-7xl font-black uppercase tracking-tighter leading-none">RANKINGS</h2>
                  <p className="text-xs font-black uppercase tracking-[0.5em] text-brand-red-neon mt-4">GLOBAL_NODES // TOP_TALENT</p>
                </div>
                <div className="text-right pb-2">
                  <span className="text-sm font-black text-zinc-700 uppercase tracking-widest">TOTAL_NODES: {data.leaderboard.length}+</span>
                </div>
              </div>
              <div className="space-y-4">
                {data.leaderboard.map((actor: any) => (
                  <div key={actor.id} className={`p-6 brutal-border transition-all flex items-center justify-between ${actor.isUser ? 'border-brand-red-neon bg-brand-red-neon/10' : 'border-zinc-900 bg-zinc-950/50'}`}>
                    <div className="flex items-center gap-8">
                      <span className={`text-4xl font-black tabular-nums w-12 ${actor.rank === 1 ? 'text-yellow-500' : actor.rank === 2 ? 'text-zinc-400' : actor.rank === 3 ? 'text-orange-700' : 'text-zinc-800'}`}>
                        #{actor.rank}
                      </span>
                      <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                        {actor.avatarUrl ? <img src={actor.avatarUrl} className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-zinc-800 m-auto mt-4" />}
                      </div>
                      <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">{actor.name}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mt-2">@{actor.username || 'AGENT'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-black text-brand-red-neon tabular-nums">{actor.score.toLocaleString()}</span>
                      <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">ACCUMULATED_LMN</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[60vh] opacity-50 animate-in fade-in duration-500">
              <div className="w-24 h-24 bg-zinc-950 brutal-border-red flex items-center justify-center mb-8 rotate-45">
                <Zap className="w-12 h-12 text-brand-red-neon -rotate-45" />
              </div>
              <h2 className="text-4xl font-black uppercase tracking-widest text-center">{currentView} // MODULE</h2>
              <p className="text-sm tracking-widest uppercase text-brand-red-neon mt-4 text-center">CONSTRUCTION_PENDING // PIPELINE_ACTIVE</p>
              <button onClick={() => setCurrentView('OVERVIEW')} className="mt-12 px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] hover:bg-brand-red-neon hover:text-white transition-all">RETURN_TO_BASE</button>
            </div>
          )}

        </div> {/* Close Content Area */}
      </div> {/* Close Main Wrapper */}

      <AnimatePresence>
          {showSettings && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/95 backdrop-blur-xl"
                onClick={() => setShowSettings(false)}
              />

              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                className="w-full max-w-4xl h-[85vh] glass-panel brutal-border-red relative z-10 flex flex-col overflow-hidden"
              >
                {/* Modal Header */}
                <div className="p-8 border-b border-zinc-900 flex justify-between items-center shrink-0">
                  <div>
                    <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">SYSTEM CONFIG</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-red-neon mt-2">USER_IDENTITY_AND_PROTOCOLS</p>
                  </div>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-4 bg-zinc-900 hover:bg-brand-red-neon transition-all cursor-pointer group"
                  >
                    <X className="w-6 h-6 text-zinc-500 group-hover:text-white" />
                  </button>
                </div>

                {/* Modal Body - Scrollable */}
                <div
                  className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar space-y-16"
                  data-lenis-prevent
                >

                  {/* Section 1: Biometric Identity */}
                  <section>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-1 h-8 bg-brand-red-neon" />
                      <h3 className="text-xl font-black uppercase tracking-[0.2em]">01_BIOMETRIC_DATA</h3>
                    </div>

                    <div className="flex flex-col md:flex-row gap-12 items-start">
                      {/* PFP Change */}
                      <div className="relative group">
                        <div className="w-48 h-48 brutal-border-red overflow-hidden bg-zinc-900 relative">
                          {data.profile.avatarUrl ? (
                            <img
                              src={data.profile.avatarUrl}
                              alt="Identity"
                              className={`w-full h-full object-cover transition-all duration-700 ${isUploadingPFP ? 'opacity-30' : 'grayscale group-hover:grayscale-0'}`}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-800 font-black text-4xl">NO_IMG</div>
                          )}
                          {isUploadingPFP && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-10 h-10 border-2 border-brand-red-neon border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex flex-col gap-2">
                          <label className="flex items-center justify-center gap-2 py-3 bg-zinc-900 text-white font-black uppercase tracking-widest text-[9px] brutal-border border-zinc-800 hover:border-brand-red-neon transition-all cursor-pointer">
                            <input type="file" className="hidden" accept="image/*" onChange={handlePFPChange} disabled={isUploadingPFP} />
                            <Upload className="w-3 h-3" /> UPLOAD NEW
                          </label>
                          {data.profile.avatarUrl && (
                            <button
                              onClick={handleRemovePFP}
                              className="flex items-center justify-center gap-2 py-3 bg-transparent text-brand-red-neon font-black uppercase tracking-widest text-[9px] brutal-border border-brand-red-deep hover:bg-brand-red-neon hover:text-white transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" /> REMOVE
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 space-y-10 w-full">
                        {/* Username Update */}
                        <div className="flex flex-col gap-4">
                          <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Update Username</label>
                          <div className="relative">
                            <input
                              type="text"
                              className={`w-full bg-zinc-950 text-white font-black text-2xl px-8 py-5 border-2 outline-none transition-all uppercase clip-brutal-tl ${usernameStatus === "available" ? "border-green-500" :
                                  usernameStatus === "taken" || usernameStatus === "invalid" ? "border-brand-red-neon" : "border-zinc-800"
                                }`}
                              placeholder={data.profile.username || "USERNAME"}
                              value={newUsername}
                              onChange={(e) => {
                                const val = e.target.value.toLowerCase();
                                setNewUsername(val);
                                checkUsername(val);
                              }}
                            />
                            {usernameStatus !== "idle" && (
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-widest">
                                {usernameStatus === "available" && <span className="text-green-500">AVAILABLE</span>}
                                {usernameStatus === "taken" && <span className="text-brand-red-neon">TAKEN</span>}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Password Update */}
                        <div className="flex flex-col gap-4">
                          <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Update Access Code</label>
                          <input
                            type="password"
                            className={`w-full bg-zinc-950 text-white font-black text-2xl px-8 py-5 border-2 outline-none transition-all uppercase clip-brutal-br ${newPassword && !validatePassword(newPassword) ? "border-brand-red-neon" :
                                newPassword && validatePassword(newPassword) ? "border-green-500" : "border-zinc-800"
                              }`}
                            placeholder="********"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Section 2: Ambition & Casting */}
                  <section>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-1 h-8 bg-brand-red-neon" />
                      <h3 className="text-xl font-black uppercase tracking-[0.2em]">02_PROFESSIONAL_PREFS</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      {/* Objective Selection */}
                      <div className="flex flex-col gap-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Primary Objective</label>
                        <div className="grid grid-cols-2 gap-3">
                          {DESIRE_LIST.map((opt) => (
                            <button
                              key={opt}
                              onClick={() => setPrefDesire(opt)}
                              className={`p-4 text-[10px] font-black uppercase tracking-widest brutal-border transition-all text-center ${prefDesire === opt ? 'bg-brand-red-neon text-white border-brand-red-neon' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600'
                                }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Language Selection */}
                      <div className="flex flex-col gap-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Languages</label>
                        <div className="flex flex-wrap gap-3">
                          {LANGUAGES_LIST.map((lang) => {
                            const isSelected = prefLanguages.includes(lang);
                            return (
                              <button
                                key={lang}
                                onClick={() => {
                                  setPrefLanguages(prev =>
                                    prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
                                  );
                                }}
                                className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest brutal-border transition-all ${isSelected ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-zinc-900 text-zinc-600 border-zinc-800 hover:border-zinc-700'
                                  }`}
                              >
                                {lang}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Archetype Selection */}
                      <div className="flex flex-col gap-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Core Archetypes</label>
                        <div className="flex flex-wrap gap-3">
                          {PERSONALITIES_LIST.map((arch) => {
                            const isSelected = prefArchetypes.includes(arch);
                            return (
                              <button
                                key={arch}
                                onClick={() => {
                                  setPrefArchetypes(prev =>
                                    prev.includes(arch) ? prev.filter(a => a !== arch) : [...prev, arch]
                                  );
                                }}
                                className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest brutal-border transition-all ${isSelected ? 'bg-brand-red-deep text-white border-brand-red-neon' : 'bg-zinc-900 text-zinc-600 border-zinc-800 hover:border-zinc-700'
                                  }`}
                              >
                                {arch}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Availability Selection */}
                      <div className="flex flex-col gap-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Opportunity Readiness</label>
                        <div className="space-y-3">
                          {AVAILABILITY_LABELS.map((label) => (
                            <button
                              key={label}
                              onClick={() => setPrefAvailability(label)}
                              className={`w-full p-5 text-[10px] font-black uppercase tracking-widest brutal-border transition-all text-left flex items-center justify-between ${prefAvailability === label ? 'bg-white/5 border-brand-red-neon text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700'
                                }`}
                            >
                              {label}
                              {prefAvailability === label && <Check className="w-4 h-4 text-brand-red-neon" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Section 3: Geographic Parameters */}
                  <section>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-1 h-8 bg-brand-red-neon" />
                      <h3 className="text-xl font-black uppercase tracking-[0.2em]">03_LOC_COORDINATES</h3>
                    </div>

                    <div className="flex flex-col gap-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Deployment Base (City, State, Country)</label>
                      <input
                        type="text"
                        className="w-full bg-zinc-950 text-white font-black text-2xl px-8 py-5 border-2 border-zinc-800 outline-none focus:border-brand-red-neon transition-all uppercase clip-brutal-tl"
                        value={prefLocation}
                        onChange={(e) => setPrefLocation(e.target.value)}
                      />
                      <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest ml-2 italic">Format: CITY, STATE, COUNTRY (e.g., MUMBAI, MAHARASHTRA, INDIA)</p>
                    </div>
                  </section>

                </div>

                {/* Modal Footer */}
                <div className="p-8 border-t border-zinc-900 bg-zinc-950/50 flex flex-col md:flex-row gap-6 shrink-0">
                  <button
                    onClick={handleUpdateSettings}
                    disabled={settingsLoading || (newUsername.length > 0 && usernameStatus !== "available") || (newPassword.length > 0 && !validatePassword(newPassword))}
                    className="flex-1 py-8 bg-brand-red-neon text-white font-black text-3xl uppercase tracking-tighter hover:bg-white hover:text-black transition-all brutal-shadow disabled:opacity-20 cursor-pointer"
                  >
                    {settingsLoading ? "PROCESSING..." : "UPDATE HUD PROTOCOLS"}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-10 py-8 glass-panel brutal-border-red text-brand-red-neon font-black text-xs uppercase tracking-widest hover:bg-brand-red-neon hover:text-white transition-all cursor-pointer flex items-center justify-center gap-3"
                  >
                    <LogOut className="w-5 h-5" />
                    TERMINATE
                  </button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Crop Modal */}
        <AnimatePresence>
          {showCropModal && cropImage && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/95 backdrop-blur-2xl"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-2xl aspect-square glass-panel brutal-border-red relative z-10 flex flex-col"
              >
                <div className="flex-1 relative bg-zinc-950">
                  <Cropper
                    image={cropImage}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                </div>
                <div className="p-8 bg-zinc-950 flex flex-col gap-6">
                  <div className="flex items-center gap-6">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest w-20">ZOOM_LVL</span>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="flex-1 accent-brand-red-neon"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={handleApplyCrop}
                      disabled={isUploadingPFP}
                      className="flex-1 py-5 bg-brand-red-neon text-white font-black text-sm uppercase tracking-widest hover:bg-white hover:text-black transition-all brutal-shadow disabled:opacity-50"
                    >
                      {isUploadingPFP ? "PROCESSING..." : "FINALIZE BIOMETRIC CROP"}
                    </button>
                    <button
                      onClick={() => setShowCropModal(false)}
                      className="px-8 py-5 border-2 border-zinc-800 text-zinc-500 font-black text-sm uppercase tracking-widest hover:border-brand-red-neon hover:text-white transition-all"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </main>
  );
}
