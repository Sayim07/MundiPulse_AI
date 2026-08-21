"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import CustomCursor from "./components/CustomCursor";

export default function LandingPage() {
  return (
    <>
      <CustomCursor />
      

      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center gap-12"
        >
          <h1 className="text-6xl md:text-9xl font-extrabold tracking-tight text-white drop-shadow-2xl">
            MandiPulse AI
          </h1>
          
          <Link href="/dashboard" className="inline-flex mt-8">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-neon text-xl px-12 py-5 font-bold tracking-wide shadow-2xl"
            >
              Check Best Prices
            </motion.button>
          </Link>
        </motion.div>
      </main>
    </>
  );
}
