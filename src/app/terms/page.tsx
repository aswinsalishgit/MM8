"use client";

import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

export default function TermsAndConditions() {
  return (
    <main className="relative min-h-screen w-full bg-black text-white selection:bg-brand-red-neon selection:text-white">
      <Navbar />
      
      <div className="pt-32 pb-20 px-6 md:px-16 max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-12 leading-none">
            TERMS OF<br/><span className="text-brand-red-neon">SERVICE</span>
          </h1>

          <div className="space-y-12 text-zinc-400 font-medium leading-relaxed">
            <section className="brutal-border-red p-8 glass-panel">
              <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">01. ACCEPTANCE</h2>
              <p>
                By accessing or using the MM8 platform, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">02. USER CONDUCT</h2>
              <p>
                You represent and warrant that all information provided during onboarding (including audition tapes and portfolio details) is truthful and that you have the right to share such content. You agree not to upload harmful, offensive, or infringing material.
              </p>
            </section>

            <section className="border-l-4 border-brand-red-neon pl-8 py-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">03. INTELLECTUAL PROPERTY</h2>
              <p>
                You retain all rights to your audition tapes and profile images. By uploading them to MM8, you grant the platform a non-exclusive, worldwide license to display this content to verified Directors and collaborators within the ecosystem for the purpose of talent discovery.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">04. LIMITATION OF LIABILITY</h2>
              <p>
                MM8 is a talent discovery platform provided "as is". We are not responsible for the outcomes of professional collaborations, casting decisions, or the security of third-party services like Google Drive beyond our reasonable control.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">05. TERMINATION</h2>
              <p>
                We reserve the right to suspend or terminate access to our service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
              </p>
            </section>

            <div className="pt-10 border-t border-zinc-800 text-xs uppercase tracking-[0.3em] text-zinc-600">
              Last Updated: April 29, 2026 | MM8 Legal Team
            </div>
          </div>
        </motion.div>
      </div>

      {/* Noise Overlay */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-50" />
    </main>
  );
}
