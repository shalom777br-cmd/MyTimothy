import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Github, Key, CheckCircle2, AlertCircle, RefreshCw, Lock, HelpCircle, ShieldCheck, Settings } from "lucide-react";

interface GithubSettingsProps {
  onTokenChange: () => void;
}

interface GithubStatus {
  authenticated: boolean;
  username: string | null;
  scopes: string[];
  serverTokenSet: boolean;
  rateLimit: {
    limit: number;
    remaining: number;
    reset: number;
  } | null;
  error?: string;
}

export const GithubSettings: React.FC<GithubSettingsProps> = ({ onTokenChange }) => {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<GithubStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("temote_github_pat") || "";
    setToken(savedToken);
    checkStatus(savedToken);
  }, []);

  const checkStatus = async (tokenToCheck: string, isManual = false) => {
    setLoading(true);
    if (isManual) setMessage(null);
    try {
      const headers: Record<string, string> = {};
      if (tokenToCheck) {
        headers["X-GitHub-Token"] = tokenToCheck;
      }

      const res = await fetch("/api/github/status", { headers });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setStatus(data);
          if (isManual) {
            if (data.authenticated) {
              setMessage({
                text: `GitHub 接続は正常です！接続確認に成功しました。(連携ユーザー: @${data.username || "guest"})`,
                type: "success",
              });
            } else {
              setMessage({
                text: data.error || "GitHub 接続に失敗しました。トークンが無効か、有効期限が切れています。",
                type: "error",
              });
            }
          }
        } else {
          console.warn("Invalid content-type from github status check:", contentType);
          setStatus(null);
          if (isManual) {
            setMessage({
              text: "サーバーから無効な応答形式（JSON以外）を受け取りました。",
              type: "error",
            });
          }
        }
      } else {
        setStatus(null);
        if (isManual) {
          setMessage({
            text: `接続確認に失敗しました（HTTPステータス: ${res.status}）`,
            type: "error",
          });
        }
      }
    } catch (err: any) {
      console.warn("Error checking GitHub status:", err);
      setStatus(null);
      if (isManual) {
        setMessage({
          text: `接続確認中にエラーが発生しました: ${err.message || "通信状況を確認してください。"}`,
          type: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setMessage(null);

    const cleanToken = token.trim();

    try {
      const headers: Record<string, string> = {};
      if (cleanToken) {
        headers["X-GitHub-Token"] = cleanToken;
      }

      const res = await fetch("/api/github/status", { headers });
      
      if (!res.ok) {
        const text = await res.text();
        let errMsg = `接続確認に失敗しました（HTTPステータス: ${res.status}）`;
        if (text.includes("<!DOCTYPE") || text.includes("<html")) {
          errMsg = "サーバーからHTMLページが返されました。バックエンドが未起動であるか、新しいAPIルーティングのデプロイが完了していない可能性があります。";
        } else {
          try {
            const parsedErr = JSON.parse(text);
            errMsg = parsedErr.error || parsedErr.message || errMsg;
          } catch (_) {
            errMsg = text || errMsg;
          }
        }
        setMessage({ text: errMsg, type: "error" });
        setTesting(false);
        return;
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        setMessage({
          text: "サーバーから無効な応答形式（JSON以外）を受け取りました。最新のビルドが正しくデプロイされ、反映されているか確認してください。",
          type: "error",
        });
        setTesting(false);
        return;
      }

      const data = await res.json();

      if (data.authenticated) {
        // Save token
        if (cleanToken) {
          localStorage.setItem("temote_github_pat", cleanToken);
          setMessage({
            text: `GitHub 接続テストに成功しました！トークンを保存しました。(連携ユーザー: @${data.username || "guest"})`,
            type: "success",
          });
        } else {
          localStorage.removeItem("temote_github_pat");
          setMessage({
            text: "カスタムトークンを削除し、接続確認に成功しました！",
            type: "success",
          });
        }
        setStatus(data);
        onTokenChange();
      } else {
        setMessage({
          text: data.error || "認証に失敗しました。トークンが無効であるか、有効期限が切れています。",
          type: "error",
        });
      }
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      console.error("Save token error:", err);
      setMessage({
        text: `接続確認中にネットワークエラーが発生しました: ${err.message || "インターネット接続やサーバー設定を確認してください。"}`,
        type: "error",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleClearToken = () => {
    localStorage.removeItem("temote_github_pat");
    setToken("");
    setMessage({
      text: "設定したトークンを削除しました。",
      type: "success",
    });
    checkStatus("");
    onTokenChange();
    setTimeout(() => setMessage(null), 3000);
  };

  const isConnected = status?.authenticated || (status?.serverTokenSet && !token);

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xs hover:shadow-sm transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
            <Github className="w-5 h-5 text-[#24292F]" />
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] font-display">GitHub Integration</h4>
            <h3 className="text-sm font-semibold text-[#1D1D1F] tracking-tight">GitHubリポジトリ自動分析 & 連携設定</h3>
          </div>
        </div>

        {/* Connection Status Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-gray-50/50 border-gray-150 text-xs font-medium">
            <div className="relative flex h-2 w-2">
              {isConnected ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
              )}
            </div>
            <span className="text-[11px] text-gray-700">
              {isConnected ? "接続完了 (Active)" : "未連携 (Inactive)"}
            </span>
          </div>

          <button
            onClick={() => checkStatus(token, true)}
            disabled={loading}
            title="最新の接続状況をチェック"
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-all border border-transparent hover:border-gray-100 shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Status Dashboard / Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">認証ソース</span>
            <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
              {token ? (
                <>
                  <Key className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>カスタムPAT（localStorage）</span>
                </>
              ) : status?.serverTokenSet ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>サーバー規定設定 (Server PAT)</span>
                </>
              ) : (
                <span className="text-gray-400">未設定</span>
              )}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">連携ユーザー</span>
            <span className="text-xs font-semibold text-gray-800 font-mono">
              {status?.username ? `@${status.username}` : "ゲスト（パブリックのみ）"}
            </span>
          </div>

          {status?.rateLimit && (
            <div className="sm:col-span-2 pt-2 border-t border-gray-100 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">APIレート制限</span>
                <span className="text-xs font-mono font-medium text-gray-700">
                  {status.rateLimit.remaining} / {status.rateLimit.limit} 残り
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">トークン権限範囲 (Scopes)</span>
                <span className="text-[10px] font-mono text-gray-600 block truncate" title={status.scopes.join(", ") || "なし"}>
                  {status.scopes.join(", ") || "読み取り専用 (No Scope)"}
                </span>
              </div>
            </div>
          )}
        </div>

        <p className="text-[11px] text-gray-400 leading-relaxed font-light">
          連携された各プロジェクトのGitHubリポジトリ設定から、最新コミット・オープンIssue・プッシュ日時をテモテが自動的に取得。
          直前の進捗を賢く分析し、<strong>「次に取り組むべき最高の一歩」</strong>をトップ画面であなたに提案します。
        </p>

        {/* Action Button to Expand Token Form */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowTokenInput(!showTokenInput)}
            className="text-xs text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{showTokenInput ? "設定フォームを閉じる" : "トークン設定・権限を管理する"}</span>
          </button>
        </div>

        {showTokenInput && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSaveToken}
            className="space-y-4 pt-4 border-t border-gray-100"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-gray-400" />
                  <span>GitHub Personal Access Token (PAT)</span>
                </label>
                <a
                  href="https://github.com/settings/tokens/new?description=Temote%20App&scopes=repo"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[9px] text-[#24292F] hover:underline flex items-center gap-1"
                >
                  <HelpCircle className="w-3 h-3 text-gray-400" />
                  <span>トークンを発行する ↗</span>
                </a>
              </div>

              <div className="relative">
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full text-xs text-gray-800 bg-gray-50/50 hover:bg-white border border-gray-150 focus:border-gray-900 rounded-xl pl-4 pr-10 py-3 transition-all outline-hidden font-mono"
                  placeholder="ghp_xxxxxxxxxxxxxxx"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300">
                  <Lock className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-center gap-1.5 p-3 rounded-xl bg-gray-50/50 border border-gray-100 text-[10px] text-gray-400 font-light leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  <strong>セキュリティ方針:</strong> 入力されたPATはローカルブラウザ（localStorage）にのみ暗号化（一時保持）され、
                  GitHub APIへの通信時以外には第三者やサーバーのDBに永続保存されることは一切ありません。
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              {localStorage.getItem("temote_github_pat") ? (
                <button
                  type="button"
                  onClick={handleClearToken}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-semibold rounded-full border border-red-100 transition-colors cursor-pointer"
                >
                  カスタムトークンをクリア
                </button>
              ) : (
                <div />
              )}

              <button
                type="submit"
                disabled={testing}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold bg-[#1D1D1F] hover:bg-black text-white shadow-xs transition-transform duration-200 hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
              >
                {testing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>検証中...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>トークンをテストして保存</span>
                  </>
                )}
              </button>
            </div>
          </motion.form>
        )}

        {/* Success / Error Toast Message */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-xs leading-relaxed ${
              message.type === "success"
                ? "bg-emerald-50/70 border-emerald-100 text-emerald-800"
                : "bg-red-50/70 border-red-100 text-red-800"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <span>{message.text}</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};
