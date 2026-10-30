"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Zap, 
  Flame, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  Play, 
  RotateCcw, 
  Trash2, 
  Code, 
  ArrowRight, 
  ShoppingBag, 
  CreditCard, 
  Activity, 
  Bot, 
  Check, 
  Copy, 
  Terminal,
  Cpu,
  Layers,
  Sparkles
} from "lucide-react";
import { 
  ChaosRules, 
  ChaosLogItem, 
  RedTeamLoophole, 
  RedTeamAuditResponse, 
  CheckoutResult 
} from "@/lib/types";
import { 
  getChaosRules, 
  updateChaosRules, 
  resetChaosRules, 
  getChaosLogs, 
  clearChaosLogs, 
  executeSampleCheckout, 
  runRedTeamAudit, 
  applyRedTeamShield, 
  verifyRedTeamShield 
} from "@/lib/api";

interface ChaosLabViewProps {
  repoId?: number;
}

export default function ChaosLabView({ repoId }: ChaosLabViewProps) {
  // 1. Chaos Rules State
  const [rules, setRules] = useState<ChaosRules>({
    active: false,
    latency_ms: 0,
    error_status: null,
    error_rate: 1.0,
    drop_request: false,
    malformed_response: false
  });
  const [updatingRules, setUpdatingRules] = useState(false);

  // 2. Sample App (Checkout) State
  const [quantity, setQuantity] = useState(1);
  const unitPrice = 49.0;
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [stuckWarning, setStuckWarning] = useState(false);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [clientShieldActive, setClientShieldActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 3. Live Request Timeline
  const [logs, setLogs] = useState<ChaosLogItem[]>([]);
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(true);

  // 4. Red-Team Autonomous Bot State
  const [auditData, setAuditData] = useState<RedTeamAuditResponse | null>(null);
  const [scanning, setScanning] = useState(false);
  const [deployingId, setDeployingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationFeedback, setVerificationFeedback] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load initial rules, logs, and audit data
  useEffect(() => {
    fetchRules();
    fetchLogs();
    fetchAudit();

    const interval = setInterval(() => {
      if (autoRefreshLogs) {
        fetchLogs();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [autoRefreshLogs]);

  const fetchRules = async () => {
    try {
      const r = await getChaosRules();
      setRules(r);
    } catch (err) {
      console.error("Failed to load chaos rules:", err);
    }
  };

  const fetchLogs = async () => {
    try {
      const l = await getChaosLogs();
      setLogs(l);
    } catch (err) {
      console.error("Failed to load logs:", err);
    }
  };

  const fetchAudit = async () => {
    try {
      const a = await runRedTeamAudit();
      setAuditData(a);
    } catch (err) {
      console.error("Failed to run red-team audit:", err);
    }
  };

  const handleUpdateRules = async (newRules: Partial<ChaosRules>) => {
    const merged = { ...rules, ...newRules };
    setRules(merged);
    setUpdatingRules(true);
    try {
      await updateChaosRules(merged);
    } catch (err) {
      console.error("Failed to apply rules:", err);
    } finally {
      setUpdatingRules(false);
    }
  };

  const handleResetRules = async () => {
    setUpdatingRules(true);
    try {
      const r = await resetChaosRules();
      setRules(r);
      fetchLogs();
    } catch (err) {
      console.error("Failed to reset rules:", err);
    } finally {
      setUpdatingRules(false);
    }
  };

  // Sample App Checkout Flow with Client AbortController & Exponential Backoff Retry
  const handleCheckout = async (fuzzQuantity?: number) => {
    const q = fuzzQuantity !== undefined ? fuzzQuantity : quantity;
    const total = q * unitPrice;
    setCheckoutLoading(true);
    setCheckoutResult(null);
    setCheckoutError(null);
    setStuckWarning(false);
    setRetryStatus(null);

    // Watchdog timer: If loading takes > 3.0s and shield is OFF, flag as stuck spinner!
    if (!clientShieldActive) {
      timerRef.current = setTimeout(() => {
        setStuckWarning(true);
      }, 3000);
    }

    try {
      if (clientShieldActive) {
        // WITH SHIELD: Client uses 3500ms AbortController + Exponential Backoff Retry
        let attempts = 0;
        const maxRetries = 2;
        let successResult: CheckoutResult | null = null;

        while (attempts <= maxRetries) {
          try {
            if (attempts > 0) {
              setRetryStatus(`Transient error detected. Automated retry attempt #${attempts} with backoff...`);
              await new Promise((r) => setTimeout(r, 600 * attempts));
            }

            successResult = await executeSampleCheckout({
              quantity: q,
              total_price: total,
              client_timeout_ms: 3500,
              retry_attempt: attempts,
              shield_enabled: true
            });
            break;
          } catch (retryErr: any) {
            attempts++;
            if (attempts > maxRetries) {
              throw retryErr;
            }
          }
        }

        if (successResult) {
          setCheckoutResult(successResult);
          setRetryStatus(attempts > 0 ? `Recovered gracefully on retry #${attempts}!` : null);
        }
      } else {
        // WITHOUT SHIELD: Naive call that hangs or breaks
        const result = await executeSampleCheckout({
          quantity: q,
          total_price: total,
          shield_enabled: false
        });
        setCheckoutResult(result);
      }
    } catch (err: any) {
      setCheckoutError(err.message || "Checkout transaction failed.");
    } finally {
      if (timerRef.current) clearTimeout(timerRef.current);
      setCheckoutLoading(false);
      fetchLogs();
    }
  };

  // Red-Team Bot Actions
  const handleScanCodebase = async () => {
    setScanning(true);
    try {
      const a = await runRedTeamAudit();
      setAuditData(a);
    } catch (err) {
      console.error("Scan error:", err);
    } finally {
      setScanning(false);
    }
  };

  const handleApplyFix = async (loopholeId: string) => {
    setDeployingId(loopholeId);
    try {
      await applyRedTeamShield(loopholeId);
      setClientShieldActive(true);
      
      // Auto-trigger verification attack
      setVerifyingId(loopholeId);
      const verifyRes = await verifyRedTeamShield(loopholeId);
      setVerificationFeedback((prev) => ({
        ...prev,
        [loopholeId]: verifyRes.re_attack_result
      }));

      // Refresh audit list
      await fetchAudit();
    } catch (err: any) {
      alert("Failed to apply patch: " + err.message);
    } finally {
      setDeployingId(null);
      setVerifyingId(null);
    }
  };

  const copyCurl = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full min-h-[calc(100vh-3.5rem)] bg-[#080c15] text-slate-100 p-6 overflow-y-auto space-y-8 font-sans">
      {/* 1. HERO HEADER DECK */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900/90 via-[#0d1424] to-slate-900/90 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-lg shadow-amber-500/10">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
                <span>API Chaos Lab</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-mono uppercase font-semibold">
                  Red-Team Resilience Engine
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5 font-mono">
                Deliberately break your backend via a local chaos proxy. Find loopholes, inject failures, and verify auto-healing patches.
              </p>
            </div>
          </div>
        </div>

        {/* Global Resilience Score Badge */}
        <div className="flex items-center space-x-4 z-10 shrink-0">
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 flex items-center space-x-3 shadow-xl">
            <div className={`p-2 rounded-xl ${
              (auditData?.resilience_score || 0) >= 80 
                ? "bg-emerald-500/20 text-emerald-400" 
                : "bg-amber-500/20 text-amber-400"
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono font-semibold text-slate-400">
                Resilience Score
              </div>
              <div className="text-lg font-bold font-mono text-white flex items-center space-x-1.5">
                <span>{auditData?.resilience_score ?? 25}%</span>
                <span className="text-[11px] font-normal text-slate-500">
                  ({(auditData?.loopholes_detected ?? 4)} vulnerabilities remaining)
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleScanCodebase}
            disabled={scanning}
            className="flex items-center space-x-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-semibold shadow-lg shadow-orange-600/25 transition-all active:scale-95 disabled:opacity-50"
          >
            <Bot className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
            <span>{scanning ? "Probing Codebase..." : "Launch Red-Team Probe"}</span>
          </button>
        </div>
      </div>

      {/* 2. THE THREE CORE LAB COLUMNS: PROXY CONTROL | SAMPLE APP | REQUEST TIMELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUMN 1: THE CHAOS CONTROL DECK (4 COLUMNS) */}
        <div className="lg:col-span-4 rounded-3xl bg-[#0c121e]/90 border border-white/10 p-5 space-y-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200 font-mono">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>Chaos Proxy Control Deck</span>
              </div>
              <button
                onClick={handleResetRules}
                disabled={updatingRules}
                className="flex items-center space-x-1 text-[11px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Reset all rules to 0ms healthy conditions"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All</span>
              </button>
            </div>

            {/* Master Chaos Toggle */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-200">Chaos Injection Proxy</div>
                <div className="text-[11px] text-slate-400">Intercepts and mutates local API traffic</div>
              </div>
              <button
                onClick={() => handleUpdateRules({ active: !rules.active })}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  rules.active ? "bg-amber-500" : "bg-slate-800"
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  rules.active ? "translate-x-6" : "translate-x-0"
                }`} />
              </button>
            </div>

            {/* Latency Injector Slider */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Latency Delay</span>
                </span>
                <span className="text-amber-400 font-bold">{rules.latency_ms} ms</span>
              </div>

              <input
                type="range"
                min="0"
                max="7000"
                step="250"
                value={rules.latency_ms}
                onChange={(e) => handleUpdateRules({ latency_ms: Number(e.target.value), active: true })}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />

              {/* Latency Presets */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[
                  { label: "Normal (0s)", val: 0 },
                  { label: "Slow 3G (2.5s)", val: 2500 },
                  { label: "Gateway Freeze (6s)", val: 6000 }
                ].map((p) => (
                  <button
                    key={p.val}
                    onClick={() => handleUpdateRules({ latency_ms: p.val, active: true })}
                    className={`py-1 rounded-lg text-[10px] transition-colors border ${
                      rules.latency_ms === p.val 
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30" 
                        : "bg-slate-800/60 text-slate-400 border-transparent hover:text-slate-200"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* HTTP Fault Injector */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 font-mono">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Inject HTTP Error Fault</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[
                  { code: null, label: "None" },
                  { code: 500, label: "500 Err" },
                  { code: 502, label: "502 Bad" },
                  { code: 504, label: "504 Time" }
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleUpdateRules({ error_status: item.code, active: true })}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      rules.error_status === item.code
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm"
                        : "bg-slate-800/60 text-slate-400 border-transparent hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dropped Socket & Malformed Response Toggles */}
            <div className="space-y-2 font-mono text-xs">
              <button
                onClick={() => handleUpdateRules({ drop_request: !rules.drop_request, active: true })}
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                  rules.drop_request
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    : "bg-slate-900/40 border-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>Drop Request (Socket Reset)</span>
                <span className="font-bold">{rules.drop_request ? "ENABLED" : "OFF"}</span>
              </button>

              <button
                onClick={() => handleUpdateRules({ malformed_response: !rules.malformed_response, active: true })}
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                  rules.malformed_response
                    ? "bg-violet-500/10 border-violet-500/30 text-violet-300"
                    : "bg-slate-900/40 border-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>Corrupt Payload (Null JSON)</span>
                <span className="font-bold">{rules.malformed_response ? "ENABLED" : "OFF"}</span>
              </button>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-[11px] text-slate-400 font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
            <span>Proxy operates strictly on local mock HTTP loopback without HTTPS interception.</span>
          </div>
        </div>

        {/* COLUMN 2: SAMPLE APP (DEMO CHECKOUT) (4 COLUMNS) */}
        <div className="lg:col-span-4 rounded-3xl bg-[#0c121e]/90 border border-white/10 p-5 space-y-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200 font-mono">
                <ShoppingBag className="w-4 h-4 text-indigo-400" />
                <span>Target Sample App: Checkout Flow</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Live Storefront
              </span>
            </div>

            {/* Product Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-[#080c15] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">RepoMind Pro Engine</h3>
                  <p className="text-xs text-slate-400 font-mono">Codebase AST & Resilience Toolkit</p>
                </div>
                <div className="text-base font-bold font-mono text-emerald-400">
                  ${unitPrice.toFixed(2)}
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs font-mono">
                <span className="text-slate-400">Quantity</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold text-white">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono pt-1">
                <span className="text-slate-400">Total Price</span>
                <span className="font-bold text-white text-sm">${(quantity * unitPrice).toFixed(2)}</span>
              </div>
            </div>

            {/* Client Resilience Shield Toggle */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className={`w-3.5 h-3.5 ${clientShieldActive ? "text-emerald-400" : "text-slate-500"}`} />
                  <span>Client Defense Shield</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {clientShieldActive 
                    ? "Active: 3.5s AbortController + Exponential Backoff Retry" 
                    : "Disabled: Vulnerable to hanging & crashes"}
                </div>
              </div>
              <button
                onClick={() => setClientShieldActive(!clientShieldActive)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  clientShieldActive ? "bg-emerald-500" : "bg-slate-800"
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  clientShieldActive ? "translate-x-6" : "translate-x-0"
                }`} />
              </button>
            </div>

            {/* Stuck Spinner Warning Alert */}
            {stuckWarning && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-2 animate-pulse">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  <strong>Stuck UI Spinner Detected:</strong> Request has hung for &gt;3s with no timeout abort mechanism!
                </span>
              </div>
            )}

            {/* Retry Status Indicator */}
            {retryStatus && (
              <div className="p-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-mono flex items-center gap-2">
                <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-indigo-400" />
                <span>{retryStatus}</span>
              </div>
            )}

            {/* Checkout Result / Error Box */}
            {checkoutResult && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs font-mono space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Order Confirmed: {checkoutResult.order_id}</span>
                </div>
                <div className="text-[11px] text-emerald-300/80">
                  Charged: ${checkoutResult.total_charged.toFixed(2)} in {checkoutResult.latency_ms}ms
                </div>
              </div>
            )}

            {checkoutError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  <span>Checkout Failed:</span>
                </div>
                <div className="text-[11px] text-rose-300/80">{checkoutError}</div>
              </div>
            )}

            {/* Checkout Trigger Button */}
            <button
              onClick={() => handleCheckout()}
              disabled={checkoutLoading}
              className={`w-full py-3.5 rounded-xl text-white text-xs font-bold font-mono transition-all flex items-center justify-center space-x-2 shadow-xl ${
                checkoutLoading
                  ? "bg-indigo-600/50 cursor-wait"
                  : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-95 shadow-indigo-600/25"
              }`}
            >
              {checkoutLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Checkout...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pay ${(quantity * unitPrice).toFixed(2)}</span>
                </>
              )}
            </button>
          </div>

          {/* Adversarial Quick Test Actions */}
          <div className="pt-3 border-t border-white/5 space-y-2">
            <div className="text-[10px] uppercase font-mono font-semibold text-slate-500">
              Quick Exploit Presets:
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <button
                onClick={() => {
                  handleUpdateRules({ latency_ms: 5500, active: true });
                  handleCheckout();
                }}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-white/5 text-left"
              >
                ⏱️ Timeout Exploit
              </button>
              <button
                onClick={() => {
                  handleCheckout(-5);
                }}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-rose-300 border border-white/5 text-left"
              >
                🔢 Negative Qty (-5)
              </button>
            </div>
          </div>
        </div>

        {/* COLUMN 3: LIVE REQUEST TIMELINE & WATERFALL CHART (4 COLUMNS) */}
        <div className="lg:col-span-4 rounded-3xl bg-[#0c121e]/90 border border-white/10 p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200 font-mono">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>Live Request Timeline</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={clearChaosLogs}
                  className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"
                  title="Clear timeline logs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={fetchLogs}
                  className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"
                  title="Refresh logs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Request Log Stream */}
            <div className="mt-3 space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs text-slate-500 font-mono">
                  No requests intercepted yet. Make a purchase or launch Red-Team probe.
                </div>
              ) : (
                logs.map((log) => {
                  const isSuccess = log.status_code >= 200 && log.status_code < 300;
                  const isTimeout = log.status_code === 504;
                  const isServerErr = log.status_code >= 500 && log.status_code !== 504;
                  const latencyPercent = Math.min(100, Math.max(5, (log.duration_ms / 6000) * 100));

                  return (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 space-y-1.5 font-mono text-[11px]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-indigo-400">{log.method}</span>
                          <span className="text-slate-300 truncate max-w-[130px]">{log.endpoint.replace('/api/chaos', '')}</span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isSuccess ? "bg-emerald-500/20 text-emerald-300" :
                          isTimeout ? "bg-amber-500/20 text-amber-300" :
                          isServerErr ? "bg-rose-500/20 text-rose-300" :
                          "bg-slate-800 text-slate-300"
                        }`}>
                          {log.status_code}
                        </span>
                      </div>

                      {/* Timing bar */}
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              log.duration_ms > 3000 ? "bg-rose-500" :
                              log.duration_ms > 1000 ? "bg-amber-400" :
                              "bg-emerald-400"
                            }`}
                            style={{ width: `${latencyPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">{log.duration_ms}ms</span>
                      </div>

                      {log.chaos_injected.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {log.chaos_injected.map((ci, idx) => (
                            <span key={idx} className="text-[9px] px-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              {ci}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-[10px] text-slate-500 font-mono flex items-center justify-between">
            <span>Interception Buffer</span>
            <span>{logs.length} requests logged</span>
          </div>
        </div>

      </div>

      {/* 3. AUTONOMOUS RED-TEAM LOOPHOLE FINDER & AUTO-HEALER SECTION */}
      <div className="rounded-3xl bg-[#0c121e]/90 border border-white/10 p-6 space-y-6 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2 font-mono">
              <Bot className="w-5 h-5 text-amber-400" />
              <span>Autonomous Red-Team Vulnerability & Resilience Probes</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              The AI Red-Team bot systematically probes your codebase for failure modes, provides reproduction proof, and waits for your permission to deploy self-healing code shields.
            </p>
          </div>

          <button
            onClick={handleScanCodebase}
            disabled={scanning}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold border border-white/10 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
            <span>Re-Run All Probes</span>
          </button>
        </div>

        {/* Loopholes List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {auditData?.loopholes.map((lh) => {
            const isShielded = lh.status === "verified_repaired" || lh.is_shielded;
            const feedback = verificationFeedback[lh.id];

            return (
              <div
                key={lh.id}
                className={`p-5 rounded-2xl border transition-all space-y-4 ${
                  isShielded
                    ? "bg-slate-950/40 border-emerald-500/30 shadow-lg shadow-emerald-500/5"
                    : "bg-[#090d16] border-white/10 hover:border-white/20"
                }`}
              >
                {/* Header: Title & Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                        lh.severity === "CRITICAL" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                        lh.severity === "HIGH" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                        "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      }`}>
                        {lh.severity}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {lh.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-100 font-mono">
                      {lh.title}
                    </h3>
                  </div>

                  <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl flex items-center space-x-1 shrink-0 ${
                    isShielded
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                  }`}>
                    {isShielded ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                    <span>{isShielded ? "SHIELD VERIFIED" : "LOOPHOLE DETECTED"}</span>
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {lh.description}
                </p>

                {/* Observed Failure Trace */}
                <div className="p-3 rounded-xl bg-slate-900/90 border border-white/5 space-y-1 font-mono text-xs">
                  <div className="text-[10px] uppercase font-semibold text-rose-400 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    <span>Observed Crash / Vulnerability</span>
                  </div>
                  <div className="text-slate-300 text-[11px]">{lh.observed_failure}</div>
                </div>

                {/* Reproduction Curl Snippet */}
                <div className="space-y-1 font-mono text-xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Reproduction Proof (cURL)</span>
                    <button
                      onClick={() => copyCurl(lh.reproduction_curl, lh.id)}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      {copiedId === lh.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === lh.id ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-white/5 text-[10px] text-slate-400 truncate">
                    {lh.reproduction_curl}
                  </div>
                </div>

                {/* Proposed Defense Patch (Diff) */}
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                    <Code className="w-3 h-3 text-indigo-400" />
                    <span>Proposed Defensive Code Patch</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-white/10 font-mono text-[10px] overflow-x-auto whitespace-pre leading-relaxed text-slate-300">
                    {lh.proposed_diff.split("\n").map((line, idx) => {
                      const isAdd = line.startsWith("+");
                      const isDel = line.startsWith("-");
                      const isHeader = line.startsWith("@@");
                      return (
                        <div
                          key={idx}
                          className={`${
                            isAdd ? "text-emerald-400 bg-emerald-500/10 px-1 rounded" :
                            isDel ? "text-rose-400 bg-rose-500/10 px-1 rounded" :
                            isHeader ? "text-violet-400 font-bold" :
                            "text-slate-400"
                          }`}
                        >
                          {line}
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-[11px] text-slate-400 italic">
                    {lh.fix_explanation}
                  </div>
                </div>

                {/* Verification Feedback Banner */}
                {feedback && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{feedback}</span>
                  </div>
                )}

                {/* Human-In-The-Loop Action Button */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Requires owner approval to deploy
                  </span>

                  <button
                    onClick={() => handleApplyFix(lh.id)}
                    disabled={deployingId === lh.id || verifyingId === lh.id}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
                      isShielded
                        ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10"
                        : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20 active:scale-95"
                    }`}
                  >
                    {deployingId === lh.id ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Deploying Shield...</span>
                      </>
                    ) : verifyingId === lh.id ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-300" />
                        <span>Re-Attacking to Verify...</span>
                      </>
                    ) : isShielded ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Re-Verify Shield</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Approve & Apply Shield Patch</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
