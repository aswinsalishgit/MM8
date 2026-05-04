"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Navbar() {
  return (
    <motion.nav 
      className="fixed top-0 left-0 w-full z-50 px-6 md:px-16 py-10 flex justify-between items-center pointer-events-none"
    >
      <Link href="/" className="text-2xl md:text-3xl font-black tracking-tighter hover:text-[var(--accent-primary)] transition-colors pointer-events-auto">
        MM8<span className="text-[var(--accent-primary)]">.</span>
      </Link>

      <div className="flex gap-4 md:gap-8 items-center pointer-events-auto">
        <Link 
          href="/auth"
          className="px-6 md:px-10 py-3 md:py-4 glass-button text-white font-black uppercase text-xs md:text-sm tracking-widest hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] clip-brutal-slant cursor-pointer"
        >
          SIGN IN
        </Link>
      </div>
    </motion.nav>
  );
}
