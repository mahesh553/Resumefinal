"use client";

import { Button } from "@/components/ui/Button";
import { ChevronRightIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function CTASection() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-blue-600 to-indigo-700">
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(5)].map((_, i) => {
          // Use deterministic positions to avoid hydration mismatches
          const positions = [
            { left: "10%", top: "20%" },
            { left: "85%", top: "15%" },
            { left: "25%", top: "70%" },
            { left: "75%", top: "65%" },
            { left: "45%", top: "35%" },
          ];

          return (
            <motion.div
              key={i}
              className="absolute w-64 h-64 bg-white/5 rounded-full blur-3xl"
              animate={
                isMounted
                  ? {
                      x: [0, 100, 0],
                      y: [0, -50, 0],
                      scale: [1, 1.3, 1],
                    }
                  : {}
              }
              transition={
                isMounted
                  ? {
                      duration: 15 + i * 3,
                      repeat: Infinity,
                      ease: "linear",
                    }
                  : { duration: 0 }
              }
              style={{
                left: positions[i]?.left || "50%",
                top: positions[i]?.top || "50%",
              }}
            />
          );
        })}
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={false}
          whileInView={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
          transition={{ duration: isMounted ? 0.8 : 0 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          {/* Icon */}
          <motion.div
            initial={false}
            whileInView={
              isMounted ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1 }
            }
            transition={{
              duration: isMounted ? 0.6 : 0,
              delay: isMounted ? 0.2 : 0,
            }}
            viewport={{ once: true }}
            className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl"
          >
            <SparklesIcon className="w-10 h-10 text-white" />
          </motion.div>

          {/* Heading */}
          <h2 className="text-4xl md:text-6xl font-display font-bold text-white leading-tight">
            Ready to Transform
            <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
              Your Career?
            </span>
          </h2>

          {/* Description */}
          <motion.p
            initial={false}
            whileInView={
              isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }
            }
            transition={{
              duration: isMounted ? 0.8 : 0,
              delay: isMounted ? 0.4 : 0,
            }}
            viewport={{ once: true }}
            className="text-xl md:text-2xl text-blue-100 leading-relaxed max-w-2xl mx-auto"
          >
            Join thousands of professionals who've landed their dream jobs with
            AI-optimized resumes. Start your journey today.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={false}
            whileInView={
              isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }
            }
            transition={{
              duration: isMounted ? 0.8 : 0,
              delay: isMounted ? 0.6 : 0,
            }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
          >
            <Button
              size="xl"
              className="bg-white text-primary-600 hover:bg-gray-50 shadow-xl hover:shadow-2xl font-semibold group"
              onClick={() => (window.location.href = "/dashboard")}
            >
              Start Free Today
              <ChevronRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>

            <Button
              variant="outline"
              size="xl"
              className="border-2 border-white/30 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20"
              onClick={() => (window.location.href = "/pricing")}
            >
              View Pricing
            </Button>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={false}
            whileInView={isMounted ? { opacity: 1 } : { opacity: 1 }}
            transition={{
              duration: isMounted ? 0.8 : 0,
              delay: isMounted ? 0.8 : 0,
            }}
            viewport={{ once: true }}
            className="text-blue-200 text-sm pt-8"
          >
            ✓ Free forever plan available • ✓ No setup fees • ✓ Cancel anytime
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
