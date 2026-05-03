"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import ISO6391 from "iso-639-1";
import Cropper, { Area } from "react-easy-crop";
import { Country, State, City } from "country-state-city";
import getCroppedImg from "@/utils/cropImage";
import { uploadProfilePicture, ensureUserFolder, removeProfilePicture } from "@/app/actions/driveActions";
import { useEffect } from "react";

const STEPS = [
  "WELCOME",
  "DESIRE",
  "LANGUAGE",
  "PERSONALITY",
  "VISIBILITY",
  "EXPERIENCE",
  "AVAILABILITY",
  "LOCATION",
  "COMPLETE",
];

const LANGUAGES = ["MALAYALAM", "TAMIL", "HINDI", "TELUGU", "ENGLISH", "KANNADA"];
const PERSONALITIES = [
  { id: "INTENSE", label: "INTENSE", bg: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1000&auto=format&fit=crop" },
  { id: "FUNNY", label: "FUNNY", bg: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=1000&auto=format&fit=crop" },
  { id: "VILLAIN", label: "VILLAIN ENERGY", bg: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=1000&auto=format&fit=crop" },
  { id: "ROMANTIC", label: "ROMANTIC", bg: "https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?q=80&w=1000&auto=format&fit=crop" },
  { id: "VERSATILE", label: "VERSATILE", bg: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=1000&auto=format&fit=crop" },
  { id: "ACTION", label: "ACTION", bg: "https://images.unsplash.com/photo-1533928298208-27ff66555d8d?q=80&w=1000&auto=format&fit=crop" },
  { id: "INNOCENT", label: "INNOCENT", bg: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=1000&auto=format&fit=crop" },
  { id: "EMOTIONAL", label: "EMOTIONAL", bg: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1000&auto=format&fit=crop" },
];
const AVAILABILITY_LABELS = ["IMMEDIATELY", "THIS MONTH", "IN 3 MONTHS"];

export default function ActorOnboardingFlow() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);

  // State
  const [desire, setDesire] = useState<string | null>(null);
  const [languages, setLanguages] = useState<string[]>([]);
  const [personalities, setPersonalities] = useState<string[]>([]);
  const [experience, setExperience] = useState<string | null>(null);
  const [availability, setAvailability] = useState(0); // 0, 1, 2
  const [acquisition, setAcquisition] = useState("");
  const [otherObjective, setOtherObjective] = useState("");
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null);

  // Advanced State
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const [countryCode, setCountryCode] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [locationValue, setLocationValue] = useState("");

  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Profile Strength Calculation
  const totalFields = 27; // 7 from onboarding + 20 future fields
  const fieldsCompleted = useMemo(() => {
    let count = 0;
    if (desire) count++;
    if (languages.length > 0) count++;
    if (personalities.length > 0) count++;
    if (previewUrl) count++;
    if (experience) count++;
    if (availability !== null) count++;
    if (locationValue) count++;
    return count;
  }, [desire, languages, personalities, previewUrl, experience, availability, locationValue]);

  const profileStrength = Math.round((fieldsCompleted / totalFields) * 100);

  // Background Initialization: Ensure role and Drive folder exist without blocking UI
  useEffect(() => {
    const initializeUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if already finished
      const { data: profile } = await supabase
        .from('profiles')
        .select('status, role')
        .eq('id', user.id)
        .single();

      if (profile?.status === 'VERIFIED') {
        router.push('/dashboard');
        return;
      }

      // 1. Update role if not already set (for zero-lag transition)
      if (!profile?.role) {
        await supabase
          .from('profiles')
          .update({ role: 'ACTOR' })
          .eq('id', user.id);
      }

      // 2. Ensure Google Drive folder exists in background
      try {
        await ensureUserFolder();
      } catch (e) {
        console.error("MM8_ONBOARDING_BG_INIT_FAILURE:", e);
      }
    };
    initializeUser();

    // 3. Geolocation Detection
    const detectLocation = async () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            // Add User-Agent as required by Nominatim terms
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`, {
              headers: { 'User-Agent': 'MM8-Talent-Platform' }
            });
            const data = await res.json();
            
            if (data.address) {
              const detectedCity = data.address.city || data.address.town || data.address.village || "";
              const detectedState = data.address.state || "";
              const detectedCountry = data.address.country || "";

              // 1. Match Country
              const matchedCountry = Country.getAllCountries().find(c => 
                c.name.toLowerCase() === detectedCountry.toLowerCase()
              );

              if (matchedCountry) {
                setCountryCode(matchedCountry.isoCode);

                // 2. Match State
                const states = State.getStatesOfCountry(matchedCountry.isoCode);
                const matchedState = states.find(s => 
                  s.name.toLowerCase().includes(detectedState.toLowerCase()) || 
                  detectedState.toLowerCase().includes(s.name.toLowerCase())
                );

                if (matchedState) {
                  setStateCode(matchedState.isoCode);

                  // 3. Match City
                  const cities = City.getCitiesOfState(matchedCountry.isoCode, matchedState.isoCode);
                  const matchedCity = cities.find(c => 
                    c.name.toLowerCase().includes(detectedCity.toLowerCase()) ||
                    detectedCity.toLowerCase().includes(c.name.toLowerCase())
                  );

                  if (matchedCity) {
                    setCityCode(matchedCity.name);
                    const locStr = [matchedCity.name, matchedState.name, matchedCountry.name].join(", ").toUpperCase();
                    setLocationValue(locStr);
                  } else {
                    // Fallback to detected city if no exact match in DB
                    setCityCode(detectedCity);
                    const locStr = [detectedCity, matchedState.name, matchedCountry.name].join(", ").toUpperCase();
                    setLocationValue(locStr);
                  }
                }
              }
            }
          } catch (e) { console.warn("LOC_RESOLUTION_FAILED", e); }
        });
      }
    };
    detectLocation();
  }, []);

  const nextStep = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((prev) => prev + 1);
    } else {
      finalizeProfile();
    }
  };
  
  const prevStep = () => {
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
    } else {
      router.push("/onboarding/role");
    }
  };

  const finalizeProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const profileUpdate: any = {
        role: 'ACTOR',
        objective_preference: desire,
        languages: languages,
        archetypes: personalities,
        experience: experience,
        opportunity_readiness: AVAILABILITY_LABELS[availability],
        location: locationValue,
        acquisition_source: acquisition,
        status: 'VERIFIED'
      };

      // Only update user_drive if it's already finished or we have no file to upload
      if (uploadedFilePath || !file) {
        profileUpdate.user_drive = uploadedFilePath || 'NONE';
      }

      const { error } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id);

      if (error) throw error;
      setStepIndex(STEPS.length - 1); // Move to COMPLETE step
    } catch (e) {
      console.error("MM8_FINALIZE_FAILURE:", e);
      setStepIndex(STEPS.length - 1);
    }
  };

  const handleLanguageToggle = (lang: string) => {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      setIsCropping(true);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      setIsCropping(true);
    }
  };

  const updateLocationValue = (city?: string, state?: string, country?: string) => {
    const parts = [
      city || City.getAllCities().find(c => c.name === cityCode)?.name,
      state || State.getStateByCodeAndCountry(stateCode, countryCode)?.name,
      country || Country.getCountryByCode(countryCode)?.name
    ].filter(Boolean);
    setLocationValue(parts.join(", ").toUpperCase());
  };

  const uploadPhoto = () => {
    if (!file) {
      nextStep();
      return;
    }

    // Prevent double upload of same file
    if (file === lastUploadedFile || isUploadingBackground) {
      nextStep();
      return;
    }

    setIsUploadingBackground(true);
    setLastUploadedFile(file);

    const processUpload = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const formData = new FormData();
        formData.append('file', file);
        
        const driveUrl = await uploadProfilePicture(formData);
        if (driveUrl) {
          setUploadedFilePath(driveUrl);
          await supabase
            .from('profiles')
            .update({ user_drive: driveUrl })
            .eq('id', user.id);
        }
      } catch (e) {
        console.error("MM8_BG_UPLOAD_FAILURE:", e);
      } finally {
        setIsUploadingBackground(false);
      }
    };

    processUpload();
    nextStep();
  };

  const handleRemovePhoto = () => {
    // Clear UI state instantly
    setFile(null);
    setPreviewUrl(null);
    setUploadedFilePath(null);
    setLastUploadedFile(null);

    // Process deletion in background
    const processDeletion = async () => {
      try {
        await removeProfilePicture();
      } catch (e) {
        console.error("MM8_BG_REMOVE_PFP_FAILURE:", e);
      }
    };
    processDeletion();
  };

  const handleConfirmCrop = async () => {
    if (!previewUrl || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(previewUrl, croppedAreaPixels);
      if (croppedBlob) {
        const croppedFile = new File([croppedBlob], file?.name || 'profile.jpg', { type: 'image/jpeg' });
        setFile(croppedFile);
        setPreviewUrl(URL.createObjectURL(croppedBlob));
        setIsCropping(false);
      }
    } catch (e) {
      console.error("MM8_CROP_ERROR:", e);
      setIsCropping(false);
    }
  };

  const progress = (stepIndex / (STEPS.length - 1)) * 100;

  return (
    <main className="min-h-screen bg-[#050000] text-white flex flex-col relative overflow-hidden">
      
      <button 
        onClick={prevStep}
        className="absolute top-8 left-8 md:top-12 md:left-16 z-20 flex items-center gap-2 text-zinc-500 hover:text-white font-black uppercase tracking-widest text-xs transition-colors group cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        {stepIndex === 0 ? "BACK TO ROLE" : "PREVIOUS STEP"}
      </button>

      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-2 bg-zinc-900 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] shadow-[0_0_20px_rgba(255,49,49,0.5)]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "circOut" }}
        />
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full px-6 py-20 mt-8 relative z-10">
        <AnimatePresence mode="wait">
          
          {STEPS[stepIndex] === "WELCOME" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-start"
            >
              <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-none mb-8">
                PROFILE<br /><span className="gradient-text-blood">CREATION</span>
              </h1>
              
              <div className="border-l-4 border-[#ff1a1a] pl-6 py-2 mb-12">
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-lg md:text-xl italic">
                  "You are 6 steps away from being discoverable."
                </p>
                <p className="text-white font-black uppercase tracking-[0.3em] text-sm md:text-base mt-4">
                  Create your profile in under 60 seconds
                </p>
              </div>

              <button
                onClick={nextStep}
                className="group relative px-12 py-8 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] text-white font-black text-3xl md:text-5xl uppercase tracking-tighter hover:bg-white hover:text-black transition-all duration-500 shadow-[0_0_50px_rgba(255,49,49,0.3)] rounded-full cursor-pointer"
              >
                START NOW
              </button>
            </motion.div>
          )}

          {STEPS[stepIndex] === "DESIRE" && (
            <motion.div
              key="desire"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex flex-col gap-8 w-full"
            >
              <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none">
                WHAT DO YOU WANT MOST<br /><span className="gradient-text-blood">RIGHT NOW?</span>
              </h2>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs max-w-2xl border-l-4 border-brand-red-dark pl-4">
                Choose the opportunities that match your current ambition. This helps us surface roles aligned with where you want to rise next.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {["FIRST BREAK", "LEAD ROLES", "OTT DEBUT", "COMMERCIALS", "SIDE ROLES", "BUILD PROFILES", "EARN INCOME", "OTHERS"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { 
                      if (opt === "OTHERS") {
                        setShowOtherInput(true);
                        setDesire(opt);
                      } else {
                        setShowOtherInput(false);
                        setDesire(opt); 
                        nextStep(); 
                      }
                    }}
                    className={`p-10 glass-panel-premium border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl text-left hover:border-[#ff1a1a] transition-all duration-300 group cursor-pointer ${desire === opt ? 'bg-[#8a0303]/20 border-[#ff1a1a]' : ''}`}
                  >
                    <span className="text-3xl font-black uppercase tracking-tighter group-hover:gradient-text-blood transition-colors">{opt}</span>
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {showOtherInput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4"
                  >
                    <input 
                      type="text"
                      placeholder="DESCRIBE YOUR GOAL..."
                      className="w-full bg-zinc-950 text-white font-black text-3xl px-8 py-10 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl outline-none focus:border-[#ff1a1a] transition-all placeholder:text-zinc-800 uppercase"
                      value={otherObjective}
                      onChange={(e) => setOtherObjective(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && otherObjective && nextStep()}
                    />
                    <button 
                      disabled={!otherObjective}
                      onClick={nextStep}
                      className="mt-4 w-full py-6 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] text-white font-black uppercase tracking-widest text-sm hover:bg-white hover:text-black transition-all cursor-pointer disabled:opacity-30"
                    >
                      CONFIRM GOAL
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {STEPS[stepIndex] === "LANGUAGE" && (
            <motion.div
              key="language"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex flex-col gap-8 w-full"
            >
              <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none">
                WHICH LANGUAGES CAN YOU<br /><span className="gradient-text-blood">PERFORM IN?</span>
              </h2>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs max-w-2xl border-l-4 border-brand-red-dark pl-4">
                Select every language you can confidently speak or perform in. This helps match you with roles, scripts, and markets where you can deliver naturally on screen.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 relative">
                {["MALAYALAM", "TAMIL", "HINDI", "TELUGU", "KANNADA"].map((lang) => {
                  const isSelected = languages.includes(lang);
                  return (
                    <button
                      key={lang}
                      onClick={() => handleLanguageToggle(lang)}
                      className={`p-6 border border-white/10 rounded-3xl transition-all duration-300 text-left cursor-pointer ${isSelected ? 'border-[#ff1a1a] bg-[#8a0303]/20 text-white shadow-[0_0_15px_rgba(255,49,49,0.3)]' : 'border-zinc-800 text-zinc-500 hover:border-zinc-400'}`}
                    >
                      <span className="text-2xl font-black uppercase tracking-tighter">{lang}</span>
                    </button>
                  );
                })}

                {languages.filter(l => !["MALAYALAM", "TAMIL", "HINDI", "TELUGU", "KANNADA"].includes(l)).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageToggle(lang)}
                    className="p-6 border border-white/10 rounded-3xl border-[#ff1a1a] bg-[#8a0303]/20 text-white shadow-[0_0_15px_rgba(255,49,49,0.3)] transition-all duration-300 text-left cursor-pointer"
                  >
                    <span className="text-2xl font-black uppercase tracking-tighter">{lang}</span>
                  </button>
                ))}
                
                <div className="relative">
                  <button
                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                    className="w-full p-6 border border-white/10 rounded-3xl border-zinc-800 text-zinc-500 hover:border-[#ff1a1a] hover:gradient-text-blood transition-all duration-300 text-left cursor-pointer"
                  >
                    <span className="text-2xl font-black uppercase tracking-tighter">OTHERS +</span>
                  </button>
                  
                  <AnimatePresence>
                    {showLanguageDropdown && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        data-lenis-prevent
                        className="absolute top-full left-0 w-full max-h-[300px] overflow-y-auto bg-[#050000] border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl z-[100] mt-2 p-2 hide-scrollbar"
                      >
                        {ISO6391.getAllNames().map((name) => (
                          <button
                            key={name}
                            onClick={() => {
                              if (!languages.includes(name.toUpperCase())) {
                                setLanguages(prev => [...prev, name.toUpperCase()]);
                              }
                              setShowLanguageDropdown(false);
                            }}
                            className="w-full p-4 text-left hover:bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] hover:text-white font-black uppercase text-xs tracking-widest transition-colors cursor-pointer"
                          >
                            {name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              <button
                disabled={languages.length === 0}
                onClick={nextStep}
                className="mt-8 px-10 py-6 bg-white text-black font-black text-2xl uppercase tracking-tighter disabled:opacity-30 hover:bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] hover:text-white transition-all border border-white/10 rounded-3xl cursor-pointer"
              >
                CONFIRM SELECTION
              </button>
            </motion.div>
          )}

          {STEPS[stepIndex] === "PERSONALITY" && (
            <motion.div
              key="personality"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex flex-col gap-8 w-full"
            >
              <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none">
                WHAT DESCRIBES YOU<br /><span className="gradient-text-blood">BEST?</span>
              </h2>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs max-w-2xl border-l-4 border-brand-red-dark pl-4">
                Select the three archetypes you embody most naturally. This helps us match you to roles where your presence feels authentic, powerful, and instantly believable.
              </p>
              
              <div className="flex-1 w-full overflow-x-auto snap-x snap-mandatory flex md:grid md:grid-cols-4 gap-6 pb-12 hide-scrollbar">
                {PERSONALITIES.map((opt) => {
                  const isSelected = personalities.includes(opt.label);
                  const isMax = personalities.length >= 3;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        if (isSelected) {
                          setPersonalities(prev => prev.filter(p => p !== opt.label));
                        } else if (!isMax) {
                          setPersonalities(prev => [...prev, opt.label]);
                        }
                      }}
                      className={`snap-center shrink-0 w-[280px] md:w-auto h-[400px] md:h-[500px] glass-panel-premium border border-white/10 rounded-3xl overflow-hidden relative flex flex-col justify-end p-8 text-left transition-all duration-500 group cursor-pointer ${isSelected ? 'border-[#ff1a1a] shadow-[0_0_30px_rgba(255,49,49,0.4)]' : 'border-zinc-800 hover:border-zinc-500'}`}
                    >
                      {/* Cinematic Background */}
                      <div className="absolute inset-0 z-0">
                        <img 
                          src={opt.bg} 
                          alt={opt.label} 
                          className={`w-full h-full object-cover transition-all duration-700 ${isSelected ? 'grayscale-0 scale-110' : 'grayscale opacity-30 group-hover:opacity-60 group-hover:grayscale-0'}`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                      </div>

                      <div className="relative z-10">
                        <div className={`w-8 h-1 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] mb-4 transition-all duration-500 ${isSelected ? 'w-full' : 'w-0 group-hover:w-12'}`} />
                        <span className={`text-3xl font-black uppercase tracking-tighter transition-colors ${isSelected ? 'text-white' : 'text-zinc-500 group-hover:text-white'}`}>
                          {opt.label}
                        </span>
                      </div>
                      
                      {isSelected && (
                        <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] flex items-center justify-center text-white font-black text-xs animate-in zoom-in duration-300">
                          {personalities.indexOf(opt.label) + 1}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              
              <button
                disabled={personalities.length === 0}
                onClick={nextStep}
                className="mt-8 px-10 py-6 bg-white text-black font-black text-2xl uppercase tracking-tighter disabled:opacity-30 hover:bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] hover:text-white transition-all border border-white/10 rounded-3xl cursor-pointer"
              >
                CONFIRM ARCHETYPES ({personalities.length}/3)
              </button>
            </motion.div>
          )}

          {STEPS[stepIndex] === "VISIBILITY" && (
            <motion.div
              key="visibility"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex flex-col gap-8 w-full"
            >
              <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
                DROP 1 PHOTO TO GET<br /><span className="gradient-text-blood">3X MORE VISIBILITY</span>
              </h2>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs max-w-2xl border-l-4 border-brand-red-dark pl-4">
                Upload a clear profile photo that captures your natural presence. First impressions matter — this helps casting teams see you instantly.
              </p>
              
              <div 
                data-lenis-prevent
                className="relative w-full aspect-square max-w-[500px] mx-auto border border-white/10 rounded-3xl overflow-hidden bg-zinc-950/50"
              >
                {isCropping && previewUrl ? (
                  <div className="relative w-full h-full">
                    <Cropper
                      image={previewUrl}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      cropShape="round"
                      showGrid={false}
                      onCropChange={setCrop}
                      onCropComplete={onCropComplete}
                      onZoomChange={setZoom}
                    />
                    
                    <button 
                      type="button"
                      onClick={handleConfirmCrop}
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 px-10 py-4 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] text-white font-black uppercase text-sm tracking-[0.2em] shadow-[0_0_30px_rgba(255,26,26,0.3)] hover:shadow-[0_0_50px_rgba(255,26,26,0.5)] hover:bg-white hover:text-black transition-all cursor-pointer"
                    >
                      CONFIRM CROP
                    </button>
                  </div>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer group">
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    {previewUrl ? (
                      <div className="relative w-full h-full">
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" />
                        <div 
                          onClick={() => setIsCropping(true)}
                          className="absolute inset-0 flex items-center justify-center bg-[#050000]/60 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="text-white font-black uppercase text-xs tracking-widest">ADJUST CROP</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-zinc-700 font-black text-4xl uppercase tracking-tighter z-10 text-center px-8">
                        UPLOAD YOUR IMAGE
                      </div>
                    )}
                  </label>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <button
                  type="button"
                  onClick={uploadPhoto}
                  disabled={uploading || !file || isCropping}
                  className="flex-1 px-8 py-8 bg-brand-red-dark text-white font-black text-3xl uppercase tracking-tighter disabled:opacity-20 transition-all hover:bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] cursor-pointer"
                >
                  {uploading || isUploadingBackground ? "PROCESSING..." : "ADD IMAGE"}
                </button>
                {file && !uploading && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-8 py-8 glass-panel-premium border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl gradient-text-blood font-black text-xl uppercase tracking-tighter hover:bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] hover:text-white transition-all cursor-pointer"
                  >
                    REMOVE
                  </button>
                )}
                {!file && (
                  <button
                    onClick={nextStep}
                    className="px-8 py-8 glass-panel-premium border border-white/10 rounded-3xl text-zinc-500 font-black text-xl uppercase tracking-tighter hover:text-white hover:border-white transition-all cursor-pointer"
                  >
                    CONTINUE ANONYMOUSLY
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {STEPS[stepIndex] === "EXPERIENCE" && (
            <motion.div
              key="experience"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex flex-col gap-8 w-full"
            >
              <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none">
                HAVE YOU<br /><span className="gradient-text-blood">ACTED BEFORE?</span>
              </h2>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs max-w-2xl border-l-4 border-brand-red-dark pl-4">
                Tell us where you are in your journey. Whether beginner or seasoned, we’ll tailor opportunities to match your current level and next leap.
              </p>
              <div className="flex flex-col gap-6">
                {["ON SCREEN", "ON STAGE", "SOCIAL MEDIA", "JUST STARTING"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setExperience(opt); nextStep(); }}
                    className="p-10 glass-panel-premium border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl text-left hover:border-[#ff1a1a] hover:bg-[#8a0303]/20/20 transition-all group cursor-pointer"
                  >
                    <span className="text-4xl font-black uppercase tracking-tighter group-hover:gradient-text-blood transition-colors">{opt}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {STEPS[stepIndex] === "AVAILABILITY" && (
            <motion.div
              key="availability"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="flex flex-col gap-12 w-full"
            >
              <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none">
                READY FOR<br /><span className="gradient-text-blood">WORK?</span>
              </h2>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs max-w-2xl border-l-4 border-brand-red-dark pl-4">
                Let us know when you’re ready to move. We’ll prioritize opportunities that match your ideal timeline.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {AVAILABILITY_LABELS.map((label, i) => (
                  <button
                    key={label}
                    onClick={() => setAvailability(i)}
                    className={`p-10 glass-panel-premium border border-white/10 rounded-3xl transition-all duration-300 text-center group cursor-pointer ${availability === i ? 'border-[#ff1a1a] bg-[#8a0303]/20 shadow-[0_0_20px_rgba(255,49,49,0.3)]' : 'border-zinc-800 hover:border-zinc-500'}`}
                  >
                    <span className={`text-2xl font-black uppercase tracking-tighter transition-colors ${availability === i ? 'text-white' : 'text-zinc-600 group-hover:text-white'}`}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={nextStep}
                className="mt-8 px-12 py-8 bg-brand-red-dark text-white font-black text-3xl uppercase tracking-tighter hover:bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] transition-all border border-white/10 rounded-3xl cursor-pointer"
              >
                CONTINUE
              </button>
            </motion.div>
          )}

          {STEPS[stepIndex] === "LOCATION" && (
            <motion.div
              key="location"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex flex-col gap-8 w-full"
            >
              <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none">
                FINAL<br /><span className="gradient-text-blood">STEPS</span>
              </h2>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs max-w-2xl border-l-4 border-brand-red-dark pl-4">
                You’re one step away from entering the network. Complete access now to unlock opportunities aligned with your profile, timing, and potential.
              </p>
              
              <div className="flex flex-col gap-8">
                {/* Cascading Dropdowns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                  
                  {/* Country Selection */}
                  <div className="flex flex-col gap-2 relative">
                    <label className="gradient-text-blood font-black uppercase tracking-widest text-[10px]">Country</label>
                    <button 
                      onClick={() => {
                        setShowCountryDropdown(!showCountryDropdown);
                        setShowStateDropdown(false);
                        setShowCityDropdown(false);
                      }}
                      className="w-full bg-zinc-950/50 text-white font-black px-6 py-5 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl outline-none text-left uppercase text-sm hover:border-[#ff1a1a] transition-colors flex justify-between items-center cursor-pointer"
                    >
                      <span>{countryCode ? Country.getCountryByCode(countryCode)?.name.toUpperCase() : "SELECT COUNTRY"}</span>
                      <svg className={`w-4 h-4 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    
                    <AnimatePresence>
                      {showCountryDropdown && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          data-lenis-prevent
                          className="absolute top-full left-0 w-full max-h-[300px] overflow-y-auto bg-[#050000] border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl z-[100] mt-2 p-2 hide-scrollbar"
                        >
                          {Country.getAllCountries().map(c => (
                            <button
                              key={c.isoCode}
                              onClick={() => {
                                setCountryCode(c.isoCode);
                                setStateCode("");
                                setCityCode("");
                                updateLocationValue("", "", c.isoCode);
                                setShowCountryDropdown(false);
                              }}
                              className="w-full p-4 text-left hover:bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] hover:text-white font-black uppercase text-xs tracking-widest transition-colors cursor-pointer"
                            >
                              {c.name}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* State Selection */}
                  <div className="flex flex-col gap-2 relative">
                    <label className="gradient-text-blood font-black uppercase tracking-widest text-[10px]">State</label>
                    <button 
                      disabled={!countryCode}
                      onClick={() => {
                        setShowStateDropdown(!showStateDropdown);
                        setShowCountryDropdown(false);
                        setShowCityDropdown(false);
                      }}
                      className="w-full bg-zinc-950/50 text-white font-black px-6 py-5 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl outline-none text-left uppercase text-sm hover:border-[#ff1a1a] transition-colors flex justify-between items-center disabled:opacity-20 cursor-pointer"
                    >
                      <span>{stateCode ? State.getStateByCodeAndCountry(stateCode, countryCode)?.name.toUpperCase() : "SELECT STATE"}</span>
                      <svg className={`w-4 h-4 transition-transform ${showStateDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    
                    <AnimatePresence>
                      {showStateDropdown && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          data-lenis-prevent
                          className="absolute top-full left-0 w-full max-h-[300px] overflow-y-auto bg-[#050000] border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl z-[100] mt-2 p-2 hide-scrollbar"
                        >
                          {State.getStatesOfCountry(countryCode).map(s => (
                            <button
                              key={s.isoCode}
                              onClick={() => {
                                setStateCode(s.isoCode);
                                setCityCode("");
                                updateLocationValue("", s.isoCode);
                                setShowStateDropdown(false);
                              }}
                              className="w-full p-4 text-left hover:bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] hover:text-white font-black uppercase text-xs tracking-widest transition-colors cursor-pointer"
                            >
                              {s.name}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* City Selection */}
                  <div className="flex flex-col gap-2 relative">
                    <label className="gradient-text-blood font-black uppercase tracking-widest text-[10px]">District/City</label>
                    <button 
                      disabled={!stateCode}
                      onClick={() => {
                        setShowCityDropdown(!showCityDropdown);
                        setShowCountryDropdown(false);
                        setShowStateDropdown(false);
                      }}
                      className="w-full bg-zinc-950/50 text-white font-black px-6 py-5 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl outline-none text-left uppercase text-sm hover:border-[#ff1a1a] transition-colors flex justify-between items-center disabled:opacity-20 cursor-pointer"
                    >
                      <span>{cityCode ? cityCode.toUpperCase() : "SELECT CITY"}</span>
                      <svg className={`w-4 h-4 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    
                    <AnimatePresence>
                      {showCityDropdown && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          data-lenis-prevent
                          className="absolute top-full left-0 w-full max-h-[300px] overflow-y-auto bg-[#050000] border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl z-[100] mt-2 p-2 hide-scrollbar"
                        >
                          {City.getCitiesOfState(countryCode, stateCode).map(c => (
                            <button
                              key={c.name}
                              onClick={() => {
                                setCityCode(c.name);
                                updateLocationValue(c.name);
                                setShowCityDropdown(false);
                              }}
                              className="w-full p-4 text-left hover:bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] hover:text-white font-black uppercase text-xs tracking-widest transition-colors cursor-pointer"
                            >
                              {c.name}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 mt-8">
                <label className="text-zinc-500 font-black uppercase tracking-widest text-xs">How did you hear about MM8?</label>
                <input 
                  type="text" 
                  value={acquisition}
                  onChange={(e) => setAcquisition(e.target.value)}
                  placeholder="INSTAGRAM, FRIEND, TALENT AGENT, ETC." 
                  className="w-full bg-zinc-950/50 text-white font-black text-4xl px-8 py-10 border border-[#ff1a1a]/30 shadow-[0_0_15px_rgba(255,26,26,0.1)] rounded-3xl outline-none focus:border-[#ff1a1a] transition-all placeholder:text-zinc-800 uppercase"
                />
              </div>

              <button
                onClick={nextStep}
                disabled={!locationValue || !acquisition.trim()}
                className="mt-12 w-full px-12 py-10 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] text-white font-black text-5xl md:text-7xl uppercase tracking-tighter hover:bg-white hover:text-black transition-all shadow-[0_0_30px_rgba(255,26,26,0.3)] hover:shadow-[0_0_50px_rgba(255,26,26,0.5)] disabled:opacity-20 cursor-pointer"
              >
                FINALIZE PROFILE
              </button>
            </motion.div>
          )}

          {STEPS[stepIndex] === "COMPLETE" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center gap-12"
            >
              <div className="w-48 h-48 bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(255,49,49,0.5)]">
                <CheckCircle2 className="w-24 h-24 text-white" />
              </div>
              
              <div>
                <h2 className="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-none mb-6">
                  PROFILE<br /><span className="gradient-text-blood">INITIALIZED</span>
                </h2>
                
                <div className="flex flex-col items-center gap-4 mt-8">
                  <div className="flex items-baseline gap-4">
                    <span className="text-zinc-500 font-black uppercase tracking-widest text-xl">PROFILE STRENGTH</span>
                    <span className="text-6xl md:text-8xl font-black text-white tabular-nums">
                      {profileStrength}<span className="gradient-text-blood text-4xl">%</span>
                    </span>
                  </div>
                  <div className="w-full max-w-md h-2 bg-zinc-900 overflow-hidden border border-white/10 rounded-3xl border-zinc-800">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${profileStrength}%` }}
                      className="h-full bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] shadow-[0_0_15px_rgba(255,49,49,0.5)]"
                    />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.4em] mt-4 italic text-center">
                    COMPLETE 20 MORE FIELDS IN SETTINGS TO REACH 100% & GET VERIFIED
                  </p>
                </div>
              </div>

              <button
                onClick={() => router.push("/dashboard")}
                className="group relative px-12 py-8 bg-white text-black font-black text-3xl md:text-5xl uppercase tracking-tighter hover:bg-gradient-to-r from-[#ff1a1a] to-[#8a0303] hover:text-white transition-all duration-500 shadow-[0_0_50px_rgba(255,255,255,0.1)] rounded-full cursor-pointer"
              >
                ENTER DASHBOARD
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  );
}
