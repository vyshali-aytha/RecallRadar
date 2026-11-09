"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { useSession } from "@/lib/session-context";

type LoginPayload = {
  success?: boolean;
  user?: unknown;
  error?: string;
};

const adminContactEmail = process.env.NEXT_PUBLIC_ADMIN_CONTACT_EMAIL?.trim();
const hasAdminContactEmail = Boolean(
  adminContactEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminContactEmail),
);

function isSessionUser(value: unknown): value is { userId: number; name: string; email: string; role: "Admin" | "Staff" } {
  if (!value || typeof value !== "object") return false;
  const user = value as Record<string, unknown>;
  return typeof user.userId === "number" && typeof user.name === "string" && typeof user.email === "string" && (user.role === "Admin" || user.role === "Staff");
}

function explainLoginError(status: number, message: string | undefined) {
  const normalized = message?.trim().toLowerCase();
  if (normalized === "invalid credentials.") return "The email address or password is incorrect.";
  if (normalized === "unsupported user role.") return "This account has a role RecallRadar cannot use. Please contact your administrator.";
  if (normalized === "email and password are required.") return "Enter both your email address and password.";
  if (status >= 500) return "RecallRadar could not complete sign in. Please try again shortly.";
  if (status === 401) return "The authentication service could not verify this account. Please try again shortly.";
  return "Sign in could not be completed. Check your details and try again.";
}

export default function LoginPage() {
  const router = useRouter();
  const { status, user, setAuthenticatedUser } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "authenticated") router.replace(user?.role === "Admin" ? "/admin" : "/");
  }, [router, status, user?.role]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError("Enter both your email address and password.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      const payload = await response.json().catch(() => null) as LoginPayload | null;
      if (!response.ok || payload?.success !== true || !isSessionUser(payload.user)) {
        setError(explainLoginError(response.status, payload?.error));
        return;
      }

      setAuthenticatedUser(payload.user);
      router.replace(payload.user.role === "Admin" ? "/admin" : "/");
    } catch {
      setError("RecallRadar could not be reached. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "authenticated") {
    return <div className="flex min-h-screen items-center justify-center bg-ivory px-5"><p className="text-sm font-medium text-muted">Opening your workspace…</p></div>;
  }

  return <main className="rr-premium min-h-screen bg-[#f4f3ed] px-4 py-5 sm:px-7 sm:py-8 lg:flex lg:items-center lg:justify-center lg:px-8 lg:py-10">
    <section className="mx-auto grid min-h-[680px] w-full max-w-[1200px] overflow-hidden rounded-[30px] bg-[#fbfbf8] shadow-[0_28px_80px_rgba(24,54,45,0.14)] lg:grid-cols-2">
      <div className="relative flex min-h-[360px] flex-col overflow-hidden bg-[#1e5045] px-7 py-7 text-white sm:px-10 sm:py-9 lg:min-h-[680px] lg:px-12 lg:py-11">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30"><div className="absolute -right-28 -top-24 size-[450px] rounded-full border border-white/20" /><div className="absolute -right-12 -top-8 size-[320px] rounded-full border border-white/15" /><div className="absolute -right-1 top-5 size-[220px] rounded-full border border-white/10" /><div className="absolute bottom-0 left-0 h-36 w-full bg-[linear-gradient(135deg,transparent_24%,rgba(214,230,117,0.08)_24%,rgba(214,230,117,0.08)_25%,transparent_25%,transparent_49%,rgba(255,255,255,0.05)_49%,rgba(255,255,255,0.05)_50%,transparent_50%)] bg-[length:54px_54px]" /></div>
        <div className="relative z-10 flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-[15px] bg-[#d6e675] text-[#1e5045]"><Icon name="radar" size={24} /></span><span className="leading-tight"><span className="block text-[17px] font-bold tracking-tight">RecallRadar</span><span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.2em] text-white/65">Supply-chain intelligence</span></span></div>
        <div className="relative z-10 mt-9 max-w-lg lg:mt-16"><p className="text-[10px] font-bold uppercase tracking-[0.19em] text-[#d6e675]">Clarity across every link</p><h2 className="rr-heading mt-4 text-[34px] font-semibold leading-[1.12] tracking-[-0.04em] sm:text-[42px] lg:text-[46px]">Know every batch.<br />Trace every impact.</h2><p className="mt-4 max-w-md text-sm leading-6 text-white/72 sm:text-[15px]">Follow critical components from their source to finished production and understand where a recall can reach.</p></div>
        <div className="relative z-10 mt-auto pt-8 lg:pt-10">
          <div className="rounded-[22px] border border-white/15 bg-[#123e35]/50 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between"><span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/55">A traceable supply chain</span><span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#d6e675]"><span className="size-1.5 rounded-full bg-[#d6e675]" />Relationship map</span></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:items-center sm:gap-0">
              {[{ label: "Supplier", icon: "truck" as const }, { label: "Component", icon: "layers" as const }, { label: "Product batch", icon: "package" as const }, { label: "Recall impact", icon: "shield" as const }].map((node, index) => <div className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.055] px-2.5 py-3 sm:mx-1 sm:flex-col sm:justify-center sm:gap-2 sm:px-2 sm:text-center" key={node.label}><span className={`flex size-8 shrink-0 items-center justify-center rounded-[11px] ${index === 3 ? "bg-[#d6e675] text-[#1e5045]" : "bg-white/10 text-white"}`}><Icon name={node.icon} size={16} /></span><span className="text-[10px] font-semibold leading-4 text-white/90">{node.label}</span>{index < 3 && <span aria-hidden="true" className="absolute -right-2 top-1/2 z-10 hidden h-px w-3 bg-[#d6e675]/70 sm:block" />}</div>)}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[9px] text-white/48"><span>Source</span><span className="h-px flex-1 mx-3 bg-white/15" /><span>Production</span><span className="h-px flex-1 mx-3 bg-white/15" /><span>Impact</span></div>
          </div>
          <p className="mt-5 text-[10px] font-medium tracking-wide text-white/45">RECALLRADAR · SUPPLY-CHAIN OPERATIONS</p>
        </div>
      </div>

      <div className="flex min-h-[540px] items-center justify-center bg-[#fbfbf8] px-6 py-10 sm:px-10 lg:min-h-[680px] lg:px-12">
        <div className="w-full max-w-[430px]">
          <div className="mb-8"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1e5045]">Team access</p><h1 className="rr-heading mt-3 text-[32px] font-semibold leading-tight tracking-[-0.04em] text-[#1d2926]">Welcome back</h1><p className="mt-2 text-sm leading-6 text-[#74807b]">Sign in to continue to your RecallRadar workspace.</p></div>
          {status === "loading" && <div className="mb-5 flex items-center gap-2 rounded-xl border border-[#e6e7e1] bg-white px-3.5 py-3 text-xs text-[#74807b]" role="status"><span className="size-2 animate-pulse rounded-full bg-[#d6e675]" />Checking your existing session…</div>}
          {status === "error" && <div className="mb-5 rounded-xl border border-[#d6e675]/60 bg-[#f7f8eb] px-3.5 py-3 text-xs leading-5 text-[#46554f]" role="status">Your existing session could not be checked. You can still try signing in.</div>}
          {error && <div className="mb-5 rounded-xl border border-[#c8563e]/20 bg-[#c8563e]/[0.06] px-3.5 py-3 text-sm leading-5 text-[#a64232]" id="login-error" role="alert">{error}</div>}
          <form className="space-y-5" onSubmit={submit}>
            <div><label className="mb-2 block text-[13px] font-semibold text-[#1d2926]" htmlFor="login-email">Email address</label><Input autoComplete="username" autoFocus className="min-h-[50px] rounded-[13px] border-[#dfe3dd] bg-white px-4 text-[14px] focus:border-[#1e5045] focus:ring-[#d6e675]/60" id="login-email" onChange={(event) => { setEmail(event.target.value); setError(""); }} placeholder="you@company.com" required type="email" value={email} /></div>
            <div><label className="mb-2 block text-[13px] font-semibold text-[#1d2926]" htmlFor="login-password">Password</label><div className="relative"><Input autoComplete="current-password" className="min-h-[50px] rounded-[13px] border-[#dfe3dd] bg-white px-4 pr-16 text-[14px] focus:border-[#1e5045] focus:ring-[#d6e675]/60" id="login-password" onChange={(event) => { setPassword(event.target.value); setError(""); }} required type={showPassword ? "text" : "password"} value={password} /><button aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute inset-y-0 right-2 my-auto min-h-9 rounded-lg px-2.5 text-xs font-bold text-[#1e5045] hover:bg-[#1e5045]/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1e5045]" onClick={() => setShowPassword((visible) => !visible)} type="button">{showPassword ? "Hide" : "Show"}</button></div></div>
            <Button className="min-h-[50px] w-full rounded-[13px] bg-[#1e5045] text-[13px] font-bold text-white shadow-[0_7px_16px_rgba(30,80,69,0.18)] hover:bg-[#17463c] focus-visible:outline-[#1e5045]" disabled={submitting || status === "loading"} type="submit">{submitting ? <><span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />Signing in…</> : "Sign in"}</Button>
          </form>
          <div className="mt-5 text-center text-[11px] leading-5 text-[#74807b]">
            <p>Don&apos;t have an account?</p>
            {hasAdminContactEmail ? (
              <a className="font-semibold text-[#1e5045] underline decoration-[#1e5045]/30 underline-offset-4 transition hover:text-[#17463c]" href={`mailto:${adminContactEmail}`}>
                Contact your administrator
              </a>
            ) : (
              <p className="mt-0.5 text-[10px]">Accounts are created by the RecallRadar administrator.</p>
            )}
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 border-t border-[#e7e8e2] pt-5 text-[11px] text-[#74807b]"><Icon className="text-[#1e5045]" name="shield" size={14} /><span>Protected access for RecallRadar team members</span></div>
        </div>
      </div>
    </section>
  </main>;
}
