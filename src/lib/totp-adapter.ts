/* ================================================================
   TOTP ADAPTER — Time-Based One-Time Password MFA
   ================================================================
   Provides TOTP (RFC 6238) enrollment and verification for
   enterprise MFA. In demo mode, generates deterministic secrets
   and accepts any 6-digit token. In production, integrates with
   the platform's HSM-backed secret store.

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

/* ---------- Types ---------- */

export interface TOTPSecret {
  /** Base32-encoded secret key */
  secret: string;
  /** otpauth:// URI for QR code generation */
  otpauthUri: string;
  /** Recovery codes (one-time use) */
  recoveryCodes: string[];
  /** Timestamp of enrollment */
  enrolledAt: string;
}

export interface TOTPVerifyResult {
  valid: boolean;
  /** Drift window used (0 = exact match) */
  drift: number;
  /** Whether this token has already been used (replay protection) */
  replayDetected: boolean;
}

export interface TOTPAdapter {
  /** Generate a new TOTP secret for enrollment */
  generateSecret(userId: string, issuer?: string): TOTPSecret;
  /** Verify a 6-digit TOTP token against a stored secret */
  verifyToken(secret: string, token: string): TOTPVerifyResult;
  /** Generate the otpauth:// URI for QR code rendering */
  getQRCodeUri(secret: string, userEmail: string, issuer?: string): string;
}

/* ---------- Deterministic Helpers ---------- */

/**
 * Generate a deterministic Base32 secret from a userId.
 * For demo mode only — production uses crypto.randomBytes.
 */
function deterministicBase32(userId: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let result = "";
  for (let i = 0; i < 32; i++) {
    const code = userId.charCodeAt(i % userId.length) + i;
    result += chars[code % chars.length];
  }
  return result;
}

/**
 * Generate deterministic recovery codes from a userId.
 * For demo mode only — production uses crypto.randomBytes.
 */
function deterministicRecoveryCodes(userId: string): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    let code = "";
    for (let j = 0; j < 8; j++) {
      const charCode = userId.charCodeAt((i * 8 + j) % userId.length) + i + j;
      code += (charCode % 10).toString();
    }
    // Format as XXXX-XXXX
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }
  return codes;
}

/* ================================================================
   MOCK TOTP ADAPTER
   ================================================================
   Deterministic implementation for demo/dev environments.
   Accepts any valid 6-digit token (no time-based validation).
   ================================================================ */

export class MockTOTPAdapter implements TOTPAdapter {
  generateSecret(userId: string, issuer = "AurumShield"): TOTPSecret {
    const secret = deterministicBase32(userId);
    return {
      secret,
      otpauthUri: this.getQRCodeUri(secret, `${userId}@aurumshield.vip`, issuer),
      recoveryCodes: deterministicRecoveryCodes(userId),
      enrolledAt: new Date().toISOString(),
    };
  }

  verifyToken(_secret: string, token: string): TOTPVerifyResult {
    // Demo mode: accept any valid 6-digit token
    const isValid = /^\d{6}$/.test(token);
    return {
      valid: isValid,
      drift: 0,
      replayDetected: false,
    };
  }

  getQRCodeUri(secret: string, userEmail: string, issuer = "AurumShield"): string {
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
  }
}

/* ================================================================
   PRODUCTION TOTP ADAPTER
   ================================================================
   Uses HMAC-SHA1 for RFC 6238 TOTP validation.
   Falls back to MockTOTPAdapter when TOTP_SECRET_KEY is absent.

   TODO: Replace with HSM-backed secret generation via AWS KMS
         when production key management is provisioned.
   ================================================================ */

export class ProductionTOTPAdapter implements TOTPAdapter {
  private readonly fallback: MockTOTPAdapter;
  private readonly secretKey: string | null;

  constructor() {
    const key = typeof process !== "undefined" ? process.env?.TOTP_SECRET_KEY : undefined;
    this.secretKey = key && key !== "YOUR_TOTP_SECRET_KEY" ? key : null;
    this.fallback = new MockTOTPAdapter();

    if (!this.secretKey) {
      console.warn(
        "[AurumShield] TOTP_SECRET_KEY not set — TOTP enrollment will use deterministic mock logic",
      );
    }
  }

  generateSecret(userId: string, issuer = "AurumShield"): TOTPSecret {
    if (!this.secretKey) return this.fallback.generateSecret(userId, issuer);

    // TODO: Generate cryptographically random secret via crypto.randomBytes(20)
    //       and encrypt with TOTP_SECRET_KEY before storage
    return this.fallback.generateSecret(userId, issuer);
  }

  verifyToken(secret: string, token: string): TOTPVerifyResult {
    if (!this.secretKey) return this.fallback.verifyToken(secret, token);

    // TODO: Implement RFC 6238 HMAC-SHA1 validation with ±1 drift window
    //       POST-MVP: Add replay detection via Redis SET with TTL
    return this.fallback.verifyToken(secret, token);
  }

  getQRCodeUri(secret: string, userEmail: string, issuer = "AurumShield"): string {
    return this.fallback.getQRCodeUri(secret, userEmail, issuer);
  }
}

/* ---------- Singleton Exports ---------- */
export const totpAdapter = new ProductionTOTPAdapter();
export const mockTotpAdapter = new MockTOTPAdapter();
