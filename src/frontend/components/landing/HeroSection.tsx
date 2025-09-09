"use client";

import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { Button } from "@/components/ui/Button";
import { ChevronRightIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function HeroSection() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="absolute inset-0 bg-grid-slate-100/50 bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      </div>

      {/* Floating Elements - Always render but conditionally animate */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => {
          // Use deterministic positions to avoid hydration mismatches
          const positions = [
            { left: "10%", top: "20%" },
            { left: "85%", top: "15%" },
            { left: "25%", top: "70%" },
            { left: "75%", top: "65%" },
            { left: "5%", top: "85%" },
            { left: "90%", top: "80%" },
          ];

          return (
            <motion.div
              key={i}
              className="absolute w-64 h-64 bg-gradient-to-br from-primary-200/20 to-blue-200/20 rounded-full blur-3xl"
              animate={
                isMounted
                  ? {
                      x: [0, 100, 0],
                      y: [0, -100, 0],
                      scale: [1, 1.2, 1],
                    }
                  : {}
              }
              transition={
                isMounted
                  ? {
                      duration: 20 + i * 5,
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={false}
          animate={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          {/* Badge */}
          <motion.div
            initial={false}
            animate={
              isMounted ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1 }
            }
            transition={{ delay: isMounted ? 0.2 : 0, duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-primary-200 rounded-full px-4 py-2"
          >
            <SparklesIcon className="w-4 h-4 text-primary-600" />
            <span className="text-sm font-medium text-primary-700">
              AI-Powered Resume Optimization
            </span>
          </motion.div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold leading-none">
            <span className="block text-gray-900">Transform Your</span>
            <span className="block gradient-text">Career Journey</span>
          </h1>

          {/* Description */}
          <motion.p
            initial={false}
            animate={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
            transition={{ delay: isMounted ? 0.4 : 0, duration: 0.8 }}
            className="max-w-2xl mx-auto text-xl md:text-2xl text-gray-600 leading-relaxed"
          >
            Get your resume optimized by AI, track job applications, and land
            your dream job with personalized insights and recommendations.
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={false}
            animate={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
            transition={{ delay: isMounted ? 0.6 : 0, duration: 0.8 }}
            className="flex flex-wrap justify-center gap-8 text-center"
          >
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-primary-600">
                <AnimatedCounter end={98} suffix="%" />
              </div>
              <div className="text-sm text-gray-600">ATS Pass Rate</div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-success-600">
                <AnimatedCounter end={10000} suffix="+" />
              </div>
              <div className="text-sm text-gray-600">Resumes Optimized</div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="text-3xl font-bold text-purple-600">
                <AnimatedCounter end={85} suffix="%" />
              </div>
              <div className="text-sm text-gray-600">Job Success Rate</div>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={false}
            animate={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
            transition={{ delay: isMounted ? 0.8 : 0, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button
              size="lg"
              className="button-primary group"
              onClick={() => (window.location.href = "/dashboard")}
            >
              Start Optimizing Now
              <ChevronRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="button-secondary"
              onClick={() => (window.location.href = "/demo")}
            >
              See Demo
            </Button>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={false}
            animate={isMounted ? { opacity: 1 } : { opacity: 1 }}
            transition={{ delay: isMounted ? 1 : 0, duration: 0.8 }}
            className="text-sm text-gray-500"
          >
            ✓ Free to start • ✓ No credit card required • ✓ AI-powered analysis
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
