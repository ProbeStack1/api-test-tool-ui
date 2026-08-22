/**
 * Shared email / password pattern validation for the auth screens
 * (LoginPage, PasswordVerifyPage — forgot-password & OTP sign-in).
 *
 * Why: these screens were only surfacing Firebase's own rejection AFTER a
 * round-trip to the server (or, for forgot-password/OTP, not validating the
 * email at all before showing a success message) — so an obviously malformed
 * email/password never got a field-level error, just a generic banner or a
 * false "sent!" message. Centralized here so every auth screen enforces the
 * same pattern with the same wording.
 */

// Standard "something@something.tld" shape — intentionally simple (matches
// what <input type="email"> itself accepts) rather than a full RFC 5322
// pattern, which rejects perfectly valid addresses in practice.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 8-128 chars, at least one letter and one digit — mirrors the backend's
// own AuthService#validatePasswordStrength so client and server agree on
// what "valid" means.
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[\s\S]{8,128}$/;

export const EMAIL_PATTERN_ERROR = "Email pattern is incorrect";
export const PASSWORD_PATTERN_ERROR = "Password pattern is incorrect";

export const isValidEmail = (value: string): boolean =>
  EMAIL_REGEX.test(value.trim());

export const isValidPassword = (value: string): boolean =>
  PASSWORD_REGEX.test(value);
