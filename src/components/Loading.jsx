import { motion } from "framer-motion";
import { Wifi } from "lucide-react";

export default function Loading({ label = "Loading" }) {
  return (
    <div className="grid min-h-[50vh] place-items-center px-6 text-center">
      <div className="flex flex-col items-center gap-6">

        {/* Layered ring + icon stack */}
        <div className="relative flex h-24 w-24 items-center justify-center">

          {/* Outer slow-rotating dashed ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 60%, rgba(103,232,249,0.55) 100%)",
              borderRadius: "9999px",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
          />

          {/* Inner faster counter-rotating arc */}
          <motion.div
            className="absolute inset-[5px] rounded-full"
            style={{
              background:
                "conic-gradient(from 180deg, transparent 70%, rgba(167,139,250,0.45) 100%)",
              borderRadius: "9999px",
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          />

          {/* Frosted glass center */}
          <motion.div
            className="absolute inset-[10px] rounded-full border border-white/15 bg-white/10 backdrop-blur-xl shadow-lg shadow-cyan-500/20"
            animate={{ scale: [1, 1.07, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Wifi icon with breathe */}
          <motion.div
            className="relative z-10"
            animate={{ scale: [0.88, 1.06, 0.88], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Wifi className="h-9 w-9 text-cyan-300 drop-shadow-[0_0_6px_rgba(103,232,249,0.8)]" />
          </motion.div>
        </div>

        {/* Label + subtitle */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-base font-semibold text-white tracking-wide">{label}</p>

          {/* Animated dot-dot-dot */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="block h-1.5 w-1.5 rounded-full bg-cyan-400"
                animate={{ opacity: [0.25, 1, 0.25], scaleY: [0.6, 1.3, 0.6] }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.18,
                }}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}