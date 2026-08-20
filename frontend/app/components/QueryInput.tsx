"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Wheat, MapPin, ChevronDown } from "lucide-react";

const CROPS = ["Paddy", "Potato", "Mustard", "Jute", "Wheat"];
const DISTRICTS = ["Hooghly", "Purba Bardhaman", "Nadia", "Bankura", "Birbhum"];

interface QueryInputProps {
  onSubmit: (crop: string, district: string) => void;
  isLoading: boolean;
}

/**
 * QueryInput — Command input bar for the farmer's query.
 * Select crop + district, then trigger the agent pipeline.
 */
export default function QueryInput({ onSubmit, isLoading }: QueryInputProps) {
  const [crop, setCrop] = useState("Paddy");
  const [district, setDistrict] = useState("Hooghly");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      onSubmit(crop, district);
    }
  };

  return (
    <motion.section
      className="w-full max-w-3xl mx-auto px-6 py-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      <form onSubmit={handleSubmit}>
        <div className="glass rounded-2xl p-1.5">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Crop Select */}
            <div className="relative flex-1">
              <Wheat className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mp-emerald-400 pointer-events-none" />
              <select
                id="crop-select"
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                className="select-glow w-full pl-10 pr-10 py-3.5 rounded-xl text-sm bg-mp-bg-deep/80"
                disabled={isLoading}
              >
                {CROPS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* District Select */}
            <div className="relative flex-1">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mp-cyan pointer-events-none" />
              <select
                id="district-select"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="select-glow w-full pl-10 pr-10 py-3.5 rounded-xl text-sm bg-mp-bg-deep/80"
                disabled={isLoading}
              >
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              className="btn-neon flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={!isLoading ? { scale: 1.02 } : {}}
              whileTap={!isLoading ? { scale: 0.98 } : {}}
            >
              {isLoading ? (
                <>
                  <div className="spinner" />
                  <span>Agent Running...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Fetch Prices</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Hint Text */}
        <p className="text-center text-xs text-mp-text-muted mt-3">
          Select a crop and your home district — the agent will compare prices across nearby mandis
        </p>
      </form>
    </motion.section>
  );
}
