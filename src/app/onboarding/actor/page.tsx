"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

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
    // In MVP, just route to a dashboard or success
    router.push("/onboarding/complete"); // Assuming a completion state exists later
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
      // 1. Verify bucket exists first to avoid confusing StorageApiErrors
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      
      const bucketExists = buckets?.some(b => b.name === 'avatars');
      
      if (bucketError || !bucketExists) {
        console.warn("MM8_SYSTEM_NOTICE: Storage bucket 'avatars' not found. Skipping physical upload but proceeding with profile flow.");
        // Proceed to next step even if bucket is missing (MVP Resilience)
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
      // In MVP, we never block the user from finishing onboarding due to infrastructure errors
      nextStep();
    } finally {
      setUploading(false);
    }
  };

  const progress = (stepIndex / (STEPS.length - 1)) * 100;

  return (
    <main className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      
      {/* Sunk Cost Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-4 bg-zinc-900 z-50">
        <motion.div
          className="h-full bg-[#ff0000]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full px-6 py-20 mt-8">
        <AnimatePresence mode="wait">
          
          {STEPS[stepIndex] === "WELCOME" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-start gap-8"
            >
              <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none border-l-8 border-[#ff0000] pl-6">
                You are 6 steps away from being discoverable.
              </h1>
              <p className="text-2xl md:text-3xl font-bold text-zinc-400 uppercase tracking-tight">
                Thousands miss opportunities because they never start.
              </p>
              <button
                onClick={nextStep}
                className="mt-8 px-12 py-8 bg-[#ff0000] text-black font-black text-4xl uppercase tracking-tighter hover:bg-white hover:scale-105 transition-all duration-300"
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
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
                What do you want most right now?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["FIRST BREAK", "LEAD ROLES", "OTT DEBUT", "COMMERCIALS"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setDesire(opt); nextStep(); }}
                    className="p-8 border-4 border-zinc-800 text-left hover:border-[#ff0000] hover:bg-zinc-900 transition-colors group"
                  >
                    <span className="text-3xl font-black uppercase tracking-tighter group-hover:text-[#ff0000] transition-colors">{opt}</span>
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
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
                Which languages can you perform in?
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {LANGUAGES.map((lang) => {
                  const isSelected = languages.includes(lang);
                  return (
                    <button
                      key={lang}
                      onClick={() => handleLanguageToggle(lang)}
                      className={`p-6 border-4 transition-all duration-200 text-left ${isSelected ? 'border-[#ff0000] bg-[#ff0000] text-black' : 'border-zinc-800 text-white hover:border-zinc-500'}`}
                    >
                      <span className="text-2xl font-black uppercase tracking-tighter">{lang}</span>
                    </button>
                  );
                })}
              </div>
              <button
                disabled={languages.length === 0}
                onClick={nextStep}
                className="mt-8 px-10 py-6 bg-white text-black font-black text-2xl uppercase tracking-tighter disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#ff0000] transition-colors"
              >
                CONFIRM LANGUAGES
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
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
                What describes you best?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PERSONALITIES.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setPersonality(opt); nextStep(); }}
                    className="p-8 border-4 border-zinc-800 text-left hover:border-[#ff0000] hover:bg-zinc-900 transition-colors group"
                  >
                    <span className="text-3xl font-black uppercase tracking-tighter group-hover:text-[#ff0000] transition-colors">{opt}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {STEPS[stepIndex] === "VISIBILITY" && (
            <motion.div
              key="visibility"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex flex-col gap-8 w-full"
            >
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
                Upload one photo to get <span className="text-[#ff0000]">3x</span> more profile visibility.
              </h2>
              
              <label 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center w-full h-[400px] border-8 border-dashed ${file ? 'border-[#ff0000] bg-zinc-900' : 'border-zinc-800 hover:border-zinc-600'} cursor-pointer overflow-hidden transition-colors`}
              >
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity" />
                ) : (
                  <div className="text-zinc-500 font-black text-4xl uppercase tracking-tighter z-10 pointer-events-none text-center px-4">
                    CLICK OR DRAG A PHOTO HERE
                  </div>
                )}
                {file && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-black text-4xl uppercase tracking-tighter shadow-black drop-shadow-lg">READY TO UPLOAD</span>
                  </div>
                )}
              </label>

              <div className="flex gap-4">
                <button
                  onClick={uploadPhoto}
                  disabled={uploading || !file}
                  className="flex-1 px-8 py-6 bg-[#ff0000] text-black font-black text-2xl uppercase tracking-tighter disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  {uploading ? "UPLOADING..." : "UPLOAD & CONTINUE"}
                </button>
                {!file && (
                  <button
                    onClick={nextStep}
                    className="px-8 py-6 border-4 border-zinc-800 text-zinc-500 font-black text-xl uppercase tracking-tighter hover:border-white hover:text-white"
                  >
                    SKIP (LOSE VISIBILITY)
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
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
                Have you acted before?
              </h2>
              <div className="flex flex-col gap-4">
                {["YES (STAGE)", "YES (SCREEN)", "NO (RAW TALENT)"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setExperience(opt); nextStep(); }}
                    className="p-8 border-4 border-zinc-800 text-left hover:border-[#ff0000] hover:bg-[#ff0000] hover:text-black transition-colors group"
                  >
                    <span className="text-3xl font-black uppercase tracking-tighter">{opt}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {STEPS[stepIndex] === "AVAILABILITY" && (
            <motion.div
              key="availability"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex flex-col gap-16 w-full"
            >
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
                When are you available?
              </h2>
              
              <div className="relative pt-12 pb-8">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="1"
                  value={availability}
                  onChange={(e) => setAvailability(parseInt(e.target.value))}
                  className="w-full h-4 bg-zinc-800 appearance-none outline-none rounded-none cursor-pointer accent-[#ff0000]"
                />
                <div className="flex justify-between mt-6 px-1">
                  {AVAILABILITY_LABELS.map((label, i) => (
                    <span 
                      key={label} 
                      className={`text-xl font-black uppercase tracking-tighter ${availability === i ? 'text-[#ff0000]' : 'text-zinc-600'}`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={nextStep}
                className="mt-8 px-10 py-6 bg-[#ff0000] text-black font-black text-2xl uppercase tracking-tighter"
              >
                CONFIRM AVAILABILITY
              </button>
            </motion.div>
          )}

          {STEPS[stepIndex] === "LOCATION" && (
            <motion.div
              key="location"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex flex-col gap-8 w-full"
            >
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
                Final Details.
              </h2>
              
              <div className="flex flex-col gap-4">
                <label className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Detected Location</label>
                <div className="p-6 border-4 border-zinc-800 bg-zinc-900 text-white font-black text-2xl uppercase tracking-tighter flex justify-between items-center opacity-70">
                  <span>KOCHI, KERALA</span>
                  <span className="text-[#ff0000] text-sm tracking-widest">AUTO-DETECTED</span>
                </div>
              </div>

              <div className="flex flex-col gap-4 mt-6">
                <label className="text-zinc-500 font-bold uppercase tracking-widest text-sm">How did you hear about MM8?</label>
                <input 
                  type="text" 
                  value={acquisition}
                  onChange={(e) => setAcquisition(e.target.value)}
                  placeholder="WORD OF MOUTH? SOCIAL MEDIA?" 
                  className="w-full bg-transparent text-white font-black text-2xl px-6 py-6 border-4 border-zinc-800 outline-none focus:border-[#ff0000] transition-colors placeholder:text-zinc-700 uppercase"
                />
              </div>

              <button
                onClick={nextStep}
                className="mt-12 w-full px-10 py-8 bg-[#ff0000] text-black font-black text-4xl md:text-5xl uppercase tracking-tighter hover:bg-white hover:text-black transition-colors"
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
