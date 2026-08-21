"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import CustomCursor from "./components/CustomCursor";
import { ArrowRight, Bot, Globe, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <>
      <CustomCursor />

      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 md:px-12 font-outfit">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-white font-bold text-2xl tracking-wide drop-shadow-md">
            MandiPulse<span className="text-mp-emerald-400">.</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-200 drop-shadow-sm">
            <Link href="#" className="hover:text-white transition-colors">How it Works</Link>
            <Link href="#" className="hover:text-white transition-colors">Coverage</Link>
            <Link href="#" className="hover:text-white transition-colors">About Us</Link>
            <Link href="/dashboard" className="px-6 py-2.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition-all backdrop-blur-md text-white">
              Launch App
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 min-h-screen flex flex-col justify-between pt-32 pb-16 px-6 font-outfit">
        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center text-center -mt-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center max-w-4xl"
          >
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-extrabold tracking-tight text-white drop-shadow-2xl mb-6">
              MandiPulse AI
            </h1>
            
            <p className="text-lg md:text-2xl text-slate-100 drop-shadow-md font-medium max-w-2xl mb-12 leading-relaxed">
              Empowering farmers with autonomous, real-time price discovery and logistics-adjusted margins.
            </p>
            
            <Link href="/dashboard" className="inline-flex group">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-neon text-lg md:text-xl px-10 py-4 font-bold tracking-wide shadow-2xl flex items-center gap-3"
              >
                Check Best Prices
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
          </motion.div>
        </div>

        {/* Feature Cards Footer */}
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {[
            {
              title: "Live Intelligence",
              desc: "Tracking active Mandis in real-time across India.",
              icon: Globe,
              delay: 0.2
            },
            {
              title: "Autonomous Agents",
              desc: "AI bots navigating government portals automatically.",
              icon: Bot,
              delay: 0.4
            },
            {
              title: "Logistics Adjusted",
              desc: "Calculating true margins to maximize farmer profit.",
              icon: ShieldCheck,
              delay: 0.6
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: feature.delay }}
              className="glass p-6 rounded-2xl flex flex-col items-center text-center gap-4 hover:bg-white/10 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-mp-emerald-500/20 flex items-center justify-center text-mp-emerald-400">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-white font-bold text-lg drop-shadow-sm">{feature.title}</h3>
              <p className="text-slate-200 text-sm font-medium">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </>
  );
}
