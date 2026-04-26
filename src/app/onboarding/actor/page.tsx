"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import BackgroundCanvas from "@/components/BackgroundCanvas";

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
  const [personality, setPersonality] = useState<string | null>(null);
  const [experience, setExperience] = useState<string | null>(null);
  const [availability, setAvailability] = useState(0); // 0, 1, 2
  const [acquisition, setAcquisition] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const nextStep = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((prev) => prev + 1);
    } else {
      finalizeProfile();
    }
  };

  const finalizeProfile = async () => {
    router.push("/onboarding/complete");
  };

  const handleLanguageToggle = (lang: string) => {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  const uploadPhoto = async () => {
    if (!file) {
      nextStep();
      return;
    }
    setUploading(true);
    try {
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === 'avatars');
      
      if (bucketError || !bucketExists) {
        console.warn("MM8_SYSTEM_NOTICE: Storage bucket 'avatars' not found.");
        nextStep();
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `actor-headshots/${fileName}`;

      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);
      
      if (error) throw error;
      nextStep();
    } catch (e) {
      console.error("MM8_UPLOAD_FAILURE:", e);
      nextStep();
    } finally {
      setUploading(false);
    }
  };

  const progress = (stepIndex / (STEPS.length - 1)) * 100;

  return (
    <main className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      <BackgroundCanvas />
      
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
              className="flex flex-col items-start gap-8"
            >
              <h1 className="text-5xl md:text-[7rem] font-black uppercase tracking-tighter leading-[0.8] border-l-[12px] border-brand-red-dark pl-8">
                PHASE 01:<br /><span className="text-brand-red-neon">DISCOVERY</span>
              </h1>
              <p className="text-2xl md:text-3xl font-bold text-zinc-400 uppercase tracking-tight max-w-2xl">
                The network is initializing. Your data is the key to bypassing the gatekeepers.
              </p>
              <button
                onClick={nextStep}
                className="mt-8 px-12 py-8 bg-brand-red-dark text-white font-black text-4xl uppercase tracking-tighter hover:bg-brand-red-neon hover:scale-105 transition-all duration-500 brutal-border"
              >
                EXECUTE START
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
                OBJECTIVE<br /><span className="text-brand-red-neon">SETTING</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {["FIRST BREAK", "LEAD ROLES", "OTT DEBUT", "COMMERCIALS"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setDesire(opt); nextStep(); }}
                    className="p-10 glass-panel brutal-border-red text-left hover:border-brand-red-neon transition-all duration-300 group"
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
                LINGUAL<br /><span className="text-brand-red-neon">MATRIX</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {LANGUAGES.map((lang) => {
                  const isSelected = languages.includes(lang);
                  return (
                    <button
                      key={lang}
                      onClick={() => handleLanguageToggle(lang)}
                      className={`p-6 brutal-border transition-all duration-300 text-left ${isSelected ? 'border-brand-red-neon bg-brand-red-deep text-white shadow-[0_0_15px_rgba(255,49,49,0.3)]' : 'border-zinc-800 text-zinc-500 hover:border-zinc-400'}`}
                    >
                      <span className="text-2xl font-black uppercase tracking-tighter">{lang}</span>
                    </button>
                  );
                })}
              </div>
              <button
                disabled={languages.length === 0}
                onClick={nextStep}
                className="mt-8 px-10 py-6 bg-white text-black font-black text-2xl uppercase tracking-tighter disabled:opacity-30 hover:bg-brand-red-neon hover:text-white transition-all brutal-border"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {PERSONALITIES.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setPersonality(opt); nextStep(); }}
                    className="p-10 glass-panel brutal-border-red text-left hover:border-brand-red-neon transition-all duration-300 group"
                  >
                    <span className="text-3xl font-black uppercase tracking-tighter group-hover:text-brand-red-neon transition-colors">{opt}</span>
                  </button>
                ))}
              </div>
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
                VISUAL<br /><span className="text-brand-red-neon">UPLINK</span>
              </h2>
              
              <label 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center w-full h-[450px] brutal-border ${file ? 'border-brand-red-neon' : 'border-zinc-800 border-dashed hover:border-brand-red-dark'} cursor-pointer overflow-hidden transition-all bg-zinc-950/50`}
              >
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity grayscale hover:grayscale-0 transition-all duration-700" />
                ) : (
                  <div className="text-zinc-700 font-black text-4xl uppercase tracking-tighter z-10 pointer-events-none text-center px-8">
                    DROP SOURCE FILE HERE
                  </div>
                )}
                {file && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-black text-5xl uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]">FILE CAPTURED</span>
                  </div>
                )}
              </label>

              <div className="flex flex-col md:flex-row gap-4">
                <button
                  onClick={uploadPhoto}
                  disabled={uploading || !file}
                  className="flex-1 px-8 py-8 bg-brand-red-dark text-white font-black text-3xl uppercase tracking-tighter disabled:opacity-20 transition-all hover:bg-brand-red-neon"
                >
                  {uploading ? "UPLOADING..." : "SYNC PHOTO"}
                </button>
                {!file && (
                  <button
                    onClick={nextStep}
                    className="px-8 py-8 glass-panel brutal-border text-zinc-500 font-black text-xl uppercase tracking-tighter hover:text-white hover:border-white transition-all"
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
                SYSTEM<br /><span className="text-brand-red-neon">HISTORY</span>
              </h2>
              <div className="flex flex-col gap-6">
                {["YES (STAGE)", "YES (SCREEN)", "NO (RAW TALENT)"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setExperience(opt); nextStep(); }}
                    className="p-10 glass-panel brutal-border-red text-left hover:border-brand-red-neon hover:bg-brand-red-deep/20 transition-all group"
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
              className="flex flex-col gap-16 w-full"
            >
              <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none">
                DEPLOYMENT<br /><span className="text-brand-red-neon">WINDOW</span>
              </h2>
              
              <div className="relative pt-12 pb-8">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="1"
                  value={availability}
                  onChange={(e) => setAvailability(parseInt(e.target.value))}
                  className="w-full h-2 bg-zinc-900 appearance-none outline-none cursor-pointer accent-brand-red-neon"
                />
                <div className="flex justify-between mt-10">
                  {AVAILABILITY_LABELS.map((label, i) => (
                    <span 
                      key={label} 
                      className={`text-2xl font-black uppercase tracking-tighter transition-colors duration-500 ${availability === i ? 'text-brand-red-neon scale-110' : 'text-zinc-700'}`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={nextStep}
                className="mt-8 px-12 py-8 bg-brand-red-dark text-white font-black text-3xl uppercase tracking-tighter hover:bg-brand-red-neon transition-all brutal-border"
              >
                LOCK WINDOW
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
                FINAL<br /><span className="text-brand-red-neon">UPLINK</span>
              </h2>
              
              <div className="flex flex-col gap-4">
                <label className="text-brand-red-neon font-black uppercase tracking-widest text-xs">Origin Node</label>
                <div className="p-8 glass-panel brutal-border-red text-white font-black text-3xl uppercase tracking-tighter flex justify-between items-center bg-brand-red-deep/10">
                  <span>KOCHI, KERALA</span>
                  <span className="text-brand-red-neon text-xs tracking-widest animate-pulse">DETECTED</span>
                </div>
              </div>

              <div className="flex flex-col gap-4 mt-8">
                <label className="text-zinc-500 font-black uppercase tracking-widest text-xs">How did you hear about MM8?</label>
                <input 
                  type="text" 
                  value={acquisition}
                  onChange={(e) => setAcquisition(e.target.value)}
                  placeholder="SOURCE?" 
                  className="w-full bg-zinc-950/50 text-white font-black text-4xl px-8 py-10 brutal-border-red outline-none focus:border-brand-red-neon transition-all placeholder:text-zinc-800 uppercase"
                />
              </div>

              <button
                onClick={nextStep}
                className="mt-12 w-full px-12 py-10 bg-brand-red-neon text-white font-black text-5xl md:text-7xl uppercase tracking-tighter hover:bg-white hover:text-black transition-all brutal-shadow"
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
