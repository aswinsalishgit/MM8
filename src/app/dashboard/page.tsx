"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PlayCircle, Star, Settings, Bell, LogOut, X, 
  ChevronRight, ChevronLeft, Crown, Upload, Trash2, MapPin, 
  ChevronDown, Check, User, CheckCircle2, Trophy, Flame, Lock, ShieldCheck, AlertTriangle, Zap, Info,
  Menu, Home, Compass, PlusSquare, Briefcase, Target, Rss, Users, Video, Mic2, Database, BookOpen, BarChart3
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
  'ELITE': { color: 'text-[#ff1a1a]', glow: 'drop-shadow-[0_0_15px_rgba(255,49,49,0.8)]', label: 'ELITE' },
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
  const [selectedFeed, setSelectedFeed] = useState<any>(null);
  const [notifFilter, setNotifFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showPassChangeModal, setShowPassChangeModal] = useState(false);
  const [currentPassVerify, setCurrentPassVerify] = useState("");
  const [passVerified, setPassVerified] = useState(false);
  const [profileForm, setProfileForm] = useState<any>({});

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

  // Sync profile form when data changes
  useEffect(() => {
    if (data?.profile) {
      setProfileForm({
        fullName: data.profile.name,
        username: data.profile.username,
        email: data.profile.email,
        alias: data.profile.alias,
        bio: data.profile.bio,
        role: data.profile.role,
        primaryObjective: data.profile.objectivePreference,
        languages: data.profile.languages,
        archetypes: data.profile.archetypes,
        opportunityReadiness: data.profile.opportunityReadiness,
        willingnessToTravel: data.profile.willingnessToTravel,
        location: data.profile.location,
        motherland: data.profile.motherland,
        age: data.profile.age,
        gender: data.profile.gender,
        height: data.profile.height,
        overallBuild: data.profile.overallBuild,
        faceShape: data.profile.faceShape,
        facialHair: data.profile.facialHair,
        eyeColor: data.profile.eyeColor,
        eyeShape: data.profile.eyeShape,
        noseStructure: data.profile.noseStructure,
        jawlineType: data.profile.jawlineType,
        skinTone: data.profile.skinTone,
        hairType: data.profile.hairType,
        scarsTattoos: data.profile.scarsTattoos,
        distinctFeatures: data.profile.distinctFeatures,
        priorArtExperience: data.profile.priorArtExperience,
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
      
      setMessage({ text: "PROFILE_UPDATED // SOURCE_STABLE", type: 'success' });
      setIsEditingProfile(false);
      window.location.reload(); // Refresh to sync all views
    } catch (err: any) {
      setMessage({ text: `UPDATE_FAILED // ${err.message}`, type: 'error' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleVerifyPassword = async () => {
     // In a real app, you would call a server action to verify the current password.
     // For this MVP, we will simulate verification.
     if (currentPassVerify === "mm8-demo-pass" || currentPassVerify.length >= 6) {
        setPassVerified(true);
        setMessage({ text: "IDENTITY_VERIFIED // UNLOCKING_PROTOCOL", type: 'success' });
     } else {
        setMessage({ text: "VERIFICATION_FAILED // INVALID_CREDENTIALS", type: 'error' });
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
    { id: 'NOTIFICATIONS', label: 'NOTIFICATIONS', icon: Bell },
    { id: 'PROFILE', label: 'PROFILE', icon: User },
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
      <main className="min-h-screen bg-[#050000]">
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050000] text-white flex overflow-hidden selection:bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] selection:text-white">
      
      {/* Status Bar */}
      {message && (
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`fixed top-0 left-0 w-full z-[2000] p-4 text-center font-black uppercase tracking-[0.4em] text-[10px] border-b ${
            message.type === 'error' ? 'bg-red-500/10 border-[#ff1a1a] text-[#ff1a1a]' : 
            message.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-500' :
            'bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]/10 border-[#ff1a1a] text-white'
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
            className="fixed lg:static inset-y-0 left-0 w-72 bg-[#050000] border-r border-zinc-900 z-[150] flex flex-col overflow-y-auto custom-scrollbar shrink-0"
          >
            <div className="p-8 border-b border-zinc-900 flex justify-between items-center shrink-0">
              <h2 className="text-4xl font-black uppercase tracking-tighter">MM8</h2>
              <button className="lg:hidden p-2 hover:bg-zinc-900 transition-colors" onClick={() => setIsSidebarOpen(false)}>
                <X className="w-6 h-6 text-zinc-500 hover:text-white" />
              </button>
            </div>
            
            <div className="p-8 border-b border-zinc-900 shrink-0 flex flex-col items-center">
              <div className="w-32 h-32 rounded-full border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl bg-zinc-900 mb-6 relative overflow-hidden">
                {data.profile.avatarUrl ? (
                  <img src={data.profile.avatarUrl} alt="PFP" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-zinc-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                )}
              </div>
              <p className="font-black text-center text-sm uppercase tracking-widest text-[#ff1a1a]">@{data.profile.username || 'ANONYMOUS'}</p>
            </div>

            <nav className="flex-1 p-4 flex flex-col gap-2">
              {NAVIGATION_ITEMS.map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    if (window.innerWidth <= 1024) setIsSidebarOpen(false);
                    if (item.id === 'SETTINGS') setShowSettings(true);
                    if (item.id === 'LOGOUT') handleLogout();
                  }}
                  className={`w-full flex items-center gap-4 p-4 text-left font-black uppercase tracking-widest text-[10px] transition-all ${
                    currentView === item.id 
                      ? 'bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]/10 border-l-4 border-[#ff1a1a] text-white' 
                      : 'border-l-4 border-transparent text-zinc-500 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${currentView === item.id ? 'text-[#ff1a1a]' : ''}`} />
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
        <header className="h-20 border-b border-zinc-900 bg-[#050000] flex items-center justify-between px-6 shrink-0 z-[100]">
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
                  <span className="absolute top-1 right-1 w-2 h-2 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] rounded-full" />
                )}
              </button>
              <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-zinc-900 rounded-full transition-colors group" title="SETTINGS">
                <Settings className="w-5 h-5 text-zinc-500 group-hover:text-white transition-all" />
              </button>
            </div>
            
            <div className="w-[1px] h-8 bg-zinc-900 hidden md:block" />
            
            <div 
              onClick={() => setCurrentView('PROFILE')}
              className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl cursor-pointer hover:scale-110 transition-transform"
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
              <div className="mb-12 border-b border-zinc-900 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none text-white">
                    ACTOR DASHBOARD
                  </h1>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mt-6 md:mt-0 glass-panel-premium border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl px-6 py-3 rounded-full flex items-center gap-3"
                >
                  <span className="font-black uppercase tracking-[0.2em] text-[10px] text-zinc-500">USERNAME:</span>
                  <span className="font-black uppercase tracking-widest text-xs text-[#ff1a1a] tabular-nums">
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
          <section className="glass-panel-premium border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl p-10 relative overflow-hidden group clip-brutal-tl">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] text-white font-black px-6 py-3 flex items-center gap-2 text-[10px] tracking-widest clip-brutal-tr">
              <CheckCircle2 className="w-4 h-4" />
              {data.profile.status}
            </div>
            
            <div className="flex items-center gap-8 mt-6 mb-12">
              <div className="w-32 h-32 bg-zinc-950 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-500 rounded-full overflow-hidden">
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
                <User className={`w-16 h-16 text-brand-red-deep group-hover:text-[#ff1a1a] transition-colors ${data.profile.avatarUrl ? 'hidden' : ''}`} />
              </div>
              <div>
                <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">{data.profile.name}</h2>
                <p className="text-[#ff1a1a] font-black uppercase tracking-[0.3em] text-xs mt-3 flex items-center gap-2">
                  <span className="w-2 h-[1px] bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]" />
                  {data.profile.location}
                </p>
              </div>
            </div>

            <div className="border-t border-zinc-900 pt-10">
              {/* Profile Completion progress bar */}
              <div className="mt-8">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-black text-zinc-600 uppercase tracking-[0.4em] text-[10px]">PROFILE_STRENGTH</h3>
                  <span className="text-white font-black text-[10px] tabular-nums">{completionProgress}%</span>
                </div>
                <div className="w-full h-3 bg-zinc-950 relative overflow-hidden rounded-full">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${completionProgress}%` }}
                    transition={{ duration: 1.5, ease: "circOut" }}
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] shadow-[0_0_20px_rgba(255,49,49,0.8)]"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Status Hub */}
          <section className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-zinc-800 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Zap className="w-5 h-5 text-[#ff1a1a]" />
                <h3 className="font-black uppercase tracking-[0.4em] text-[10px]">STATUS</h3>
              </div>
              <div className={`flex items-center gap-2 ${TIER_CONFIG[data.profile.lumenTier]?.color || 'text-zinc-500'}`}>
                <Zap className={`w-3 h-3 ${TIER_CONFIG[data.profile.lumenTier]?.glow || ''}`} />
                <span className="font-black uppercase tracking-widest text-[9px]">{data.profile.lumenTier}</span>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="text-left">
                <span className="text-6xl font-black tracking-tighter text-white tabular-nums leading-none">
                  {data.profile.lumenPoints.toLocaleString()}
                </span>
                <span className="text-xl font-black text-[#ff1a1a] ml-2">LMN</span>
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
          <section className="glass-panel-premium-red p-10 hover:bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]/10 transition-all cursor-pointer group relative overflow-hidden clip-brutal-br">
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <Flame className="w-6 h-6 text-[#ff1a1a]" />
                <h3 className="font-black uppercase tracking-[0.4em] text-[10px]">DAILY_MISSIONS</h3>
              </div>
                <div className="flex flex-col gap-4">
                  {data.missions.map((mission: any) => (
                    <div key={mission.label} className={`flex items-center justify-between p-4 border border-white/10 rounded-3xl transition-all ${mission.done ? 'border-green-500 bg-green-500/10' : 'border-zinc-800 bg-zinc-950/50'}`}>
                      <div className="flex items-center gap-3">
                        {mission.done ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <div className="w-4 h-4 border border-zinc-700 bg-zinc-900" />
                        )}
                        <span className={`font-black uppercase tracking-widest text-[10px] ${mission.done ? 'text-green-500' : 'text-zinc-500'}`}>{mission.label}</span>
                      </div>
                      <span className={`font-black text-[10px] tracking-widest ${mission.done ? 'text-green-500' : 'text-[#ff1a1a]'}`}>
                        {mission.done ? 'COMPLETED' : `+${mission.reward} LMN`}
                      </span>
                    </div>
                  ))}
                </div>
            </div>
          </section>

          {/* Ranking Subsystem — Live LUMEN Leaderboard */}
          <section className="glass-panel-premium p-10 border border-white/10 rounded-3xl clip-brutal-bl">
            <div className="flex items-center gap-4 mb-10 border-b border-zinc-900 pb-8">
              <Trophy className="w-6 h-6 text-[#ff1a1a]" />
              <h3 className="font-black uppercase tracking-[0.4em] text-[10px]">GLOBAL_RANKINGS</h3>
              <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest ml-auto">LIVE // {data.leaderboard.length} NODES</span>
            </div>
            {data.leaderboard.length > 0 ? (
              <div className="flex flex-col gap-4">
                {data.leaderboard.map((actor: any) => (
                  <div key={actor.id} className={`flex items-center justify-between p-5 border border-white/10 rounded-3xl transition-all group ${actor.isUser ? 'border-[#ff1a1a] bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]/10 rounded-full' : 'border-zinc-900 bg-zinc-950/50 hover:border-zinc-700'}`}>
                    <div className="flex items-center gap-5">
                      <span className={`font-black text-2xl tabular-nums w-8 shrink-0 ${actor.rank === 1 ? 'text-[#ff1a1a]' : actor.rank === 2 ? 'text-zinc-400' : actor.rank === 3 ? 'text-orange-700' : 'text-zinc-800 group-hover:text-zinc-600'}`}>
                        {String(actor.rank).padStart(2, '0')}
                      </span>
                      <div className="w-10 h-10 bg-zinc-900 rounded-full overflow-hidden border border-white/10 rounded-3xl border-zinc-800 shrink-0 flex items-center justify-center">
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
                      <span className="font-black tabular-nums text-[#ff1a1a] text-lg">{actor.score.toLocaleString()}</span>
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
          <section className="glass-panel-premium border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl p-10 clip-brutal-tr relative overflow-hidden">
            <div className="flex items-center justify-between mb-8 border-b border-zinc-900 pb-6">
              <div className="flex items-center gap-4">
                <Bell className="w-6 h-6 text-[#ff1a1a]" />
                <h3 className="font-black uppercase tracking-[0.4em] text-[10px]">LATEST_UPDATES</h3>
              </div>
              <button 
                onClick={() => router.push('/dashboard/notifications')}
                className="text-zinc-600 hover:text-[#ff1a1a] font-black uppercase tracking-[0.3em] text-[10px] flex items-center gap-2 transition-colors cursor-pointer"
              >
                VIEW ALL <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            
            {data.notifications && data.notifications.length > 0 ? (
              <div className="space-y-4">
                {data.notifications.slice(0, 3).map((notif: any) => (
                  <div 
                    key={notif.id}
                    onClick={() => router.push('/dashboard/notifications')}
                    className={`p-5 border border-white/10 rounded-3xl transition-all cursor-pointer group relative ${
                      notif.priority === 'VERY IMPORTANT' 
                        ? 'border-[#ff1a1a] bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]/10 hover:bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]/20' 
                        : notif.priority === 'IMPORTANT'
                        ? 'border-yellow-500/50 bg-yellow-500/5 hover:bg-yellow-500/10'
                        : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-600'
                    }`}
                  >
                    {!notif.read && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]" />
                    )}
                    <div className="flex items-start gap-4">
                      <div className={`p-2 shrink-0 ${
                        notif.priority === 'VERY IMPORTANT' ? 'bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]/20' : 'bg-zinc-900'
                      }`}>
                        {notif.priority === 'VERY IMPORTANT' 
                          ? <AlertTriangle className="w-4 h-4 text-[#ff1a1a]" />
                          : <Bell className="w-4 h-4 text-zinc-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-widest text-white ${
                            notif.priority === 'VERY IMPORTANT' ? 'bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]' : notif.priority === 'IMPORTANT' ? 'bg-yellow-500' : 'bg-zinc-600'
                          }`}>
                            {notif.priority}
                          </span>
                          {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] animate-pulse" />}
                        </div>
                        <h4 className="text-sm font-black uppercase tracking-tighter group-hover:text-[#ff1a1a] transition-colors">{notif.title}</h4>
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
          
          {/* Action Hub */}
          <section className="w-full">
            <button 
              onClick={handleUploadClick}
              disabled={uploading}
              className={`w-full relative group p-12 md:p-24 text-left overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-12 transition-all duration-700 cursor-pointer ${
                uploading ? 'bg-zinc-950 border-2 border-brand-red-deep' : 'bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] text-white clip-brutal-hero-primary shadow-[0_0_60px_rgba(255,49,49,0.3)] hover:shadow-[0_0_100px_rgba(255,49,49,0.5)]'
              }`}
            >
              {uploading && (
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] opacity-30 z-0 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              )}
              
              <div className="relative z-10 max-w-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-[2px] bg-white opacity-60" />
                  <p className="font-black uppercase tracking-[0.5em] text-[10px] text-white/70">
                    {uploading ? "UPLINK_ESTABLISHED" : ""}
                  </p>
                </div>
                <h2 className="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-[0.8] text-white">
                  {uploading ? `SYNCING ${uploadProgress}%` : "UPLOAD AUDITION"}
                </h2>
                <p className="font-black uppercase tracking-widest mt-8 text-sm text-white/80 max-w-lg">
                  {uploading ? "Transferring raw talent packets to the MM8 decentralized storage layer." : "Submit your latest performance. Our AI agents will match you directly to the pipeline."}
                </p>
              </div>

              {!uploading && (
                <div className="relative z-10 w-32 h-32 bg-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500 clip-brutal-tr shadow-2xl">
                  <PlayCircle className="w-16 h-16 text-[#ff1a1a]" />
                </div>
              )}
              
              <div className="absolute right-[-30px] bottom-[-30px] text-[20rem] font-black text-black opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity uppercase leading-none">
                RAW
              </div>
            </button>
          </section>

          {/* AI Matching Grid */}
          {data.roles.length > 0 && (
          <section className="flex-1 flex flex-col min-h-0 mt-8">
            <div className="flex items-end justify-between mb-12 px-2">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]/10 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl rounded-full">
                  <Star className="w-8 h-8 text-[#ff1a1a]" />
                </div>
                <div>
                  <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">AGENTIC MATCHES</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 mt-2">REAL_TIME_PIPELINE_SYNC</p>
                </div>
              </div>
              <button className="text-zinc-600 hover:text-[#ff1a1a] font-black uppercase tracking-[0.3em] text-[10px] flex items-center gap-3 transition-all border-b border-transparent hover:border-[#ff1a1a] pb-2 cursor-pointer">
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
                  className={`snap-center shrink-0 w-[350px] md:w-[480px] glass-panel-premium border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl p-10 flex flex-col hover:bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]/5 transition-all group cursor-pointer ${
                    index % 2 === 0 ? 'clip-brutal-tl' : 'clip-brutal-tr'
                  }`}
                >
                  <div className="flex justify-between items-start mb-10">
                    <div className="bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] text-white font-black px-6 py-3 uppercase text-[10px] tracking-[0.2em] shadow-[0_0_20px_rgba(255,49,49,0.4)] rounded-full">
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
                      <div className="w-2 h-2 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] rounded-full" />
                      <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[10px]">{role.project}</p>
                    </div>
                    <h3 className="text-5xl font-black uppercase tracking-tighter leading-[0.9] mb-8 group-hover:text-[#ff1a1a] transition-colors">
                      {role.title}
                    </h3>
                    <div className="flex flex-wrap gap-3 mt-auto">
                      {role.tags.map((tag: string) => (
                        <span key={tag} className="border border-zinc-800 text-zinc-500 px-4 py-2 text-[9px] font-black uppercase tracking-widest group-hover:border-[#ff1a1a]/30 group-hover:text-[#ff1a1a] transition-colors">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-12 border-t border-zinc-900 pt-8 flex justify-between items-center group-hover:border-[#ff1a1a]/30 transition-all">
                    <span className="font-black text-[10px] uppercase tracking-[0.3em] text-zinc-600 group-hover:text-white transition-colors">ANALYZE_SPECIFICATIONS</span>
                    <div className="w-12 h-12 bg-zinc-950 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl flex items-center justify-center group-hover:bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] transition-all">
                      <ChevronRight className="w-6 h-6 text-[#ff1a1a] group-hover:text-white transition-all" />
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
            <div className="p-5 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]/10 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl rounded-full">
              <PlusSquare className="w-10 h-10 text-[#ff1a1a]" />
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
                  uploading ? 'bg-zinc-950 border-2 border-brand-red-deep' : 'bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] text-white clip-brutal-hero-primary shadow-[0_0_60px_rgba(255,49,49,0.3)] hover:shadow-[0_0_100px_rgba(255,49,49,0.5)]'
                }`}
              >
                {uploading && (
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] opacity-30 z-0 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                )}
                
                <div className="relative z-10 max-w-2xl">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-[2px] bg-white opacity-60" />
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
                    <PlayCircle className="w-16 h-16 text-[#ff1a1a]" />
                  </div>
                )}
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-zinc-800 clip-brutal-tl hover:border-[#ff1a1a]/30 transition-colors group">
                  <div className="flex items-center gap-4 mb-6">
                    <Video className="w-5 h-5 text-[#ff1a1a]" />
                    <h3 className="font-black uppercase tracking-widest text-[10px]">VIDEO_GUIDELINES</h3>
                  </div>
                  <ul className="space-y-4">
                    {['Horizontal framing only', 'Neutral background', 'Chest-up medium shot', 'Stable lighting (No backlighting)'].map((tip: string) => (
                      <li key={tip} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]" />
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-zinc-200 transition-colors">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-zinc-800 clip-brutal-tr hover:border-[#ff1a1a]/30 transition-colors group">
                  <div className="flex items-center gap-4 mb-6">
                    <Mic2 className="w-5 h-5 text-[#ff1a1a]" />
                    <h3 className="font-black uppercase tracking-widest text-[10px]">AUDIO_PROTOCOLS</h3>
                  </div>
                  <ul className="space-y-4">
                    {['Minimize background noise', 'Clear voice projection', 'No music/overlay', 'Direct mic orientation'].map((tip: string) => (
                      <li key={tip} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]" />
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-zinc-200 transition-colors">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-8">
              <div className="glass-panel-premium-red p-10 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl clip-brutal-br shadow-[0_0_40px_rgba(255,49,49,0.1)]">
                <div className="flex items-center gap-4 mb-8">
                  <Zap className="w-6 h-6 text-[#ff1a1a]" />
                  <h3 className="font-black uppercase tracking-widest text-[10px]">LMN_REWARDS</h3>
                </div>
                <div className="text-left">
                  <span className="text-7xl font-black tracking-tighter text-white">+{Math.floor(40 * (data.profile.multiplier || 1))}</span>
                  <span className="text-xl font-black text-[#ff1a1a] ml-2">LMN</span>
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mt-4 leading-relaxed">
                  Every audition upload awards 40 LMN points (x1.3 for VIP members). Points contribute directly to your global ranking and pipeline priority.
                </p>
              </div>

              <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-zinc-900 clip-brutal-bl bg-zinc-950/50">
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
              <div className="p-5 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]/10 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl rounded-full">
                <Star className="w-10 h-10 text-[#ff1a1a]" />
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
               <div className="w-2 h-2 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] rounded-full animate-pulse self-center" />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 px-4 border-y border-zinc-900 py-6">
            {['HIGH_MATCH', 'URGENT', 'NEW_PROJECTS', 'SAVED'].map((filter: string) => (
              <button key={filter} className="px-6 py-2 border border-zinc-800 text-[9px] font-black uppercase tracking-widest hover:border-[#ff1a1a] hover:text-[#ff1a1a] transition-all cursor-pointer">
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
                  className="glass-panel-premium border border-white/10 rounded-3xl p-10 flex flex-col hover:border-[#ff1a1a]/50 transition-all group cursor-pointer relative overflow-hidden h-full"
                >
                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                      <Star className="w-5 h-5 text-[#ff1a1a]" />
                   </div>

                  <div className="flex justify-between items-start mb-8">
                    <div className="bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] text-white font-black px-4 py-2 uppercase text-[9px] tracking-widest rounded-full shadow-[0_0_20px_rgba(255,49,49,0.2)]">
                      {role.match}% MATCH
                    </div>
                    <div className="text-right">
                       <span className="text-[8px] font-black text-zinc-600 uppercase block tracking-widest">DEADLINE</span>
                       <span className="text-white font-black uppercase text-xs tabular-nums">{role.deadline}</span>
                    </div>
                  </div>

                  <div className="flex-1">
                    <p className="text-zinc-600 font-black uppercase tracking-[0.3em] text-[9px] mb-2">{role.project}</p>
                    <h3 className="text-4xl font-black uppercase tracking-tighter leading-none mb-8 group-hover:text-[#ff1a1a] transition-colors">
                      {role.title}
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                       <div className="bg-zinc-950/50 p-4 border border-zinc-900 group-hover:border-zinc-800 transition-colors">
                          <p className="text-[7px] font-black text-zinc-600 uppercase tracking-widest mb-1">DIRECTOR</p>
                          <p className="text-[10px] font-black text-white uppercase">{role.director || 'RESTRICTED'}</p>
                       </div>
                       <div className="bg-zinc-950/50 p-4 border border-zinc-900 group-hover:border-zinc-800 transition-colors">
                          <p className="text-[7px] font-black text-zinc-600 uppercase tracking-widest mb-1">BUDGET</p>
                          <p className="text-[10px] font-black text-white uppercase">{role.budget || 'STANDARD'}</p>
                       </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {role.tags.map((tag: string) => (
                        <span key={tag} className="bg-zinc-900/30 text-zinc-500 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest border border-zinc-900 group-hover:border-[#ff1a1a]/20 transition-all">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button className="mt-12 w-full py-4 bg-zinc-950 border border-zinc-800 font-black uppercase tracking-[0.3em] text-[10px] hover:bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] hover:text-white transition-all group-hover:border-[#ff1a1a] cursor-pointer">
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
              <div className="p-5 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]/10 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl rounded-full">
                <Target className="w-10 h-10 text-[#ff1a1a]" />
              </div>
              <div>
                <h1 className="text-7xl font-black uppercase tracking-tighter leading-none">MISSIONS_HUB</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 mt-2">RESOURCE_ACQUISITION_PROTOCOLS</p>
              </div>
            </div>
            
            <div className="bg-zinc-900/50 p-6 border border-white/10 rounded-3xl border-zinc-800 flex flex-col gap-2">
               <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">ACTIVE_MULTIPLIER</span>
               <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-[#ff1a1a]" />
                  <span className="text-2xl font-black text-white tabular-nums">x{data.profile.multiplier.toFixed(1)}</span>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 px-4">
             {/* Main Missions Column */}
             <div className="lg:col-span-8 flex flex-col gap-10">
                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-zinc-800">
                   <div className="flex items-center gap-4 mb-10 border-b border-zinc-900 pb-6">
                      <Flame className="w-6 h-6 text-[#ff1a1a]" />
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
                              : 'border-zinc-900 bg-zinc-950/50 hover:border-zinc-700'
                          }`}
                        >
                          {mission.done && (
                            <div className="absolute top-0 left-0 w-1 h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                          )}
                          
                          <div className="flex items-center gap-6">
                            <div className={`w-12 h-12 flex items-center justify-center border border-white/10 rounded-3xl ${
                               mission.done ? 'border-green-500/30 bg-green-500/10' : 'border-zinc-800 bg-zinc-900'
                            }`}>
                               {mission.done ? (
                                 <CheckCircle2 className="w-6 h-6 text-green-500" />
                               ) : (
                                 <div className="w-2 h-2 bg-zinc-700 rounded-full group-hover:bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] transition-colors" />
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
                             <span className={`text-3xl font-black tabular-nums ${mission.done ? 'text-green-500' : 'text-[#ff1a1a]'}`}>
                                {mission.done ? 'DONE' : `+${mission.reward}`}
                             </span>
                             <span className="text-[10px] font-black text-zinc-600 ml-2">LMN</span>
                          </div>
                        </div>
                      ))}
                   </div>
                </div>

                {/* Achievement/Milestone Section */}
                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-zinc-800 opacity-50">
                   <div className="flex items-center gap-4 mb-10 border-b border-zinc-900 pb-6">
                      <Trophy className="w-6 h-6 text-zinc-600" />
                      <h3 className="text-2xl font-black uppercase tracking-tighter">MILESTONES // LOCKED</h3>
                   </div>
                   <div className="flex items-center justify-center py-20 border-2 border-dashed border-zinc-900">
                      <Lock className="w-10 h-10 text-zinc-800" />
                   </div>
                </div>
             </div>

             {/* Sidebar Info */}
             <div className="lg:col-span-4 flex flex-col gap-10">
                <div className="glass-panel-premium-red p-10 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl clip-brutal-hero-primary shadow-[0_0_40px_rgba(255,49,49,0.1)]">
                   <h3 className="font-black uppercase tracking-widest text-[10px] mb-6">PROGRESS_REPORT</h3>
                   <div className="flex items-end justify-between mb-4">
                      <span className="text-[9px] font-black uppercase text-white/60 tracking-widest">TIER_REACH: {data.profile.lumenTier}</span>
                      <span className="text-sm font-black text-white">{data.profile.lumenPoints} / 6000</span>
                   </div>
                   <div className="w-full h-2 bg-[#050000]/40 relative overflow-hidden">
                      <div 
                         className="absolute top-0 left-0 h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all duration-1000"
                         style={{ width: `${Math.min((data.profile.lumenPoints / 6000) * 100, 100)}%` }}
                      />
                   </div>
                   <p className="text-[8px] font-black uppercase tracking-widest mt-6 text-white/50 leading-relaxed">
                      Collect 6,000 LMN to activate the "ACTIVE TALENT" node. This unlocks priority matchmaking and advanced analytics.
                   </p>
                </div>

                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-zinc-900">
                   <h3 className="font-black uppercase tracking-widest text-[10px] mb-8 text-zinc-600">MISSION_HISTORY</h3>
                   <div className="space-y-6">
                      {[
                         { action: 'DAILY_LOGIN', date: '03.05.2026', points: Math.floor(10 * data.profile.multiplier) },
                         { action: 'PROFILE_SYNC', date: '02.05.2026', points: Math.floor(40 * data.profile.multiplier) },
                         { action: 'NODE_ACTIVATION', date: '01.05.2026', points: 100 },
                      ].map((log: any, i: number) => (
                         <div key={i} className="flex justify-between items-center border-l-2 border-zinc-900 pl-4 py-2">
                            <div>
                               <p className="text-[10px] font-black uppercase text-white">{log.action}</p>
                               <p className="text-[8px] font-black text-zinc-600">{log.date}</p>
                            </div>
                            <span className="text-xs font-black text-[#ff1a1a]">+{log.points}</span>
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
              <div className="p-5 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]/10 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl rounded-full">
                <Zap className="w-10 h-10 text-[#ff1a1a]" />
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
                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-zinc-800 bg-zinc-950/50">
                   <div className="flex items-center gap-4 mb-10 border-b border-zinc-900 pb-6">
                      <BookOpen className="w-6 h-6 text-[#ff1a1a]" />
                      <h3 className="text-2xl font-black uppercase tracking-tighter">ECONOMY_101 // THE_PROTOCOL</h3>
                   </div>
                   
                   <div className="space-y-12">
                      <div className="flex gap-8 group">
                         <div className="text-5xl font-black text-zinc-800 group-hover:text-[#ff1a1a] transition-colors tabular-nums">01</div>
                         <div>
                            <h4 className="text-xl font-black uppercase tracking-tight mb-3">WHAT IS LUMEN?</h4>
                            <p className="text-zinc-500 text-sm leading-relaxed max-w-2xl font-medium">
                               LUMEN (LMN) is the foundational utility resource of the MM8 ecosystem. It represents your "Talent Index" — a measurable metric of your activity, reliability, and match-potential within the decentralized casting pipeline.
                            </p>
                         </div>
                      </div>

                      <div className="flex gap-8 group">
                         <div className="text-5xl font-black text-zinc-800 group-hover:text-[#ff1a1a] transition-colors tabular-nums">02</div>
                         <div>
                            <h4 className="text-xl font-black uppercase tracking-tight mb-3">THE_VALUE_PROP</h4>
                            <p className="text-zinc-500 text-sm leading-relaxed max-w-2xl font-medium">
                               LMN is not just a score. It dictates your visibility to AI agents. High-LMN nodes receive priority matching for premium roles, early access to "Urgent" casting calls, and higher resource multipliers.
                            </p>
                         </div>
                      </div>

                      <div className="flex gap-8 group">
                         <div className="text-5xl font-black text-zinc-800 group-hover:text-[#ff1a1a] transition-colors tabular-nums">03</div>
                         <div>
                            <h4 className="text-xl font-black uppercase tracking-tight mb-3">YIELD_CALCULATION</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                               {[
                                  { label: 'DAILY_LOGIN', base: '10 LMN', logic: 'x STREAK_MULT' },
                                  { label: 'AUDITION_UPLOAD', base: '100 LMN', logic: 'BASE_REWARD' },
                                  { label: 'PROFILE_SYNC', base: '50 LMN', logic: 'ONE_TIME_GRANT' },
                                  { label: 'VIP_STATUS', base: '+30%', logic: 'GLOBAL_MULTIPLIER' },
                               ].map((m: any) => (
                                  <div key={m.label} className="p-4 bg-zinc-900 border border-white/10 rounded-3xl border-zinc-800">
                                     <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">{m.label}</p>
                                     <div className="flex items-center justify-between">
                                        <span className="text-lg font-black text-white tabular-nums">{m.base}</span>
                                        <span className="text-[8px] font-black text-[#ff1a1a] uppercase">{m.logic}</span>
                                     </div>
                                  </div>
                               ))}
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Detailed Metrics */}
                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-zinc-800">
                   <div className="flex items-center gap-4 mb-10 border-b border-zinc-900 pb-6">
                      <BarChart3 className="w-6 h-6 text-[#ff1a1a]" />
                      <h3 className="text-2xl font-black uppercase tracking-tighter">YIELD_METRICS</h3>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="text-center p-8 bg-zinc-950 border border-white/10 rounded-3xl border-zinc-900">
                         <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">AVG_DAILY_YIELD</p>
                         <p className="text-4xl font-black text-white tabular-nums">142</p>
                         <p className="text-[8px] font-black text-green-500 mt-2 uppercase tracking-tighter">+12% VS LAST_WEEK</p>
                      </div>
                      <div className="text-center p-8 bg-zinc-950 border border-white/10 rounded-3xl border-zinc-900">
                         <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">ACCUMULATION_RATE</p>
                         <p className="text-4xl font-black text-white tabular-nums">0.85</p>
                         <p className="text-[8px] font-black text-zinc-500 mt-2 uppercase tracking-tighter">LMN / HR</p>
                      </div>
                      <div className="text-center p-8 bg-zinc-950 border border-white/10 rounded-3xl border-zinc-900">
                         <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">TOTAL_DISTRIBUTED</p>
                         <p className="text-4xl font-black text-white tabular-nums">1.2M</p>
                         <p className="text-[8px] font-black text-zinc-500 mt-2 uppercase tracking-tighter">ACROSS_GLOBAL_INDEX</p>
                      </div>
                   </div>
                </div>
             </div>

             {/* Sidebar Info & Tips */}
             <div className="lg:col-span-4 flex flex-col gap-10">
                <div className="glass-panel-premium-red p-10 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl clip-brutal-tl shadow-[0_0_40px_rgba(255,49,49,0.1)]">
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
                         <span className="text-2xl font-black text-[#ff1a1a] tabular-nums">x{data.profile.multiplier.toFixed(1)}</span>
                      </div>
                   </div>
                </div>

                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-zinc-900 bg-zinc-950/50">
                   <h3 className="font-black uppercase tracking-widest text-[10px] mb-8 text-zinc-600">STRATEGIC_TIPS</h3>
                   <div className="space-y-6">
                      {[
                         { title: 'STREAK_MAINTENANCE', desc: 'Login for 7 consecutive days to activate a x1.5 multiplier.' },
                         { title: 'ROLE_INTERACTION', desc: 'Viewing and saving roles boosts your match-score by 5 LMN/action.' },
                         { title: 'NODE_UPGRADE', desc: 'Activate VIP status to permanently boost all LMN yield by 30%.' },
                         { title: 'AUDITION_MASTERY', desc: 'Weekly video submissions grant a massive 500 LMN consistency bonus.' },
                      ].map((tip: any, i: number) => (
                         <div key={i} className="group cursor-pointer">
                            <h4 className="text-[10px] font-black uppercase text-white mb-2 group-hover:text-[#ff1a1a] transition-colors flex items-center gap-2">
                               <div className="w-1.5 h-1.5 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]" />
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
              <div className="p-5 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]/10 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl rounded-full">
                <Rss className="w-10 h-10 text-[#ff1a1a]" />
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
                      className={`glass-panel-premium p-8 border border-white/10 rounded-3xl border-zinc-900 hover:border-[#ff1a1a] transition-all cursor-pointer group flex flex-col md:flex-row gap-8 ${selectedFeed?.id === feed.id ? 'border-[#ff1a1a] bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]/5' : 'bg-zinc-950/50'}`}
                   >
                      <div className="w-full md:w-48 h-48 border border-white/10 rounded-3xl border-zinc-800 overflow-hidden shrink-0 relative">
                         <img src={feed.image} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 scale-105 group-hover:scale-100" />
                         <div className="absolute top-2 left-2 px-2 py-1 bg-[#050000] text-[8px] font-black uppercase tracking-widest text-white border border-zinc-800">
                            {feed.category}
                         </div>
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-2">
                         <div>
                            <div className="flex items-center gap-4 mb-3">
                               <span className="text-[9px] font-black text-[#ff1a1a] uppercase tracking-widest">{feed.author}</span>
                               <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                               <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest tabular-nums">{feed.timestamp}</span>
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter leading-tight group-hover:text-[#ff1a1a] transition-colors mb-4">
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
                         className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-zinc-800 bg-zinc-950 sticky top-12"
                      >
                         <div className="w-full h-72 border border-white/10 rounded-3xl border-zinc-900 mb-10 overflow-hidden relative">
                            <img src={selectedFeed.image} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                            <div className="absolute bottom-6 left-6 right-6">
                               <span className="px-3 py-1 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] text-white text-[10px] font-black uppercase tracking-widest">
                                  {selectedFeed.category}
                               </span>
                            </div>
                         </div>
                         
                         <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-6">
                            {selectedFeed.title}
                         </h2>
                         
                         <div className="flex items-center gap-4 mb-10 border-y border-zinc-900 py-6">
                            <div className="w-10 h-10 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]/10 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl flex items-center justify-center">
                               <Rss className="w-4 h-4 text-[#ff1a1a]" />
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
                               <button className="flex-1 py-4 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] text-white font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white hover:text-black transition-all cursor-pointer">
                                  SHARE_INTEL
                               </button>
                               <button className="p-4 border border-white/10 rounded-3xl border-zinc-800 text-zinc-500 hover:text-white transition-all cursor-pointer">
                                  <Briefcase className="w-4 h-4" />
                               </button>
                            </div>
                         </div>
                      </motion.div>
                   ) : (
                      <div className="h-[70vh] glass-panel-premium border border-white/10 rounded-3xl border-zinc-900 flex flex-col items-center justify-center text-center p-12 opacity-30 sticky top-12">
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-zinc-900 pb-12 mb-4">
            <div>
              <h1 className="text-7xl font-black uppercase tracking-tighter leading-none">
                NOTIF<span className="text-brand-red-neon drop-shadow-[0_0_15px_rgba(255,49,49,0.5)]">//</span>CENTER
              </h1>
              <div className="flex items-center gap-4 mt-6">
                <div className="flex gap-1">
                  {[...Array(5)].map((_: any, i: number) => {
                    const unreadCount = data.notifications.filter((n: any) => !n.read).length;
                    return (
                      <div key={i} className={`w-1 h-4 ${i < unreadCount ? 'bg-brand-red-neon' : 'bg-zinc-800'}`} />
                    );
                  })}
                </div>
                <p className="text-zinc-600 font-black tracking-[0.4em] uppercase text-[10px] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-red-neon animate-pulse" />
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
                      notifFilter === f ? 'bg-brand-red-neon text-white' : 'bg-zinc-950 text-zinc-500 hover:text-white brutal-border border-zinc-800'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              {data.notifications.filter((n: any) => !n.read).length > 0 && (
                <button 
                  onClick={markAllRead}
                  className="px-6 py-3 glass-panel brutal-border-red text-brand-red-neon font-black uppercase tracking-widest text-[10px] hover:bg-brand-red-neon hover:text-white transition-all cursor-pointer flex items-center gap-2"
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
                        !notif.read ? 'hover:border-brand-red-neon' : 'opacity-60 hover:opacity-80'
                      }`}
                    >
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
        </div>
      ) : currentView === 'PROFILE' ? (
        <div className="flex flex-col gap-16 py-12 animate-in slide-in-from-bottom-8 duration-700">
          {/* Profile Header & Strength */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-4 gap-8">
            <div className="flex items-center gap-6">
              <div className="p-5 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]/10 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl rounded-full">
                <User className="w-10 h-10 text-[#ff1a1a]" />
              </div>
              <div>
                <h1 className="text-7xl font-black uppercase tracking-tighter leading-none">ACTOR_PROFILE</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 mt-2">DECENTRALIZED_IDENTITY_VAULT</p>
              </div>
            </div>

            <div className="w-full md:w-96 p-8 glass-panel-premium border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl flex flex-col gap-4 relative overflow-hidden group">
               <div className="flex justify-between items-end relative z-10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">PROFILE_STRENGTH</span>
                  <span className="text-3xl font-black text-[#ff1a1a] tabular-nums">{profileStrength}%</span>
               </div>
               <div className="h-2 bg-zinc-900 border border-white/10 rounded-3xl border-zinc-800 relative z-10 overflow-hidden">
                  <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${profileStrength}%` }}
                     className="h-full bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] shadow-[0_0_20px_rgba(255,49,49,0.5)]"
                  />
               </div>
               {profileStrength < 100 && (
                  <p className="text-[8px] font-black text-[#ff1a1a] uppercase tracking-widest animate-pulse relative z-10">
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
                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-zinc-800 flex flex-col items-center text-center">
                   <div className="w-48 h-48 rounded-full border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl bg-zinc-900 mb-8 relative overflow-hidden group">
                      {data.profile.avatarUrl ? (
                         <img src={data.profile.avatarUrl} alt="PFP" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                         <User className="w-20 h-20 text-zinc-800 m-auto mt-14" />
                      )}
                      <button 
                        onClick={() => setShowCropModal(true)}
                        className="absolute inset-0 bg-[#050000]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-white"
                      >
                         UPDATE_BIOMETRIC
                      </button>
                   </div>
                   <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">{data.profile.name}</h2>
                   <p className="text-[#ff1a1a] font-black text-xs tracking-widest mb-8">@{data.profile.username || 'ANONYMOUS'}</p>
                   
                   <div className="w-full space-y-4">
                      <button 
                        onClick={() => {
                           navigator.clipboard.writeText(`${window.location.origin}/actor/${data.profile.username || data.profile.id}`);
                           setMessage({ text: "PROFILE_LINK_COPIED // SHARE_READY", type: 'info' });
                        }}
                        className="w-full py-4 bg-zinc-900 hover:bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] transition-all border border-white/10 rounded-3xl border-zinc-800 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3"
                      >
                         <Rss className="w-4 h-4" /> SHARE_PROFILE
                      </button>
                      {!isEditingProfile && (
                         <button 
                            onClick={() => setIsEditingProfile(true)}
                            className="w-full py-4 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 rounded-full"
                         >
                            <PlusSquare className="w-4 h-4" /> EDIT_DATA_VAULT
                         </button>
                      )}
                   </div>
                </div>

                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-zinc-800 bg-zinc-950/50">
                   <h3 className="font-black uppercase tracking-widest text-[10px] mb-8 text-zinc-600">IDENTITY_BADGES</h3>
                   <div className="flex flex-wrap gap-4">
                      <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
                         <Crown className="w-3 h-3" /> VERIFIED_TALENT
                      </div>
                      <div className="px-4 py-2 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]/10 border border-[#ff1a1a]/30 text-[#ff1a1a] text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
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
                      <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-zinc-800">
                         <h3 className="text-2xl font-black uppercase tracking-tighter mb-10 border-b border-zinc-900 pb-6 flex items-center gap-4">
                            <User className="w-6 h-6 text-[#ff1a1a]" /> CORE_IDENTITY
                         </h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">FULL_NAME</label>
                               <input 
                                  value={profileForm.fullName}
                                  onChange={e => setProfileForm({...profileForm, fullName: e.target.value})}
                                  className="bg-zinc-900 border border-white/10 rounded-3xl border-zinc-800 p-4 font-black uppercase text-xs tracking-widest focus:border-[#ff1a1a] outline-none"
                               />
                            </div>
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">USERNAME</label>
                               <input 
                                  value={profileForm.username}
                                  onChange={e => setProfileForm({...profileForm, username: e.target.value})}
                                  className="bg-zinc-900 border border-white/10 rounded-3xl border-zinc-800 p-4 font-black text-[#ff1a1a] text-xs tracking-widest focus:border-[#ff1a1a] outline-none"
                               />
                            </div>
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">EMAIL_ADDRESS</label>
                               <input 
                                  disabled
                                  value={profileForm.email}
                                  className="bg-zinc-950/50 border border-white/10 rounded-3xl border-zinc-900 p-4 font-black text-zinc-700 text-xs tracking-widest outline-none opacity-50"
                               />
                            </div>
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">ALIAS / STAGE_NAME</label>
                               <input 
                                  value={profileForm.alias}
                                  onChange={e => setProfileForm({...profileForm, alias: e.target.value})}
                                  placeholder="E.G. THE_MAVERICK"
                                  className="bg-zinc-900 border border-white/10 rounded-3xl border-zinc-800 p-4 font-black uppercase text-xs tracking-widest focus:border-[#ff1a1a] outline-none"
                               />
                            </div>
                            <div className="md:col-span-2 flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">BIO (MAX 500 WORDS)</label>
                               <textarea 
                                  value={profileForm.bio}
                                  onChange={e => setProfileForm({...profileForm, bio: e.target.value})}
                                  rows={4}
                                  className="bg-zinc-900 border border-white/10 rounded-3xl border-zinc-800 p-4 font-black uppercase text-xs tracking-widest focus:border-[#ff1a1a] outline-none resize-none"
                               />
                            </div>
                            <div className="md:col-span-2">
                               <button 
                                 type="button"
                                 onClick={() => setShowPassChangeModal(true)}
                                 className="px-6 py-3 border border-zinc-800 hover:border-[#ff1a1a] transition-all text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white flex items-center gap-3"
                               >
                                  <Lock className="w-4 h-4" /> RECONFIGURE_SECURITY_PROTOCOL
                               </button>
                            </div>
                         </div>
                      </div>

                      {/* Section: Professional Specs */}
                      <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-zinc-800">
                         <h3 className="text-2xl font-black uppercase tracking-tighter mb-10 border-b border-zinc-900 pb-6 flex items-center gap-4">
                            <Briefcase className="w-6 h-6 text-[#ff1a1a]" /> PROFESSIONAL_SPECS
                         </h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">ROLE_TYPE</label>
                               <select 
                                  value={profileForm.role}
                                  onChange={e => setProfileForm({...profileForm, role: e.target.value})}
                                  className="bg-zinc-900 border border-white/10 rounded-3xl border-zinc-800 p-4 font-black uppercase text-xs tracking-widest focus:border-[#ff1a1a] outline-none"
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
                                  className="bg-zinc-900 border border-white/10 rounded-3xl border-zinc-800 p-4 font-black uppercase text-xs tracking-widest focus:border-[#ff1a1a] outline-none"
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
                                  className="bg-zinc-900 border border-white/10 rounded-3xl border-zinc-800 p-4 font-black uppercase text-xs tracking-widest focus:border-[#ff1a1a] outline-none"
                               />
                            </div>
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">MOTHERLAND / HOME_TOWN</label>
                               <input 
                                  value={profileForm.motherland}
                                  onChange={e => setProfileForm({...profileForm, motherland: e.target.value})}
                                  className="bg-zinc-900 border border-white/10 rounded-3xl border-zinc-800 p-4 font-black uppercase text-xs tracking-widest focus:border-[#ff1a1a] outline-none"
                               />
                            </div>
                            <div className="md:col-span-2 flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">EXPERIENCE_LOG</label>
                               <textarea 
                                  value={profileForm.priorArtExperience}
                                  onChange={e => setProfileForm({...profileForm, priorArtExperience: e.target.value})}
                                  placeholder="DESCRIBE_PRIOR_WORK..."
                                  rows={3}
                                  className="bg-zinc-900 border border-white/10 rounded-3xl border-zinc-800 p-4 font-black uppercase text-xs tracking-widest focus:border-[#ff1a1a] outline-none resize-none"
                               />
                            </div>
                         </div>
                      </div>

                      {/* Section: Biometric Data */}
                      <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-zinc-800">
                         <h3 className="text-2xl font-black uppercase tracking-tighter mb-10 border-b border-zinc-900 pb-6 flex items-center gap-4">
                            <Zap className="w-6 h-6 text-[#ff1a1a]" /> BIOMETRIC_DATA
                         </h3>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">AGE</label>
                               <input 
                                  type="number"
                                  value={profileForm.age || ''}
                                  onChange={e => setProfileForm({...profileForm, age: e.target.value})}
                                  className="bg-zinc-900 border border-white/10 rounded-3xl border-zinc-800 p-4 font-black uppercase text-xs tracking-widest focus:border-[#ff1a1a] outline-none"
                               />
                            </div>
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">GENDER</label>
                               <select 
                                  value={profileForm.gender}
                                  onChange={e => setProfileForm({...profileForm, gender: e.target.value})}
                                  className="bg-zinc-900 border border-white/10 rounded-3xl border-zinc-800 p-4 font-black uppercase text-xs tracking-widest focus:border-[#ff1a1a] outline-none"
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
                                  className="bg-zinc-900 border border-white/10 rounded-3xl border-zinc-800 p-4 font-black uppercase text-xs tracking-widest focus:border-[#ff1a1a] outline-none"
                               />
                            </div>
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">OVERALL_BUILD</label>
                               <select 
                                  value={profileForm.overallBuild}
                                  onChange={e => setProfileForm({...profileForm, overallBuild: e.target.value})}
                                  className="bg-zinc-900 border border-white/10 rounded-3xl border-zinc-800 p-4 font-black uppercase text-xs tracking-widest focus:border-[#ff1a1a] outline-none"
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
                                  className="bg-zinc-900 border border-white/10 rounded-3xl border-zinc-800 p-4 font-black uppercase text-xs tracking-widest focus:border-[#ff1a1a] outline-none"
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
                                  className="bg-zinc-900 border border-white/10 rounded-3xl border-zinc-800 p-4 font-black uppercase text-xs tracking-widest focus:border-[#ff1a1a] outline-none"
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
                                  className="bg-zinc-900 border border-white/10 rounded-3xl border-zinc-800 p-4 font-black uppercase text-xs tracking-widest focus:border-[#ff1a1a] outline-none"
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
                                  className="bg-zinc-900 border border-white/10 rounded-3xl border-zinc-800 p-4 font-black uppercase text-xs tracking-widest focus:border-[#ff1a1a] outline-none"
                               />
                            </div>
                            <div className="flex flex-col gap-3">
                               <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">SCARS / TATTOOS?</label>
                               <input 
                                  value={profileForm.scarsTattoos}
                                  onChange={e => setProfileForm({...profileForm, scarsTattoos: e.target.value})}
                                  placeholder="DESCRIBE_IF_ANY..."
                                  className="bg-zinc-900 border border-white/10 rounded-3xl border-zinc-800 p-4 font-black uppercase text-xs tracking-widest focus:border-[#ff1a1a] outline-none"
                               />
                            </div>
                         </div>
                      </div>

                      <div className="flex gap-6 pb-20">
                         <button 
                            type="submit"
                            disabled={profileLoading}
                            className="flex-1 py-6 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] text-white font-black uppercase tracking-[0.5em] text-sm hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(255,26,26,0.3)] hover:shadow-[0_0_50px_rgba(255,26,26,0.5)] disabled:opacity-50"
                         >
                            {profileLoading ? "SYNCING_IDENTITY..." : "SAVE_DEEP_PROFILE"}
                         </button>
                         <button 
                            type="button"
                            onClick={() => setIsEditingProfile(false)}
                            className="px-12 py-6 border-2 border-zinc-800 text-zinc-500 font-black uppercase tracking-widest text-xs hover:border-white hover:text-white transition-all"
                         >
                            CANCEL
                         </button>
                      </div>
                   </form>
                ) : (
                   <div className="flex flex-col gap-12">
                      {/* Read-only Display Summary */}
                      <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-zinc-800 relative overflow-hidden">
                         <div className="flex justify-between items-start mb-12">
                            <div>
                               <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 mb-2">PUBLIC_LEDGER_DATA</h3>
                               <p className="text-4xl font-black uppercase tracking-tighter">DATA_SUMMARY</p>
                            </div>
                            <ShieldCheck className="w-12 h-12 text-[#ff1a1a] opacity-20" />
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
                            {[
                               { label: 'STATUS', val: data.profile.status, color: 'text-[#ff1a1a]' },
                               { label: 'LOCATION', val: data.profile.location },
                               { label: 'ROLE', val: data.profile.role },
                               { label: 'OBJECTIVE', val: data.profile.objectivePreference },
                               { label: 'AGE', val: data.profile.age || '—' },
                               { label: 'HEIGHT', val: data.profile.height ? `${data.profile.height} CM` : '—' },
                               { label: 'GENDER', val: data.profile.gender },
                               { label: 'BUILD', val: data.profile.overallBuild },
                            ].map(item => (
                               <div key={item.label} className="border-l-2 border-zinc-900 pl-6">
                                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">{item.label}</p>
                                  <p className={`text-sm font-black uppercase tracking-widest ${item.color || 'text-white'}`}>{item.val || 'NULL_SIGNAL'}</p>
                               </div>
                            ))}
                         </div>

                         <div className="mt-12 pt-12 border-t border-zinc-900">
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-4">BIO_ENCRYPTION_STREAM</p>
                            <p className="text-zinc-500 text-xs font-black uppercase leading-relaxed max-w-2xl">
                               {data.profile.bio || "IDENTITY_DESCRIPTION_PENDING. COMPLETE_PROFILE_TO_DECRYPT_FULL_BIO."}
                            </p>
                         </div>
                      </div>

                      <div className="glass-panel-premium-red p-10 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl flex flex-col md:flex-row items-center justify-between gap-8">
                         <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-white flex items-center justify-center rounded-full">
                               <Zap className="w-8 h-8 text-[#ff1a1a]" />
                            </div>
                            <div>
                               <h4 className="text-xl font-black uppercase tracking-tighter">UPGRADE_VISIBILITY</h4>
                               <p className="text-[9px] font-black uppercase tracking-widest text-white/60">REACH_100%_FOR_THE_7X_ALGORITHM_BOOST</p>
                            </div>
                         </div>
                         <button 
                            onClick={() => setIsEditingProfile(true)}
                            className="px-8 py-4 bg-white text-[#ff1a1a] font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all"
                         >
                            FINALIZE_VAULT
                         </button>
                      </div>
                   </div>
                )}
             </div>
          </div>

          {/* PassChange Modal */}
          <AnimatePresence>
             {showPassChangeModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                   <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowPassChangeModal(false)}
                      className="absolute inset-0 bg-[#050000]/95 backdrop-blur-xl"
                   />
                   <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="relative z-10 w-full max-w-lg glass-panel-premium border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl p-12 flex flex-col gap-8"
                   >
                      <h3 className="text-3xl font-black uppercase tracking-tighter text-[#ff1a1a]">SECURITY_BYPASS_REQ</h3>
                      
                      {!passVerified ? (
                         <div className="flex flex-col gap-6">
                            <p className="text-xs font-black uppercase text-zinc-500 tracking-widest">ENTER_CURRENT_PROTOCOL_KEY_FOR_IDENTITY_PROOF:</p>
                            <input 
                               type="password"
                               value={currentPassVerify}
                               onChange={e => setCurrentPassVerify(e.target.value)}
                               className="bg-zinc-900 border border-white/10 rounded-3xl border-zinc-800 p-4 font-black text-white text-xs tracking-widest outline-none focus:border-[#ff1a1a]"
                               placeholder="CURRENT_KEY"
                            />
                            <button 
                               onClick={handleVerifyPassword}
                               className="w-full py-4 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] text-white font-black uppercase tracking-widest text-[10px]"
                            >
                               VERIFY_IDENTITY
                            </button>
                         </div>
                      ) : (
                         <div className="flex flex-col gap-6">
                            <p className="text-xs font-black uppercase text-zinc-500 tracking-widest">INITIALIZE_NEW_SECURITY_KEY:</p>
                            <input 
                               type="password"
                               value={newPassword}
                               onChange={e => setNewPassword(e.target.value)}
                               className="bg-zinc-900 border border-white/10 rounded-3xl border-zinc-800 p-4 font-black text-white text-xs tracking-widest outline-none focus:border-[#ff1a1a]"
                               placeholder="NEW_SECURE_KEY"
                            />
                            <button 
                               onClick={() => {
                                  // This would call the update password action
                                  setMessage({ text: "PROTOCOL_KEY_UPDATED // SECURITY_REINFORCED", type: 'success' });
                                  setShowPassChangeModal(false);
                                  setPassVerified(false);
                                  setCurrentPassVerify("");
                               }}
                               className="w-full py-4 bg-green-500 text-black font-black uppercase tracking-widest text-[10px]"
                            >
                               COMMIT_CHANGES
                            </button>
                         </div>
                      )}

                      <button 
                         onClick={() => setShowPassChangeModal(false)}
                         className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-700 hover:text-white transition-colors"
                      >
                         ABORT_PROCEDURE
                      </button>
                   </motion.div>
                </div>
             )}
          </AnimatePresence>
        </div>
      ) : currentView === 'LEADERBOARD' ? (
        <div className="flex flex-col gap-16 py-12 animate-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-6">
              <div className="p-5 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]/10 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl rounded-full">
                <Trophy className="w-10 h-10 text-[#ff1a1a]" />
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
                      i === 0 ? 'bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] border-white scale-105 z-10 shadow-[0_0_50px_rgba(255,49,49,0.4)]' : 'bg-zinc-900/50 border-zinc-800'
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
                   <div className={`text-5xl font-black mb-2 italic ${i === 0 ? 'text-white' : 'text-[#ff1a1a]'}`}>#{i + 1}</div>
                   <h3 className={`text-2xl font-black uppercase tracking-tight ${i === 0 ? 'text-white' : 'text-zinc-200'}`}>{actor.name}</h3>
                   <p className={`text-[10px] font-black uppercase tracking-widest mt-2 ${i === 0 ? 'text-white/70' : 'text-zinc-600'}`}>{actor.score.toLocaleString()} LMN</p>
                </div>
             ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 px-4">
             {/* Full Rankings List */}
             <div className="lg:col-span-8">
                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-zinc-800">
                   <div className="flex items-center justify-between mb-10 border-b border-zinc-900 pb-6">
                      <h3 className="text-2xl font-black uppercase tracking-tighter">ALL_NODES</h3>
                      <div className="flex gap-6">
                         {['GLOBAL', 'REGION', 'LOCAL'].map((t: string) => (
                            <button key={t} className="text-[9px] font-black text-zinc-600 hover:text-[#ff1a1a] uppercase tracking-widest transition-colors cursor-pointer">
                               {t}
                            </button>
                         ))}
                      </div>
                   </div>

                   <div className="flex flex-col gap-4">
                      {data.leaderboard.map((actor: any) => (
                        <div key={actor.id} className={`flex items-center justify-between p-6 border border-white/10 rounded-3xl transition-all group ${actor.isUser ? 'border-[#ff1a1a] bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]/10' : 'border-zinc-900 bg-zinc-950/50 hover:border-zinc-800'}`}>
                          <div className="flex items-center gap-6">
                            <span className={`font-black text-3xl tabular-nums w-12 shrink-0 ${actor.rank <= 3 ? 'text-[#ff1a1a]' : 'text-zinc-800 group-hover:text-zinc-600'}`}>
                              {String(actor.rank).padStart(2, '0')}
                            </span>
                            <div className="w-12 h-12 bg-zinc-900 rounded-full overflow-hidden border border-white/10 rounded-3xl border-zinc-800 shrink-0">
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
                             <span className="font-black tabular-nums text-[#ff1a1a] text-xl">{actor.score.toLocaleString()}</span>
                             <span className="text-[10px] font-black text-zinc-600 ml-2">LMN</span>
                          </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>

             {/* Personal Stats & Analytics */}
             <div className="lg:col-span-4 flex flex-col gap-10">
                <div className="glass-panel-premium-red p-10 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl clip-brutal-tr shadow-[0_0_40px_rgba(255,49,49,0.1)]">
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
                      <button className="w-full py-4 bg-white text-[#ff1a1a] font-black uppercase tracking-[0.3em] text-[10px] hover:bg-[#050000] hover:text-white transition-all cursor-pointer">
                         BOOST_RANKING
                      </button>
                   </div>
                </div>

                <div className="glass-panel-premium p-10 border border-white/10 rounded-3xl border-zinc-900 bg-zinc-950/50">
                   <h3 className="font-black uppercase tracking-widest text-[10px] mb-8 text-zinc-600">RISING_STARS // 24H</h3>
                   <div className="space-y-6">
                      {data.leaderboard.slice(0, 4).reverse().map((actor: any, i: number) => (
                         <div key={i} className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800" />
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
      ) : (
        <div className="flex flex-col items-center justify-center h-[60vh] opacity-50 animate-in fade-in duration-500">
           <h2 className="text-4xl font-black uppercase tracking-widest text-center">{currentView} {/* MODULE */}</h2>
           <p className="text-sm tracking-widest uppercase text-[#ff1a1a] mt-4 text-center">CONSTRUCTION_PENDING</p>
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
              className="absolute inset-0 bg-[#050000]/95 backdrop-blur-xl"
              onClick={() => setShowSettings(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="w-full max-w-4xl h-[85vh] glass-panel-premium border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl relative z-10 flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-zinc-900 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">SYSTEM CONFIG</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ff1a1a] mt-2">USER_IDENTITY_AND_PROTOCOLS</p>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-4 bg-zinc-900 hover:bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] transition-all cursor-pointer group"
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
                    <div className="w-1 h-8 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]" />
                    <h3 className="text-xl font-black uppercase tracking-[0.2em]">01_BIOMETRIC_DATA</h3>
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-12 items-start">
                    {/* PFP Change */}
                    <div className="relative group">
                      <div className="w-48 h-48 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl overflow-hidden bg-zinc-900 relative">
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
                            <div className="w-10 h-10 border-2 border-[#ff1a1a] border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 flex flex-col gap-2">
                        <label className="flex items-center justify-center gap-2 py-3 bg-zinc-900 text-white font-black uppercase tracking-widest text-[9px] border border-white/10 rounded-3xl border-zinc-800 hover:border-[#ff1a1a] transition-all cursor-pointer">
                          <input type="file" className="hidden" accept="image/*" onChange={handlePFPChange} disabled={isUploadingPFP} />
                          <Upload className="w-3 h-3" /> UPLOAD NEW
                        </label>
                        {data.profile.avatarUrl && (
                          <button 
                            onClick={handleRemovePFP}
                            className="flex items-center justify-center gap-2 py-3 bg-transparent text-[#ff1a1a] font-black uppercase tracking-widest text-[9px] border border-white/10 rounded-3xl border-brand-red-deep hover:bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] hover:text-white transition-all cursor-pointer"
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
                            className={`w-full bg-zinc-950 text-white font-black text-2xl px-8 py-5 border-2 outline-none transition-all uppercase clip-brutal-tl ${
                              usernameStatus === "available" ? "border-green-500" : 
                              usernameStatus === "taken" || usernameStatus === "invalid" ? "border-[#ff1a1a]" : "border-zinc-800"
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
                              {usernameStatus === "taken" && <span className="text-[#ff1a1a]">TAKEN</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Password Update */}
                      <div className="flex flex-col gap-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Update Access Code</label>
                        <input 
                          type="password" 
                          className={`w-full bg-zinc-950 text-white font-black text-2xl px-8 py-5 border-2 outline-none transition-all uppercase clip-brutal-br ${
                            newPassword && !validatePassword(newPassword) ? "border-[#ff1a1a]" : 
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
                    <div className="w-1 h-8 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]" />
                    <h3 className="text-xl font-black uppercase tracking-[0.2em]">02_PROFESSIONAL_PREFS</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Objective Selection */}
                    <div className="flex flex-col gap-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Primary Objective</label>
                      <div className="grid grid-cols-2 gap-3">
                        {DESIRE_LIST.map((opt: string) => (
                          <button
                            key={opt}
                            onClick={() => setPrefDesire(opt)}
                            className={`p-4 text-[10px] font-black uppercase tracking-widest border border-white/10 rounded-3xl transition-all text-center ${
                              prefDesire === opt ? 'bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] text-white border-[#ff1a1a]' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600'
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
                        {LANGUAGES_LIST.map((lang: string) => {
                          const isSelected = prefLanguages.includes(lang);
                          return (
                            <button
                              key={lang}
                              onClick={() => {
                                setPrefLanguages(prev => 
                                  prev.includes(lang) ? prev.filter((l: string) => l !== lang) : [...prev, lang]
                                );
                              }}
                              className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest border border-white/10 rounded-3xl transition-all ${
                                isSelected ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-zinc-900 text-zinc-600 border-zinc-800 hover:border-zinc-700'
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
                        {PERSONALITIES_LIST.map((arch: string) => {
                          const isSelected = prefArchetypes.includes(arch);
                          return (
                            <button
                              key={arch}
                              onClick={() => {
                                setPrefArchetypes(prev => 
                                  prev.includes(arch) ? prev.filter((a: string) => a !== arch) : [...prev, arch]
                                );
                              }}
                              className={`px-5 py-3 text-[10px] font-black uppercase tracking-widest border border-white/10 rounded-3xl transition-all ${
                                isSelected ? 'bg-[#8a0303]/20 text-white border-[#ff1a1a]' : 'bg-zinc-900 text-zinc-600 border-zinc-800 hover:border-zinc-700'
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
                        {AVAILABILITY_LABELS.map((label: string) => (
                          <button
                            key={label}
                            onClick={() => setPrefAvailability(label)}
                            className={`w-full p-5 text-[10px] font-black uppercase tracking-widest border border-white/10 rounded-3xl transition-all text-left flex items-center justify-between ${
                              prefAvailability === label ? 'bg-white/5 border-[#ff1a1a] text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700'
                            }`}
                          >
                            {label}
                            {prefAvailability === label && <Check className="w-4 h-4 text-[#ff1a1a]" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 3: Geographic Parameters */}
                <section>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-1 h-8 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303]" />
                    <h3 className="text-xl font-black uppercase tracking-[0.2em]">03_LOC_COORDINATES</h3>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Deployment Base (City, State, Country)</label>
                    <input 
                      type="text" 
                      className="w-full bg-zinc-950 text-white font-black text-2xl px-8 py-5 border-2 border-zinc-800 outline-none focus:border-[#ff1a1a] transition-all uppercase clip-brutal-tl"
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
                  className="flex-1 py-8 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] text-white font-black text-3xl uppercase tracking-tighter hover:bg-white hover:text-black transition-all shadow-[0_0_30px_rgba(255,26,26,0.3)] hover:shadow-[0_0_50px_rgba(255,26,26,0.5)] disabled:opacity-20 cursor-pointer"
                >
                  {settingsLoading ? "PROCESSING..." : "UPDATE HUD PROTOCOLS"}
                </button>
                <button 
                  onClick={handleLogout}
                  className="px-10 py-8 glass-panel-premium border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl text-[#ff1a1a] font-black text-xs uppercase tracking-widest hover:bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-3"
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
              className="absolute inset-0 bg-[#050000]/95 backdrop-blur-2xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-2xl aspect-square glass-panel-premium border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl relative z-10 flex flex-col"
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
                    className="flex-1 py-5 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] text-white font-black text-sm uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-[0_0_30px_rgba(255,26,26,0.3)] hover:shadow-[0_0_50px_rgba(255,26,26,0.5)] disabled:opacity-50"
                  >
                    {isUploadingPFP ? "PROCESSING..." : "FINALIZE BIOMETRIC CROP"}
                  </button>
                  <button 
                    onClick={() => setShowCropModal(false)}
                    className="px-8 py-5 border-2 border-zinc-800 text-zinc-500 font-black text-sm uppercase tracking-widest hover:border-[#ff1a1a] hover:text-white transition-all"
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
