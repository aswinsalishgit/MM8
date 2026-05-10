"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence, useScroll, useSpring, useTransform, useVelocity } from "framer-motion";
import { useRef } from "react";
import { 
  PlayCircle, Star, Settings, Bell, LogOut, X, Search, MessageSquare,
  ChevronRight, ChevronLeft, Crown, Upload, Trash2, MapPin, 
  ChevronDown, Check, User, CheckCircle2, Trophy, Flame, Lock, ShieldCheck, AlertTriangle, Zap, Info,
  Menu, Home, Compass, PlusSquare, Briefcase, Target, Rss, Users, Video, Mic2, Database, BookOpen, BarChart3
} from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { uploadProfilePicture, removeProfilePicture, uploadAuditionTape } from "@/app/actions/driveActions";
import DirectorChatbot from "@/components/DirectorChatbot";

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
  'ELITE': { color: 'text-[var(--accent-primary)]', glow: 'drop-shadow-[0_0_15px_rgba(255,49,49,0.8)]', label: 'ELITE' },
};

const GENDER_OPTIONS = ["MALE", "FEMALE", "NON-BINARY", "OTHER"];
const BUILD_OPTIONS = ["ATHLETIC", "SLIM", "AVERAGE", "HEAVY", "MUSCULAR"];
const FACE_SHAPE_OPTIONS = ["OVAL", "ROUND", "SQUARE", "HEART", "DIAMOND"];
const SKIN_TONE_OPTIONS = ["FAIR", "WHEATISH", "BROWN", "DARK"];
const HAIR_TYPE_MALE = ["SHORT", "LONG", "BALD", "CURLY", "SPIKY"];
const HAIR_TYPE_FEMALE = ["SHORT", "LONG", "BOB", "LAYERED", "CURLY"];

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
        .select('*, settings(*)')
        .eq('id', session.user.id)
        .single();

      if (profile?.role === 'DIRECTOR') {
        router.push("/director-dashboard");
        return;
      }

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
          .from('profiles').select('*, settings(*)').eq('id', session.user.id).single();
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
            .from('profiles').select('*, settings(*)').eq('id', session.user.id).single();
          if (refreshed) profile = refreshed;
        }
      }

      // --- FETCH TODAY'S MISSIONS ---
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      
      const { data: todayLogs } = await supabase
        .from('lumen_log')
        .select('action')
        .eq('user_id', session.user.id)
        .gte('created_at', todayStart.toISOString());

      const missionActions = (todayLogs || []).map((l: any) => l.action);
      
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
        .limit(50);

      setData({
        profile: {
          id: profile.id,
          name: profile.full_name || "AGENT_X",
          username: profile.username || null,
          email: profile.email || "",
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
          alias: profile.alias || "",
          bio: profile.bio || "",
          willingnessToTravel: profile.willingness_to_travel || "",
          motherland: profile.motherland || "",
          age: profile.age || null,
          gender: profile.gender || "",
          height: profile.height || "",
          overallBuild: profile.overall_build || "",
          faceShape: profile.face_shape || "",
          facialHair: profile.facial_hair || "",
          eyeColor: profile.eye_color || "",
          eyeShape: profile.eye_shape || "",
          noseStructure: profile.nose_structure || "",
          jawlineType: profile.jawline_type || "",
          skinTone: profile.skin_tone || "",
          hairType: profile.hair_type || "",
          scarsTattoos: profile.scars_tattoos || "",
          distinctFeatures: profile.distinct_features || "",
          priorArtExperience: profile.prior_art_experience || "",
          settings: profile.settings ? {
            appearance: profile.settings[0]?.appearance || 'system',
            accentColor: profile.settings[0]?.accent_color || 'default',
            contrast: profile.settings[0]?.contrast || 'system',
            notifications: {
              push: profile.settings[0]?.push_notifications ?? true,
              email: profile.settings[0]?.email_notifications ?? true,
              sms: profile.settings[0]?.sms_notifications ?? false,
            },
            categories: profile.settings[0]?.categories || {
              casting: true, activity: true, ai: true, progress: true, communication: true, account: true, platform: true
            },
            privacy: {
              visibility: profile.settings[0]?.privacy_visibility || 'public',
              openToWork: profile.settings[0]?.open_to_work ?? true,
              showAge: profile.settings[0]?.show_age ?? true,
              showLocation: profile.settings[0]?.show_location ?? true,
              showContact: profile.settings[0]?.show_contact ?? true,
            },
            permissions: {
              message: profile.settings[0]?.message_permissions || 'everyone',
              viewTapes: profile.settings[0]?.view_tapes_permissions || 'directors',
              sendInvites: profile.settings[0]?.send_invites_permissions || 'directors',
              appearInSearches: profile.settings[0]?.appear_in_searches ?? true,
            }
          } : null,
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

  return { data, loading, fetchData, setData };
};

export default function AgenticDashboard() {
  const router = useRouter();
  const { data, loading, fetchData, setData } = useDashboardData();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' | 'info' } | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [appearance, setAppearance] = useState<'system' | 'light' | 'dark'>('system');
  const [contrast, setContrast] = useState<'system' | 'medium' | 'increased'>('system');
  const [accentColor, setAccentColor] = useState<'default' | 'blue' | 'green' | 'yellow' | 'pink' | 'orange' | 'black' | 'glass'>('default');
  const [notificationsDelivery, setNotificationsDelivery] = useState({
    push: true,
    email: true,
    sms: false
  });
  const [notificationCategories, setNotificationCategories] = useState({
    casting: true,
    activity: true,
    ai: true,
    progress: true,
    communication: true,
    account: true,
    platform: true
  });
  const [profilePrivacy, setProfilePrivacy] = useState({
    visibility: 'public',
    openToWork: true,
    showAge: true,
    showLocation: true,
    showContact: true
  });
  const [permissions, setPermissions] = useState({
    message: 'everyone',
    viewTapes: 'directors',
    sendInvites: 'directors',
    appearInSearches: true
  });

  // Debounced username check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (newUsername) {
        checkUsername(newUsername);
      } else {
        setUsernameStatus("idle");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [newUsername]);

  // Load preferences
  useEffect(() => {
    const savedTheme = localStorage.getItem('mm8-visual-protocol') as 'dark' | 'light';
    const savedAccent = localStorage.getItem('mm8-accent-protocol');
    const savedContrast = localStorage.getItem('mm8-contrast-protocol');
    const savedLang = localStorage.getItem('mm8-lang-protocol');
    const savedNotifications = localStorage.getItem('mm8-notifications-protocol');

    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
      setAppearance(savedTheme);
    }
    if (savedAccent) {
      setAccentColor(savedAccent as any);
      document.documentElement.setAttribute('data-accent', savedAccent);
    }
    if (savedContrast) {
      setContrast(savedContrast as any);
      document.documentElement.setAttribute('data-contrast', savedContrast);
    }
    if (savedNotifications) {
      try {
        setNotificationsDelivery(JSON.parse(savedNotifications));
      } catch (e) { console.warn("NOTIF_PARSE_FAILURE", e); }
    }

    // Database settings override local storage if available
    if (data?.profile?.settings) {
      const s = data.profile.settings;
      
      // If we are currently showing settings, don't overwrite local state unless we just saved
      // (This prevents race conditions or accidental resets while editing)
      
      if (s) {
        if (s.appearance) {
          setAppearance(s.appearance);
          if (s.appearance !== 'system') {
            setTheme(s.appearance);
            document.documentElement.setAttribute('data-theme', s.appearance);
          }
        }
        if (s.accentColor) {
          setAccentColor(s.accentColor);
          document.documentElement.setAttribute('data-accent', s.accentColor);
        }
        if (s.contrast) {
          setContrast(s.contrast);
          document.documentElement.setAttribute('data-contrast', s.contrast);
        }
        
        // Notification Delivery Sync (Using mapped structure)
        if (s.notifications) {
          setNotificationsDelivery({
            push: s.notifications.push ?? true,
            email: s.notifications.email ?? true,
            sms: s.notifications.sms ?? false,
          });
        }

        // Categories Sync - SANITIZED to remove legacy keys
        if (s.categories) {
          const validKeys = ['casting', 'activity', 'ai', 'progress', 'communication', 'account', 'platform'];
          const filtered: any = {};
          validKeys.forEach(key => {
            filtered[key] = s.categories[key] ?? true;
          });
          setNotificationCategories(filtered);
        }

        // Privacy Sync
        if (s.privacy) {
          setProfilePrivacy({
            visibility: s.privacy.visibility || 'public',
            openToWork: s.privacy.openToWork ?? true,
            showAge: s.privacy.showAge ?? true,
            showLocation: s.privacy.showLocation ?? true,
            showContact: s.privacy.showContact ?? true,
          });
        }

        // Permissions Sync
        if (s.permissions) {
          setPermissions({
            message: s.permissions.message || 'everyone',
            viewTapes: s.permissions.viewTapes || 'directors',
            sendInvites: s.permissions.sendInvites || 'directors',
            appearInSearches: s.permissions.appearInSearches ?? true,
          });
        }
      }
    }
  }, [data?.profile?.settings]);

  // Update Attributes when state changes
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accentColor);
    localStorage.setItem('mm8-accent-protocol', accentColor);
  }, [accentColor]);

  useEffect(() => {
    document.documentElement.setAttribute('data-contrast', contrast);
    localStorage.setItem('mm8-contrast-protocol', contrast);
  }, [contrast]);


  // Handle system appearance changes
  useEffect(() => {
    if (appearance === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
      };
      
      const initialTheme = mediaQuery.matches ? 'dark' : 'light';
      setTheme(initialTheme);
      document.documentElement.setAttribute('data-theme', initialTheme);
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [appearance]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('mm8-visual-protocol', newTheme);
  };

  // Navigation State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState("OVERVIEW");
  const [selectedFeed, setSelectedFeed] = useState<any>(null);
  const [notifFilter, setNotifFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [friendships, setFriendships] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showUsernameInput, setShowUsernameInput] = useState(false);
  const [showPassUpdateInput, setShowPassUpdateInput] = useState(false);
  const [passUpdateLoading, setPassUpdateLoading] = useState(false);
  const [currentPassVerify, setCurrentPassVerify] = useState("");
  const [passVerified, setPassVerified] = useState(false);
  const [profileForm, setProfileForm] = useState<any>({
    fullName: "",
    username: "",
    email: "",
    alias: "",
    bio: "",
    role: "",
    primaryObjective: "",
    languages: [],
    archetypes: [],
    opportunityReadiness: "",
    willingnessToTravel: "",
    location: "",
    motherland: "",
    age: "",
    gender: "",
    height: "",
    overallBuild: "",
    faceShape: "",
    facialHair: "",
    eyeColor: "",
    eyeShape: "",
    noseStructure: "",
    jawlineType: "",
    skinTone: "",
    hairType: "",
    scarsTattoos: "",
    distinctFeatures: "",
    priorArtExperience: "",
  });

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setData((prev: any) => ({
      ...prev,
      notifications: prev.notifications.map((n: any) => n.id === id ? { ...n, read: true } : n)
    }));
  };

  const markAllRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", session.user.id);
    setData((prev: any) => ({
      ...prev,
      notifications: prev.notifications.map((n: any) => ({ ...n, read: true }))
    }));
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "VERY IMPORTANT": return { color: "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10", icon: AlertTriangle, iconColor: "text-[var(--accent-primary)]", badge: "bg-[var(--accent-primary)]" };
      case "IMPORTANT": return { color: "border-yellow-500/50 bg-yellow-500/5", icon: AlertTriangle, iconColor: "text-yellow-500", badge: "bg-yellow-500" };
      default: return { color: "border-[var(--border-main)] bg-[var(--bg-tertiary)]/50", icon: Info, iconColor: "text-zinc-500", badge: "bg-zinc-600" };
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

  const handleUserSearch = async (query: string) => {
    setUserSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url:avatar_url_proxy, role, settings(appear_in_searches)')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      
      const filtered = (data || []).filter((p: any) => {
        const s = p.settings?.[0];
        return s?.appear_in_searches !== false;
      });
      
      setSearchResults(filtered);
    } catch (err: any) {
      console.error('Search error raw:', err);
      if (err.message) {
        console.error('Search error message:', err.message);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
        .eq('id', userId)
        .single();

      setSelectedUserProfile({ ...profileData, settings: settingsData ? [settingsData] : [] });
      setShowProfileModal(true);
    } catch (err: any) {
      console.error('Error fetching profile raw:', err);
      console.error('Error fetching profile msg:', err.message);
      setMessage({ text: "Failed to load profile. Connection lost.", type: 'error' });
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: session.user.id,
          friend_id: friendId,
          status: 'pending'
        });

      if (error) throw error;
      setMessage({ text: "Friend request transmitted.", type: 'success' });
      // Update local friendships state
      fetchFriendships();
    } catch (err: any) {
      console.error('Friend request error:', err);
      setMessage({ text: err.message || "Failed to send request.", type: 'error' });
    }
  };

  const fetchFriendships = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          friend:profiles!friend_id(id, full_name, username, avatar_url:avatar_url_proxy),
          user:profiles!user_id(id, full_name, username, avatar_url:avatar_url_proxy)
        `)
        .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`);

      if (error) {
        console.error('Fetch friendships error details:', error.message, error.details, error.hint);
        throw error;
      }
      setFriendships(data || []);
    } catch (err: any) {
      console.error('Fetch friendships failed:', err.message || err);
    }
  };

  const startChat = async (friendId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      // Check if chat already exists
      const { data: existingChats, error: chatErr } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', session.user.id);

      if (chatErr) throw chatErr;

      let chatId = null;
      if (existingChats && existingChats.length > 0) {
        const chatIds = existingChats.map(c => c.chat_id);
        const { data: commonChats, error: commonErr } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .in('chat_id', chatIds)
          .eq('user_id', friendId);

        if (commonErr) throw commonErr;
        if (commonChats && commonChats.length > 0) {
          chatId = commonChats[0].chat_id;
        }
      }

      if (!chatId) {
        // Create new chat
        const { data: newChat, error: createErr } = await supabase
          .from('chats')
          .insert({})
          .select()
          .single();

        if (createErr) throw createErr;
        chatId = newChat.id;

        // Add participants
        await supabase.from('chat_participants').insert([
          { chat_id: chatId, user_id: session.user.id },
          { chat_id: chatId, user_id: friendId }
        ]);
      }

      const { data: chatData } = await supabase.from('chats').select('*').eq('id', chatId).single();
      setActiveChat(chatData);
      fetchMessages(chatId);
      setCurrentView('STANGAB');
    } catch (err: any) {
      console.error('Start chat error raw:', err);
      console.error('Start chat error msg:', err.message);
      setMessage({ text: "Failed to initialize communication link.", type: 'error' });
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles(id, full_name, username, avatar_url:avatar_url_proxy)')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setChatMessages(data || []);
    } catch (err: any) {
      console.error('Fetch messages error raw:', err);
    }
  };

  const sendMessage = async () => {
    if (!activeChat || !newMessage.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: activeChat.id,
          sender_id: session.user.id,
          content: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage("");
    } catch (err) {
      console.error('Send message error:', err);
    }
  };

  // Real-time Messages Subscription
  useEffect(() => {
    if (!activeChat) return;

    const channel = supabase
      .channel(`chat:${activeChat.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${activeChat.id}`
      }, (payload) => {
        setChatMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat]);

  // Initial Data Fetch
  useEffect(() => {
    fetchFriendships();
  }, []);

  // Sync profile form when data changes
  useEffect(() => {
    if (data?.profile) {
      setProfileForm({
        fullName: data.profile.name || "",
        username: data.profile.username || "",
        email: data.profile.email || "",
        alias: data.profile.alias || "",
        bio: data.profile.bio || "",
        role: data.profile.role || "",
        primaryObjective: data.profile.objectivePreference || "",
        languages: data.profile.languages || [],
        archetypes: data.profile.archetypes || [],
        opportunityReadiness: data.profile.opportunityReadiness || "",
        willingnessToTravel: data.profile.willingnessToTravel || "",
        location: data.profile.location || "",
        motherland: data.profile.motherland || "",
        age: data.profile.age || "",
        gender: data.profile.gender || "",
        height: data.profile.height || "",
        overallBuild: data.profile.overallBuild || "",
        faceShape: data.profile.faceShape || "",
        facialHair: data.profile.facialHair || "",
        eyeColor: data.profile.eyeColor || "",
        eyeShape: data.profile.eyeShape || "",
        noseStructure: data.profile.noseStructure || "",
        jawlineType: data.profile.jawlineType || "",
        skinTone: data.profile.skinTone || "",
        hairType: data.profile.hairType || "",
        scarsTattoos: data.profile.scarsTattoos || "",
        distinctFeatures: data.profile.distinctFeatures || "",
        priorArtExperience: data.profile.priorArtExperience || "",
      });
    }
  }, [data]);

  const calculateProfileStrength = useCallback((profile: any) => {
    if (!profile) return 0;
    const fields = [
      'fullName', 'username', 'email', 'bio', 'role', 'primaryObjective', 
      'languages', 'archetypes', 'opportunityReadiness', 'willingnessToTravel', 
      'location', 'motherland', 'age', 'gender', 'height', 'overallBuild', 
      'faceShape', 'facialHair', 'eyeColor', 'eyeShape', 'noseStructure', 'jawlineType', 
      'skinTone', 'hairType', 'scarsTattoos', 'distinctFeatures', 'priorArtExperience'
    ];
    let filled = 0;
    fields.forEach(field => {
      const val = profile[field];
      if (val && val !== 'NONE' && val !== 'UNKNOWN' && val !== '') {
         if (Array.isArray(val)) {
           if (val.length > 0) filled++;
         } else {
           filled++;
         }
      }
    });
    return Math.round((filled / fields.length) * 100);
  }, []);

  const profileStrength = useMemo(() => calculateProfileStrength(profileForm), [profileForm, calculateProfileStrength]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.fullName,
          username: profileForm.username,
          email: profileForm.email,
          alias: profileForm.alias,
          bio: profileForm.bio,
          role: profileForm.role,
          objective_preference: profileForm.primaryObjective,
          languages: profileForm.languages,
          archetypes: profileForm.archetypes,
          opportunity_readiness: profileForm.opportunityReadiness,
          willingness_to_travel: profileForm.willingnessToTravel,
          location: profileForm.location,
          motherland: profileForm.motherland,
          age: profileForm.age ? parseInt(profileForm.age) : null,
          gender: profileForm.gender,
          height: profileForm.height,
          overall_build: profileForm.overallBuild,
          face_shape: profileForm.faceShape,
          facial_hair: profileForm.facialHair,
          eye_color: profileForm.eyeColor,
          eye_shape: profileForm.eyeShape,
          nose_structure: profileForm.noseStructure,
          jawline_type: profileForm.jawlineType,
          skin_tone: profileForm.skinTone,
          hair_type: profileForm.hairType,
          scars_tattoos: profileForm.scarsTattoos,
          distinct_features: profileForm.distinctFeatures,
          prior_art_experience: profileForm.priorArtExperience,
        })
        .eq('id', session.user.id);

      if (error) throw error;
      
      setMessage({ text: "Your profile has been successfully updated.", type: 'success' });
      setIsEditingProfile(false);
      fetchData(); // Partial content refresh to sync all views
    } catch (err: any) {
      setMessage({ text: `An error occurred during the update process: ${err.message}`, type: 'error' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!currentPassVerify) return;
    setPassUpdateLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.profile.email,
        password: currentPassVerify,
      });
      if (error) throw new Error("Verification failed: Incorrect current password.");
      setPassVerified(true);
      setMessage({ text: "Identity verified. You may now initialize a new security key.", type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setPassUpdateLoading(false);
    }
  };

  const MOCK_FEEDS = [
    {
      id: 'f1',
      title: 'PUSHPA 2: THE RULE BREAKS PRE-RELEASE RECORDS',
      category: 'TOLLYWOOD',
      image: 'https://images.unsplash.com/photo-1598897611553-d68a88e9f46e?q=80&w=2070&auto=format&fit=crop',
      summary: 'Allu Arjun starrer Pushpa 2 is trending globally as pre-release business crosses 1000Cr mark.',
      details: 'Pushpa 2: The Rule, directed by Sukumar, has created history in Indian cinema. With the trailer gaining millions of views within minutes, the anticipation for the December release is at an all-time high. Trade analysts suggest it could be the first Indian film to challenge the 2000Cr global box office milestone.',
      timestamp: '2H AGO',
      author: 'MM8 INTEL'
    },
    {
      id: 'f2',
      title: 'THALAPATHY 69: FINAL SCHEDULE COMMENCES IN CHENNAI',
      category: 'KOLLYWOOD',
      image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2059&auto=format&fit=crop',
      summary: 'Vijay’s swan song project moves into its final production phase with high-octane action sequences.',
      details: 'The final film of Thalapathy Vijay, directed by H. Vinoth, is currently being shot in a massive set in Chennai. Fans are emotional as this marks the superstar’s last cinematic venture before his full-time political entry. The film is expected to be a socio-political thriller with music by Anirudh Ravichander.',
      timestamp: '5H AGO',
      author: 'MM8 INTEL'
    },
    {
      id: 'f3',
      title: 'PRABHAS & SPIRIT: PRE-PRODUCTION UPDATE',
      category: 'PAN-INDIA',
      image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=2070&auto=format&fit=crop',
      summary: 'The most awaited cop-actioner Spirit is set to go on floors early next year.',
      details: 'Sandeep Reddy Vanga is ready with the final draft of Spirit. Prabhas will be seen in a never-before-seen avatar as a fierce police officer. The film promises to be a raw and intense action drama, keeping in line with Vanga’s signature style.',
      timestamp: '1D AGO',
      author: 'MM8 INTEL'
    },
    {
      id: 'f4',
      title: 'L2: EMPURAAN - MOHANLAL WRAPS UP OVERSEAS SCHEDULE',
      category: 'MOLLYWOOD',
      image: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=2070&auto=format&fit=crop',
      summary: 'Prithviraj Sukumaran’s directorial sequel completes its major London schedule.',
      details: 'The sequel to Lucifer, L2: Empuraan, is moving ahead at a rapid pace. Mohanlal has completed his London portions and the team is now heading back to India for the final leg. The film is touted to be one of the costliest Malayalam movies ever made.',
      timestamp: '3D AGO',
      author: 'MM8 INTEL'
    }
  ];

  const NAVIGATION_ITEMS = [
    { id: 'CREATE', label: 'CREATE', icon: PlusSquare },
    { id: 'OVERVIEW', label: 'OVERVIEW', icon: Home },
    { id: 'ROLES', label: 'ROLES', icon: Briefcase },
    { id: 'MISSIONS', label: 'MISSIONS', icon: Target },
    { id: 'LEADERBOARD', label: 'LEADERBOARD', icon: Trophy },
    { id: 'FEED', label: 'FEED', icon: Rss },
    { id: 'LMN_REGISTER', label: 'LMN REGISTER', icon: Zap },
    { id: 'STANGAB', label: 'STANGAB', icon: Users },
    { id: 'NOTIFICATIONS', label: 'NOTIFICATIONS', icon: Bell },
    { id: 'PROFILE', label: 'PROFILE', icon: User },
    { id: 'SETTINGS', label: 'SETTINGS', icon: Settings },
    { id: 'LOGOUT', label: 'LOG OUT', icon: LogOut },
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
      
      // Reset password update states on settings open
      if (showSettings) {
        setPassVerified(false);
        setCurrentPassVerify("");
        setNewPassword("");
        setShowPassUpdateInput(false);
      }
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
      setMessage({ text: "Please select a valid and unique username.", type: 'error' });
      return;
    }
    if (newPassword && !validatePassword(newPassword)) {
      setMessage({ text: "The provided password does not meet the required security standards.", type: 'error' });
      return;
    }
    if (newPassword && !passVerified) {
      setMessage({ text: "Please verify your current identity protocol before updating the security key.", type: 'error' });
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
        full_name: profileForm.fullName,
        bio: profileForm.bio, // Added bio
        languages: profileForm.languages,
      };

      if (newUsername) {
        profileUpdate.username = newUsername;
      }

      const settingsUpdate = {
        appearance,
        accent_color: accentColor,
        contrast,
        push_notifications: notificationsDelivery.push,
        email_notifications: notificationsDelivery.email,
        sms_notifications: notificationsDelivery.sms,
        categories: notificationCategories, // Now included
        privacy_visibility: profilePrivacy.visibility,
        open_to_work: profilePrivacy.openToWork,
        show_age: profilePrivacy.showAge,
        show_location: profilePrivacy.showLocation,
        show_contact: profilePrivacy.showContact,
        message_permissions: permissions.message,
        view_tapes_permissions: permissions.viewTapes,
        send_invites_permissions: permissions.sendInvites,
        appear_in_searches: permissions.appearInSearches,
        updated_at: new Date().toISOString()
      };

      const [pRes, sRes] = await Promise.all([
        supabase.from('profiles').update(profileUpdate).eq('id', user.id),
        supabase.from('settings').upsert({ id: user.id, ...settingsUpdate })
      ]);

      if (pRes.error) throw pRes.error;
      if (sRes.error) throw sRes.error;

      // Persist notifications to local storage
      localStorage.setItem('mm8-notifications-protocol', JSON.stringify(notificationsDelivery));

      setMessage({ text: "Your settings have been saved and synchronization is complete.", type: 'success' });
      
      // Clear password states after successful update
      setPassVerified(false);
      setCurrentPassVerify("");
      setNewPassword("");
      setShowPassUpdateInput(false);
      
      // BACKGROUND REFRESH: Fetch data without closing the modal
      fetchData(); 
      
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (err: any) {
      setMessage({ text: `A critical error has occurred: ${err.message}`, type: 'error' });
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
    setMessage({ text: "Your biometric data is currently being processed...", type: 'info' });

    try {
      const croppedBlob = await getCroppedImg(cropImage, croppedAreaPixels);
      if (!croppedBlob) throw new Error("CROP_FAILURE");

      const formData = new FormData();
      formData.append('file', croppedBlob, 'pfp.jpg');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication failure");

      const profileUrl = await uploadProfilePicture(formData);
      if (profileUrl) {
        setMessage({ text: "Your identity image has been successfully updated.", type: 'success' });
        // Real-time will handle the refresh, but let's clear local state
        setCropImage(null);
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ text: "The profile picture upload has failed.", type: 'error' });
    } finally {
      setIsUploadingPFP(false);
    }
  };

  const handleRemovePFP = async () => {
    if (!confirm("PERMANENTLY REMOVE IDENTITY IMAGE?")) return;
    try {
      await removeProfilePicture();
      setMessage({ text: "The profile picture has been successfully removed.", type: 'success' });
      setTimeout(() => {
        fetchData();
        setCurrentView('OVERVIEW');
      }, 1000);
    } catch (err) {
      setMessage({ text: "An error occurred while attempting to remove the profile picture.", type: 'error' });
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setMessage({ text: `The logout process could not be completed: ${error.message}`, type: 'error' });
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

        const initData = await initRes.json();
        const { uploadUrl } = initData;

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

        setMessage({ text: "Your audition has been successfully uploaded. You have been awarded 40 LMN credits.", type: 'success' });

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
        setMessage({ text: `The upload process has failed: ${error.message}`, type: 'error' });
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    };
    input.click();
  };

  if (loading || !data) {
    return (
      <main className="min-h-screen bg-[var(--bg-primary)]">
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex overflow-hidden selection:bg-[var(--accent-red)] selection:text-white transition-colors duration-500">
      
      {/* Command Toast System (Premium Glassmorphic) */}
      <AnimatePresence mode="wait">
        {notificationsDelivery.push && message && (
          <motion.div 
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            className="fixed bottom-10 right-10 z-[2500] w-full max-w-[400px]"
          >
            <div className={`p-8 rounded-[2.5rem] border-2 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden transition-all duration-500 ${
              message.type === 'error' ? 'bg-red-500/10 border-red-500/50 shadow-red-500/20' : 
              message.type === 'success' ? 'bg-green-500/10 border-green-500/50 shadow-green-500/20' :
              'bg-[var(--accent-primary)]/5 border-[var(--accent-primary)]/30 shadow-[var(--accent-glow)]/10'
            }`}>
              {/* Soft Radial Glow */}
              <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-30 ${
                message.type === 'error' ? 'bg-red-500' : 
                message.type === 'success' ? 'bg-green-500' :
                'bg-[var(--accent-primary)]'
              }`} />
              
              <div className="flex flex-col gap-5 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                      message.type === 'error' ? 'bg-red-500' : 
                      message.type === 'success' ? 'bg-green-500' :
                      'bg-[var(--accent-primary)]'
                    }`} />
                    <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-400">System Notification</span>
                  </div>
                  <button 
                    onClick={() => setMessage(null)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-zinc-500" />
                  </button>
                </div>
                
                <div className="space-y-1">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-primary)] opacity-70">
                    {message.type === 'error' ? 'Security Alert' : message.type === 'success' ? 'Update Complete' : 'Information'}
                  </h5>
                  <p className="text-sm font-medium leading-relaxed text-zinc-100">
                    {message.text}
                  </p>
                </div>
                
                <div className="pt-2">
                  <div className="w-full h-[1px] bg-white/5" />
                  <div className="mt-4 flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-zinc-500">
                    <span>Protocol: Secure_Bridge</span>
                    <span className="opacity-40">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <AnimatePresence>
        {(isSidebarOpen || (typeof window !== 'undefined' && window.innerWidth > 1024)) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ duration: 0.3, ease: "circOut" }}
            data-lenis-prevent
            className="fixed lg:sticky top-0 left-0 w-72 h-screen bg-[var(--bg-secondary)] border-r border-[var(--border-main)] z-[150] flex flex-col shrink-0 overflow-hidden"
          >
            <div className="p-8 border-b border-[var(--border-main)] flex justify-between items-center shrink-0">
              <h2 className="text-4xl font-black uppercase tracking-tighter">MM8</h2>
              <button className="lg:hidden p-2 hover:bg-[var(--bg-secondary)] transition-colors" onClick={() => setIsSidebarOpen(false)}>
                <X className="w-6 h-6 text-zinc-500 hover:text-white" />
              </button>
            </div>
            
            <div className="p-8 border-b border-[var(--border-main)] shrink-0 flex flex-col items-center">
              <div className="w-32 h-32 rounded-full border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl bg-[var(--bg-tertiary)] mb-6 relative overflow-hidden">
                {data.profile.avatarUrl ? (
                  <img src={data.profile.avatarUrl} alt="PFP" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-zinc-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                )}
              </div>
              <p className="font-black text-center text-sm uppercase tracking-widest text-[var(--accent-primary)]">@{data.profile.username || 'ANONYMOUS'}</p>
            </div>

            <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto hide-scrollbar">
              {NAVIGATION_ITEMS.map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    if (window.innerWidth <= 1024) setIsSidebarOpen(false);
                    if (item.id === 'LOGOUT') handleLogout();
                  }}
                  className={`w-full flex items-center gap-4 p-4 text-left font-black uppercase tracking-widest text-[10px] transition-all ${
                    currentView === item.id 
                      ? 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/10 border-l-4 border-[var(--accent-primary)] text-white' 
                      : 'border-l-4 border-transparent text-zinc-500 hover:bg-[var(--bg-secondary)] hover:text-white'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${currentView === item.id ? 'text-[var(--accent-primary)]' : ''}`} />
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
        <header className="h-20 border-b border-[var(--border-main)] bg-[var(--bg-primary)] flex items-center justify-between px-6 shrink-0 z-[100]">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-3 hover:bg-[var(--bg-secondary)] transition-colors lg:hidden"
          >
            <Menu className="w-6 h-6 text-[var(--text-primary)]" />
          </button>
          

          <div className="flex items-center gap-6 md:gap-12 ml-auto">
            <div className="flex items-center gap-4 md:gap-8">
              <button onClick={() => setCurrentView('OVERVIEW')} className="p-2 hover:bg-[var(--bg-secondary)] rounded-full transition-colors group" title="HOME">
                <Home className="w-5 h-5 text-zinc-500 group-hover:text-[var(--text-primary)] transition-all" />
              </button>
              <button 
                onClick={() => setCurrentView('STANGAB')}
                className="p-2 hover:bg-[var(--bg-secondary)] rounded-full transition-colors group" 
                title="DISCOVER"
              >
                <Compass className="w-5 h-5 text-zinc-500 group-hover:text-[var(--text-primary)] transition-all" />
              </button>
              <button onClick={() => setCurrentView('NOTIFICATIONS')} className="p-2 hover:bg-[var(--bg-secondary)] rounded-full transition-colors group relative" title="NOTIFICATIONS">
                <Bell className="w-5 h-5 text-zinc-500 group-hover:text-[var(--text-primary)] transition-all" />
                {data.notifications?.filter((n: any) => !n.read).length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full" />
                )}
              </button>
              <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-[var(--bg-secondary)] rounded-full transition-colors group" title="SETTINGS">
                <Settings className="w-5 h-5 text-zinc-500 group-hover:text-[var(--text-primary)] transition-all" />
              </button>
            </div>
            
            <div className="w-[1px] h-8 bg-[var(--bg-secondary)] hidden md:block" />
            
            <div 
              onClick={() => setCurrentView('PROFILE')}
              className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-main)] overflow-hidden shrink-0 border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl cursor-pointer hover:scale-110 transition-transform"
            >
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
            <div className="animate-in fade-in duration-500">
              {/* Overview Title */}
              <div className="mb-12 border-b border-[var(--border-main)] pb-8 flex flex-col md:flex-row justify-between items-start md:items-end">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none text-[var(--text-primary)]">
                    ACTOR DASHBOARD
                  </h1>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mt-6 md:mt-0 glass-panel-premium border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl px-6 py-3 rounded-full flex items-center gap-3"
                >
                  <span className="font-black uppercase tracking-[0.2em] text-[10px] text-zinc-500">USERNAME:</span>
                  <span className="font-black uppercase tracking-widest text-xs text-[var(--accent-primary)] tabular-nums">
                    @{data.profile.username || 'ANONYMOUS'}
                  </span>
                  {data.profile.isVip && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 text-[8px] font-black uppercase tracking-widest">
                      <Crown className="w-3 h-3" /> VIP
                    </span>
                  )}
                </motion.div>
              </div>

      <div className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10 pb-20">
        
        {/* LEFT COLUMN: IDENTITY & INTEL */}
        <div className="lg:col-span-4 flex flex-col gap-12">
          
          {/* Identity HUD */}
          <section className="glass-panel-premium border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl p-10 relative overflow-hidden group clip-brutal-tl">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-[var(--text-primary)] font-black px-6 py-3 flex items-center gap-2 text-[10px] tracking-widest clip-brutal-tr">
              <CheckCircle2 className="w-4 h-4" />
              {data.profile.status}
            </div>
            
            <div className="flex flex-col md:flex-row items-start gap-8 mt-10 mb-12">
              <div className="w-32 h-32 bg-[var(--bg-tertiary)] border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-500 rounded-full overflow-hidden shrink-0">
                {data.profile.avatarUrl ? (
                  <img 
                    src={data.profile.avatarUrl} 
                    alt="PFP" 
                    className="w-full h-full object-cover"
                    onError={(e: any) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                ) : null}
                <User className={`w-16 h-16 text-[var(--accent-secondary)] group-hover:text-[var(--accent-primary)] transition-colors ${data.profile.avatarUrl ? 'hidden' : ''}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none break-words">{data.profile.name}</h2>
                <div className="mt-4 flex items-start gap-3">
                  <span className="w-2 h-0.5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] mt-1.5 shrink-0" />
                  {data.profile.bio ? (
                    <p className="text-[var(--accent-primary)] font-black uppercase tracking-[0.2em] text-[10px] leading-relaxed break-words">
                      {data.profile.bio}
                    </p>
                  ) : (
                    <button 
                      onClick={() => setShowSettings(true)}
                      className="text-[var(--accent-primary)] font-black uppercase tracking-[0.2em] text-[10px] leading-relaxed hover:underline cursor-pointer text-left"
                    >
                      UPDATE BIO
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border-main)] pt-10">
              {/* Profile Completion progress bar */}
              <div className="mt-8">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-black text-zinc-600 uppercase tracking-[0.4em] text-[10px]">PROFILE_STRENGTH</h3>
                  <span className="text-[var(--text-primary)] font-black text-[10px] tabular-nums">{completionProgress}%</span>
                </div>
                <div className="w-full h-3 bg-[var(--bg-tertiary)] relative overflow-hidden rounded-full">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${completionProgress}%` }}
                    transition={{ duration: 1.5, ease: "circOut" }}
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] shadow-[0_0_20px_rgba(255,49,49,0.8)]"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Status Hub */}
          <section className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-[var(--border-main)] relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Zap className="w-5 h-5 text-[var(--accent-primary)]" />
                <h3 className="font-black uppercase tracking-[0.4em] text-[10px]">STATUS</h3>
              </div>
              <div className={`flex items-center gap-2 ${TIER_CONFIG[data.profile.lumenTier]?.color || 'text-zinc-500'}`}>
                <Zap className={`w-3 h-3 ${TIER_CONFIG[data.profile.lumenTier]?.glow || ''}`} />
                <span className="font-black uppercase tracking-widest text-[9px]">{data.profile.lumenTier}</span>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="text-left">
                <span className="text-6xl font-black tracking-tighter text-[var(--text-primary)] tabular-nums leading-none">
                  {data.profile.lumenPoints.toLocaleString()}
                </span>
                <span className="text-xl font-black text-[var(--accent-primary)] ml-2">LMN</span>
              </div>
              
              {data.profile.streakDays > 0 && (
                <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-full">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest tabular-nums">
                    {data.profile.streakDays} DAY STREAK
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Streak & Daily Missions */}
          <section className="glass-panel-premium-red p-10 hover:bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/10 transition-all cursor-pointer group relative overflow-hidden clip-brutal-br">
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <Flame className="w-6 h-6 text-[var(--accent-primary)]" />
                <h3 className="font-black uppercase tracking-[0.4em] text-[10px]">DAILY_MISSIONS</h3>
              </div>
                <div className="flex flex-col gap-4">
                  {data.missions.map((mission: any) => (
                    <div key={mission.label} className={`flex items-center justify-between p-4 border border-white/10 rounded-3xl transition-all ${mission.done ? 'border-green-500 bg-green-500/10' : 'border-[var(--border-main)] bg-[var(--bg-tertiary)]/50'}`}>
                      <div className="flex items-center gap-3">
                        {mission.done ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <div className="w-4 h-4 border border-zinc-700 bg-[var(--bg-secondary)]" />
                        )}
                        <span className={`font-black uppercase tracking-widest text-[10px] ${mission.done ? 'text-green-500' : 'text-zinc-500'}`}>{mission.label}</span>
                      </div>
                      <span className={`font-black text-[10px] tracking-widest ${mission.done ? 'text-green-500' : 'text-[var(--accent-primary)]'}`}>
                        {mission.done ? 'COMPLETED' : `+${mission.reward} LMN`}
                      </span>
                    </div>
                  ))}
                </div>
            </div>
          </section>

          {/* Ranking Subsystem — Live LUMEN Leaderboard */}
          <section className="glass-panel-premium p-10 border border-white/10 rounded-3xl clip-brutal-bl">
            <div className="flex items-center gap-4 mb-10 border-b border-[var(--border-main)] pb-8">
              <Trophy className="w-6 h-6 text-[var(--accent-primary)]" />
              <h3 className="font-black uppercase tracking-[0.4em] text-[10px]">GLOBAL_RANKINGS</h3>
              <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest ml-auto">LIVE // {data.leaderboard.length} NODES</span>
            </div>
            {data.leaderboard.length > 0 ? (
              <div className="flex flex-col gap-4">
                {data.leaderboard.map((actor: any) => (
                  <div key={actor.id} className={`flex items-center justify-between p-5 border border-white/10 rounded-3xl transition-all group ${actor.isUser ? 'border-[var(--accent-primary)] bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/10 rounded-full' : 'border-[var(--border-main)] bg-[var(--bg-tertiary)]/50 hover:border-zinc-700'}`}>
                    <div className="flex items-center gap-5">
                      <span className={`font-black text-2xl tabular-nums w-8 shrink-0 ${actor.rank === 1 ? 'text-[var(--accent-primary)]' : actor.rank === 2 ? 'text-zinc-400' : actor.rank === 3 ? 'text-orange-700' : 'text-zinc-800 group-hover:text-zinc-600'}`}>
                        {String(actor.rank).padStart(2, '0')}
                      </span>
                      <div className="w-10 h-10 bg-[var(--bg-secondary)] rounded-full overflow-hidden border border-white/10 rounded-3xl border-[var(--border-main)] shrink-0 flex items-center justify-center">
                        {actor.avatarUrl ? (
                          <img src={actor.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-zinc-700" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-black uppercase tracking-tighter text-sm ${actor.isUser ? 'text-white' : 'text-zinc-400'}`}>
                            {actor.isUser ? 'YOU' : actor.name}
                          </span>
                          {actor.isVip && <Crown className="w-3 h-3 text-yellow-400" />}
                          {actor.streakDays >= 3 && <Flame className="w-3 h-3 text-orange-500" />}
                        </div>
                        {actor.username && (
                          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">@{actor.username}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-black tabular-nums text-[var(--accent-primary)] text-lg">{actor.score.toLocaleString()}</span>
                      <span className="text-[8px] font-black text-zinc-600 ml-1">LMN</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Trophy className="w-8 h-8 text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-700 font-black uppercase tracking-widest text-[10px]">NO RANKED USERS YET</p>
              </div>
            )}
          </section>

          {/* Notification Preview */}
          <section className="glass-panel-premium border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl p-10 clip-brutal-tr relative overflow-hidden">
            <div className="flex items-center justify-between mb-8 border-b border-[var(--border-main)] pb-6">
              <div className="flex items-center gap-4">
                <Bell className="w-6 h-6 text-[var(--accent-primary)]" />
                <h3 className="font-black uppercase tracking-[0.4em] text-[10px]">LATEST_UPDATES</h3>
              </div>
              <button 
                onClick={() => setCurrentView('NOTIFICATIONS')}
                className="text-zinc-600 hover:text-[var(--accent-primary)] font-black uppercase tracking-[0.3em] text-[10px] flex items-center gap-2 transition-colors cursor-pointer"
              >
                VIEW ALL <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            
            {data.notifications && data.notifications.length > 0 ? (
              <div className="space-y-4">
                {data.notifications.slice(0, 3).map((notif: any) => (
                  <div 
                    key={notif.id}
                    onClick={() => setCurrentView('NOTIFICATIONS')}
                    className={`p-5 border border-white/10 rounded-3xl transition-all cursor-pointer group relative ${
                      notif.priority === 'VERY IMPORTANT' 
                        ? 'border-[var(--accent-primary)] bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/10 hover:bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/20' 
                        : notif.priority === 'IMPORTANT'
                        ? 'border-yellow-500/50 bg-yellow-500/5 hover:bg-yellow-500/10'
                        : 'border-[var(--border-main)] bg-[var(--bg-tertiary)]/50 hover:border-zinc-600'
                    }`}
                  >
                    {!notif.read && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]" />
                    )}
                    <div className="flex items-start gap-4">
                      <div className={`p-2 shrink-0 ${
                        notif.priority === 'VERY IMPORTANT' ? 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/20' : 'bg-[var(--bg-secondary)]'
                      }`}>
                        {notif.priority === 'VERY IMPORTANT' 
                          ? <AlertTriangle className="w-4 h-4 text-[var(--accent-primary)]" />
                          : <Bell className="w-4 h-4 text-zinc-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-white ${
                            notif.priority === 'VERY IMPORTANT' ? 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]' : notif.priority === 'IMPORTANT' ? 'bg-yellow-500' : 'bg-zinc-600'
                          }`}>
                            {notif.priority}
                          </span>
                          {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] animate-pulse" />}
                        </div>
                        <h4 className="text-sm font-black uppercase tracking-tighter group-hover:text-[var(--accent-primary)] transition-colors">{notif.title}</h4>
                        <p className="text-[10px] text-zinc-600 font-bold mt-1 line-clamp-2">{notif.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bell className="w-8 h-8 text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-700 font-black uppercase tracking-widest text-[10px]">NO SIGNALS YET</p>
              </div>
            )}
          </section>

        </div>

        {/* RIGHT COLUMN: OPERATIONS */}
        <div className="lg:col-span-8 flex flex-col gap-12">
          
          {/* Action Hub - Chatbot Interface */}
          <section className="w-full">
            <div className="glass-panel-premium border border-[var(--accent-primary)]/30 shadow-[0_0_40px_var(--accent-glow)]/10 rounded-[3rem] p-10 md:p-16 relative overflow-hidden group clip-brutal-hero-primary min-h-[600px] flex flex-col">
              <div className="flex items-center gap-6 mb-12 relative z-10">
                <div className="p-4 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-3xl shadow-[0_0_20px_var(--accent-glow)]">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">AI_MATCHING_ENGINE</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--accent-primary)] mt-2">AGENTIC_TALENT_ACQUISITION</p>
                </div>
              </div>

              <div className="flex-1 min-h-0 relative z-10">
                <DirectorChatbot />
              </div>

              {/* Decorative Background Elements */}
              <div className="absolute right-[-30px] bottom-[-30px] text-[20rem] font-black text-black opacity-10 pointer-events-none uppercase leading-none z-0">
                AI
              </div>
            </div>
          </section>

          {/* AI Matching Grid */}
          {data.roles.length > 0 && (
          <section className="flex-1 flex flex-col min-h-0 mt-8">
            <div className="flex items-end justify-between mb-12 px-2">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/10 border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl rounded-full">
                  <Star className="w-8 h-8 text-[var(--accent-primary)]" />
                </div>
                <div>
                  <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">AGENTIC MATCHES</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 mt-2">REAL_TIME_PIPELINE_SYNC</p>
                </div>
              </div>
              <button className="text-zinc-600 hover:text-[var(--accent-primary)] font-black uppercase tracking-[0.3em] text-[10px] flex items-center gap-3 transition-all border-b border-transparent hover:border-[var(--accent-primary)] pb-2 cursor-pointer">
                FULL REGISTRY <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 w-full overflow-x-auto snap-x snap-mandatory hide-scrollbar flex gap-10 pb-12">
              {data.roles.map((role: any, index: number) => (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`snap-center shrink-0 w-[350px] md:w-[480px] glass-panel-premium border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl p-10 flex flex-col hover:bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/5 transition-all group cursor-pointer ${
                    index % 2 === 0 ? 'clip-brutal-tl' : 'clip-brutal-tr'
                  }`}
                >
                  <div className="flex justify-between items-start mb-10">
                    <div className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-black px-6 py-3 uppercase text-[10px] tracking-[0.2em] shadow-[0_0_20px_rgba(255,49,49,0.4)] rounded-full">
                      {role.match}% MATCH
                    </div>
                    <div className="text-right">
                      <p className="text-zinc-600 font-black uppercase tracking-widest text-[9px]">EXPIRES_IN</p>
                      <span className="text-white font-black uppercase tracking-widest text-xs tabular-nums">
                        {role.deadline}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-2 h-2 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full" />
                      <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[10px]">{role.project}</p>
                    </div>
                    <h3 className="text-5xl font-black uppercase tracking-tighter leading-[0.9] mb-8 group-hover:text-[var(--accent-primary)] transition-colors">
                      {role.title}
                    </h3>
                    <div className="flex flex-wrap gap-3 mt-auto">
                      {role.tags.map((tag: string) => (
                        <span key={tag} className="border border-[var(--border-main)] text-zinc-500 px-4 py-2 text-[9px] font-black uppercase tracking-widest group-hover:border-[var(--accent-primary)]/30 group-hover:text-[var(--accent-primary)] transition-colors">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-12 border-t border-[var(--border-main)] pt-8 flex justify-between items-center group-hover:border-[var(--accent-primary)]/30 transition-all">
                    <span className="font-black text-[10px] uppercase tracking-[0.3em] text-zinc-600 group-hover:text-white transition-colors">ANALYZE_SPECIFICATIONS</span>
                    <div className="w-12 h-12 bg-[var(--bg-tertiary)] border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl flex items-center justify-center group-hover:bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transition-all">
                      <ChevronRight className="w-6 h-6 text-[var(--accent-primary)] group-hover:text-white transition-all" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
          )}

      </div>
      </div>
      </div>
      ) : currentView === 'CREATE' ? (
        <div className="flex flex-col gap-16 py-12 animate-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center gap-6 px-4">
            <div className="p-5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/10 border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl rounded-full">
              <PlusSquare className="w-10 h-10 text-[var(--accent-primary)]" />
            </div>
            <div>
              <h1 className="text-7xl font-black uppercase tracking-tighter leading-none">CREATE_HUB</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 mt-2">SUBMIT_YOUR_PERFORMANCE</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-8 flex flex-col gap-12">
              <button 
                onClick={handleUploadClick}
                disabled={uploading}
                className={`w-full relative group p-16 md:p-24 text-left overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-12 transition-all duration-700 cursor-pointer ${
                  uploading ? 'bg-[var(--bg-tertiary)] border-2 border-[var(--accent-secondary)]' : 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white clip-brutal-hero-primary shadow-[0_0_60px_var(--accent-glow)] hover:shadow-[0_0_100px_var(--accent-glow)]'
                }`}
              >
                {uploading && (
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] opacity-30 z-0 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                )}
                
                <div className="relative z-10 max-w-2xl">
                  <div className="flex items-center gap-4 mb-6">
                    <p className="font-black uppercase tracking-[0.5em] text-[10px] text-white/70">
                      {uploading ? "UPLINK_ESTABLISHED" : "ACTIVATE_PIPELINE"}
                    </p>
                  </div>
                  <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.8] text-white">
                    {uploading ? `SYNCING ${uploadProgress}%` : "UPLOAD AUDITION"}
                  </h2>
                  <p className="font-black uppercase tracking-widest mt-8 text-sm text-white/80 max-w-lg">
                    {uploading ? "Transferring performance data to MM8 decentralized storage." : "Submit your latest performance. MM8 agents will automatically analyze and match your data."}
                  </p>
                </div>

                {!uploading && (
                  <div className="relative z-10 w-32 h-32 bg-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500 clip-brutal-tr shadow-2xl">
                    <PlayCircle className="w-16 h-16 text-[var(--accent-primary)]" />
                  </div>
                )}
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-[var(--border-main)] clip-brutal-tl hover:border-[var(--accent-primary)]/30 transition-colors group">
                  <div className="flex items-center gap-4 mb-6">
                    <Video className="w-5 h-5 text-[var(--accent-primary)]" />
                    <h3 className="font-black uppercase tracking-widest text-[10px]">VIDEO_GUIDELINES</h3>
                  </div>
                  <ul className="space-y-4">
                    {['Horizontal framing only', 'Neutral background', 'Chest-up medium shot', 'Stable lighting (No backlighting)'].map((tip: string) => (
                      <li key={tip} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]" />
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-zinc-200 transition-colors">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-[var(--border-main)] clip-brutal-tr hover:border-[var(--accent-primary)]/30 transition-colors group">
                  <div className="flex items-center gap-4 mb-6">
                    <Mic2 className="w-5 h-5 text-[var(--accent-primary)]" />
                    <h3 className="font-black uppercase tracking-widest text-[10px]">AUDIO_PROTOCOLS</h3>
                  </div>
                  <ul className="space-y-4">
                    {['Minimize background noise', 'Clear voice projection', 'No music/overlay', 'Direct mic orientation'].map((tip: string) => (
                      <li key={tip} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]" />
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-zinc-200 transition-colors">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-8">
              <div className="glass-panel-premium-red p-10 border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl clip-brutal-br shadow-[0_0_40px_rgba(255,49,49,0.1)]">
                <div className="flex items-center gap-4 mb-8">
                  <Zap className="w-6 h-6 text-[var(--accent-primary)]" />
                  <h3 className="font-black uppercase tracking-widest text-[10px]">LMN_REWARDS</h3>
                </div>
                <div className="text-left">
                  <span className="text-7xl font-black tracking-tighter text-white">+{Math.floor(40 * (data.profile.multiplier || 1))}</span>
                  <span className="text-xl font-black text-[var(--accent-primary)] ml-2">LMN</span>
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mt-4 leading-relaxed">
                  Every audition upload awards 40 LMN points (x1.3 for VIP members). Points contribute directly to your global ranking and pipeline priority.
                </p>
              </div>

              <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-[var(--border-main)] clip-brutal-bl bg-[var(--bg-tertiary)]/50">
                <h3 className="font-black uppercase tracking-widest text-[10px] mb-6 text-zinc-600">SUBMISSION_HISTORY</h3>
                <div className="flex flex-col gap-4">
                  <div className="text-center py-10 opacity-30">
                    <Database className="w-8 h-8 text-zinc-800 mx-auto mb-4" />
                    <p className="text-[9px] font-black uppercase tracking-widest">LOGS_OFFLINE</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : currentView === 'ROLES' ? (
        <div className="flex flex-col gap-16 py-12 animate-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-6">
              <div className="p-5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/10 border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl rounded-full">
                <Star className="w-10 h-10 text-[var(--accent-primary)]" />
              </div>
              <div>
                <h1 className="text-7xl font-black uppercase tracking-tighter leading-none">ROLES_HUB</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 mt-2">ACTIVE_PIPELINE_MATCHES</p>
              </div>
            </div>
            
            <div className="flex gap-4">
               <div className="hidden md:flex flex-col text-right">
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">REALTIME_MATCHING</span>
                  <span className="text-sm font-black text-white uppercase tracking-tighter">NODE_SYNC_ACTIVE</span>
               </div>
               <div className="w-2 h-2 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full animate-pulse self-center" />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 px-4 border-y border-[var(--border-main)] py-6">
            {['HIGH_MATCH', 'URGENT', 'NEW_PROJECTS', 'SAVED'].map((filter: string) => (
              <button key={filter} className="px-6 py-2 border border-[var(--border-main)] text-[9px] font-black uppercase tracking-widest hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all cursor-pointer">
                {filter}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-10 px-4">
             {(data.roles.length > 0 ? data.roles : [
                { id: 1, title: "LEAD ANTAGONIST", project: "SHADOWS OF KOCHI", match: 98, deadline: "24H", tags: ["INTENSE", "MALAYALAM"], budget: "UPSCALE", director: "ANONYMOUS_A" },
                { id: 2, title: "SUPPORTING COP", project: "UNTITLED THRILLER", match: 84, deadline: "3D", tags: ["ACTION", "HINDI"], budget: "UPSCALE", director: "ANONYMOUS_B" },
                { id: 3, title: "COMIC RELIEF", project: "CAMPUS DIARIES", match: 72, deadline: "1W", tags: ["FUNNY", "TAMIL"], budget: "STANDARD", director: "ANONYMOUS_C" },
                { id: 4, title: "STUNT DOUBLE", project: "REBELS", match: 65, deadline: "12H", tags: ["PHYSICAL", "ENGLISH"], budget: "PREMIUM", director: "STUNT_CORP" },
                { id: 5, title: "VOICE ARTIST", project: "NEON DREAMS", match: 58, deadline: "5D", tags: ["VOICE", "FUTURISTIC"], budget: "MICRO", director: "INDIE_STUDIO" },
             ]).map((role: any, index: number) => (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-panel-premium border border-white/10 rounded-3xl p-10 flex flex-col hover:border-[var(--accent-primary)]/50 transition-all group cursor-pointer relative overflow-hidden h-full"
                >
                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                      <Star className="w-5 h-5 text-[var(--accent-primary)]" />
                   </div>

                  <div className="flex justify-between items-start mb-8">
                    <div className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-black px-4 py-2 uppercase text-[9px] tracking-widest rounded-full shadow-[0_0_20px_rgba(255,49,49,0.2)]">
                      {role.match}% MATCH
                    </div>
                    <div className="text-right">
                       <span className="text-[8px] font-black text-zinc-600 uppercase block tracking-widest">DEADLINE</span>
                       <span className="text-white font-black uppercase text-xs tabular-nums">{role.deadline}</span>
                    </div>
                  </div>

                  <div className="flex-1">
                    <p className="text-zinc-600 font-black uppercase tracking-[0.3em] text-[9px] mb-2">{role.project}</p>
                    <h3 className="text-4xl font-black uppercase tracking-tighter leading-none mb-8 group-hover:text-[var(--accent-primary)] transition-colors">
                      {role.title}
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                       <div className="bg-[var(--bg-tertiary)]/50 p-4 border border-[var(--border-main)] group-hover:border-[var(--border-main)] transition-colors">
                          <p className="text-[7px] font-black text-zinc-600 uppercase tracking-widest mb-1">DIRECTOR</p>
                          <p className="text-[10px] font-black text-white uppercase">{role.director || 'RESTRICTED'}</p>
                       </div>
                       <div className="bg-[var(--bg-tertiary)]/50 p-4 border border-[var(--border-main)] group-hover:border-[var(--border-main)] transition-colors">
                          <p className="text-[7px] font-black text-zinc-600 uppercase tracking-widest mb-1">BUDGET</p>
                          <p className="text-[10px] font-black text-white uppercase">{role.budget || 'STANDARD'}</p>
                       </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {role.tags.map((tag: string) => (
                        <span key={tag} className="bg-[var(--bg-secondary)]/30 text-zinc-500 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest border border-[var(--border-main)] group-hover:border-[var(--accent-primary)]/20 transition-all">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button className="mt-12 w-full py-4 bg-[var(--bg-tertiary)] border border-[var(--border-main)] font-black uppercase tracking-[0.3em] text-[10px] hover:bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] hover:text-white transition-all group-hover:border-[var(--accent-primary)] cursor-pointer">
                    ANALYZE_ROLE
                  </button>
                </motion.div>
             ))}
          </div>
        </div>
      ) : currentView === 'MISSIONS' ? (
        <div className="flex flex-col gap-16 py-12 animate-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-6">
              <div className="p-5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/10 border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl rounded-full">
                <Target className="w-10 h-10 text-[var(--accent-primary)]" />
              </div>
              <div>
                <h1 className="text-7xl font-black uppercase tracking-tighter leading-none">MISSIONS_HUB</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 mt-2">RESOURCE_ACQUISITION_PROTOCOLS</p>
              </div>
            </div>
            
            <div className="bg-[var(--bg-secondary)]/50 p-6 border border-white/10 rounded-3xl border-[var(--border-main)] flex flex-col gap-2">
               <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">ACTIVE_MULTIPLIER</span>
               <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span className="text-2xl font-black text-white tabular-nums">x{data.profile.multiplier.toFixed(1)}</span>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 px-4">
             {/* Main Missions Column */}
             <div className="lg:col-span-8 flex flex-col gap-10">
                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-[var(--border-main)]">
                   <div className="flex items-center gap-4 mb-10 border-b border-[var(--border-main)] pb-6">
                      <Flame className="w-6 h-6 text-[var(--accent-primary)]" />
                      <h3 className="text-2xl font-black uppercase tracking-tighter">DAILY_MISSIONS</h3>
                      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-auto">RESETS_IN 14H</span>
                   </div>

                   <div className="flex flex-col gap-6">
                      {data.missions.map((mission: any) => (
                        <div 
                          key={mission.label} 
                          className={`flex items-center justify-between p-8 border border-white/10 rounded-3xl transition-all relative overflow-hidden group ${
                            mission.done 
                              ? 'border-green-500/50 bg-green-500/5' 
                              : 'border-[var(--border-main)] bg-[var(--bg-tertiary)]/50 hover:border-zinc-700'
                          }`}
                        >
                          {mission.done && (
                            <div className="absolute top-0 left-0 w-1 h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                          )}
                          
                          <div className="flex items-center gap-6">
                            <div className={`w-12 h-12 flex items-center justify-center border border-white/10 rounded-3xl ${
                               mission.done ? 'border-green-500/30 bg-green-500/10' : 'border-[var(--border-main)] bg-[var(--bg-secondary)]'
                            }`}>
                               {mission.done ? (
                                 <CheckCircle2 className="w-6 h-6 text-green-500" />
                               ) : (
                                 <div className="w-2 h-2 bg-zinc-700 rounded-full group-hover:bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transition-colors" />
                               )}
                            </div>
                            <div>
                               <h4 className={`text-xl font-black uppercase tracking-tight ${mission.done ? 'text-green-500' : 'text-white'}`}>
                                  {mission.label}
                               </h4>
                               <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-1">
                                  {mission.done ? 'MISSION_ACKNOWLEDGED' : 'PENDING_VALIDATION'}
                               </p>
                            </div>
                          </div>

                          <div className="text-right">
                             <span className={`text-3xl font-black tabular-nums ${mission.done ? 'text-green-500' : 'text-[var(--accent-primary)]'}`}>
                                {mission.done ? 'DONE' : `+${mission.reward}`}
                             </span>
                             <span className="text-[10px] font-black text-zinc-600 ml-2">LMN</span>
                          </div>
                        </div>
                      ))}
                   </div>
                </div>

                {/* Achievement/Milestone Section */}
                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-[var(--border-main)] opacity-50">
                   <div className="flex items-center gap-4 mb-10 border-b border-[var(--border-main)] pb-6">
                      <Trophy className="w-6 h-6 text-zinc-600" />
                      <h3 className="text-2xl font-black uppercase tracking-tighter">MILESTONES // LOCKED</h3>
                   </div>
                   <div className="flex items-center justify-center py-20 border-2 border-dashed border-[var(--border-main)]">
                      <Lock className="w-10 h-10 text-zinc-800" />
                   </div>
                </div>
             </div>

             {/* Sidebar Info */}
             <div className="lg:col-span-4 flex flex-col gap-10">
                <div className="glass-panel-premium-red p-10 border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl clip-brutal-hero-primary shadow-[0_0_40px_rgba(255,49,49,0.1)]">
                   <h3 className="font-black uppercase tracking-widest text-[10px] mb-6">PROGRESS_REPORT</h3>
                   <div className="flex items-end justify-between mb-4">
                      <span className="text-[9px] font-black uppercase text-[var(--text-secondary)] tracking-widest">TIER_REACH: {data.profile.lumenTier}</span>
                      <span className="text-sm font-black text-[var(--text-primary)]">{data.profile.lumenPoints} / 6000</span>
                   </div>
                   <div className="w-full h-2 bg-[var(--bg-primary)]/40 relative overflow-hidden">
                      <div 
                         className="absolute top-0 left-0 h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all duration-1000"
                         style={{ width: `${Math.min((data.profile.lumenPoints / 6000) * 100, 100)}%` }}
                      />
                   </div>
                   <p className="text-[8px] font-black uppercase tracking-widest mt-6 text-white/50 leading-relaxed">
                      Collect 6,000 LMN to activate the "ACTIVE TALENT" node. This unlocks priority matchmaking and advanced analytics.
                   </p>
                </div>

                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-[var(--border-main)]">
                   <h3 className="font-black uppercase tracking-widest text-[10px] mb-8 text-zinc-600">MISSION_HISTORY</h3>
                   <div className="space-y-6">
                      {[
                         { action: 'DAILY_LOGIN', date: '03.05.2026', points: Math.floor(10 * data.profile.multiplier) },
                         { action: 'PROFILE_SYNC', date: '02.05.2026', points: Math.floor(40 * data.profile.multiplier) },
                         { action: 'NODE_ACTIVATION', date: '01.05.2026', points: 100 },
                      ].map((log: any, i: number) => (
                         <div key={i} className="flex justify-between items-center border-l-2 border-[var(--border-main)] pl-4 py-2">
                            <div>
                               <p className="text-[10px] font-black uppercase text-white">{log.action}</p>
                               <p className="text-[8px] font-black text-zinc-600">{log.date}</p>
                            </div>
                            <span className="text-xs font-black text-[var(--accent-primary)]">+{log.points}</span>
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        </div>
      ) : currentView === 'LMN_REGISTER' ? (
        <div className="flex flex-col gap-16 py-12 animate-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-6">
              <div className="p-5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/10 border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl rounded-full">
                <Zap className="w-10 h-10 text-[var(--accent-primary)]" />
              </div>
              <div>
                <h1 className="text-7xl font-black uppercase tracking-tighter leading-none">LMN_REGISTER</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 mt-2">DECENTRALIZED_RESOURCE_LEDGER</p>
              </div>
            </div>
            
            <div className="text-right hidden md:block">
               <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">VERIFIED_BALANCE</p>
               <p className="text-3xl font-black text-white tabular-nums">{data.profile.lumenPoints.toLocaleString()} LMN</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 px-4">
             {/* Economy Walkthrough */}
             <div className="lg:col-span-8 flex flex-col gap-10">
                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-[var(--border-main)] bg-[var(--bg-tertiary)]/50">
                   <div className="flex items-center gap-4 mb-10 border-b border-[var(--border-main)] pb-6">
                      <BookOpen className="w-6 h-6 text-[var(--accent-primary)]" />
                      <h3 className="text-2xl font-black uppercase tracking-tighter">ECONOMY_101 // THE_PROTOCOL</h3>
                   </div>
                   
                   <div className="space-y-12">
                      <div className="flex gap-8 group">
                         <div className="text-5xl font-black text-zinc-800 group-hover:text-[var(--accent-primary)] transition-colors tabular-nums">01</div>
                         <div>
                            <h4 className="text-xl font-black uppercase tracking-tight mb-3">WHAT IS LUMEN?</h4>
                            <p className="text-zinc-500 text-sm leading-relaxed max-w-2xl font-medium">
                               LUMEN (LMN) is the foundational utility resource of the MM8 ecosystem. It represents your "Talent Index" — a measurable metric of your activity, reliability, and match-potential within the decentralized casting pipeline.
                            </p>
                         </div>
                      </div>

                      <div className="flex gap-8 group">
                         <div className="text-5xl font-black text-zinc-800 group-hover:text-[var(--accent-primary)] transition-colors tabular-nums">02</div>
                         <div>
                            <h4 className="text-xl font-black uppercase tracking-tight mb-3">THE_VALUE_PROP</h4>
                            <p className="text-zinc-500 text-sm leading-relaxed max-w-2xl font-medium">
                               LMN is not just a score. It dictates your visibility to AI agents. High-LMN nodes receive priority matching for premium roles, early access to "Urgent" casting calls, and higher resource multipliers.
                            </p>
                         </div>
                      </div>

                      <div className="flex gap-8 group">
                         <div className="text-5xl font-black text-zinc-800 group-hover:text-[var(--accent-primary)] transition-colors tabular-nums">03</div>
                         <div>
                            <h4 className="text-xl font-black uppercase tracking-tight mb-3">YIELD_CALCULATION</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                               {[
                                  { label: 'DAILY_LOGIN', base: '10 LMN', logic: 'x STREAK_MULT' },
                                  { label: 'AUDITION_UPLOAD', base: '100 LMN', logic: 'BASE_REWARD' },
                                  { label: 'PROFILE_SYNC', base: '50 LMN', logic: 'ONE_TIME_GRANT' },
                                  { label: 'VIP_STATUS', base: '+30%', logic: 'GLOBAL_MULTIPLIER' },
                               ].map((m: any) => (
                                  <div key={m.label} className="p-4 bg-[var(--bg-secondary)] border border-white/10 rounded-3xl border-[var(--border-main)]">
                                     <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">{m.label}</p>
                                     <div className="flex items-center justify-between">
                                        <span className="text-lg font-black text-[var(--text-primary)] tabular-nums">{m.base}</span>
                                        <span className="text-[8px] font-black text-[var(--accent-primary)] uppercase">{m.logic}</span>
                                     </div>
                                  </div>
                               ))}
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Detailed Metrics */}
                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-[var(--border-main)]">
                   <div className="flex items-center gap-4 mb-10 border-b border-[var(--border-main)] pb-6">
                      <BarChart3 className="w-6 h-6 text-[var(--accent-primary)]" />
                      <h3 className="text-2xl font-black uppercase tracking-tighter">YIELD_METRICS</h3>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="text-center p-8 bg-[var(--bg-tertiary)] border border-white/10 rounded-3xl border-[var(--border-main)]">
                         <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">AVG_DAILY_YIELD</p>
                         <p className="text-4xl font-black text-white tabular-nums">142</p>
                         <p className="text-[8px] font-black text-green-500 mt-2 uppercase tracking-tighter">+12% VS LAST_WEEK</p>
                      </div>
                      <div className="text-center p-8 bg-[var(--bg-tertiary)] border border-white/10 rounded-3xl border-[var(--border-main)]">
                         <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">ACCUMULATION_RATE</p>
                         <p className="text-4xl font-black text-white tabular-nums">0.85</p>
                         <p className="text-[8px] font-black text-zinc-500 mt-2 uppercase tracking-tighter">LMN / HR</p>
                      </div>
                      <div className="text-center p-8 bg-[var(--bg-tertiary)] border border-white/10 rounded-3xl border-[var(--border-main)]">
                         <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">TOTAL_DISTRIBUTED</p>
                         <p className="text-4xl font-black text-white tabular-nums">1.2M</p>
                         <p className="text-[8px] font-black text-zinc-500 mt-2 uppercase tracking-tighter">ACROSS_GLOBAL_INDEX</p>
                      </div>
                   </div>
                </div>
             </div>

             {/* Sidebar Info & Tips */}
             <div className="lg:col-span-4 flex flex-col gap-10">
                <div className="glass-panel-premium-red p-10 border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl clip-brutal-tl shadow-[0_0_40px_rgba(255,49,49,0.1)]">
                   <h3 className="font-black uppercase tracking-widest text-[10px] mb-8">MY_LMN_RECORD</h3>
                   <div className="space-y-8">
                      <div className="flex justify-between items-end border-b border-white/10 pb-4">
                         <span className="text-[10px] font-black uppercase text-white/60">LIFETIME_POINTS</span>
                         <span className="text-2xl font-black text-white tabular-nums">{data.profile.lumenPoints}</span>
                      </div>
                      <div className="flex justify-between items-end border-b border-white/10 pb-4">
                         <span className="text-[10px] font-black uppercase text-white/60">CURRENT_TIER</span>
                         <span className="text-2xl font-black text-white uppercase">{data.profile.lumenTier}</span>
                      </div>
                      <div className="flex justify-between items-end border-b border-white/10 pb-4">
                         <span className="text-[10px] font-black uppercase text-white/60">ACTIVE_MULTIPLIER</span>
                         <span className="text-2xl font-black text-[var(--accent-primary)] tabular-nums">x{data.profile.multiplier.toFixed(1)}</span>
                      </div>
                   </div>
                </div>

                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-[var(--border-main)] bg-[var(--bg-tertiary)]/50">
                   <h3 className="font-black uppercase tracking-widest text-[10px] mb-8 text-zinc-600">STRATEGIC_TIPS</h3>
                   <div className="space-y-6">
                      {[
                         { title: 'STREAK_MAINTENANCE', desc: 'Login for 7 consecutive days to activate a x1.5 multiplier.' },
                         { title: 'ROLE_INTERACTION', desc: 'Viewing and saving roles boosts your match-score by 5 LMN/action.' },
                         { title: 'NODE_UPGRADE', desc: 'Activate VIP status to permanently boost all LMN yield by 30%.' },
                         { title: 'AUDITION_MASTERY', desc: 'Weekly video submissions grant a massive 500 LMN consistency bonus.' },
                      ].map((tip: any, i: number) => (
                         <div key={i} className="group cursor-pointer">
                            <h4 className="text-[10px] font-black uppercase text-white mb-2 group-hover:text-[var(--accent-primary)] transition-colors flex items-center gap-2">
                               <div className="w-1.5 h-1.5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]" />
                               {tip.title}
                            </h4>
                            <p className="text-[9px] font-bold text-zinc-600 leading-relaxed uppercase">{tip.desc}</p>
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        </div>
      ) : currentView === 'FEED' ? (
        <div className="flex flex-col gap-16 py-12 animate-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-6">
              <div className="p-5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/10 border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl rounded-full">
                <Rss className="w-10 h-10 text-[var(--accent-primary)]" />
              </div>
              <div>
                <h1 className="text-7xl font-black uppercase tracking-tighter leading-none">INTEL_FEED</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 mt-2">GLOBAL_TALENT_PIPELINE_NEWS</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 px-4 relative">
             {/* Feed List */}
             <div className="lg:col-span-7 flex flex-col gap-8">
                {MOCK_FEEDS.map((feed: any) => (
                   <div 
                      key={feed.id}
                      onClick={() => setSelectedFeed(feed)}
                      className={`glass-panel-premium p-8 border border-white/10 rounded-3xl border-[var(--border-main)] hover:border-[var(--accent-primary)] transition-all cursor-pointer group flex flex-col md:flex-row gap-8 ${selectedFeed?.id === feed.id ? 'border-[var(--accent-primary)] bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/5' : 'bg-[var(--bg-tertiary)]/50'}`}
                   >
                      <div className="w-full md:w-48 h-48 border border-white/10 rounded-3xl border-[var(--border-main)] overflow-hidden shrink-0 relative">
                         <img src={feed.image} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 scale-105 group-hover:scale-100" />
                         <div className="absolute top-2 left-2 px-2 py-1 bg-[var(--bg-primary)] text-[8px] font-black uppercase tracking-widest text-white border border-[var(--border-main)]">
                            {feed.category}
                         </div>
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-2">
                         <div>
                            <div className="flex items-center gap-4 mb-3">
                               <span className="text-[9px] font-black text-[var(--accent-primary)] uppercase tracking-widest">{feed.author}</span>
                               <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                               <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest tabular-nums">{feed.timestamp}</span>
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter leading-tight group-hover:text-[var(--accent-primary)] transition-colors mb-4">
                               {feed.title}
                            </h3>
                            <p className="text-zinc-500 text-[11px] font-black uppercase leading-relaxed line-clamp-2">
                               {feed.summary}
                            </p>
                         </div>
                         <div className="mt-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-white transition-colors">
                            READ_FULL_INTEL <ChevronRight className="w-3 h-3" />
                         </div>
                      </div>
                   </div>
                ))}
             </div>

             {/* Detail Panel */}
             <div className="lg:col-span-5 relative">
                <AnimatePresence mode="wait">
                   {selectedFeed ? (
                      <motion.div 
                         key={selectedFeed.id}
                         initial={{ opacity: 0, x: 20 }}
                         animate={{ opacity: 1, x: 0 }}
                         exit={{ opacity: 0, x: -20 }}
                         className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-[var(--border-main)] bg-[var(--bg-tertiary)] sticky top-12"
                      >
                         <div className="w-full h-72 border border-white/10 rounded-3xl border-[var(--border-main)] mb-10 overflow-hidden relative">
                            <img src={selectedFeed.image} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                            <div className="absolute bottom-6 left-6 right-6">
                               <span className="px-3 py-1 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white text-[10px] font-black uppercase tracking-widest">
                                  {selectedFeed.category}
                               </span>
                            </div>
                         </div>
                         
                         <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-6">
                            {selectedFeed.title}
                         </h2>
                         
                         <div className="flex items-center gap-4 mb-10 border-y border-[var(--border-main)] py-6">
                            <div className="w-10 h-10 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/10 border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl flex items-center justify-center">
                               <Rss className="w-4 h-4 text-[var(--accent-primary)]" />
                            </div>
                            <div>
                               <p className="text-[10px] font-black uppercase text-white tracking-widest">{selectedFeed.author}</p>
                               <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{selectedFeed.timestamp} // VERIFIED_SOURCE</p>
                            </div>
                         </div>

                         <div className="space-y-6">
                            <p className="text-zinc-400 text-sm leading-relaxed font-medium">
                               {selectedFeed.details}
                            </p>
                            <div className="pt-10 flex gap-4">
                               <button className="flex-1 py-4 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white hover:text-black transition-all cursor-pointer">
                                  SHARE_INTEL
                               </button>
                               <button className="p-4 border border-white/10 rounded-3xl border-[var(--border-main)] text-zinc-500 hover:text-white transition-all cursor-pointer">
                                  <Briefcase className="w-4 h-4" />
                               </button>
                            </div>
                         </div>
                      </motion.div>
                   ) : (
                      <div className="h-[70vh] glass-panel-premium border border-white/10 rounded-3xl border-[var(--border-main)] flex flex-col items-center justify-center text-center p-12 opacity-30 sticky top-12">
                         <Compass className="w-16 h-16 text-zinc-800 mb-8 animate-pulse" />
                         <h3 className="text-xl font-black uppercase tracking-widest text-zinc-700">SELECT_SIGNAL_TO_DECODE</h3>
                         <p className="text-[10px] font-black uppercase text-zinc-800 mt-4 tracking-[0.3em]">AWAITING_USER_INPUT</p>
                      </div>
                   )}
                </AnimatePresence>
             </div>
          </div>
        </div>
      ) : currentView === 'NOTIFICATIONS' ? (
        <div className="flex flex-col gap-12 py-12 animate-in slide-in-from-bottom-8 duration-700 max-w-5xl mx-auto w-full px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[var(--border-main)] pb-12 mb-4">
            <div>
              <h1 className="text-7xl font-black uppercase tracking-tighter leading-none">
                NOTIF<span className="text-[var(--accent-primary)] drop-shadow-[0_0_15px_var(--accent-glow)]">//</span>CENTER
              </h1>
              <div className="flex items-center gap-4 mt-6">
                <div className="flex gap-1">
                  {[...Array(5)].map((_: any, i: number) => {
                    const unreadCount = data.notifications.filter((n: any) => !n.read).length;
                    return (
                      <div key={i} className={`w-1 h-4 ${i < unreadCount ? 'bg-[var(--accent-primary)]' : 'bg-zinc-800'}`} />
                    );
                  })}
                </div>
                <p className="text-zinc-600 font-black tracking-[0.4em] uppercase text-[10px] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                  {data.notifications.filter((n: any) => !n.read).length} UNREAD_SIGNALS
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-8 md:mt-0">
              <div className="flex items-center gap-0">
                {(["ALL", "UNREAD"] as const).map((f: "ALL" | "UNREAD") => (
                  <button
                    key={f}
                    onClick={() => setNotifFilter(f)}
                    className={`px-6 py-3 font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer ${
                      notifFilter === f ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-tertiary)] text-zinc-500 hover:text-white brutal-border border-[var(--border-main)]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              {data.notifications.filter((n: any) => !n.read).length > 0 && (
                <button 
                  onClick={markAllRead}
                  className="px-6 py-3 glass-panel brutal-border-red text-[var(--accent-primary)] font-black uppercase tracking-widest text-[10px] hover:bg-[var(--accent-primary)] hover:text-white transition-all cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-3 h-3" /> MARK ALL READ
                </button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {(notifFilter === 'UNREAD' ? data.notifications.filter((n: any) => !n.read) : data.notifications).length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  className="text-center py-32"
                >
                  <Bell className="w-16 h-16 text-zinc-800 mx-auto mb-8" />
                  <p className="text-zinc-600 font-black uppercase tracking-[0.5em] text-sm">
                    {notifFilter === "UNREAD" ? "ALL SIGNALS PROCESSED" : "NO TRANSMISSIONS YET"}
                  </p>
                </motion.div>
              ) : (
                (notifFilter === 'UNREAD' ? data.notifications.filter((n: any) => !n.read) : data.notifications).map((notif: any, index: number) => {
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
                        !notif.read ? 'hover:border-[var(--accent-primary)]' : 'opacity-60 hover:opacity-80'
                      }`}
                    >
                      {!notif.read && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent-primary)] shadow-[0_0_10px_var(--accent-glow)]" />
                      )}

                      <div className="flex items-start gap-6 md:gap-8">
                        <div className={`p-3 ${notif.priority === 'VERY IMPORTANT' ? 'bg-[var(--accent-primary)]/20' : 'bg-[var(--bg-secondary)]'} shrink-0`}>
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
                              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                            )}
                          </div>
                          
                          <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter mb-4 group-hover:text-[var(--accent-primary)] transition-colors leading-tight">
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
        </div>
      ) : currentView === 'PROFILE' ? (
        <div className="flex flex-col gap-16 py-12 animate-in slide-in-from-bottom-8 duration-700">
          {/* Profile Header & Strength */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-4 gap-8">
            <div className="flex items-center gap-6">
              <div className="p-5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/10 border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl rounded-full">
                <User className="w-10 h-10 text-[var(--accent-primary)]" />
              </div>
              <div>
                <h1 className="text-7xl font-black uppercase tracking-tighter leading-none">ACTOR_PROFILE</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 mt-2">DECENTRALIZED_IDENTITY_VAULT</p>
              </div>
            </div>

            <div className="w-full md:w-96 p-8 glass-panel-premium border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl flex flex-col gap-4 relative overflow-hidden group">
               <div className="flex justify-between items-end relative z-10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">PROFILE_STRENGTH</span>
                  <span className="text-3xl font-black text-[var(--accent-primary)] tabular-nums">{profileStrength}%</span>
               </div>
               <div className="h-2 bg-[var(--bg-secondary)] border border-white/10 rounded-3xl border-[var(--border-main)] relative z-10 overflow-hidden">
                  <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${profileStrength}%` }}
                     className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] shadow-[0_0_20px_var(--accent-glow)]"
                  />
               </div>
               {profileStrength < 100 && (
                  <p className="text-[8px] font-black text-[var(--accent-primary)] uppercase tracking-widest animate-pulse relative z-10">
                     COMPLETE_PROFILE FOR 7X_VISIBILITY_BOOST
                  </p>
               )}
               <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                  <ShieldCheck className="w-20 h-20 text-white" />
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 px-4">
             {/* Left Column: Visuals & Sharing */}
             <div className="lg:col-span-4 flex flex-col gap-10">
                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-[var(--border-main)] flex flex-col items-center text-center">
                   <div className="w-48 h-48 rounded-full border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl bg-[var(--bg-secondary)] mb-8 relative overflow-hidden group">
                      {data.profile.avatarUrl ? (
                         <img src={data.profile.avatarUrl} alt="PFP" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                         <User className="w-20 h-20 text-zinc-800 m-auto mt-14" />
                      )}
                      <button 
                        onClick={() => setShowCropModal(true)}
                        className="absolute inset-0 bg-[var(--bg-primary)]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-white"
                      >
                         UPDATE_BIOMETRIC
                      </button>
                   </div>
                   <h2 className="text-3xl font-black uppercase tracking-tighter mb-1">{data.profile.name}</h2>
                   <p className="text-zinc-500 font-medium text-xs mb-4 line-clamp-2 max-w-[250px]">{data.profile.bio || 'NO_BIO_INITIALIZED'}</p>
                   <p className="text-[var(--accent-primary)] font-black text-[10px] tracking-[0.2em] mb-8">@{data.profile.username || 'ANONYMOUS'}</p>
                   
                   <div className="w-full space-y-4">
                      <button 
                        onClick={() => {
                           navigator.clipboard.writeText(`${window.location.origin}/actor/${data.profile.username || data.profile.id}`);
                           setMessage({ text: "The profile link has been copied to your clipboard.", type: 'info' });
                        }}
                        className="w-full py-4 bg-[var(--bg-secondary)] hover:bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transition-all border border-white/10 rounded-3xl border-[var(--border-main)] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3"
                      >
                         <Rss className="w-4 h-4" /> SHARE_PROFILE
                      </button>
                      {!isEditingProfile && (
                         <button 
                            onClick={() => setIsEditingProfile(true)}
                            className="w-full py-4 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 rounded-full"
                         >
                            <PlusSquare className="w-4 h-4" /> EDIT_DATA_VAULT
                         </button>
                      )}
                   </div>
                </div>

                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-[var(--border-main)] bg-[var(--bg-tertiary)]/50">
                   <h3 className="font-black uppercase tracking-widest text-[10px] mb-8 text-zinc-600">IDENTITY_BADGES</h3>
                   <div className="flex flex-wrap gap-4">
                      <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
                         <Crown className="w-3 h-3" /> VERIFIED_TALENT
                      </div>
                      <div className="px-4 py-2 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
                         <Zap className="w-3 h-3" /> HIGH_YIELD_NODE
                      </div>
                      <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-500 text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
                         <ShieldCheck className="w-3 h-3" /> DATA_SECURED
                      </div>
                   </div>
                </div>
             </div>

             {/* Right Column: Form/Display */}
             <div className="lg:col-span-8">
                {isEditingProfile ? (
                   <form onSubmit={handleUpdateProfile} className="flex flex-col gap-12">
                      {/* Section: Core Identity */}
                      <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-[var(--border-main)]">
                         <h3 className="text-2xl font-black uppercase tracking-tighter mb-10 border-b border-[var(--border-main)] pb-6 flex items-center gap-4">
                            <User className="w-6 h-6 text-[var(--accent-primary)]" /> CORE_IDENTITY
                         </h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">FULL_NAME</label>
                               <input 
                                  value={profileForm.fullName}
                                  onChange={e => setProfileForm({...profileForm, fullName: e.target.value})}
                                  className="bg-[var(--bg-secondary)] border border-white/10 rounded-3xl border-[var(--border-main)] p-4 font-black uppercase text-xs tracking-widest focus:border-[var(--accent-primary)] outline-none"
                               />
                            </div>
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">USERNAME</label>
                               <input 
                                  value={profileForm.username}
                                  onChange={e => setProfileForm({...profileForm, username: e.target.value})}
                                  className="bg-[var(--bg-secondary)] border border-white/10 rounded-3xl border-[var(--border-main)] p-4 font-black text-[var(--accent-primary)] text-xs tracking-widest focus:border-[var(--accent-primary)] outline-none"
                               />
                            </div>
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">EMAIL_ADDRESS</label>
                               <input 
                                  disabled
                                  value={profileForm.email}
                                  className="bg-[var(--bg-tertiary)]/50 border border-white/10 rounded-3xl border-[var(--border-main)] p-4 font-black text-zinc-700 text-xs tracking-widest outline-none opacity-50"
                               />
                            </div>
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">ALIAS / STAGE_NAME</label>
                               <input 
                                  value={profileForm.alias}
                                  onChange={e => setProfileForm({...profileForm, alias: e.target.value})}
                                  placeholder="E.G. THE_MAVERICK"
                                  className="bg-[var(--bg-secondary)] border border-white/10 rounded-3xl border-[var(--border-main)] p-4 font-black uppercase text-xs tracking-widest focus:border-[var(--accent-primary)] outline-none"
                               />
                            </div>
                            <div className="md:col-span-2 flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">BIO (MAX 500 WORDS)</label>
                               <textarea 
                                  value={profileForm.bio}
                                  onChange={e => setProfileForm({...profileForm, bio: e.target.value})}
                                  rows={4}
                                  className="bg-[var(--bg-secondary)] border border-white/10 rounded-3xl border-[var(--border-main)] p-4 font-black uppercase text-xs tracking-widest focus:border-[var(--accent-primary)] outline-none resize-none"
                               />
                            </div>
                            <div className="md:col-span-2">
                               <button 
                                 type="button"
                                 onClick={() => { setShowSettings(true); setShowPassUpdateInput(true); }}
                                 className="px-6 py-3 border border-[var(--border-main)] hover:border-[var(--accent-primary)] transition-all text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white flex items-center gap-3"
                               >
                                  <Lock className="w-4 h-4" /> RECONFIGURE_SECURITY_PROTOCOL
                               </button>
                            </div>
                         </div>
                      </div>

                      {/* Section: Professional Specs */}
                      <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-[var(--border-main)]">
                         <h3 className="text-2xl font-black uppercase tracking-tighter mb-10 border-b border-[var(--border-main)] pb-6 flex items-center gap-4">
                            <Briefcase className="w-6 h-6 text-[var(--accent-primary)]" /> PROFESSIONAL_SPECS
                         </h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">ROLE_TYPE</label>
                               <select 
                                  value={profileForm.role}
                                  onChange={e => setProfileForm({...profileForm, role: e.target.value})}
                                  className="bg-[var(--bg-secondary)] border border-white/10 rounded-3xl border-[var(--border-main)] p-4 font-black uppercase text-xs tracking-widest focus:border-[var(--accent-primary)] outline-none"
                               >
                                  <option value="">SELECT_ROLE</option>
                                  <option value="ACTOR">ACTOR</option>
                                  <option value="MODEL">MODEL</option>
                                  <option value="VOICE_OVER">VOICE_OVER</option>
                                  <option value="EXTRAS">EXTRAS</option>
                               </select>
                            </div>
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">PRIMARY_OBJECTIVE</label>
                               <select 
                                  value={profileForm.primaryObjective}
                                  onChange={e => setProfileForm({...profileForm, primaryObjective: e.target.value})}
                                  className="bg-[var(--bg-secondary)] border border-white/10 rounded-3xl border-[var(--border-main)] p-4 font-black uppercase text-xs tracking-widest focus:border-[var(--accent-primary)] outline-none"
                               >
                                  <option value="">SELECT_OBJECTIVE</option>
                                  {DESIRE_LIST.map(d => <option key={d} value={d}>{d}</option>)}
                               </select>
                            </div>
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">LOCATION</label>
                               <input 
                                  value={profileForm.location}
                                  onChange={e => setProfileForm({...profileForm, location: e.target.value})}
                                  className="bg-[var(--bg-secondary)] border border-white/10 rounded-3xl border-[var(--border-main)] p-4 font-black uppercase text-xs tracking-widest focus:border-[var(--accent-primary)] outline-none"
                               />
                            </div>
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">MOTHERLAND / HOME_TOWN</label>
                               <input 
                                  value={profileForm.motherland}
                                  onChange={e => setProfileForm({...profileForm, motherland: e.target.value})}
                                  className="bg-[var(--bg-secondary)] border border-white/10 rounded-3xl border-[var(--border-main)] p-4 font-black uppercase text-xs tracking-widest focus:border-[var(--accent-primary)] outline-none"
                               />
                            </div>
                            <div className="md:col-span-2 flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">EXPERIENCE_LOG</label>
                               <textarea 
                                  value={profileForm.priorArtExperience}
                                  onChange={e => setProfileForm({...profileForm, priorArtExperience: e.target.value})}
                                  placeholder="DESCRIBE_PRIOR_WORK..."
                                  rows={3}
                                  className="bg-[var(--bg-secondary)] border border-white/10 rounded-3xl border-[var(--border-main)] p-4 font-black uppercase text-xs tracking-widest focus:border-[var(--accent-primary)] outline-none resize-none"
                               />
                            </div>
                         </div>
                      </div>

                      {/* Section: Biometric Data */}
                      <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-[var(--border-main)]">
                         <h3 className="text-2xl font-black uppercase tracking-tighter mb-10 border-b border-[var(--border-main)] pb-6 flex items-center gap-4">
                            <Zap className="w-6 h-6 text-[var(--accent-primary)]" /> BIOMETRIC_DATA
                         </h3>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">AGE</label>
                               <input 
                                  type="number"
                                  value={profileForm.age || ''}
                                  onChange={e => setProfileForm({...profileForm, age: e.target.value})}
                                  className="bg-[var(--bg-secondary)] border border-white/10 rounded-3xl border-[var(--border-main)] p-4 font-black uppercase text-xs tracking-widest focus:border-[var(--accent-primary)] outline-none"
                               />
                            </div>
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">GENDER</label>
                               <select 
                                  value={profileForm.gender}
                                  onChange={e => setProfileForm({...profileForm, gender: e.target.value})}
                                  className="bg-[var(--bg-secondary)] border border-white/10 rounded-3xl border-[var(--border-main)] p-4 font-black uppercase text-xs tracking-widest focus:border-[var(--accent-primary)] outline-none"
                               >
                                  <option value="">SELECT</option>
                                  {GENDER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                               </select>
                            </div>
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">HEIGHT (CM)</label>
                               <input 
                                  value={profileForm.height}
                                  onChange={e => setProfileForm({...profileForm, height: e.target.value})}
                                  className="bg-[var(--bg-secondary)] border border-white/10 rounded-3xl border-[var(--border-main)] p-4 font-black uppercase text-xs tracking-widest focus:border-[var(--accent-primary)] outline-none"
                               />
                            </div>
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">OVERALL_BUILD</label>
                               <select 
                                  value={profileForm.overallBuild}
                                  onChange={e => setProfileForm({...profileForm, overallBuild: e.target.value})}
                                  className="bg-[var(--bg-secondary)] border border-white/10 rounded-3xl border-[var(--border-main)] p-4 font-black uppercase text-xs tracking-widest focus:border-[var(--accent-primary)] outline-none"
                               >
                                  <option value="">SELECT</option>
                                  {BUILD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                               </select>
                            </div>
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">FACE_SHAPE</label>
                               <select 
                                  value={profileForm.faceShape}
                                  onChange={e => setProfileForm({...profileForm, faceShape: e.target.value})}
                                  className="bg-[var(--bg-secondary)] border border-white/10 rounded-3xl border-[var(--border-main)] p-4 font-black uppercase text-xs tracking-widest focus:border-[var(--accent-primary)] outline-none"
                               >
                                  <option value="">SELECT</option>
                                  {FACE_SHAPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                               </select>
                            </div>
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">SKIN_TONE</label>
                               <select 
                                  value={profileForm.skinTone}
                                  onChange={e => setProfileForm({...profileForm, skinTone: e.target.value})}
                                  className="bg-[var(--bg-secondary)] border border-white/10 rounded-3xl border-[var(--border-main)] p-4 font-black uppercase text-xs tracking-widest focus:border-[var(--accent-primary)] outline-none"
                               >
                                  <option value="">SELECT</option>
                                  {SKIN_TONE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                               </select>
                            </div>
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">HAIR_TYPE</label>
                               <select 
                                  value={profileForm.hairType}
                                  onChange={e => setProfileForm({...profileForm, hairType: e.target.value})}
                                  className="bg-[var(--bg-secondary)] border border-white/10 rounded-3xl border-[var(--border-main)] p-4 font-black uppercase text-xs tracking-widest focus:border-[var(--accent-primary)] outline-none"
                               >
                                  <option value="">SELECT</option>
                                  {profileForm.gender === 'MALE' ? HAIR_TYPE_MALE.map(o => <option key={o} value={o}>{o}</option>) : HAIR_TYPE_FEMALE.map(o => <option key={o} value={o}>{o}</option>)}
                               </select>
                            </div>
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">EYE_COLOR</label>
                               <input 
                                  value={profileForm.eyeColor}
                                  onChange={e => setProfileForm({...profileForm, eyeColor: e.target.value})}
                                  className="bg-[var(--bg-secondary)] border border-white/10 rounded-3xl border-[var(--border-main)] p-4 font-black uppercase text-xs tracking-widest focus:border-[var(--accent-primary)] outline-none"
                               />
                            </div>
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">SCARS / TATTOOS?</label>
                               <input 
                                  value={profileForm.scarsTattoos}
                                  onChange={e => setProfileForm({...profileForm, scarsTattoos: e.target.value})}
                                  placeholder="DESCRIBE_IF_ANY..."
                                  className="bg-[var(--bg-secondary)] border border-white/10 rounded-3xl border-[var(--border-main)] p-4 font-black uppercase text-xs tracking-widest focus:border-[var(--accent-primary)] outline-none"
                               />
                            </div>
                         </div>
                      </div>

                      <div className="flex gap-6 pb-20">
                         <button 
                            type="submit"
                            disabled={profileLoading}
                            className="flex-1 py-6 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-black uppercase tracking-[0.5em] text-sm hover:scale-[1.02] transition-all shadow-[0_0_30px_var(--accent-glow)] hover:shadow-[0_0_50px_var(--accent-glow)] disabled:opacity-50"
                         >
                            {profileLoading ? "SYNCING_IDENTITY..." : "SAVE_DEEP_PROFILE"}
                         </button>
                         <button 
                            type="button"
                            onClick={() => setIsEditingProfile(false)}
                            className="px-12 py-6 border-2 border-[var(--border-main)] text-zinc-500 font-black uppercase tracking-widest text-xs hover:border-white hover:text-white transition-all"
                         >
                            CANCEL
                         </button>
                      </div>
                   </form>
                ) : (
                   <div className="flex flex-col gap-12">
                      {/* Read-only Display Summary */}
                      <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-[var(--border-main)] relative overflow-hidden">
                         <div className="flex justify-between items-start mb-12">
                            <div>
                               <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 mb-2">PUBLIC_LEDGER_DATA</h3>
                               <p className="text-4xl font-black uppercase tracking-tighter">DATA_SUMMARY</p>
                            </div>
                            <ShieldCheck className="w-12 h-12 text-[var(--accent-primary)] opacity-20" />
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
                            {[
                               { label: 'STATUS', val: data.profile.status, color: 'text-[var(--accent-primary)]' },
                               { label: 'LOCATION', val: data.profile.location },
                               { label: 'ROLE', val: data.profile.role },
                               { label: 'OBJECTIVE', val: data.profile.objectivePreference },
                               { label: 'AGE', val: data.profile.age || '—' },
                               { label: 'HEIGHT', val: data.profile.height ? `${data.profile.height} CM` : '—' },
                               { label: 'GENDER', val: data.profile.gender },
                               { label: 'BUILD', val: data.profile.overallBuild },
                            ].map(item => (
                               <div key={item.label} className="border-l-2 border-[var(--border-main)] pl-6">
                                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">{item.label}</p>
                                  <p className={`text-sm font-black uppercase tracking-widest ${item.color || 'text-white'}`}>{item.val || 'NULL_SIGNAL'}</p>
                               </div>
                            ))}
                         </div>

                         <div className="mt-12 pt-12 border-t border-[var(--border-main)]">
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-4">BIO_ENCRYPTION_STREAM</p>
                            <p className="text-zinc-500 text-xs font-black uppercase leading-relaxed max-w-2xl">
                               {data.profile.bio || "IDENTITY_DESCRIPTION_PENDING. COMPLETE_PROFILE_TO_DECRYPT_FULL_BIO."}
                            </p>
                         </div>
                      </div>

                      <div className="glass-panel-premium-red p-10 border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl flex flex-col md:flex-row items-center justify-between gap-8">
                         <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-white flex items-center justify-center rounded-full">
                               <Zap className="w-8 h-8 text-[var(--accent-primary)]" />
                            </div>
                            <div>
                               <h4 className="text-xl font-black uppercase tracking-tighter">UPGRADE_VISIBILITY</h4>
                               <p className="text-[9px] font-black uppercase tracking-widest text-white/60">REACH_100%_FOR_THE_7X_ALGORITHM_BOOST</p>
                            </div>
                         </div>
                         <button 
                            onClick={() => setIsEditingProfile(true)}
                            className="px-8 py-4 bg-white text-[var(--accent-primary)] font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all"
                         >
                            FINALIZE_VAULT
                         </button>
                      </div>
                   </div>
                )}
             </div>
          </div>
        </div>
      ) : currentView === 'LEADERBOARD' ? (
        <div className="flex flex-col gap-16 py-12 animate-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-6">
              <div className="p-5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/10 border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl rounded-full">
                <Trophy className="w-10 h-10 text-[var(--accent-primary)]" />
              </div>
              <div>
                <h1 className="text-7xl font-black uppercase tracking-tighter leading-none">GLOBAL_RANKINGS</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 mt-2">DECENTRALIZED_TALENT_INDEX</p>
              </div>
            </div>
            
            <div className="text-right hidden md:block">
               <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">CURRENT_INDEX_SIZE</p>
               <p className="text-2xl font-black text-white tabular-nums">{data.leaderboard.length * 124} NODES</p>
            </div>
          </div>

          {/* Top 3 Spotlight */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
             {data.leaderboard.slice(0, 3).map((actor: any, i: number) => (
                <div 
                   key={actor.id} 
                   className={`relative p-10 border border-white/10 rounded-3xl flex flex-col items-center text-center overflow-hidden transition-all duration-500 hover:-translate-y-2 ${
                      i === 0 ? 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] border-white scale-105 z-10 shadow-[0_0_50px_rgba(255,49,49,0.4)]' : 'bg-[var(--bg-secondary)]/50 border-[var(--border-main)]'
                   }`}
                >
                   {i === 0 && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-white animate-pulse" />
                   )}
                   <div className="w-24 h-24 rounded-full border-4 border-white/20 overflow-hidden mb-6 relative group">
                      {actor.avatarUrl ? (
                         <img src={actor.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                         <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                            <User className="w-10 h-10 text-zinc-600" />
                         </div>
                      )}
                      {i === 0 && (
                         <div className="absolute inset-0 bg-white/10 animate-pulse" />
                      )}
                   </div>
                   <div className={`text-5xl font-black mb-2 italic ${i === 0 ? 'text-white' : 'text-[var(--accent-primary)]'}`}>#{i + 1}</div>
                   <h3 className={`text-2xl font-black uppercase tracking-tight ${i === 0 ? 'text-white' : 'text-zinc-200'}`}>{actor.name}</h3>
                   <p className={`text-[10px] font-black uppercase tracking-widest mt-2 ${i === 0 ? 'text-white/70' : 'text-zinc-600'}`}>{actor.score.toLocaleString()} LMN</p>
                </div>
             ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 px-4">
             {/* Full Rankings List */}
             <div className="lg:col-span-8">
                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-[var(--border-main)]">
                   <div className="flex items-center justify-between mb-10 border-b border-[var(--border-main)] pb-6">
                      <h3 className="text-2xl font-black uppercase tracking-tighter">ALL_NODES</h3>
                      <div className="flex gap-6">
                         {['GLOBAL', 'REGION', 'LOCAL'].map((t: string) => (
                            <button key={t} className="text-[9px] font-black text-zinc-600 hover:text-[var(--accent-primary)] uppercase tracking-widest transition-colors cursor-pointer">
                               {t}
                            </button>
                         ))}
                      </div>
                   </div>

                   <div className="flex flex-col gap-4">
                      {data.leaderboard.map((actor: any) => (
                        <div key={actor.id} className={`flex items-center justify-between p-6 border border-white/10 rounded-3xl transition-all group ${actor.isUser ? 'border-[var(--accent-primary)] bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/10' : 'border-[var(--border-main)] bg-[var(--bg-tertiary)]/50 hover:border-[var(--border-main)]'}`}>
                          <div className="flex items-center gap-6">
                            <span className={`font-black text-3xl tabular-nums w-12 shrink-0 ${actor.rank <= 3 ? 'text-[var(--accent-primary)]' : 'text-zinc-800 group-hover:text-zinc-600'}`}>
                              {String(actor.rank).padStart(2, '0')}
                            </span>
                            <div className="w-12 h-12 bg-[var(--bg-secondary)] rounded-full overflow-hidden border border-white/10 rounded-3xl border-[var(--border-main)] shrink-0">
                               {actor.avatarUrl ? (
                                 <img src={actor.avatarUrl} alt="" className="w-full h-full object-cover" />
                               ) : (
                                 <div className="w-full h-full flex items-center justify-center">
                                    <User className="w-6 h-6 text-zinc-700" />
                                 </div>
                               )}
                            </div>
                            <div>
                               <div className="flex items-center gap-3">
                                  <span className={`font-black uppercase tracking-tight text-lg ${actor.isUser ? 'text-white' : 'text-zinc-400'}`}>
                                    {actor.isUser ? 'YOU' : actor.name}
                                  </span>
                                  {actor.isVip && <Crown className="w-3 h-3 text-yellow-400" />}
                                  {actor.streakDays >= 3 && <Flame className="w-3 h-3 text-orange-500" />}
                               </div>
                               <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em]">@{actor.username || 'ANONYMOUS'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                             <span className="font-black tabular-nums text-[var(--accent-primary)] text-xl">{actor.score.toLocaleString()}</span>
                             <span className="text-[10px] font-black text-zinc-600 ml-2">LMN</span>
                          </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>

             {/* Personal Stats & Analytics */}
             <div className="lg:col-span-4 flex flex-col gap-10">
                <div className="glass-panel-premium-red p-10 border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl clip-brutal-tr shadow-[0_0_40px_rgba(255,49,49,0.1)]">
                   <h3 className="font-black uppercase tracking-widest text-[10px] mb-8">MY_RANKING_STATUS</h3>
                   <div className="space-y-10">
                      <div>
                         <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-2">GLOBAL_POSITION</p>
                         <p className="text-6xl font-black text-white tabular-nums">#{data.leaderboard.find((a: any) => a.isUser)?.rank || '??'}</p>
                      </div>
                      <div>
                         <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-2">PERCENTILE_REACH</p>
                         <p className="text-4xl font-black text-white tabular-nums">TOP 12%</p>
                      </div>
                      <button className="w-full py-4 bg-white text-[var(--accent-primary)] font-black uppercase tracking-[0.3em] text-[10px] hover:bg-[var(--bg-primary)] hover:text-white transition-all cursor-pointer">
                         BOOST_RANKING
                      </button>
                   </div>
                </div>

                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-[var(--border-main)] bg-[var(--bg-tertiary)]/50">
                   <h3 className="font-black uppercase tracking-widest text-[10px] mb-8 text-zinc-600">RISING_STARS // 24H</h3>
                   <div className="space-y-6">
                      {data.leaderboard.slice(0, 4).reverse().map((actor: any, i: number) => (
                         <div key={i} className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-main)]" />
                            <div className="flex-1">
                               <p className="text-[10px] font-black uppercase text-zinc-400">{actor.name}</p>
                               <p className="text-[8px] font-black text-green-500 uppercase">+{Math.floor(Math.random() * 200)} LMN</p>
                            </div>
                            <span className="text-[10px] font-black text-zinc-700">+{i + 1}pos</span>
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        </div>
      ) : currentView === 'STANGAB' ? (
        <div className="h-[calc(100vh-120px)] flex flex-col gap-8 py-8 animate-in slide-in-from-bottom-8 duration-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-6">
              <div className="p-5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/10 border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl rounded-full">
                <Users className="w-10 h-10 text-[var(--accent-primary)]" />
              </div>
              <div>
                <h1 className="text-7xl font-black uppercase tracking-tighter leading-none">STANGAB</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--accent-primary)] mt-2">COMMUNITY_MAIN_HUD // REAL_TIME_ENGAGEMENT</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-main)] p-4 rounded-3xl flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">1.2K NODES_ONLINE</span>
              </div>
            </div>
          </div>

          {/* Main Interface Grid */}
          <div className="flex-1 flex gap-8 px-4 overflow-hidden">
            {/* Sidebar: Hubs/Channels & User Search */}
            <div className="w-80 flex flex-col gap-6 shrink-0 h-full">
               <div className="glass-panel-premium p-6 border border-[var(--border-main)] rounded-3xl flex-1 flex flex-col overflow-hidden">
                  {/* User Search Bar */}
                  <div className="relative mb-8">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                     <input 
                        type="text"
                        value={userSearchQuery}
                        onChange={(e) => handleUserSearch(e.target.value)}
                        placeholder="SEARCH_USERS..."
                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-main)] pl-12 pr-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-[var(--accent-primary)] transition-all"
                     />
                     {isSearching && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                           <div className="w-3 h-3 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
                        </div>
                     )}
                  </div>

                  {userSearchQuery ? (
                     <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between mb-4 px-2">
                           <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">SEARCH_RESULTS</h4>
                           <button onClick={() => setUserSearchQuery("")} className="text-[8px] font-black text-[var(--accent-primary)] uppercase">CLEAR</button>
                        </div>
                        <div className="flex-1 overflow-y-auto hide-scrollbar space-y-3">
                           {searchResults.length > 0 ? (
                              searchResults.map(user => (
                                 <div 
                                    key={user.id}
                                    onClick={() => fetchUserProfile(user.id)}
                                    className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl hover:border-[var(--accent-primary)]/50 transition-all cursor-pointer group flex items-center gap-4"
                                 >
                                    <div className="w-10 h-10 rounded-full border border-[var(--border-main)] overflow-hidden shrink-0">
                                       {user.avatar_url ? (
                                          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                       ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                             <User className="w-5 h-5 text-zinc-600" />
                                          </div>
                                       )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <p className="text-[10px] font-black text-white truncate">{user.full_name}</p>
                                       <p className="text-[8px] font-black text-zinc-500 truncate uppercase tracking-widest">@{user.username || 'ANONYMOUS'}</p>
                                    </div>
                                 </div>
                              ))
                           ) : (
                              <div className="text-center py-10 opacity-30">
                                 <p className="text-[9px] font-black uppercase tracking-widest">NO_SIGNALS_FOUND</p>
                              </div>
                           )}
                        </div>
                     </div>
                  ) : (
                     <div className="flex-1 flex flex-col overflow-hidden">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-6 px-2">STAN_HUBS</h4>
                        <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2">
                     {[
                       { name: 'GENERAL_CHAT', active: true, users: 432 },
                       { name: 'CASTING_ALERTS', active: false, users: 128 },
                       { name: 'SCRIPT_BRAINSTORM', active: false, users: 64 },
                       { name: 'ACTING_TIPS', active: false, users: 256 },
                       { name: 'DEV_UPDATES', active: false, users: 32 },
                       { name: 'KERALA_LOCATIONS', active: false, users: 94 },
                       { name: 'TECHNICAL_SUPPORT', active: false, users: 12 }
                     ].map(hub => (
                        <button key={hub.name} className={`w-full p-4 flex items-center justify-between transition-all group ${hub.active ? 'bg-[var(--accent-primary)]/10 border-l-4 border-[var(--accent-primary)]' : 'hover:bg-white/5 border-l-4 border-transparent'}`}>
                           <span className={`text-[10px] font-black uppercase tracking-widest ${hub.active ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>{hub.name}</span>
                           <span className="text-[8px] font-black text-zinc-700">{hub.users}</span>
                        </button>
                     ))}
                  </div>
                  <button className="mt-6 w-full py-4 border border-dashed border-[var(--border-main)] text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:border-[var(--accent-primary)] hover:text-white transition-all">
                     + INITIALIZE_NEW_HUB
                  </button>
               </div>
               )}
            </div>
         </div>

            {/* Center: Chat Mainframe */}
            <div className="flex-1 flex flex-col gap-6 h-full overflow-hidden">
               <div className="glass-panel-premium p-8 border border-[var(--border-main)] rounded-3xl flex-1 flex flex-col overflow-hidden">
                  {activeChat ? (
                    <>
                      <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
                        {chatMessages.length > 0 ? (
                          chatMessages.map((msg: any, i: number) => {
                            const isMe = msg.sender_id === data.profile.id;
                            return (
                              <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-2`}>
                                <div className="flex items-center gap-3">
                                  {!isMe && <div className="w-6 h-6 rounded-full bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/30 overflow-hidden shrink-0">
                                    {msg.sender?.avatar_url && <img src={msg.sender.avatar_url} alt="" className="w-full h-full object-cover" />}
                                  </div>}
                                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                    {isMe ? 'YOU' : (msg.sender?.full_name || 'AGENT_REMOTE')}
                                  </span>
                                  <span className="text-[8px] font-black text-zinc-700">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className={`max-w-[70%] p-5 text-xs font-medium leading-relaxed ${
                                  isMe 
                                    ? 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-2xl rounded-tr-none shadow-[0_10px_20px_var(--accent-glow)]' 
                                    : 'bg-[var(--bg-tertiary)] text-zinc-300 border border-[var(--border-main)] rounded-2xl rounded-tl-none'
                                }`}>
                                  {msg.content}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center opacity-20">
                            <MessageSquare className="w-16 h-16 mb-6" />
                            <p className="text-[10px] font-black uppercase tracking-[0.5em]">INITIALIZE_COMMUNICATION_STREAM</p>
                          </div>
                        )}
                      </div>

                      {/* Input Interface */}
                      <div className="mt-8 pt-8 border-t border-[var(--border-main)] flex gap-4">
                        <div className="flex-1 relative">
                            <input 
                              type="text" 
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                              placeholder="TYPE_COMMAND_OR_MESSAGE..."
                              className="w-full bg-[var(--bg-secondary)] border-2 border-[var(--border-main)] p-6 font-black text-xs uppercase tracking-widest outline-none focus:border-[var(--accent-primary)] transition-all"
                            />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex gap-4 text-zinc-600">
                              <Mic2 className="w-5 h-5 hover:text-white transition-colors cursor-pointer" />
                              <Video className="w-5 h-5 hover:text-white transition-colors cursor-pointer" />
                            </div>
                        </div>
                        <button 
                          onClick={sendMessage}
                          className="px-10 bg-white text-black font-black uppercase tracking-[0.3em] text-xs hover:bg-[var(--accent-primary)] hover:text-white transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        >
                            SEND
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-30">
                       <Compass className="w-20 h-20 text-zinc-800 mb-10 animate-pulse" />
                       <h3 className="text-2xl font-black uppercase tracking-widest text-zinc-700">SELECT_USER_TO_INITIALIZE_LINK</h3>
                       <p className="text-[10px] font-black uppercase text-zinc-800 mt-6 tracking-[0.5em] max-w-sm mx-auto leading-loose">
                         Searching for nodes in the decentralized talent index. Use the sidebar to find and connect with other agents.
                       </p>
                    </div>
                  )}
               </div>
            </div>

            {/* Right: Intelligence Panel */}
            <div className="w-80 flex flex-col gap-8 shrink-0 h-full">
               <div className="glass-panel-premium p-8 border border-[var(--border-main)] rounded-3xl bg-[var(--accent-primary)]/5">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--accent-primary)] mb-8">HUB_INTELLIGENCE</h4>
                  <div className="space-y-10">
                     <div>
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-4">ACTIVE_NODES</p>
                        <div className="flex -space-x-3">
                           {[1,2,3,4,5].map(i => (
                              <div key={i} className="w-10 h-10 rounded-full border-2 border-[var(--bg-primary)] bg-[var(--bg-tertiary)] overflow-hidden">
                                 <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900" />
                              </div>
                           ))}
                           <div className="w-10 h-10 rounded-full border-2 border-[var(--bg-primary)] bg-[var(--bg-tertiary)] flex items-center justify-center">
                              <span className="text-[10px] font-black text-zinc-500">+12</span>
                           </div>
                        </div>
                     </div>
                     <div>
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-4">TRENDING_TOPICS</p>
                        <div className="space-y-3">
                           {['#MALAYALAM_NEW_WAVE', '#AUDITION_TIPS', '#LMN_REWARDS'].map(tag => (
                              <div key={tag} className="text-[10px] font-black text-zinc-400 hover:text-[var(--accent-primary)] transition-colors cursor-pointer">{tag}</div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>

               <div className="glass-panel-premium p-8 border border-[var(--border-main)] rounded-3xl flex-1">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-8">SYSTEM_ACTIVITY</h4>
                  <div className="space-y-6">
                     {[1,2,3].map(i => (
                        <div key={i} className="flex gap-4 opacity-50">
                           <div className="w-1 h-8 bg-zinc-800" />
                           <div>
                              <p className="text-[9px] font-black uppercase text-zinc-400">Node_Logged_{i}24</p>
                              <p className="text-[8px] font-black text-zinc-700 uppercase">SYNCHRONIZING_DATA</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>
        </div>
      ) : currentView === 'SETTINGS' ? (
        <div className="flex flex-col gap-16 py-12 animate-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-6">
              <div className="p-5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]/10 border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl rounded-full">
                <Settings className="w-10 h-10 text-[var(--accent-primary)]" />
              </div>
              <div>
                <h1 className="text-7xl font-black uppercase tracking-tighter leading-none">SYSTEM_SETTINGS</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--accent-primary)] mt-2">@{data.profile.username || "UNKNOWN"}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-16 px-4">
            {/* GENERAL SECTION */}
            <section className="glass-panel-premium p-10 border border-[var(--border-main)] rounded-3xl">
              <div className="flex items-center gap-4 mb-10 border-b border-[var(--border-main)] pb-4">
                <div className="w-1.5 h-6 bg-[var(--accent-primary)]" />
                <h3 className="text-2xl font-black uppercase tracking-[0.2em]">GENERAL_PROTOCOL</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Appearance</label>
                  <select 
                    value={appearance}
                    onChange={(e: any) => {
                      setAppearance(e.target.value);
                      if (e.target.value !== 'system') {
                        const themeVal = e.target.value === 'light' ? 'PAPER_BRUTALISM' : 'DARK_CMD';
                        setTheme(e.target.value);
                        document.documentElement.setAttribute('data-theme', themeVal);
                        localStorage.setItem('mm8-visual-protocol', e.target.value);
                      }
                    }}
                    className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-black text-sm px-6 py-4 border-2 border-[var(--border-main)] outline-none focus:border-[var(--accent-primary)] uppercase appearance-none cursor-pointer"
                  >
                    <option value="system">System</option>
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                  </select>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Contrast</label>
                  <select 
                    value={contrast}
                    onChange={(e: any) => setContrast(e.target.value)}
                    className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-black text-sm px-6 py-4 border-2 border-[var(--border-main)] outline-none focus:border-[var(--accent-primary)] uppercase appearance-none cursor-pointer"
                  >
                    <option value="system">System</option>
                    <option value="medium">Medium</option>
                    <option value="increased">Increased</option>
                  </select>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Accent Color</label>
                  <select 
                    value={accentColor}
                    onChange={(e: any) => setAccentColor(e.target.value)}
                    className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-black text-sm px-6 py-4 border-2 border-[var(--border-main)] outline-none focus:border-[var(--accent-primary)] uppercase appearance-none cursor-pointer"
                  >
                    <option value="default">Default (Red)</option>
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                    <option value="yellow">Yellow</option>
                    <option value="pink">Pink</option>
                    <option value="orange">Orange</option>
                    <option value="black">Black (Premium)</option>
                    <option value="glass">Glass (Premium)</option>
                  </select>
                </div>
              </div>
            </section>

            {/* NOTIFICATIONS SECTION */}
            <section className="glass-panel-premium p-10 border border-[var(--border-main)] rounded-3xl">
              <div className="flex items-center gap-4 mb-10 border-b border-[var(--border-main)] pb-4">
                <div className="w-1.5 h-6 bg-[var(--accent-primary)]" />
                <h3 className="text-2xl font-black uppercase tracking-[0.2em]">NOTIFICATIONS_ENGINE</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                <div className="space-y-8">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--accent-primary)]">Delivery Controls</h4>
                  {[
                    { key: 'push', label: 'Push Notifications' },
                    { key: 'email', label: 'Email Notifications' },
                    { key: 'sms', label: 'SMS / WhatsApp Alerts' }
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                      <button 
                        onClick={() => setNotificationsDelivery({...notificationsDelivery, [item.key]: !((notificationsDelivery as any)[item.key])})}
                        className={`w-14 h-7 border-2 transition-all relative ${((notificationsDelivery as any)[item.key]) ? 'border-[var(--accent-primary)] bg-[var(--bg-secondary)] shadow-[0_0_15px_var(--accent-glow)]' : 'border-[var(--border-main)] bg-transparent opacity-40'}`}
                      >
                        <div className={`absolute top-1 w-4 h-3 transition-all ${((notificationsDelivery as any)[item.key]) ? 'right-1 bg-[var(--accent-primary)]' : 'left-1 bg-zinc-600'}`} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-8">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--accent-primary)]">Categories</h4>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    {[
                      { label: 'Casting & Opportunities', key: 'casting' },
                      { label: 'Activity & Engagement', key: 'activity' },
                      { label: 'AI & Platform Insights', key: 'ai' },
                      { label: 'Progress & Rewards', key: 'progress' },
                      { label: 'Communication', key: 'communication' },
                      { label: 'Account & Security', key: 'account' },
                      { label: 'Platform Updates', key: 'platform' }
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{item.label}</span>
                        <button 
                          onClick={() => setNotificationCategories({...notificationCategories, [item.key]: !((notificationCategories as any)[item.key])})}
                          className={`w-4 h-4 border transition-all ${((notificationCategories as any)[item.key]) ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--border-main)] bg-transparent'}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* IDENTITY SECTION */}
            <section className="glass-panel-premium p-10 border border-[var(--border-main)] rounded-3xl">
              <div className="flex items-center gap-4 mb-10 border-b border-[var(--border-main)] pb-4">
                <div className="w-1.5 h-6 bg-[var(--accent-primary)]" />
                <h3 className="text-2xl font-black uppercase tracking-[0.2em]">IDENTITY_PROFILE</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                <div className="space-y-8">
                  <div className="flex flex-col gap-4">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Full Name</label>
                    <input 
                      type="text" 
                      value={profileForm.fullName}
                      onChange={e => setProfileForm({...profileForm, fullName: e.target.value})}
                      className="w-full bg-[var(--bg-secondary)] border-2 border-[var(--border-main)] p-4 font-black text-sm uppercase outline-none focus:border-[var(--accent-primary)] transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-4">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Bio (Max 500 characters)</label>
                    <textarea 
                      value={profileForm.bio}
                      onChange={e => setProfileForm({...profileForm, bio: e.target.value.slice(0, 500)})}
                      className="w-full bg-[var(--bg-secondary)] border-2 border-[var(--border-main)] p-6 font-black text-xs uppercase outline-none focus:border-[var(--accent-primary)] transition-all h-40 custom-scrollbar"
                      placeholder="TELL YOUR STORY..."
                    />
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex flex-col gap-4">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Profile Identity Image</label>
                    <div className="flex items-center gap-8">
                      <div className="w-24 h-24 rounded-full bg-[var(--bg-secondary)] border-2 border-[var(--border-main)] overflow-hidden shrink-0">
                        {data.profile.avatarUrl ? (
                          <img src={data.profile.avatarUrl} alt="" className="w-full h-full object-cover grayscale" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><User className="w-8 h-8 text-zinc-700" /></div>
                        )}
                      </div>
                      <label className="flex-1 py-8 border-2 border-dashed border-[var(--border-main)] flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest hover:border-[var(--accent-primary)] transition-all cursor-pointer bg-[var(--bg-tertiary)]/50">
                        <input type="file" className="hidden" accept="image/*" onChange={handlePFPChange} />
                        <Upload className="w-4 h-4" /> Update Identity Image
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                            {showUsernameInput ? (
                              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-[var(--border-main)] pt-6 mt-2">
                                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Identify New Protocol Name</label>
                                <div className="space-y-2">
                                  <div className="relative">
                                    <input 
                                      value={newUsername}
                                      onChange={e => setNewUsername(e.target.value.toLowerCase())}
                                      className={`w-full bg-[var(--bg-tertiary)] border-2 p-4 font-black text-white text-xs tracking-widest outline-none transition-all ${
                                        newUsername ? (usernameStatus === 'available' ? 'border-green-500' : 'border-[var(--accent-primary)]') : 'border-[var(--border-main)]'
                                      }`}
                                      placeholder="NEW_USERNAME"
                                    />
                                    {usernameStatus !== 'idle' && (
                                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase tracking-widest">
                                        {usernameStatus === 'checking' ? 'CHECKING...' : usernameStatus === 'available' ? 'AVAILABLE' : 'TAKEN'}
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-[8px] font-black text-zinc-600 uppercase">Lowercase letters only. Must be unique.</p>
                                </div>
                                <button onClick={() => setShowUsernameInput(false)} className="text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors underline">Cancel Change</button>
                              </div>
                            ) : (
                              <button onClick={() => setShowUsernameInput(true)} className="w-full py-5 border-2 border-[var(--border-main)] font-black text-[10px] uppercase tracking-widest hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">Update Username</button>
                            )}
                            {showPassUpdateInput ? (
                              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-[var(--border-main)] pt-6 mt-2">
                                {!passVerified ? (
                                  <div className="space-y-4">
                                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Verify Current Password</label>
                                    <input 
                                      type="password"
                                      value={currentPassVerify}
                                      onChange={e => setCurrentPassVerify(e.target.value)}
                                      className="w-full bg-[var(--bg-tertiary)] border-2 border-[var(--border-main)] p-4 font-black text-white text-xs tracking-widest outline-none focus:border-[var(--accent-primary)]"
                                      placeholder="CURRENT_KEY"
                                    />
                                    <button 
                                      onClick={handleVerifyPassword}
                                      disabled={passUpdateLoading}
                                      className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] hover:bg-[var(--accent-primary)] hover:text-white transition-all"
                                    >
                                      {passUpdateLoading ? "VERIFYING..." : "VERIFY_IDENTITY"}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    <label className="text-[9px] font-black text-[var(--accent-primary)] uppercase tracking-widest">Initialize New Password</label>
                                    <input 
                                      type="password"
                                      value={newPassword}
                                      onChange={e => setNewPassword(e.target.value)}
                                      className={`w-full bg-[var(--bg-tertiary)] border-2 p-4 font-black text-white text-xs tracking-widest outline-none transition-all ${
                                        newPassword ? (validatePassword(newPassword) ? 'border-green-500' : 'border-[var(--accent-primary)]') : 'border-[var(--border-main)]'
                                      }`}
                                      placeholder="NEW_SECURE_KEY"
                                    />
                                    <p className="text-[8px] font-black text-zinc-600 uppercase">Min 8 chars, 1 uppercase, 1 number, 1 special char</p>
                                  </div>
                                )}
                                <button 
                                  onClick={() => {
                                    setShowPassUpdateInput(false);
                                    setPassVerified(false);
                                    setCurrentPassVerify("");
                                    setNewPassword("");
                                  }} 
                                  className="text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors underline"
                                >
                                  Cancel Change
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setShowPassUpdateInput(true)} className="w-full py-5 border-2 border-[var(--border-main)] font-black text-[10px] uppercase tracking-widest hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">Update Password</button>
                            )}
                  </div>
                </div>
              </div>
            </section>

            <div className="pt-8 mb-24">
              <button 
                onClick={handleUpdateSettings}
                disabled={settingsLoading || (newUsername.length > 0 && usernameStatus !== "available") || (newPassword.length > 0 && !validatePassword(newPassword))}
                className="w-full py-10 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-black text-4xl uppercase tracking-tighter hover:bg-white hover:text-black transition-all shadow-[0_0_50px_var(--accent-glow)] disabled:opacity-20 cursor-pointer"
              >
                {settingsLoading ? "SYNCHRONIZING..." : "SAVE_ALL_CONFIGURATIONS"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[60vh] opacity-50 animate-in fade-in duration-500">
           <h2 className="text-4xl font-black uppercase tracking-widest text-center">{currentView} {/* MODULE */}</h2>
           <p className="text-sm tracking-widest uppercase text-[var(--accent-primary)] mt-4 text-center">CONSTRUCTION_PENDING</p>
        </div>
      )}

      </div> {/* Close Content Area */}
      </div> {/* Close Main Wrapper */}

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[var(--bg-primary)]/95 backdrop-blur-xl"
              onClick={() => setShowSettings(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="w-full max-w-4xl h-[85vh] glass-panel-premium border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl relative z-10 flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-[var(--border-main)] flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">SETTINGS</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--accent-primary)] mt-2">@{data.profile.username || "UNKNOWN"}</p>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-4 bg-[var(--bg-secondary)] hover:bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transition-all cursor-pointer group"
                >
                  <X className="w-6 h-6 text-zinc-500 group-hover:text-white" />
                </button>
              </div>

              {/* Modal Body - Scrollable */}
              <div 
                className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar space-y-16"
                data-lenis-prevent
              >
                
                {/* GENERAL SECTION */}
                <section>
                  <div className="flex items-center gap-4 mb-10 border-b border-[var(--border-main)] pb-4">
                    <div className="w-1.5 h-6 bg-[var(--accent-primary)]" />
                    <h3 className="text-2xl font-black uppercase tracking-[0.2em]">GENERAL</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Appearance</label>
                      <select 
                        value={appearance}
                        onChange={(e: any) => {
                          setAppearance(e.target.value);
                          if (e.target.value !== 'system') {
                            const themeVal = e.target.value === 'light' ? 'PAPER_BRUTALISM' : 'DARK_CMD';
                            setTheme(e.target.value);
                            document.documentElement.setAttribute('data-theme', themeVal);
                            localStorage.setItem('mm8-visual-protocol', e.target.value);
                          }
                        }}
                        className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-black text-sm px-6 py-4 border-2 border-[var(--border-main)] outline-none focus:border-[var(--accent-primary)] uppercase appearance-none cursor-pointer"
                      >
                        <option value="system">System</option>
                        <option value="light">Light Mode (Paper Brutalism)</option>
                        <option value="dark">Dark Mode (Standard)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Contrast</label>
                      <select 
                        value={contrast}
                        onChange={(e: any) => setContrast(e.target.value)}
                        className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-black text-sm px-6 py-4 border-2 border-[var(--border-main)] outline-none focus:border-[var(--accent-primary)] uppercase appearance-none cursor-pointer"
                      >
                        <option value="system">System</option>
                        <option value="medium">Medium</option>
                        <option value="increased">Increased</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Accent Color</label>
                      <select 
                        value={accentColor}
                        onChange={(e: any) => setAccentColor(e.target.value)}
                        className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-black text-sm px-6 py-4 border-2 border-[var(--border-main)] outline-none focus:border-[var(--accent-primary)] uppercase appearance-none cursor-pointer"
                      >
                        <option value="default">Default (Red)</option>
                        <option value="blue">Blue</option>
                        <option value="green">Green</option>
                        <option value="yellow">Yellow</option>
                        <option value="pink">Pink</option>
                        <option value="orange">Orange</option>
                        <option value="black">Black (Premium)</option>
                        <option value="glass">Glass (Premium)</option>
                      </select>
                    </div>

                  </div>
                </section>

                {/* NOTIFICATIONS SECTION */}
                <section>
                  <div className="flex items-center gap-4 mb-10 border-b border-[var(--border-main)] pb-4">
                    <div className="w-1.5 h-6 bg-[var(--accent-primary)]" />
                    <h3 className="text-2xl font-black uppercase tracking-[0.2em]">NOTIFICATIONS</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    {/* Delivery Controls */}
                    <div className="space-y-8">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--accent-primary)]">Delivery Controls</h4>
                      {[
                        { key: 'push', label: 'Push Notifications' },
                        { key: 'email', label: 'Email Notifications' },
                        { key: 'sms', label: 'SMS / WhatsApp Alerts' }
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                          <button 
                            onClick={() => setNotificationsDelivery({...notificationsDelivery, [item.key]: !((notificationsDelivery as any)[item.key])})}
                            className={`w-14 h-7 border-2 transition-all relative ${((notificationsDelivery as any)[item.key]) ? 'border-[var(--accent-primary)] bg-[var(--bg-secondary)] shadow-[0_0_15px_var(--accent-glow)]' : 'border-[var(--border-main)] bg-transparent opacity-40'}`}
                          >
                            <div className={`absolute top-1 w-4 h-3 transition-all ${((notificationsDelivery as any)[item.key]) ? 'right-1 bg-[var(--accent-primary)]' : 'left-1 bg-zinc-600'}`} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Categories */}
                    <div className="space-y-8">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--accent-primary)]">Categories</h4>
                      <div className="grid grid-cols-1 gap-4">
                        {[
                          { label: 'Casting & Opportunities', key: 'casting' },
                          { label: 'Activity & Engagement', key: 'activity' },
                          { label: 'AI & Platform Insights', key: 'ai' },
                          { label: 'Progress & Rewards', key: 'progress' },
                          { label: 'Communication', key: 'communication' },
                          { label: 'Account & Security', key: 'account' },
                          { label: 'Platform Updates', key: 'platform' }
                        ].map(item => (
                          <div key={item.key} className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{item.label}</span>
                            <button 
                              onClick={() => setNotificationCategories({...notificationCategories, [item.key]: !((notificationCategories as any)[item.key])})}
                              className={`w-4 h-4 border transition-all ${((notificationCategories as any)[item.key]) ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--border-main)] bg-transparent'}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* PROFILE SECTION */}
                <section>
                  <div className="flex items-center gap-4 mb-10 border-b border-[var(--border-main)] pb-4">
                    <div className="w-1.5 h-6 bg-[var(--accent-primary)]" />
                    <h3 className="text-2xl font-black uppercase tracking-[0.2em]">PROFILE</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                    {/* Identity Group */}
                    <div className="space-y-8">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--accent-primary)]">Identification</h4>
                       
                       <div className="space-y-6">
                         <div className="flex flex-col gap-2">
                           <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Full Name</label>
                           <input 
                              type="text" 
                              value={profileForm.fullName}
                              onChange={e => setProfileForm({...profileForm, fullName: e.target.value})}
                              className="w-full bg-[var(--bg-secondary)] border-b-2 border-[var(--border-main)] py-3 px-1 font-black text-sm uppercase outline-none focus:border-[var(--accent-primary)] transition-all"
                           />
                         </div>

                         <div className="flex flex-col gap-2">
                           <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Bio (Max 500 characters)</label>
                           <textarea 
                              value={profileForm.bio}
                              onChange={e => setProfileForm({...profileForm, bio: e.target.value.slice(0, 500)})}
                              className="w-full bg-[var(--bg-secondary)] border-2 border-[var(--border-main)] p-4 font-black text-xs uppercase outline-none focus:border-[var(--accent-primary)] transition-all h-24 custom-scrollbar"
                              placeholder="TELL YOUR STORY..."
                           />
                         </div>

                         <div className="flex flex-col gap-2 pt-4">
                           <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Profile Picture</label>
                           <div className="flex items-center gap-6">
                             <div className="w-16 h-16 rounded-full bg-[var(--bg-secondary)] border-2 border-[var(--border-main)] overflow-hidden shrink-0">
                               {data.profile.avatarUrl ? (
                                 <img src={data.profile.avatarUrl} alt="" className="w-full h-full object-cover grayscale" />
                               ) : (
                                 <div className="w-full h-full flex items-center justify-center"><User className="w-6 h-6 text-zinc-700" /></div>
                               )}
                             </div>
                             <label className="flex-1 py-3 border-2 border-dashed border-[var(--border-main)] flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:border-[var(--accent-primary)] transition-all cursor-pointer">
                               <input type="file" className="hidden" accept="image/*" onChange={handlePFPChange} />
                               <Upload className="w-3 h-3" /> Update Image
                             </label>
                           </div>
                         </div>

                         <div className="flex flex-col gap-2">
                           <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Email Address</label>
                           <input 
                              type="email" 
                              value={profileForm.email}
                              disabled
                              className="w-full bg-transparent border-b border-[var(--border-main)] py-3 px-1 font-black text-sm text-zinc-600 outline-none"
                           />
                         </div>

                         <div className="flex flex-col gap-4 pt-4">
                           {showUsernameInput ? (
                             <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                               <label className="text-[9px] font-black text-[var(--accent-primary)] uppercase tracking-widest">Select New Username</label>
                               <div className="relative">
                                 <input 
                                   type="text" 
                                   value={newUsername}
                                   onChange={(e) => {
                                     const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                                     setNewUsername(val);
                                     checkUsername(val);
                                   }}
                                   className={`w-full bg-[var(--bg-tertiary)] border-2 p-4 font-black text-white text-xs tracking-widest outline-none transition-all ${
                                     usernameStatus === "available" ? "border-green-500" : 
                                     usernameStatus === "taken" || usernameStatus === "invalid" ? "border-[var(--accent-primary)]" : "border-[var(--border-main)]"
                                   }`}
                                   placeholder="NEW_IDENTITY_ID"
                                 />
                                 {usernameStatus !== "idle" && (
                                   <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase">
                                     {usernameStatus === "available" && <span className="text-green-500">AVAILABLE</span>}
                                     {usernameStatus === "taken" && <span className="text-[var(--accent-primary)]">TAKEN</span>}
                                   </div>
                                 )}
                               </div>
                               <button onClick={() => setShowUsernameInput(false)} className="text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors underline">Cancel Change</button>
                             </div>
                           ) : (
                             <button onClick={() => setShowUsernameInput(true)} className="w-full py-4 border-2 border-[var(--border-main)] font-black text-[10px] uppercase tracking-widest hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">Update Username</button>
                           )}
                            {showPassUpdateInput ? (
                              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-[var(--border-main)] pt-6 mt-2">
                                {!passVerified ? (
                                  <div className="space-y-4">
                                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Verify Current Password</label>
                                    <input 
                                      type="password"
                                      value={currentPassVerify}
                                      onChange={e => setCurrentPassVerify(e.target.value)}
                                      className="w-full bg-[var(--bg-tertiary)] border-2 border-[var(--border-main)] p-4 font-black text-white text-xs tracking-widest outline-none focus:border-[var(--accent-primary)]"
                                      placeholder="CURRENT_KEY"
                                    />
                                    <button 
                                      onClick={handleVerifyPassword}
                                      disabled={passUpdateLoading}
                                      className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] hover:bg-[var(--accent-primary)] hover:text-white transition-all"
                                    >
                                      {passUpdateLoading ? "VERIFYING..." : "VERIFY_IDENTITY"}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    <label className="text-[9px] font-black text-[var(--accent-primary)] uppercase tracking-widest">Initialize New Password</label>
                                    <input 
                                      type="password"
                                      value={newPassword}
                                      onChange={e => setNewPassword(e.target.value)}
                                      className={`w-full bg-[var(--bg-tertiary)] border-2 p-4 font-black text-white text-xs tracking-widest outline-none transition-all ${
                                        newPassword ? (validatePassword(newPassword) ? 'border-green-500' : 'border-[var(--accent-primary)]') : 'border-[var(--border-main)]'
                                      }`}
                                      placeholder="NEW_SECURE_KEY"
                                    />
                                    <p className="text-[8px] font-black text-zinc-600 uppercase">Min 8 chars, 1 uppercase, 1 number, 1 special char</p>
                                  </div>
                                )}
                                <button 
                                  onClick={() => {
                                    setShowPassUpdateInput(false);
                                    setPassVerified(false);
                                    setCurrentPassVerify("");
                                    setNewPassword("");
                                  }} 
                                  className="text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors underline"
                                >
                                  Cancel Change
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setShowPassUpdateInput(true)} className="w-full py-4 border-2 border-[var(--border-main)] font-black text-[10px] uppercase tracking-widest hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">Update Password</button>
                            )}
                         </div>
                       </div>
                    </div>

                    {/* Privacy & Visibility */}
                    <div className="space-y-8">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--accent-primary)]">Privacy Controls</h4>
                       
                       <div className="space-y-6">
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Profile Visibility</span>
                            <select 
                              value={profilePrivacy.visibility}
                              onChange={e => setProfilePrivacy({...profilePrivacy, visibility: e.target.value})}
                              className="bg-[var(--bg-tertiary)] font-black text-[10px] uppercase p-2 border border-[var(--border-main)] outline-none"
                            >
                               <option value="public">Public</option>
                               <option value="directors">Only Directors</option>
                            </select>
                         </div>

                         {[
                           { key: 'openToWork', label: 'Open To Work' },
                           { key: 'showAge', label: 'Show Age' },
                           { key: 'showLocation', label: 'Show Location' },
                           { key: 'showContact', label: 'Show Contact Details' }
                         ].map(item => (
                           <div key={item.key} className="flex items-center justify-between">
                             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{item.label}</span>
                             <button 
                                onClick={() => setProfilePrivacy({...profilePrivacy, [item.key]: !((profilePrivacy as any)[item.key])})}
                                className={`w-8 h-4 border transition-all ${((profilePrivacy as any)[item.key]) ? 'bg-green-500 border-green-500' : 'bg-zinc-800 border-zinc-700'}`}
                             />
                           </div>
                         ))}
                       </div>
                    </div>

                    {/* Permissions */}
                    <div className="space-y-8">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--accent-primary)]">Permission Matrix</h4>
                       
                       <div className="space-y-4">
                          {[
                            { label: 'Who can message you', key: 'message', options: ['everyone', 'directors', 'none'] },
                            { label: 'Who can view audition tapes', key: 'viewTapes', options: ['everyone', 'directors'] },
                            { label: 'Who can send casting invites', key: 'sendInvites', options: ['everyone', 'directors'] }
                          ].map(p => (
                            <div key={p.key} className="flex flex-col gap-2">
                               <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{p.label}</label>
                               <div className="flex gap-2">
                                  {p.options.map(opt => (
                                    <button 
                                      key={opt}
                                      onClick={() => setPermissions({...permissions, [p.key]: opt})}
                                      className={`flex-1 py-2 text-[8px] font-black uppercase tracking-tighter border transition-all ${((permissions as any)[p.key]) === opt ? 'bg-white text-black border-white' : 'bg-[var(--bg-secondary)] text-zinc-600 border-[var(--border-main)] hover:border-zinc-700'}`}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                               </div>
                            </div>
                          ))}
                          
                          <div className="flex items-center justify-between pt-4">
                             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Appear in Casting Searches</span>
                             <button 
                                onClick={() => setPermissions({...permissions, appearInSearches: !permissions.appearInSearches})}
                                className={`w-10 h-5 border transition-all ${permissions.appearInSearches ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'bg-transparent border-zinc-700'}`}
                             />
                          </div>
                       </div>
                    </div>

                    {/* Account Management */}
                    <div className="space-y-8">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--accent-primary)]">Account Management</h4>
                       <div className="grid grid-cols-1 gap-3">
                          <button onClick={handleLogout} className="w-full py-4 bg-[var(--bg-secondary)] border border-[var(--border-main)] text-white font-black text-[10px] uppercase tracking-widest hover:bg-[var(--accent-primary)] hover:border-[var(--accent-primary)] transition-all">Logout</button>
                          <button className="w-full py-4 border border-white/10 rounded-3xl border-[var(--border-main)] text-zinc-500 font-black text-[10px] uppercase tracking-widest hover:text-white hover:border-white transition-all">Logout from all Devices</button>
                          <div className="grid grid-cols-2 gap-3 pt-4">
                             <button className="py-4 border-2 border-zinc-900 text-zinc-800 font-black text-[9px] uppercase tracking-widest hover:border-zinc-700 hover:text-zinc-600 transition-all">Deactivate Account</button>
                             <button className="py-4 border-2 border-[var(--accent-primary)]/20 text-[var(--accent-primary)]/50 font-black text-[9px] uppercase tracking-widest hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all">Delete Account</button>
                          </div>
                       </div>
                    </div>
                  </div>
                </section>

              </div>

              {/* Modal Footer */}
              <div className="p-8 border-t border-[var(--border-main)] bg-[var(--bg-tertiary)]/50 flex flex-col md:flex-row gap-6 shrink-0">
                <button 
                  onClick={handleUpdateSettings}
                  disabled={settingsLoading || (newUsername.length > 0 && usernameStatus !== "available") || (newPassword.length > 0 && !validatePassword(newPassword))}
                  className="flex-1 py-8 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-black text-3xl uppercase tracking-tighter hover:bg-white hover:text-black transition-all shadow-[0_0_30px_var(--accent-glow)] hover:shadow-[0_0_50px_var(--accent-glow)] disabled:opacity-20 cursor-pointer"
                >
                  {settingsLoading ? "PROCESSING..." : "SAVE CONFIGURATION"}
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
              className="absolute inset-0 bg-[var(--bg-primary)]/95 backdrop-blur-2xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-2xl aspect-square glass-panel-premium border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-glow)] rounded-3xl relative z-10 flex flex-col"
            >
              <div className="flex-1 relative bg-[var(--bg-tertiary)]">
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
              <div className="p-8 bg-[var(--bg-tertiary)] flex flex-col gap-6">
                <div className="flex items-center gap-6">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest w-20">ZOOM_LVL</span>
                  <input 
                    type="range" 
                    min={1} 
                    max={3} 
                    step={0.1} 
                    value={zoom} 
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 accent-[var(--accent-primary)]"
                  />
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={handleApplyCrop}
                    disabled={isUploadingPFP}
                    className="flex-1 py-5 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-black text-sm uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-[0_0_30px_var(--accent-glow)] hover:shadow-[0_0_50px_var(--accent-glow)] disabled:opacity-50"
                  >
                    {isUploadingPFP ? "PROCESSING..." : "FINALIZE BIOMETRIC CROP"}
                  </button>
                  <button 
                    onClick={() => setShowCropModal(false)}
                    className="px-8 py-5 border-2 border-[var(--border-main)] text-zinc-500 font-black text-sm uppercase tracking-widest hover:border-[var(--accent-primary)] hover:text-white transition-all"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Profile Modal */}
      <AnimatePresence>
        {showProfileModal && selectedUserProfile && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="w-full max-w-2xl glass-panel-premium border border-[var(--accent-primary)]/30 shadow-[0_0_50px_rgba(255,49,49,0.2)] rounded-3xl relative z-10 flex flex-col overflow-hidden max-h-[90vh]"
            >
              <div className="p-10 overflow-y-auto custom-scrollbar">
                <div className="flex flex-col md:flex-row gap-10 items-center md:items-start mb-12">
                  <div className="w-40 h-40 rounded-full border-4 border-[var(--accent-primary)]/30 p-2 shrink-0">
                    <div className="w-full h-full rounded-full border border-[var(--accent-primary)]/50 overflow-hidden">
                      {selectedUserProfile.avatar_url ? (
                        <img src={selectedUserProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                          <User className="w-16 h-16 text-zinc-700" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-center md:text-left flex-1">
                    <h2 className="text-5xl font-black uppercase tracking-tighter mb-2">{selectedUserProfile.full_name}</h2>
                    <p className="text-[var(--accent-primary)] font-black tracking-[0.3em] uppercase text-xs mb-6">@{selectedUserProfile.username || 'ANONYMOUS'}</p>
                    <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                      <button 
                        onClick={() => sendFriendRequest(selectedUserProfile.id)}
                        className="px-8 py-3 bg-[var(--accent-primary)] text-white font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,49,49,0.3)]"
                      >
                        ADD_FRIEND
                      </button>
                      <button 
                        onClick={() => startChat(selectedUserProfile.id)}
                        className="px-8 py-3 border border-[var(--border-main)] text-white font-black uppercase tracking-widest text-[10px] hover:border-[var(--accent-primary)] transition-all"
                      >
                        INITIALIZE_CHAT
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="glass-panel-premium p-6 border border-[var(--border-main)] rounded-2xl">
                    <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-6">CORE_METRICS</h4>
                    <div className="space-y-4">
                      {[
                        { label: 'ROLE', value: selectedUserProfile.role },
                        { label: 'STATUS', value: selectedUserProfile.status },
                        { label: 'LOCATION', value: selectedUserProfile.settings?.[0]?.show_location !== false ? selectedUserProfile.location : 'RESTRICTED' },
                        { label: 'AGE', value: selectedUserProfile.settings?.[0]?.show_age !== false ? selectedUserProfile.age : 'HIDDEN' }
                      ].map(item => (
                        <div key={item.label} className="flex justify-between items-center border-b border-[var(--border-main)]/30 pb-2">
                          <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{item.label}</span>
                          <span className="text-[10px] font-black text-white uppercase">{item.value || 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass-panel-premium p-6 border border-[var(--border-main)] rounded-2xl">
                    <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-6">IDENTITY_VAULT</h4>
                    <p className="text-zinc-400 text-xs font-medium leading-relaxed">
                      {selectedUserProfile.settings?.[0]?.privacy_visibility === 'public' ? (
                        selectedUserProfile.bio || "No data stream detected."
                      ) : (
                        "DATA_ENCRYPTED. ACCESS_RESTRICTED."
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="w-full py-6 bg-zinc-900 border-t border-[var(--border-main)] text-zinc-500 font-black uppercase tracking-[0.4em] text-[10px] hover:text-white transition-all"
              >
                DISCONNECT_VIEW
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
