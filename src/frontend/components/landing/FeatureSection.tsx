"use client";

import {
  ArrowTrendingUpIcon,
  ChartBarIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  SparklesIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const features = [
  {
    icon: SparklesIcon,
    title: "AI-Powered Analysis",
    description:
      "Advanced AI algorithms analyze your resume for ATS compatibility and optimization opportunities.",
    color: "from-blue-500 to-indigo-600",
    delay: 0.1,
  },
  {
    icon: ChartBarIcon,
    title: "ATS Scoring",
    description:
      "Get detailed ATS scores and insights to ensure your resume passes through applicant tracking systems.",
    color: "from-purple-500 to-pink-600",
    delay: 0.2,
  },
  {
    icon: DocumentTextIcon,
    title: "Smart Suggestions",
    description:
      "Receive personalized recommendations to improve content, keywords, and formatting.",
    color: "from-green-500 to-emerald-600",
    delay: 0.3,
  },
  {
    icon: ArrowTrendingUpIcon,
    title: "Job Matching",
    description:
      "Match your resume with job descriptions and get tailored optimization suggestions.",
    color: "from-orange-500 to-red-600",
    delay: 0.4,
  },
  {
    icon: UserGroupIcon,
    title: "Version Control",
    description:
      "Keep track of multiple resume versions and compare their performance over time.",
    color: "from-teal-500 to-cyan-600",
    delay: 0.5,
  },
  {
    icon: CheckCircleIcon,
    title: "Real-time Feedback",
    description:
      "Get instant feedback as you edit your resume with live optimization suggestions.",
    color: "from-violet-500 to-purple-600",
    delay: 0.6,
  },
];

export function FeatureSection() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100/50 bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={false}
          whileInView={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
          transition={{ duration: isMounted ? 0.8 : 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mb-6">
            Powerful Features for
            <span className="block gradient-text">Career Success</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our AI-powered platform provides everything you need to create,
            optimize, and track your resume for maximum impact.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={false}
              whileInView={
                isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }
              }
              transition={{
                duration: isMounted ? 0.6 : 0,
                delay: isMounted ? feature.delay : 0,
              }}
              viewport={{ once: true }}
              onHoverStart={() => setHoveredFeature(index)}
              onHoverEnd={() => setHoveredFeature(null)}
              className="group relative"
            >
              <div className="card hover-lift h-full">
                {/* Icon */}
                <div className="relative mb-6">
                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} p-4 shadow-soft`}
                  >
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Animated Background */}
                  {hoveredFeature === index && isMounted && (
                    <motion.div
                      layoutId="feature-bg"
                      className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${feature.color} opacity-10`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 0.1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover Effect */}
                <motion.div
                  className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-primary-200 transition-colors duration-300"
                  whileHover={{ scale: 1.02 }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={false}
          whileInView={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
          transition={{
            duration: isMounted ? 0.8 : 0,
            delay: isMounted ? 0.8 : 0,
          }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <p className="text-lg text-gray-600 mb-6">
            Ready to optimize your resume with AI?
          </p>
          <button className="button-primary">Get Started for Free</button>
        </motion.div>
      </div>
    </section>
  );
}
