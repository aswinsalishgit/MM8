"use client";

import { motion } from "framer-motion";

const FEATURES = [
  {
    title: "Agentic Matching",
    description: "Our AI agents don't just match keywords; they understand creative intent.",
    count: "01"
  },
  {
    title: "Decentralized Casting",
    description: "No more middle-men. Direct-to-talent pipelines for global projects.",
    count: "02"
  },
  {
    title: "Real-time Verification",
    description: "Immutable performance history stored on the MM8 network.",
    count: "03"
  }
];

export default function FeatureSection() {
  return (
    <section className="py-32 px-6 md:px-16 relative bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
          <h2 className="text-5xl md:text-8xl font-black leading-none">
            THE<br /><span className="text-brand-red-neon">CORE</span> ENGINE
          </h2>
          <p className="max-w-sm text-zinc-500 font-bold uppercase tracking-widest text-sm">
            Phase 1 Deployment: Infrastructure for the next generation of Mollywood talent.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {FEATURES.map((feature, i) => (
            <motion.div 
              key={feature.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="group relative p-10 glass-panel brutal-border hover:brutal-border-red transition-colors duration-500"
            >
              <span className="absolute top-4 right-4 text-4xl font-black text-brand-red-deep group-hover:text-brand-red-neon transition-colors">
                {feature.count}
              </span>
              <h3 className="text-3xl font-black mb-6 mt-10">{feature.title}</h3>
              <p className="text-zinc-400 font-medium leading-relaxed">
                {feature.description}
              </p>
              
              <div className="mt-12">
                <div className="h-1 w-full bg-zinc-900 overflow-hidden">
                  <motion.div 
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    transition={{ duration: 1.5, ease: "circOut" }}
                    className="h-full bg-brand-red-dark origin-left"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
