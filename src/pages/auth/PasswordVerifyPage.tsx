/**
 * Password Verify Page — Forgot, Reset, OTP.
 *
 * Same layout as LoginPage (left brand panel + right card).
 * Content changes based on `?mode=forgot|reset|otp`.
 */
import { useEffect, useState, type FormEvent, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Sparkles,
  ShieldCheck,
  Activity,
  Boxes,
  TestTube2,
  Moon,
  Sun,
  Building2,
  KeyRound,
  CheckCircle2,
  Zap,
  RefreshCw,
  UserCheck,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { useSettings } from "@/stores/settings.store";
import { useAuth } from "@/stores/auth.store";
import {
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  signInWithCustomToken,
  auth,
} from "@/lib/firebase";
import { userMgmtService } from "@/services/userMgmt.service";
import { cn } from "@/utils/cn";
import {
  isValidEmail,
  isValidPassword,
  EMAIL_PATTERN_ERROR,
  PASSWORD_PATTERN_ERROR,
} from "@/utils/authValidation";

type PasswordMode = "forgot" | "reset" | "otp";

// ---------- Left panel config per mode ----------
const LEFT_PANEL_CONFIG: Record<
  PasswordMode,
  {
    badge: string;
    title: string;
    subtitle: string;
    highlights: { icon: any; title: string; desc: string }[];
  }
> = {
  forgot: {
    badge: "Secure your account – hassle‑free",
    title: "Reset your password securely",
    subtitle:
      "We’ll send a recovery link to your email – no hassle, just security.",
    highlights: [
      {
        icon: Mail,
        title: "Email verification",
        desc: "Confirm ownership of your account.",
      },
      {
        icon: ShieldCheck,
        title: "Secure link",
        desc: "Single‑use, time‑limited reset token.",
      },
      {
        icon: Clock,
        title: "Quick recovery",
        desc: "Back in your account in minutes.",
      },
      {
        icon: CheckCircle2,
        title: "No data loss",
        desc: "Your projects and settings stay safe.",
      },
    ],
  },
  reset: {
    badge: "Strengthen your account security",
    title: "Create a strong new password",
    subtitle: "Choose a password you haven’t used before – we’ll keep it safe.",
    highlights: [
      {
        icon: Lock,
        title: "Strong encryption",
        desc: "Your new password is hashed and secured.",
      },
      {
        icon: RefreshCw,
        title: "Immediate effect",
        desc: "Password updates take effect right away.",
      },
      {
        icon: UserCheck,
        title: "Account protection",
        desc: "Helps prevent unauthorized access.",
      },
      {
        icon: Activity,
        title: "Stay signed in",
        desc: "No need to log out after reset.",
      },
    ],
  },
  otp: {
    badge: "Password‑free & instant",
    title: "One‑time access – fast & safe",
    subtitle: "Get a temporary code via email and log in without a password.",
    highlights: [
      {
        icon: Zap,
        title: "No password needed",
        desc: "Just your email and a one‑time code.",
      },
      {
        icon: Clock,
        title: "Expires quickly",
        desc: "Codes are valid for a short time only.",
      },
      {
        icon: ShieldCheck,
        title: "Phishing‑proof",
        desc: "Codes are unique to each login attempt.",
      },
      {
        icon: Mail,
        title: "Delivered instantly",
        desc: "Code arrives in your inbox in seconds.",
      },
    ],
  },
};

// ---------- Canvas particle field ----------
const CanvasParticles = ({ isDark }: { isDark: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let w = 0,
      h = 0,
      dpr = Math.min(window.devicePixelRatio || 1, 2);

    type P = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      c: string;
    };
    const colors = isDark
      ? ["#ff4400", "#1e00ff", "#00ff33"]
      : ["#ff5b1f", "#1fbf9a", "#ffb400"];
    let particles: P[] = [];

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      const count = Math.min(70, Math.floor((w * h) / 22000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 2 + 1,
        c: colors[Math.floor(Math.random() * colors.length)],
      }));
    };

    const linkRgb = isDark ? "255,255,255" : "17,24,39";

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = isDark ? 0.65 : 0.55;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i],
            b = particles[j];
          const dx = a.x - b.x,
            dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 120 * 120) {
            ctx.strokeStyle = `rgba(${linkRgb},${(isDark ? 0.16 : 0.12) * (1 - d2 / (120 * 120))})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    resize();
    tick();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ pointerEvents: "none" }}
    />
  );
};

// ---------- Helper components ----------
const Field = ({
  icon: Icon,
  testid,
  trailing,
  isDark = true,
  error,
  hint,
  ...rest
}: {
  icon: any;
  testid: string;
  trailing?: React.ReactNode;
  isDark?: boolean;
  error?: string;
  /** Persistent helper text shown below the field when there's no error. */
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div>
    <div
      className={cn(
        "group relative flex items-center rounded-lg border transition-all",
        error
          ? "border-rose-500/60"
          : isDark
            ? "border-white/10 bg-white/[0.03] focus-within:border-[#ff5b1f]/55 focus-within:bg-white/[0.06]"
            : "border-black/10 bg-black/[0.03] focus-within:border-[#ff5b1f]/65 focus-within:bg-white",
      )}
    >
      <Icon
        className={cn(
          "ml-3 h-4 w-4 shrink-0 transition-colors group-focus-within:text-[#ff8c4a]",
          isDark ? "text-white/40" : "text-gray-400",
        )}
      />
      <input
        {...rest}
        data-testid={testid}
        aria-invalid={!!error}
        // See the matching comment in LoginPage.tsx's Field — opts this
        // input out of tailwind.css's global focus border/box-shadow rule,
        // which otherwise stacks a second glow box on top of this
        // component's own focus-within border.
        className={cn(
          "no-global-focus-ring flex-1 bg-transparent px-3 py-2.5 text-sm outline-none",
          isDark
            ? "text-white placeholder-white/35"
            : "text-gray-900 placeholder-gray-400",
        )}
      />
      {trailing && <div className="mr-3">{trailing}</div>}
    </div>
    {error ? (
      <p
        data-testid={`${testid}-error`}
        className="mt-1 text-[11px] text-rose-500"
      >
        {error}
      </p>
    ) : (
      hint && (
        <p
          data-testid={`${testid}-hint`}
          className={cn(
            "mt-1 text-[11px]",
            isDark ? "text-white/40" : "text-gray-400",
          )}
        >
          {hint}
        </p>
      )
    )}
  </div>
);

// ---------- Main Component ----------
export const PasswordVerifyPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = (params.get("mode") as PasswordMode) || "forgot";

  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const isDark = theme === "dark";

  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // "Try another way (OTP sign in)" / "Try reset password" only change the
  // `?mode=` query param — this component stays mounted, so without this,
  // a stale banner (or a leftover in-progress OTP screen) from the
  // PREVIOUS mode kept showing under the new mode's own form.
  useEffect(() => {
    setErrorMsg(null);
    setInfoMsg(null);
    setEmailFieldError(undefined);
    setOtpSent(false);
    setOtp("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  // Field-level email pattern error — shown under the email input itself,
  // separate from `errorMsg`/`infoMsg` (the top-of-form banners).
  const [emailFieldError, setEmailFieldError] = useState<string | undefined>();

  const oobCode = params.get("oobCode"); // Firebase fallback link
  const ourToken = params.get("token");  // our own reset link (primary)

  // Validate the incoming link for reset mode.
  //   • Our own `?token=...` link: no pre-check round-trip needed — same
  //     as VerifyEmailPage, the token gets consumed server-side on submit.
  //   • Firebase's `?oobCode=...` fallback link: still needs Firebase's
  //     own pre-validation call, same as before.
  const [isValidCode, setIsValidCode] = useState<boolean | null>(null);
  useEffect(() => {
    if (mode !== "reset") return;
    if (ourToken) {
      setIsValidCode(true);
      return;
    }
    if (oobCode) {
      verifyPasswordResetCode(auth, oobCode)
        .then((resolvedEmail) => {
          setIsValidCode(true);
          setEmail(resolvedEmail);
        })
        .catch(() => {
          setIsValidCode(false);
          setErrorMsg(
            "The reset link is invalid or has expired. Please request a new one.",
          );
        });
    }
  }, [mode, oobCode, ourToken]);

  // Shared handlers
  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    // Validate the email SHAPE before ever calling the backend — previously
    // an obviously malformed address (e.g. "abc@") still hit
    // userMgmtService.forgotPassword and came back as a generic success,
    // since that endpoint intentionally never discloses whether an address
    // exists (to avoid user enumeration). That's correct for "email not
    // found", but it was also masking "email isn't even a valid shape",
    // which should never get a success message.
    if (!isValidEmail(email)) {
      setEmailFieldError(EMAIL_PATTERN_ERROR);
      return;
    }
    setEmailFieldError(undefined);
    setErrorMsg(null);
    setInfoMsg(null);
    setSubmitting(true);
    try {
      // Our own backend + SendGrid template is primary. Firebase's native
      // sendPasswordResetEmail only fires as a fallback, and only when our
      // send genuinely failed — so a SendGrid outage never blocks a user
      // from resetting their password, but the happy path always uses our
      // branded email.
      const { emailDispatched } = await userMgmtService.forgotPassword(email.trim());
      if (!emailDispatched) {
        await sendPasswordResetEmail(auth, email.trim()).catch(() => {});
      }
      // Echo back exactly what the user typed — lets them visually catch
      // their own typo (e.g. a mistyped company email) without us ever
      // disclosing whether that address is actually registered.
      setInfoMsg(`If ${email.trim()} is registered, we've sent a reset link.`);
    } catch (err: any) {
      setErrorMsg(
        err?.message || "Failed to send reset link. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!ourToken && !oobCode) return;
    // Match the backend's actual requirement (ResetPasswordRequest —
    // @Size(min=8, max=128), plus AuthService requiring a letter + digit).
    // This used to only check length >= 6, so a 6-7 char password sailed
    // through here and only failed later at the backend with a generic
    // error — now it's caught up front with the real reason.
    if (!isValidPassword(newPassword)) {
      setErrorMsg(PASSWORD_PATTERN_ERROR);
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    setErrorMsg(null);
    setInfoMsg(null);
    setSubmitting(true);
    try {
      if (ourToken) {
        await userMgmtService.resetPassword(ourToken, newPassword);
      } else if (oobCode) {
        await confirmPasswordReset(auth, oobCode, newPassword);
      }
      setInfoMsg("Password reset successfully! You can now sign in.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      setErrorMsg(
        err?.message || "Failed to reset password. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    // Same as forgot-password: reject an invalid SHAPE before calling the
    // backend, instead of always showing "a code was sent" regardless of
    // whether the address could even be real.
    if (!isValidEmail(email)) {
      setEmailFieldError(EMAIL_PATTERN_ERROR);
      return;
    }
    setEmailFieldError(undefined);
    setErrorMsg(null);
    setInfoMsg(null);
    setSubmitting(true);
    try {
      await userMgmtService.requestOtp(email.trim());
      setOtpSent(true);
      setResendTimer(60);
      setInfoMsg(`If that email exists, a code was sent to ${email.trim()}.`);
      const interval = setInterval(() => {
        setResendTimer((t) => {
          if (t <= 1) {
            clearInterval(interval);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to send code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setErrorMsg("Please enter a valid 6-digit code.");
      return;
    }
    setErrorMsg(null);
    setInfoMsg(null);
    setSubmitting(true);
    try {
      // Verifying the code mints a Firebase custom token server-side —
      // exchange it for a real Firebase session, exactly like every other
      // sign-in path (password, Google, GitHub) ends up with one.
      const { customToken } = await userMgmtService.verifyOtp(email.trim(), otp);
      const userCred = await signInWithCustomToken(auth, customToken);
      const idToken = await userCred.user.getIdToken();
      const payload = JSON.parse(atob(idToken.split(".")[1]));
      const expiresInSec = payload.exp - Math.floor(Date.now() / 1000);
      const user = await userMgmtService.me(idToken);

      useAuth.getState().setSession({
        accessToken: idToken,
        refreshToken: "",
        expiresInSec,
        user,
      });

      setInfoMsg("Signed in! Redirecting…");
      setTimeout(() => navigate("/projects/collections"), 800);
    } catch (err: any) {
      setErrorMsg(err?.message || "Invalid code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Mode configuration ----
  const modeConfig = {
    forgot: {
      title: "Reset password",
      subtitle: "Enter your email address and we’ll send you a reset link.",
      renderForm: () => (
        <form onSubmit={handleForgotPassword} className="mt-6 space-y-3.5">
          {errorMsg && (
            <div
              data-testid="auth-error"
              className={cn(
                "rounded-lg border px-3 py-2 text-[12px] leading-relaxed text-balance",
                isDark
                  ? "border-rose-500/35 bg-rose-500/10 text-rose-200"
                  : "border-rose-500/40 bg-rose-50 text-rose-700",
              )}
            >
              {errorMsg}
            </div>
          )}
          {infoMsg && (
            <div
              data-testid="auth-info"
              className={cn(
                "rounded-lg border px-3 py-2 text-[12px] leading-relaxed text-balance",
                isDark
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "border-emerald-500/40 bg-emerald-50 text-emerald-800",
              )}
            >
              {infoMsg}
            </div>
          )}
          <Field
            icon={Mail}
            testid="auth-input-email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailFieldError(undefined);
            }}
            required
            autoComplete="email"
            maxLength={254}
            isDark={isDark}
            error={emailFieldError}
          />
          <button
            type="submit"
            data-testid="auth-submit-btn"
            disabled={submitting}
            className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#ff5b1f] to-[#ff8c4a] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff5b1f]/25 transition-all hover:shadow-[#ff5b1f]/45 disabled:opacity-60"
          >
            {submitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
            ) : (
              <>
                Send reset link{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
          <div className="mt-6 flex items-center gap-3">
            <span
              className={cn(
                "h-px flex-1",
                isDark ? "bg-white/10" : "bg-black/10",
              )}
            />
            <span
              className={cn(
                "text-[11px] uppercase tracking-[0.18em]",
                isDark ? "text-white/35" : "text-gray-400",
              )}
            >
              or
            </span>
            <span
              className={cn(
                "h-px flex-1",
                isDark ? "bg-white/10" : "bg-black/10",
              )}
            />
          </div>
          <button
            type="button"
            onClick={() => navigate("/password?mode=otp")}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all",
              isDark
                ? "border-white/10 bg-white/[0.03] text-white/80 hover:border-[#1fbf9a]/40 hover:text-white"
                : "border-black/10 bg-black/[0.03] text-gray-600 hover:border-[#1fbf9a]/55 hover:text-gray-900",
            )}
          >
            <KeyRound className="h-4 w-4" />
            Try another way (OTP sign in)
          </button>
          <p
            className={cn(
              "mt-4 text-center text-xs",
              isDark ? "text-white/45" : "text-gray-500",
            )}
          >
            <Link
              to="/login"
              className="font-medium text-[#ffb400] hover:text-[#ff8c4a]"
            >
              ← Back to sign in
            </Link>
          </p>
        </form>
      ),
    },
    reset: {
      title: "Set new password",
      subtitle: "Create a new password for your account.",
      renderForm: () => {
        if (isValidCode === false) {
          return (
            <>
              <h1
                className={cn(
                  "text-2xl font-bold",
                  isDark ? "text-white" : "text-gray-900",
                )}
              >
                Invalid or expired link
              </h1>
              <p
                className={cn(
                  "mt-2 text-sm",
                  isDark ? "text-white/55" : "text-gray-500",
                )}
              >
                The reset link is invalid or has expired. Please request a new
                one.
              </p>
              <button
                type="button"
                onClick={() => navigate("/password?mode=forgot")}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#ff5b1f] to-[#ff8c4a] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff5b1f]/25 transition-all hover:shadow-[#ff5b1f]/45"
              >
                Request new link
              </button>
              <p
                className={cn(
                  "mt-4 text-center text-xs",
                  isDark ? "text-white/45" : "text-gray-500",
                )}
              >
                <Link
                  to="/login"
                  className="font-medium text-[#ffb400] hover:text-[#ff8c4a]"
                >
                  ← Back to sign in
                </Link>
              </p>
            </>
          );
        }
        return (
          <form onSubmit={handleResetPassword} className="mt-6 space-y-3.5">
            {errorMsg && (
              <div
                data-testid="auth-error"
                className={cn(
                  "rounded-lg border px-3 py-2 text-[12px] leading-relaxed text-balance",
                  isDark
                    ? "border-rose-500/35 bg-rose-500/10 text-rose-200"
                    : "border-rose-500/40 bg-rose-50 text-rose-700",
                )}
              >
                {errorMsg}
              </div>
            )}
            {infoMsg && (
              <div
                data-testid="auth-info"
                className={cn(
                  "rounded-lg border px-3 py-2 text-[12px] leading-relaxed text-balance",
                  isDark
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-emerald-500/40 bg-emerald-50 text-emerald-800",
                )}
              >
                {infoMsg}
              </div>
            )}
            <Field
              icon={Lock}
              testid="auth-input-new-password"
              type={showPwd ? "text" : "password"}
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              maxLength={128}
              isDark={isDark}
              hint="At least 8 characters, with letters and numbers"
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPwd((p) => !p)}
                  className={
                    isDark
                      ? "text-white/45 hover:text-white"
                      : "text-gray-400 hover:text-gray-700"
                  }
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />
            <Field
              icon={Lock}
              testid="auth-input-confirm-password"
              type={showPwd ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              maxLength={128}
              isDark={isDark}
            />
            <button
              type="submit"
              data-testid="auth-submit-btn"
              disabled={submitting || isValidCode === null}
              className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#ff5b1f] to-[#ff8c4a] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff5b1f]/25 transition-all hover:shadow-[#ff5b1f]/45 disabled:opacity-60"
            >
              {submitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
              ) : (
                <>
                  Reset password{" "}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
            <p
              className={cn(
                "mt-4 text-center text-xs",
                isDark ? "text-white/45" : "text-gray-500",
              )}
            >
              <Link
                to="/login"
                className="font-medium text-[#ffb400] hover:text-[#ff8c4a]"
              >
                ← Back to sign in
              </Link>
            </p>
          </form>
        );
      },
    },
    otp: {
      title: "OTP sign in",
      subtitle: "Enter your email address and we’ll send you a one-time code.",
      renderForm: () => {
        if (!otpSent) {
          return (
            <form onSubmit={handleSendOtp} className="mt-6 space-y-3.5">
              {errorMsg && (
                <div
                  data-testid="auth-error"
                  className={cn(
                    "rounded-lg border px-3 py-2 text-[12px] leading-relaxed text-balance",
                    isDark
                      ? "border-rose-500/35 bg-rose-500/10 text-rose-200"
                      : "border-rose-500/40 bg-rose-50 text-rose-700",
                  )}
                >
                  {errorMsg}
                </div>
              )}
              {infoMsg && (
                <div
                  data-testid="auth-info"
                  className={cn(
                    "rounded-lg border px-3 py-2 text-[12px] leading-relaxed text-balance",
                    isDark
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                      : "border-emerald-500/40 bg-emerald-50 text-emerald-800",
                  )}
                >
                  {infoMsg}
                </div>
              )}
              <Field
                icon={Mail}
                testid="auth-input-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailFieldError(undefined);
                }}
                required
                autoComplete="email"
                isDark={isDark}
                error={emailFieldError}
              />
              <button
                type="submit"
                data-testid="auth-submit-btn"
                disabled={submitting}
                className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#ff5b1f] to-[#ff8c4a] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff5b1f]/25 transition-all hover:shadow-[#ff5b1f]/45 disabled:opacity-60"
              >
                {submitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                ) : (
                  <>
                    Send OTP{" "}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
              {/* Pre-send confirmation — lets the user proofread their own
                  typed address before we act on it (WhatsApp/Telegram-style
                  "code will be sent to +91 xxxxx" nudge), without disclosing
                  whether that address is actually registered. */}
              {email.trim() && (
                <p
                  className={cn(
                    "flex items-start gap-1.5 text-[11px] italic",
                    isDark ? "text-white/45" : "text-gray-500",
                  )}
                >
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>
                    If{" "}
                    <span className="not-italic font-medium">
                      {email.trim()}
                    </span>{" "}
                    matches an account, an OTP will be sent to it.
                  </span>
                </p>
              )}
              <div className="mt-6 flex items-center gap-3">
                <span
                  className={cn(
                    "h-px flex-1",
                    isDark ? "bg-white/10" : "bg-black/10",
                  )}
                />
                <span
                  className={cn(
                    "text-[11px] uppercase tracking-[0.18em]",
                    isDark ? "text-white/35" : "text-gray-400",
                  )}
                >
                  or
                </span>
                <span
                  className={cn(
                    "h-px flex-1",
                    isDark ? "bg-white/10" : "bg-black/10",
                  )}
                />
              </div>
              <button
                type="button"
                onClick={() => navigate("/password?mode=forgot")}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all",
                  isDark
                    ? "border-white/10 bg-white/[0.03] text-white/80 hover:border-[#1fbf9a]/40 hover:text-white"
                    : "border-black/10 bg-black/[0.03] text-gray-600 hover:border-[#1fbf9a]/55 hover:text-gray-900",
                )}
              >
                <KeyRound className="h-4 w-4" />
                Try reset password
              </button>
              <p
                className={cn(
                  "mt-4 text-center text-xs",
                  isDark ? "text-white/45" : "text-gray-500",
                )}
              >
                <Link
                  to="/login"
                  className="font-medium text-[#ffb400] hover:text-[#ff8c4a]"
                >
                  ← Back to sign in
                </Link>
              </p>
            </form>
          );
        }
        return (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-3.5">
            {errorMsg && (
              <div
                data-testid="auth-error"
                className={cn(
                  "rounded-lg border px-3 py-2 text-[12px] leading-relaxed text-balance",
                  isDark
                    ? "border-rose-500/35 bg-rose-500/10 text-rose-200"
                    : "border-rose-500/40 bg-rose-50 text-rose-700",
                )}
              >
                {errorMsg}
              </div>
            )}
            {infoMsg && (
              <div
                data-testid="auth-info"
                className={cn(
                  "rounded-lg border px-3 py-2 text-[12px] leading-relaxed text-balance",
                  isDark
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-emerald-500/40 bg-emerald-50 text-emerald-800",
                )}
              >
                {infoMsg}
              </div>
            )}
            {/* WhatsApp/Telegram-style "code sent to <address>" line with an
                inline Edit — going back to the email step keeps the typed
                email intact (unlike the old "Change email" button, which
                blanked it and forced a full retype after a simple typo). */}
            <p
              className={cn(
                "text-center text-[13px]",
                isDark ? "text-white/60" : "text-gray-500",
              )}
            >
              Code sent to{" "}
              <span
                className={cn(
                  "font-medium",
                  isDark ? "text-white" : "text-gray-900",
                )}
              >
                {email}
              </span>{" "}
              ·{" "}
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                  setErrorMsg(null);
                  setInfoMsg(null);
                  setEmailFieldError(undefined);
                }}
                className="font-medium text-[#ff8c4a] underline-offset-2 hover:text-[#ffb400] hover:underline"
              >
                Edit
              </button>
            </p>
            <div className="flex justify-center gap-2">
              {[...Array(6)].map((_, i) => (
                <input
                  key={i}
                  type="text"
                  maxLength={1}
                  value={otp[i] || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    if (val) {
                      const newOtp = otp.split("");
                      newOtp[i] = val;
                      setOtp(newOtp.join(""));
                      const next = document.querySelector<HTMLInputElement>(
                        `input[name="otp-${i + 1}"]`,
                      );
                      if (next) next.focus();
                    } else {
                      const newOtp = otp.split("");
                      newOtp[i] = "";
                      setOtp(newOtp.join(""));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !otp[i] && i > 0) {
                      const prev = document.querySelector<HTMLInputElement>(
                        `input[name="otp-${i - 1}"]`,
                      );
                      if (prev) prev.focus();
                    }
                  }}
                  onPaste={(e) => {
                    // Users typically copy the whole code and paste it into
                    // the first box — without this, a single-char maxLength
                    // silently truncates the paste to just its first digit
                    // and drops the rest on the floor.
                    const digits = e.clipboardData
                      .getData("text")
                      .replace(/[^0-9]/g, "")
                      .slice(0, 6);
                    if (digits.length > 1) {
                      e.preventDefault();
                      setOtp(digits);
                      const target = document.querySelector<HTMLInputElement>(
                        `input[name="otp-${Math.min(digits.length, 5)}"]`,
                      );
                      target?.focus();
                    }
                  }}
                  name={`otp-${i}`}
                  className={cn(
                    "h-12 w-12 text-center text-xl font-semibold rounded-lg border transition-all",
                    isDark
                      ? "border-white/20 bg-white/[0.03] text-white focus:border-[#ff5b1f]/55 focus:ring-2 focus:ring-[#ff5b1f]/25"
                      : "border-black/20 bg-white text-gray-900 focus:border-[#ff5b1f]/65 focus:ring-2 focus:ring-[#ff5b1f]/20",
                  )}
                />
              ))}
            </div>
            <button
              type="submit"
              data-testid="auth-submit-btn"
              disabled={submitting}
              className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#ff5b1f] to-[#ff8c4a] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#ff5b1f]/25 transition-all hover:shadow-[#ff5b1f]/45 disabled:opacity-60"
            >
              {submitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
              ) : (
                <>
                  Verify OTP{" "}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
            <div className="flex items-center justify-center text-xs">
              {resendTimer > 0 ? (
                <span className={isDark ? "text-white/45" : "text-gray-500"}>
                  Resend in {resendTimer}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="text-[#ff8c4a] hover:text-[#ffb400]"
                >
                  Resend OTP
                </button>
              )}
            </div>
            <p
              className={cn(
                "mt-4 text-center text-xs",
                isDark ? "text-white/45" : "text-gray-500",
              )}
            >
              <Link
                to="/login"
                className="font-medium text-[#ffb400] hover:text-[#ff8c4a]"
              >
                ← Back to sign in
              </Link>
            </p>
          </form>
        );
      },
    },
  };

  // Get the current mode config
  const config = modeConfig[mode];
  const leftContent = LEFT_PANEL_CONFIG[mode];

  return (
    <div
      data-testid="password-page"
      className={cn(
        "relative min-h-screen w-full overflow-hidden transition-colors duration-300",
        isDark ? "bg-[#0b0d12] text-white" : "bg-[#f6f7fb] text-[#1f2937]",
      )}
    >
      <style>{`
        .particle-rise {
          position: absolute;
          bottom: -50px;
          will-change: transform, opacity;
          animation: rise var(--duration) linear infinite var(--delay);
        }
        @keyframes rise {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-110vh) translateX(var(--drift-x)); opacity: 0; }
        }
      `}</style>

      {/* Floating theme toggle */}
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        data-testid="auth-theme-toggle"
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        className={cn(
          "absolute right-5 top-5 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur transition-all",
          isDark
            ? "border-white/15 bg-white/[0.06] text-white hover:border-[#ff5b1f]/45 hover:bg-white/[0.1]"
            : "border-black/10 bg-white/70 text-[#1f2937] hover:border-[#ff5b1f]/55 hover:bg-white",
        )}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      {/* Ambient gradient orbs */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div
          className={cn(
            "absolute -left-1/4 -top-1/4 h-[60%] w-[60%] animate-pulse rounded-full blur-[140px]",
            isDark ? "bg-[#ff5b1f]/25" : "bg-[#ff5b1f]/18",
          )}
        />
        <div
          className={cn(
            "absolute -bottom-1/4 -right-1/4 h-[55%] w-[55%] animate-pulse rounded-full blur-[140px]",
            isDark ? "bg-[#1fbf9a]/20" : "bg-[#1fbf9a]/14",
          )}
          style={{ animationDelay: "1.5s" }}
        />
        <div
          className={cn(
            "absolute inset-0",
            isDark
              ? "opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:48px_48px]"
              : "opacity-[0.06] [background-image:linear-gradient(rgba(0,0,0,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.6)_1px,transparent_1px)] [background-size:48px_48px]",
          )}
        />
      </div>

      <CanvasParticles isDark={isDark} />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1400px] grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        {/* LEFT: brand panel */}
        <aside
          data-testid="auth-brand-panel"
          className="hidden flex-col justify-between p-10 lg:flex lg:p-14"
        >
          <Link
            to="/"
            data-testid="app-header-logo"
            className="flex items-center gap-1"
          >
            <Logo variant="mark" className="h-12 w-10" />
            <div className="text-left">
              <div className="text-[0.8rem] text-text-secondary tracking-normal leading-tight mb-[-2px]">
                ProbeStack
              </div>
              <div className="font-bold text-2xl tracking-normal leading-tight gradient-text">
                ForgeFuzz
              </div>
            </div>
          </Link>

          <div className="space-y-8">
            <div>
              <div
                className={cn(
                  "mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
                  isDark
                    ? "border-white/10 bg-white/[0.04] text-white/70"
                    : "border-black/10 bg-white/70 text-gray-700",
                )}
              >
                <Sparkles className="h-3.5 w-3.5 text-[#ffb400]" />
                {leftContent.badge}
              </div>
              <h2 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
                {leftContent.title}
              </h2>
              <p
                className={cn(
                  "mt-3 max-w-md text-base",
                  isDark ? "text-white/65" : "text-gray-600",
                )}
              >
                {leftContent.subtitle}
              </p>
            </div>

            <ul className="grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
              {leftContent.highlights.map(({ icon: Icon, title: t, desc }) => (
                <li
                  key={t}
                  className={cn(
                    "group rounded-xl border p-3 backdrop-blur-sm transition-all hover:-translate-y-0.5",
                    isDark
                      ? "border-white/10 bg-white/[0.03] hover:border-[#ff5b1f]/40 hover:bg-white/[0.06]"
                      : "border-black/10 bg-white/70 hover:border-[#ff5b1f]/50 hover:bg-white",
                  )}
                >
                  <div className="mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff5b1f]/25 to-[#1fbf9a]/25">
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        isDark ? "text-white" : "text-gray-800",
                      )}
                    />
                  </div>
                  <div
                    className={cn(
                      "text-sm font-semibold",
                      isDark ? "text-white" : "text-gray-900",
                    )}
                  >
                    {t}
                  </div>
                  <div
                    className={cn(
                      "text-xs",
                      isDark ? "text-white/55" : "text-gray-500",
                    )}
                  >
                    {desc}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div
            className={cn(
              "flex items-center gap-4 text-xs",
              isDark ? "text-white/45" : "text-gray-500",
            )}
          >
            <span>© ProbeStack 2026</span>
            <span
              className={cn(
                "h-1 w-1 rounded-full",
                isDark ? "bg-white/30" : "bg-black/30",
              )}
            />
            <Link
              to="/pricing"
              className={isDark ? "hover:text-white/80" : "hover:text-gray-800"}
            >
              Pricing
            </Link>
            <span
              className={cn(
                "h-1 w-1 rounded-full",
                isDark ? "bg-white/30" : "bg-black/30",
              )}
            />
            <a
              href="/docs/customer-api-v1"
              className={isDark ? "hover:text-white/80" : "hover:text-gray-800"}
            >
              Docs
            </a>
          </div>
        </aside>

        {/* RIGHT: form card */}
        <main className="flex items-center justify-center p-6 sm:p-10">
          <div
            data-testid="password-card"
            className={cn(
              "w-full max-w-[440px] rounded-2xl border p-7 shadow-[0_30px_80px_-30px_rgba(255,91,31,0.35)] backdrop-blur-2xl sm:p-9",
              isDark
                ? "border-white/10 bg-[#13161d]/85"
                : "border-black/10 bg-white/85",
            )}
          >
            {/* Mobile logo */}
            <Link
              to="/"
              data-testid="auth-logo-mobile"
              className="mb-6 inline-flex items-center gap-2 lg:hidden"
            >
              <Logo variant="mark" className="h-12 w-10" />
              <div className="text-left">
                <div className="text-[0.8rem] text-text-secondary tracking-normal leading-tight mb-[-2px]">
                  ProbeStack
                </div>
                <div className="font-bold  text-2xl tracking-normal leading-tight gradient-text">
                  ForgeFuzz
                </div>
              </div>
            </Link>

            {/* Heading / subtitle */}
            <h1
              className={cn(
                "text-2xl font-bold",
                isDark ? "text-white" : "text-gray-900",
              )}
            >
              {config.title}
            </h1>
            <p
              className={cn(
                "mt-1 text-sm",
                isDark ? "text-white/55" : "text-gray-500",
              )}
            >
              {config.subtitle}
            </p>

            {/* Form (mode-specific) */}
            {config.renderForm()}
          </div>
        </main>
      </div>
    </div>
  );
};
