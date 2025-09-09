"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface ScoreCardProps {
  title: string;
  score: number;
  delay?: number;
}

const getScoreColor = (score: number) => {
  if (score >= 90) return "text-green-600 bg-green-50 border-green-200";
  if (score >= 80) return "text-blue-600 bg-blue-50 border-blue-200";
  if (score >= 70) return "text-warning-600 bg-warning-50 border-warning-200";
  return "text-error-600 bg-error-50 border-error-200";
};

const getProgressColor = (score: number) => {
  if (score >= 90) return "bg-green-500";
  if (score >= 80) return "bg-blue-500";
  if (score >= 70) return "bg-warning-500";
  return "bg-error-500";
};

export function ScoreCard({ title, score, delay = 0 }: ScoreCardProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  return (
    <motion.div
      initial={false}
      animate={isMounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
      transition={{
        duration: isMounted ? 0.5 : 0,
        delay: isMounted ? delay : 0,
      }}
      className={`p-4 rounded-xl border ${getScoreColor(score)}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium">{title}</h4>
        <span className="text-lg font-bold">{score}%</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <motion.div
          className={`h-2 rounded-full ${getProgressColor(score)}`}
          initial={false}
          animate={isMounted ? { width: `${score}%` } : { width: `${score}%` }}
          transition={{
            duration: isMounted ? 1 : 0,
            delay: isMounted ? delay + 0.2 : 0,
          }}
        />
      </div>
    </motion.div>
  );
}
