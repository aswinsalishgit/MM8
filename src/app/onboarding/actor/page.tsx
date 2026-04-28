"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import BackgroundCanvas from "@/components/BackgroundCanvas";
import ISO6391 from "iso-639-1";
import Cropper, { Area } from "react-easy-crop";
import { Country, State, City } from "country-state-city";
import getCroppedImg from "@/utils/cropImage";
import { uploadProfilePicture } from "@/app/actions/driveActions";

const STEPS = [
  "WELCOME",
  "DESIRE",
  "LANGUAGE",
  "PERSONALITY",
  "VISIBILITY",
  "EXPERIENCE",
  "AVAILABILITY",
  "LOCATION",
];

const LANGUAGES = ["MALAYALAM", "TAMIL", "HINDI", "TELUGU", "ENGLISH", "KANNADA"];
const PERSONALITIES = ["INTENSE", "FUNNY", "VILLAIN ENERGY", "ROMANTIC", "EVERYDAY PRO", "ACTION DRIVEN"];
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
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);

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

      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'ACTOR',
          objective_preference: desire,
          languages: languages,
          archetypes: personalities,
          user_drive: uploadedFilePath || 'NONE', // Stores the Drive Link
          experience: experience,
          opportunity_readiness: AVAILABILITY_LABELS[availability],
          location: locationValue,
          acquisition_source: acquisition
        })
        .eq('id', user.id);

      if (error) throw error;
      router.push("/onboarding/complete");
    } catch (e) {
      console.error("MM8_FINALIZE_FAILURE:", e);
      // Fallback redirect even if DB update fails so user isn't stuck
      router.push("/onboarding/complete");
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

  const uploadPhoto = async () => {
    if (!file) {
      nextStep();
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const formData = new FormData();
      formData.append('file', file);
      
      const driveUrl = await uploadProfilePicture(formData);
      if (driveUrl) {
        setUploadedFilePath(driveUrl);
        // Immediate save to DB to prevent data loss on reload
        await supabase
          .from('profiles')
          .update({ user_drive: driveUrl })
          .eq('id', user.id);
      }
      nextStep();
    } catch (e) {
      console.error("MM8_DRIVE_UPLOAD_FAILURE:", e);
      alert("UPLOAD FAILED. PLEASE TRY AGAIN OR SKIP.");
      // nextStep(); // Don't skip automatically on failure to allow retry
    } finally {
      setUploading(false);
    }
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
    <main className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      <BackgroundCanvas />
      
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
          className="h-full bg-brand-red-neon shadow-[0_0_20px_rgba(255,49,49,0.5)]"
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
                PROFILE<br /><span className="text-brand-red-neon">CREATION</span>
              </h1>
              
              <div className="border-l-4 border-brand-red-neon pl-6 py-2 mb-12">
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-lg md:text-xl italic">
                  "Your Data is the key to bypassing the gatekeepers"
                </p>
                <p className="text-white font-black uppercase tracking-[0.3em] text-sm md:text-base mt-4">
                  Create your profile in under 60 seconds
                </p>
              </div>

              <button
                onClick={nextStep}
                className="group relative px-12 py-8 bg-brand-red-neon text-white font-black text-3xl md:text-5xl uppercase tracking-tighter hover:bg-white hover:text-black transition-all duration-500 shadow-[0_0_50px_rgba(255,49,49,0.3)] clip-brutal-hero-primary cursor-pointer"
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
                OBJECTIVE<br /><span className="text-brand-red-neon">PREFERENCE</span>
              </h2>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs max-w-2xl border-l-4 border-brand-red-dark pl-4">
                Choose the opportunities that match your current ambition. This helps us surface roles aligned with where you want to rise next.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {["FIRST BREAK", "LEAD ROLES", "OTT DEBUT", "COMMERCIALS"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setDesire(opt); nextStep(); }}
                    className="p-10 glass-panel brutal-border-red text-left hover:border-brand-red-neon transition-all duration-300 group cursor-pointer"
                  >
                    <span className="text-3xl font-black uppercase tracking-tighter group-hover:text-brand-red-neon transition-colors">{opt}</span>
                  </button>
                ))}
              </div>
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
                LANGUAGE<br /><span className="text-brand-red-neon">PREFERENCES</span>
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
                      className={`p-6 brutal-border transition-all duration-300 text-left cursor-pointer ${isSelected ? 'border-brand-red-neon bg-brand-red-deep text-white shadow-[0_0_15px_rgba(255,49,49,0.3)]' : 'border-zinc-800 text-zinc-500 hover:border-zinc-400'}`}
                    >
                      <span className="text-2xl font-black uppercase tracking-tighter">{lang}</span>
                    </button>
                  );
                })}

                {languages.filter(l => !["MALAYALAM", "TAMIL", "HINDI", "TELUGU", "KANNADA"].includes(l)).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageToggle(lang)}
                    className="p-6 brutal-border border-brand-red-neon bg-brand-red-deep text-white shadow-[0_0_15px_rgba(255,49,49,0.3)] transition-all duration-300 text-left cursor-pointer"
                  >
                    <span className="text-2xl font-black uppercase tracking-tighter">{lang}</span>
                  </button>
                ))}
                
                <div className="relative">
                  <button
                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                    className="w-full p-6 brutal-border border-zinc-800 text-zinc-500 hover:border-brand-red-neon hover:text-brand-red-neon transition-all duration-300 text-left cursor-pointer"
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
                        className="absolute top-full left-0 w-full max-h-[300px] overflow-y-auto bg-black brutal-border-red z-[100] mt-2 p-2 hide-scrollbar"
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
                            className="w-full p-4 text-left hover:bg-brand-red-neon hover:text-white font-black uppercase text-xs tracking-widest transition-colors cursor-pointer"
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
                className="mt-8 px-10 py-6 bg-white text-black font-black text-2xl uppercase tracking-tighter disabled:opacity-30 hover:bg-brand-red-neon hover:text-white transition-all brutal-border cursor-pointer"
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
                CORE<br /><span className="text-brand-red-neon">ARCHETYPE</span>
              </h2>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs max-w-2xl border-l-4 border-brand-red-dark pl-4">
                Select the three archetypes you embody most naturally. This helps us match you to roles where your presence feels authentic, powerful, and instantly believable.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {PERSONALITIES.map((opt) => {
                  const isSelected = personalities.includes(opt);
                  const isMax = personalities.length >= 3;
                  return (
                    <button
                      key={opt}
                      onClick={() => {
                        if (isSelected) {
                          setPersonalities(prev => prev.filter(p => p !== opt));
                        } else if (!isMax) {
                          setPersonalities(prev => [...prev, opt]);
                        }
                      }}
                      className={`p-10 glass-panel brutal-border transition-all duration-300 text-left group cursor-pointer ${isSelected ? 'border-brand-red-neon bg-brand-red-deep' : 'border-zinc-800 hover:border-zinc-400'}`}
                    >
                      <span className={`text-3xl font-black uppercase tracking-tighter transition-colors ${isSelected ? 'text-white' : 'text-zinc-500 group-hover:text-white'}`}>{opt}</span>
                    </button>
                  );
                })}
              </div>
              
              <button
                disabled={personalities.length === 0}
                onClick={nextStep}
                className="mt-8 px-10 py-6 bg-white text-black font-black text-2xl uppercase tracking-tighter disabled:opacity-30 hover:bg-brand-red-neon hover:text-white transition-all brutal-border cursor-pointer"
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
                UPLOAD<br /><span className="text-brand-red-neon">FACE</span>
              </h2>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs max-w-2xl border-l-4 border-brand-red-dark pl-4">
                Upload a clear profile photo that captures your natural presence. First impressions matter — this helps casting teams see you instantly.
              </p>
              
              <div 
                data-lenis-prevent
                className="relative w-full aspect-square max-w-[500px] mx-auto brutal-border overflow-hidden bg-zinc-950/50"
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
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 px-10 py-4 bg-brand-red-neon text-white font-black uppercase text-sm tracking-[0.2em] brutal-shadow hover:bg-white hover:text-black transition-all cursor-pointer"
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
                          className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
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
                  className="flex-1 px-8 py-8 bg-brand-red-dark text-white font-black text-3xl uppercase tracking-tighter disabled:opacity-20 transition-all hover:bg-brand-red-neon cursor-pointer"
                >
                  {uploading ? "UPLOADING..." : "ADD IMAGE"}
                </button>
                {!file && (
                  <button
                    onClick={nextStep}
                    className="px-8 py-8 glass-panel brutal-border text-zinc-500 font-black text-xl uppercase tracking-tighter hover:text-white hover:border-white transition-all cursor-pointer"
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
                YOUR<br /><span className="text-brand-red-neon">EXPERIENCE</span>
              </h2>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs max-w-2xl border-l-4 border-brand-red-dark pl-4">
                Tell us where you are in your journey. Whether beginner or seasoned, we’ll tailor opportunities to match your current level and next leap.
              </p>
              <div className="flex flex-col gap-6">
                {["YES (STAGE)", "YES (SCREEN)", "NO (RAW TALENT)"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setExperience(opt); nextStep(); }}
                    className="p-10 glass-panel brutal-border-red text-left hover:border-brand-red-neon hover:bg-brand-red-deep/20 transition-all group cursor-pointer"
                  >
                    <span className="text-4xl font-black uppercase tracking-tighter group-hover:text-brand-red-neon transition-colors">{opt}</span>
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
                OPPORTUNITY<br /><span className="text-brand-red-neon">READINESS</span>
              </h2>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs max-w-2xl border-l-4 border-brand-red-dark pl-4">
                Let us know when you’re ready to move. We’ll prioritize opportunities that match your ideal timeline.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {AVAILABILITY_LABELS.map((label, i) => (
                  <button
                    key={label}
                    onClick={() => setAvailability(i)}
                    className={`p-10 glass-panel brutal-border transition-all duration-300 text-center group cursor-pointer ${availability === i ? 'border-brand-red-neon bg-brand-red-deep shadow-[0_0_20px_rgba(255,49,49,0.3)]' : 'border-zinc-800 hover:border-zinc-500'}`}
                  >
                    <span className={`text-2xl font-black uppercase tracking-tighter transition-colors ${availability === i ? 'text-white' : 'text-zinc-600 group-hover:text-white'}`}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={nextStep}
                className="mt-8 px-12 py-8 bg-brand-red-dark text-white font-black text-3xl uppercase tracking-tighter hover:bg-brand-red-neon transition-all brutal-border cursor-pointer"
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
                FINAL<br /><span className="text-brand-red-neon">STEPS</span>
              </h2>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs max-w-2xl border-l-4 border-brand-red-dark pl-4">
                You’re one step away from entering the network. Complete access now to unlock opportunities aligned with your profile, timing, and potential.
              </p>
              
              <div className="flex flex-col gap-8">
                {/* Cascading Dropdowns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                  
                  {/* Country Selection */}
                  <div className="flex flex-col gap-2 relative">
                    <label className="text-brand-red-neon font-black uppercase tracking-widest text-[10px]">Country</label>
                    <button 
                      onClick={() => {
                        setShowCountryDropdown(!showCountryDropdown);
                        setShowStateDropdown(false);
                        setShowCityDropdown(false);
                      }}
                      className="w-full bg-zinc-950/50 text-white font-black px-6 py-5 brutal-border-red outline-none text-left uppercase text-sm hover:border-brand-red-neon transition-colors flex justify-between items-center cursor-pointer"
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
                          className="absolute top-full left-0 w-full max-h-[300px] overflow-y-auto bg-black brutal-border-red z-[100] mt-2 p-2 hide-scrollbar"
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
                              className="w-full p-4 text-left hover:bg-brand-red-neon hover:text-white font-black uppercase text-xs tracking-widest transition-colors cursor-pointer"
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
                    <label className="text-brand-red-neon font-black uppercase tracking-widest text-[10px]">State</label>
                    <button 
                      disabled={!countryCode}
                      onClick={() => {
                        setShowStateDropdown(!showStateDropdown);
                        setShowCountryDropdown(false);
                        setShowCityDropdown(false);
                      }}
                      className="w-full bg-zinc-950/50 text-white font-black px-6 py-5 brutal-border-red outline-none text-left uppercase text-sm hover:border-brand-red-neon transition-colors flex justify-between items-center disabled:opacity-20 cursor-pointer"
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
                          className="absolute top-full left-0 w-full max-h-[300px] overflow-y-auto bg-black brutal-border-red z-[100] mt-2 p-2 hide-scrollbar"
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
                              className="w-full p-4 text-left hover:bg-brand-red-neon hover:text-white font-black uppercase text-xs tracking-widest transition-colors cursor-pointer"
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
                    <label className="text-brand-red-neon font-black uppercase tracking-widest text-[10px]">District/City</label>
                    <button 
                      disabled={!stateCode}
                      onClick={() => {
                        setShowCityDropdown(!showCityDropdown);
                        setShowCountryDropdown(false);
                        setShowStateDropdown(false);
                      }}
                      className="w-full bg-zinc-950/50 text-white font-black px-6 py-5 brutal-border-red outline-none text-left uppercase text-sm hover:border-brand-red-neon transition-colors flex justify-between items-center disabled:opacity-20 cursor-pointer"
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
                          className="absolute top-full left-0 w-full max-h-[300px] overflow-y-auto bg-black brutal-border-red z-[100] mt-2 p-2 hide-scrollbar"
                        >
                          {City.getCitiesOfState(countryCode, stateCode).map(c => (
                            <button
                              key={c.name}
                              onClick={() => {
                                setCityCode(c.name);
                                updateLocationValue(c.name);
                                setShowCityDropdown(false);
                              }}
                              className="w-full p-4 text-left hover:bg-brand-red-neon hover:text-white font-black uppercase text-xs tracking-widest transition-colors cursor-pointer"
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
                  className="w-full bg-zinc-950/50 text-white font-black text-4xl px-8 py-10 brutal-border-red outline-none focus:border-brand-red-neon transition-all placeholder:text-zinc-800 uppercase"
                />
              </div>

              <button
                onClick={nextStep}
                disabled={!locationValue || !acquisition.trim()}
                className="mt-12 w-full px-12 py-10 bg-brand-red-neon text-white font-black text-5xl md:text-7xl uppercase tracking-tighter hover:bg-white hover:text-black transition-all brutal-shadow disabled:opacity-20 cursor-pointer"
              >
                FINALIZE PROFILE
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  );
}
