"use client";

import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

export default function PrivacyPolicy() {
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
            PRIVACY<br/><span className="text-brand-red-neon">POLICY</span>
          </h1>

          <div className="space-y-12 text-zinc-400 font-medium leading-relaxed">
            <section className="brutal-border-red p-8 glass-panel">
              <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">01. DATA COLLECTION</h2>
              <p>
                MM8 collects information necessary to provide talent discovery and deployment services. This includes:
              </p>
              <ul className="list-disc list-inside mt-4 space-y-2 text-zinc-500">
                <li>Full Name and Email address (via Google Authentication)</li>
                <li>Profile details (Experience, Archetypes, Location)</li>
                <li>Media assets (Profile Pictures, Audition Tapes)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">02. STORAGE & GOOGLE DRIVE</h2>
              <p>
                MM8 utilizes Google Drive for the storage of high-fidelity media assets. By using MM8, you authorize the application to create a dedicated folder within our controlled Google Drive infrastructure to store your audition tapes and profile images. 
              </p>
              <p className="mt-4">
                We do not access any files outside of the specific folder created for your account.
              </p>
            </section>

            <section className="border-l-4 border-brand-red-neon pl-8 py-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">03. DATA USAGE</h2>
              <p>
                Your data is used exclusively for:
              </p>
              <ul className="list-disc list-inside mt-4 space-y-2 text-zinc-500">
                <li>Verifying your identity as a talent or director.</li>
                <li>Presenting your portfolio to potential collaborators within the MM8 ecosystem.</li>
                <li>Improving the talent discovery algorithm.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">04. YOUR RIGHTS</h2>
              <p>
                You maintain full ownership of your data. You may request deletion of your MM8 account at any time. Upon deletion, all profile records in Supabase and associated media folders in Google Drive will be permanently removed/trashed.
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
