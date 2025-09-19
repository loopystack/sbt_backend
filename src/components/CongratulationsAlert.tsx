import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface CongratulationsAlertProps {
  isVisible: boolean;
  onClose: () => void;
  betAmount?: string;
  potentialWin?: string;
  teams?: string;
}

const CongratulationsAlert: React.FC<CongratulationsAlertProps> = ({
  isVisible,
  onClose,
  betAmount = "0.0001",
  potentialWin = "0.001026",
  teams = "Team A vs Team B"
}) => {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setShowConfetti(true);
      setAnimationPhase(1);
      
      // Phase 1: Initial celebration
      setTimeout(() => setAnimationPhase(2), 500);
      
      // Phase 2: Show details
      setTimeout(() => setAnimationPhase(3), 1000);
      
      // Auto close after 5 seconds
      setTimeout(() => {
        setAnimationPhase(0);
        setTimeout(onClose, 500);
      }, 5000);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <>
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[60]">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][Math.floor(Math.random() * 6)]
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Main Alert Modal */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[50] flex items-center justify-center p-4">
        <div 
          className={`bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 rounded-3xl shadow-2xl max-w-md w-full transform transition-all duration-500 ${
            animationPhase === 0 ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
          }`}
          style={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)'
          }}
        >
          {/* Success Icon */}
          <div className="flex justify-center pt-8 pb-4">
            <div className={`relative transition-all duration-700 ${
              animationPhase >= 1 ? 'scale-100 rotate-0' : 'scale-0 rotate-180'
            }`}>
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <svg 
                    className="w-10 h-10 text-emerald-600" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={3} 
                      d="M5 13l4 4L19 7" 
                    />
                  </svg>
                </div>
              </div>
              
              {/* Pulsing ring */}
              <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping"></div>
              <div className="absolute inset-2 rounded-full border-2 border-white/20 animate-ping" style={{animationDelay: '0.5s'}}></div>
            </div>
          </div>

          {/* Congratulations Text */}
          <div className="text-center px-6 pb-6">
            <h2 className={`text-3xl font-bold text-white mb-2 transition-all duration-700 ${
              animationPhase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}>
              🎉 Congratulations! 🎉
            </h2>
            
            <p className={`text-lg text-white/90 mb-4 transition-all duration-700 delay-200 ${
              animationPhase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}>
              Your bet has been placed successfully!
            </p>

            {/* Bet Details */}
            <div className={`bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6 transition-all duration-700 delay-400 ${
              animationPhase >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/80 text-sm">Match:</span>
                  <span className="text-white font-semibold text-sm">{teams}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80 text-sm">Bet Amount:</span>
                  <span className="text-white font-semibold">$ {betAmount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80 text-sm">Potential Win:</span>
                  <span className="text-yellow-300 font-bold">$ {potentialWin}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={`flex gap-3 transition-all duration-700 delay-600 ${
              animationPhase >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}>
              <button
                onClick={onClose}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/20"
              >
                Awesome! 🚀
              </button>
              <button
                onClick={() => {
                  onClose();
                  navigate('/dashboard');
                }}
                className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-gray-800 font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg"
              >
                Check History 📊
              </button>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-4 left-4 w-8 h-8 bg-white/10 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          <div className="absolute top-6 right-6 w-6 h-6 bg-white/10 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
          <div className="absolute bottom-6 left-6 w-4 h-4 bg-white/10 rounded-full animate-bounce" style={{animationDelay: '0.6s'}}></div>
          <div className="absolute bottom-4 right-4 w-10 h-10 bg-white/10 rounded-full animate-bounce" style={{animationDelay: '0.8s'}}></div>
        </div>
      </div>

    </>
  );
};

export default CongratulationsAlert;
