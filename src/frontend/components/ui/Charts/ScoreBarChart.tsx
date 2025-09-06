"use client";

import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ScoreData {
  category: string;
  score: number;
}

interface ScoreBarChartProps {
  data: ScoreData[];
  title?: string;
  height?: number;
  className?: string;
}

export function ScoreBarChart({
  data,
  title = "Score Breakdown",
  height = 300,
  className = "",
}: ScoreBarChartProps) {
  // Color mapping based on score ranges
  const getBarColor = (score: number) => {
    if (score >= 80) return "#10B981"; // Green
    if (score >= 60) return "#F59E0B"; // Yellow
    return "#EF4444"; // Red
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 capitalize">{label}</p>
          <p className="text-blue-600">
            Score: <span className="font-semibold">{payload[0].value}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}
    >
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="category"
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            tick={{ style: { textTransform: 'capitalize' } }}
          />
          <YAxis
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="score" radius={[4, 4, 0, 0]} name="Score">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
