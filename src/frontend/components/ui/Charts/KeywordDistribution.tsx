"use client";

import { motion } from "framer-motion";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface KeywordData {
  name: string;
  value: number;
  color: string;
}

interface KeywordDistributionProps {
  foundCount: number;
  missingCount: number;
  title?: string;
  height?: number;
  className?: string;
}

export function KeywordDistribution({
  foundCount,
  missingCount,
  title = "Keywords Coverage",
  height = 300,
  className = "",
}: KeywordDistributionProps) {
  const data: KeywordData[] = [
    {
      name: "Found Keywords",
      value: foundCount,
      color: "#10B981",
    },
    {
      name: "Missing Keywords",
      value: missingCount,
      color: "#EF4444",
    },
  ];

  const total = foundCount + missingCount;
  const percentage = total > 0 ? Math.round((foundCount / total) * 100) : 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percent = total > 0 ? Math.round((data.value / total) * 100) : 0;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-blue-600">
            Count: <span className="font-semibold">{data.value}</span>
          </p>
          <p className="text-gray-600">
            Percentage: <span className="font-semibold">{percent}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const renderLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-sm font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        )}
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">{percentage}%</div>
          <div className="text-xs text-gray-500">Coverage Rate</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            animationBegin={0}
            animationDuration={1000}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry) => (
              <span
                style={{ color: entry.color }}
                className="text-sm font-medium"
              >
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
