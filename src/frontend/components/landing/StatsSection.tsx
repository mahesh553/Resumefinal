'use client';

import { motion } from 'framer-motion';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';

const stats = [
  {
    value: 98,
    suffix: '%',
    label: 'ATS Pass Rate',
    description: 'Resumes optimized with our AI pass ATS screening',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    value: 10000,
    suffix: '+',
    label: 'Resumes Optimized',
    description: 'Successful resume transformations completed',
    color: 'from-green-500 to-emerald-600',
  },
  {
    value: 85,
    suffix: '%',
    label: 'Job Success Rate',
    description: 'Users who land interviews within 30 days',
    color: 'from-purple-500 to-pink-600',
  },
  {
    value: 500,
    suffix: '+',
    label: 'Companies Trust Us',
    description: 'HR professionals recommend our platform',
    color: 'from-orange-500 to-red-600',
  },
];

export function StatsSection() {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-96 h-96 bg-gradient-to-br from-primary-200/10 to-blue-200/10 rounded-full blur-3xl"
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20 + i * 5,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              left: `${20 + i * 30}%`,
              top: `${10 + i * 20}%`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mb-6">
            Trusted by Thousands of
            <span className="block gradient-text">Job Seekers</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join the community of successful professionals who've transformed their careers with our AI-powered resume optimization.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                duration: 0.6, 
                delay: index * 0.1,
                type: "spring",
                stiffness: 100,
              }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="glass-effect rounded-3xl p-8 text-center hover-lift group-hover:bg-white/90 transition-all duration-300">
                {/* Gradient Background */}
                <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-r ${stat.color} p-0.5`}>
                  <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center">
                    <div className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                      <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                  {stat.label}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {stat.description}
                </p>

                {/* Hover Indicator */}
                <motion.div
                  className={`mt-4 h-1 bg-gradient-to-r ${stat.color} rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-gray-500 mb-8">Trusted by professionals at</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            {['Google', 'Microsoft', 'Apple', 'Amazon', 'Meta', 'Netflix'].map((company) => (
              <div
                key={company}
                className="text-lg font-semibold text-gray-400 hover:text-gray-600 transition-colors"
              >
                {company}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}