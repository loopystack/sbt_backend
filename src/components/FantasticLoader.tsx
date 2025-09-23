import React from 'react';

interface FantasticLoaderProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
}

export default function FantasticLoader({ size = 'medium', text = 'Loading odds...' }: FantasticLoaderProps) {
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32'
  };

  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8">

      {/* Main cold shimmering loader */}
      <div className={`relative ${sizeClasses[size]} z-10`}>
        {/* Outer ice ring - very visible rotation */}
        <div className={`absolute inset-0 rounded-full border-4 border-transparent`} 
             style={{ 
               background: 'conic-gradient(from 0deg, #06b6d4, #0891b2, #0e7490, #155e75, #164e63, #06b6d4)',
               animation: 'spin 2s linear infinite',
               filter: 'drop-shadow(0 0 20px rgba(6, 182, 212, 0.8))'
             }}>
          <div className="absolute inset-1 rounded-full bg-bg"></div>
        </div>

        {/* Middle frost ring - counter rotating with clear segments */}
        <div className={`absolute inset-3 rounded-full border-4 border-transparent`}
             style={{ 
               background: 'conic-gradient(from 180deg, #ffffff, #e0f7fa, #b2ebf2, #80deea, #4dd0e1, #26c6da, #ffffff)',
               animation: 'spin 1.5s linear infinite reverse',
               filter: 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.6))'
             }}>
          <div className="absolute inset-1 rounded-full bg-bg"></div>
        </div>

        {/* Inner crystal ring - fastest rotation */}
        <div className={`absolute inset-6 rounded-full border-4 border-transparent`}
             style={{ 
               background: 'conic-gradient(from 90deg, #f0f9ff, #e0f2fe, #bae6fd, #7dd3fc, #38bdf8, #0ea5e9, #f0f9ff)',
               animation: 'spin 1s linear infinite',
               filter: 'drop-shadow(0 0 12px rgba(14, 165, 233, 0.7))'
             }}>
          <div className="absolute inset-1 rounded-full bg-bg"></div>
        </div>

        {/* Central ice crystal */}
        <div className="absolute inset-9 rounded-full bg-gradient-to-br from-white via-cyan-50 to-blue-50 shadow-2xl">
          {/* Rotating inner ring - very visible */}
          <div className="absolute inset-2 rounded-full border-2 border-transparent"
               style={{ 
                 background: 'conic-gradient(from 45deg, #06b6d4, #ffffff, #0ea5e9, #ffffff, #06b6d4)',
                 animation: 'spin 0.8s linear infinite'
               }}>
            <div className="absolute inset-1 rounded-full bg-gradient-to-br from-cyan-100 to-white"></div>
          </div>
          
          {/* Pulsing core */}
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white via-cyan-100 to-blue-100 animate-pulse">
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-200 via-white to-transparent animate-ping opacity-80"></div>
          </div>
        </div>

        {/* Floating ice particles */}
        <div className="absolute inset-0">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-gradient-to-r from-cyan-300 to-blue-300 rounded-full animate-ping"
              style={{
                top: `${50 + Math.sin(i * Math.PI / 5) * 35}%`,
                left: `${50 + Math.cos(i * Math.PI / 5) * 35}%`,
                transform: 'translate(-50%, -50%)',
                animationDelay: `${i * 0.3}s`,
                animationDuration: '2.5s',
                filter: 'blur(0.5px) drop-shadow(0 0 6px rgba(6, 182, 212, 0.8))'
              }}
            />
          ))}
        </div>

        {/* Cold aura */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/15 via-blue-400/15 via-cyan-300/15 via-white/10 to-cyan-400/15 blur-2xl animate-pulse`}
             style={{ animationDuration: '4s' }}></div>
        
        {/* Frost shimmer */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-white/5 via-cyan-200/10 via-white/5 via-blue-200/10 to-white/5 blur-3xl animate-pulse`}
             style={{ animationDuration: '6s', animationDelay: '2s' }}></div>
      </div>

      {/* Cold shimmering text */}
      <div className="text-center z-10 relative">
        <div className={`${textSizeClasses[size]} font-bold bg-gradient-to-r from-cyan-300 via-white via-blue-200 via-cyan-200 to-cyan-300 bg-clip-text text-transparent animate-pulse`}
             style={{
               backgroundSize: '200% 200%',
               animationDuration: '3s',
               filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.5))'
             }}>
          {text}
        </div>
        
        {/* Shimmering dots */}
        <div className="flex justify-center space-x-2 mt-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ 
                background: ['#06b6d4', '#ffffff', '#0ea5e9', '#ffffff', '#06b6d4'][i],
                animationDelay: `${i * 0.2}s`,
                boxShadow: `0 0 8px ${['#06b6d4', '#ffffff', '#0ea5e9', '#ffffff', '#06b6d4'][i]}`
              }}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
