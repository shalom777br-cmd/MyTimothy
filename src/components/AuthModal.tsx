import React, { useState, useEffect } from "react";
import { LogIn, X, Lock, CheckCircle, ShieldAlert, Delete } from "lucide-react";
import { CuteTemoteLogo } from "./CuteTemoteLogo";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (email: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [pin, setPin] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyPress = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);
      
      // Auto-submit when 4 digits are reached
      if (nextPin.length === 4) {
        verifyPasscode(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError(null);
    }
  };

  const verifyPasscode = (code: string) => {
    setLoading(true);
    
    setTimeout(() => {
      // Joanna's dedicated private passcode is 7770
      if (code === "7770") {
        setLoading(false);
        setSuccess(true);
        setTimeout(() => {
          onLoginSuccess("shalom777br@gmail.com");
          setSuccess(false);
          onClose();
        }, 1000);
      } else {
        setLoading(false);
        setPin("");
        setError("パスコードが正しくありません。");
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    }, 800);
  };

  const keypadDigits = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"]
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 hover:bg-gray-50 text-gray-400 hover:text-gray-900 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Heading */}
        <div className="text-center space-y-1.5 pt-2">
          <CuteTemoteLogo size={42} className="mx-auto" />
          <h2 className="text-sm font-display font-bold text-[#1D1D1F]">
            ジョアンナ専用 AI秘書テモテ
          </h2>
          <p className="text-[10px] text-gray-400 max-w-[240px] mx-auto font-light">
            3台のデバイス間で作業状況を同期するため、共通の4桁パスコードを入力してください。
          </p>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-2 animate-scale-up">
            <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
            <p className="text-xs font-semibold text-emerald-800">ロックを解除しました</p>
            <p className="text-[10px] text-gray-400 font-light">共有記憶層とテモテの記憶を同期中...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* PIN Dots indicators */}
            <div className={`flex justify-center gap-4 py-2 ${shake ? "animate-bounce" : ""}`}>
              {[0, 1, 2, 3].map((index) => {
                const isFilled = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                      isFilled 
                        ? "bg-gray-800 border-gray-800 scale-110 shadow-xs" 
                        : "border-gray-250 bg-gray-50/50"
                    }`}
                  />
                );
              })}
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-[10px] text-red-600 bg-red-50 border border-red-100 rounded-xl p-2.5 flex items-center justify-center gap-1.5 text-center leading-relaxed">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* iOS-Style Virtual Keypad */}
            <div className="space-y-3">
              {keypadDigits.map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-4">
                  {row.map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      disabled={loading}
                      onClick={() => handleKeyPress(digit)}
                      className="w-14 h-14 rounded-full bg-gray-50 hover:bg-gray-100 active:bg-gray-200 border border-gray-150/50 text-gray-800 font-display font-bold text-lg flex items-center justify-center transition-all select-none cursor-pointer outline-hidden disabled:opacity-50"
                    >
                      {digit}
                    </button>
                  ))}
                </div>
              ))}
              <div className="flex justify-center gap-4">
                {/* Dummy placeholder for layout alignment */}
                <div className="w-14 h-14" />
                
                {/* Digit 0 */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleKeyPress("0")}
                  className="w-14 h-14 rounded-full bg-gray-50 hover:bg-gray-100 active:bg-gray-200 border border-gray-150/50 text-gray-800 font-display font-bold text-lg flex items-center justify-center transition-all select-none cursor-pointer outline-hidden disabled:opacity-50"
                >
                  0
                </button>

                {/* Backspace Button */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleBackspace}
                  className="w-14 h-14 rounded-full bg-gray-50/30 hover:bg-gray-100 text-gray-400 hover:text-gray-800 flex items-center justify-center transition-colors cursor-pointer select-none outline-hidden disabled:opacity-50"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 space-y-1 text-[9px] text-gray-400 leading-relaxed font-light text-center">
              <div>🔒 Joanna Private Secure Environment</div>
              <div>パスコード入力に成功すると、ローカルストレージに安全にトークンが維持され、Supabaseに自動バックアップされます。</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

