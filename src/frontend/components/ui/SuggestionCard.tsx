'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import type { Suggestion } from '@/types';

interface SuggestionCardProps {
  suggestion: Suggestion;
  delay?: number;
}

const priorityColors = {
  high: 'border-error-200 bg-error-50',
  medium: 'border-warning-200 bg-warning-50',
  low: 'border-blue-200 bg-blue-50',
};

const priorityIcons = {
  high: ExclamationTriangleIcon,
  medium: InformationCircleIcon,
  low: LightBulbIcon,
};

const priorityIconColors = {
  high: 'text-error-600',
  medium: 'text-warning-600',
  low: 'text-blue-600',
};

export function SuggestionCard({ suggestion, delay = 0 }: SuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const IconComponent = priorityIcons[suggestion.priority];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`border rounded-xl overflow-hidden ${priorityColors[suggestion.priority]}`}
    >
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3">
          <IconComponent className={`w-5 h-5 mt-0.5 flex-shrink-0 ${priorityIconColors[suggestion.priority]}`} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                  suggestion.priority === 'high' ? 'bg-error-100 text-error-800' :
                  suggestion.priority === 'medium' ? 'bg-warning-100 text-warning-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {suggestion.priority}
                </span>
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                </motion.div>
              </div>
            </div>
            
            <p className="text-gray-600 mt-1 line-clamp-2">
              {suggestion.description}
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-200"
          >
            <div className="p-4 bg-white/50">
              <p className="text-gray-700 mb-3">
                {suggestion.description}
              </p>
              
              {suggestion.example && (
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-sm font-medium text-gray-900 mb-1">Example:</p>
                  <p className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded">
                    {suggestion.example}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}