import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.SESSION_SECRET || "fallback_default_secret_key_32_bytes_long!!";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * 평문 비밀번호를 안전하게 암호화하여 저장
 */
export function encryptPassword(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  // iv + tag + encrypted 를 base64로 패킹
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString("base64");
}

/**
 * 암호화된 비밀번호를 복호화
 */
export function decryptPassword(cipherText: string): string {
  try {
    const buffer = Buffer.from(cipherText, "base64");
    if (buffer.length < IV_LENGTH + TAG_LENGTH) {
      throw new Error("Invalid cipher text format");
    }

    const iv = buffer.subarray(0, IV_LENGTH);
    const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("비밀번호 복호화 오류:", error);
    return "";
  }
}
