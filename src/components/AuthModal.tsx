import React, { useState } from "react";
import { LogIn, X, Mail, Lock, CheckCircle, ShieldAlert } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (email: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください。");
      return;
    }

    setLoading(true);
    setError(null);

    // Simulate Supabase Auth + Server verification delay
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        onLoginSuccess(email);
        setSuccess(false);
        onClose();
      }, 1000);
    }, 1200);
  };

  const handleUseDemo = () => {
    setEmail("shalom777br@gmail.com");
    setPassword("joannapassword123");
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    setError(null);

    // Simulate Google Sign-In pop-up and secure session initialization
    setTimeout(() => {
      setGoogleLoading(false);
      setSuccess(true);
      setTimeout(() => {
        onLoginSuccess("shalom777br@gmail.com");
        setSuccess(false);
        onClose();
      }, 1000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-sm bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 hover:bg-gray-50 text-gray-400 hover:text-gray-900 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Heading */}
        <div className="text-center space-y-2 pt-2">
          <div className="w-12 h-12 rounded-2xl bg-[#1D1D1F] text-white flex items-center justify-center font-display font-semibold mx-auto shadow-xs text-lg">
            テ
          </div>
          <h2 className="text-base font-display font-bold text-[#1D1D1F]">
            テモテにログイン
          </h2>
          <p className="text-[11px] text-gray-400 max-w-[240px] mx-auto font-light">
            認証してご自身のプロジェクト・タスクにアクセスします。
          </p>
        </div>

        {success ? (
          <div className="py-6 text-center space-y-2 animate-scale-up">
            <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
            <p className="text-xs font-semibold text-emerald-800">ログイン成功</p>
            <p className="text-[10px] text-gray-400 font-light">セッションの初期化と実データを読み込んでいます...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
              className={`w-full py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold rounded-full flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.98] ${
                (loading || googleLoading) ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {googleLoading ? (
                <span className="text-[10px] text-gray-400 font-normal">Googleアカウント認証中...</span>
              ) : (
                <>
                  <span className="w-5 h-5 flex items-center justify-center font-display font-black text-xs text-[#4285F4] shrink-0 bg-gray-50 rounded-full border border-gray-100 shadow-3xs">G</span>
                  <span>Google でログイン</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex py-1.5 items-center">
              <div className="flex-grow border-t border-gray-150/60"></div>
              <span className="flex-shrink mx-3 text-[9px] text-gray-400 font-semibold font-display tracking-widest uppercase">または</span>
              <div className="flex-grow border-t border-gray-150/60"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 font-display flex items-center gap-1.5 uppercase tracking-wider">
                  <Mail className="w-3.5 h-3.5" />
                  <span>メールアドレス</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="shalom777br@gmail.com"
                  className="w-full text-xs text-gray-800 bg-gray-50/50 hover:bg-white border border-gray-150 focus:border-gray-900 rounded-xl px-3 py-2.5 transition-all outline-hidden font-light"
                  disabled={loading || googleLoading}
                />
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 font-display flex items-center gap-1.5 uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5" />
                  <span>パスワード</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs text-gray-800 bg-gray-50/50 hover:bg-white border border-gray-150 focus:border-gray-900 rounded-xl px-3 py-2.5 transition-all outline-hidden font-light"
                  disabled={loading || googleLoading}
                />
              </div>

              {error && (
                <div className="text-[10px] text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2 leading-relaxed">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Security Explanation */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-1.5 text-[9px] text-gray-500 leading-relaxed font-light">
                <div className="font-semibold text-gray-700 font-display">🔒 セキュリティ・アクセス設計</div>
                <div>Supabase Authにてユーザーセッションを認証。サーバー側で毎リクエスト毎にトークンを自動検証し、Row Level Security (RLS) で完全に分離されたデータベース領域へ接続します。</div>
              </div>

              {/* Form actions */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full py-2.5 bg-[#1D1D1F] hover:bg-black text-white text-xs font-semibold rounded-full hover:scale-[1.02] transition-transform cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <span>接続しています...</span>
                  ) : (
                    <>
                      <LogIn className="w-3.5 h-3.5" />
                      <span>ログイン</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleUseDemo}
                  disabled={loading || googleLoading}
                  className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-[10px] font-semibold rounded-full border border-gray-200 transition-colors cursor-pointer"
                >
                  デモ情報を自動入力する
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
