/**
 * Vault 凭证应用层加密（浏览器 Web Crypto）
 *
 * 约定算法（与 JWE 常用组合一致，RFC 7516 / RFC 7518）:
 *   - 内容加密: AES-256-GCM（A256GCM），IV 12 字节，tag 128 bit（WebCrypto 拼在密文末尾）
 *   - 密钥封装: RSA-OAEP，Hash = SHA-256（RSA-OAEP-256）
 *
 * 前端每次提交:
 *   1. GET /v1/vault/crypto/public-key 取 RSA 公钥（SPKI PEM）
 *   2. 随机生成 AES-256 密钥，GCM 加密凭证明文 JSON
 *   3. 用 RSA 公钥封装 AES 密钥
 *   4. POST /v1/vault/credentials 直接传信封字段（v/alg/enc/kid/iv/ek/ct）
 *      不传 credentialJson，不传明文私钥
 *
 * POST body 加密字段:
 *   v, alg, enc, kid, iv, ek, ct
 *
 * 后端解密:
 *   1. 用 kid 对应 RSA 私钥（建议放 KMS/HSM）做 RSA-OAEP-256 解出 AES key
 *   2. AES-256-GCM 解密 ct（最后 16 字节为 tag）
 *   3. 得到明文 JSON，如 {"privateKey":"0x..."}，再按原逻辑入库加密存储
 *   4. 拒绝缺少 iv/ek/ct，或 alg/enc 不匹配；不要接受明文私钥
 */

export const VAULT_CRYPTO_ALG = 'RSA-OAEP-256';
export const VAULT_CRYPTO_ENC = 'A256GCM';
export const VAULT_CRYPTO_VERSION = 1;

function getSubtle() {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto API is not available');
  }
  return subtle;
}

function bytesToB64(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < arr.length; i += chunk) {
    bin += String.fromCharCode.apply(null, arr.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function bytesToB64url(bytes) {
  return bytesToB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function pemToSpkiBytes(pem) {
  const cleaned = String(pem || '')
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '');
  if (!cleaned) {
    throw new Error('empty RSA public key');
  }
  const bin = atob(cleaned);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function spkiFromApi(data) {
  if (data?.publicKeyPem) return pemToSpkiBytes(data.publicKeyPem);
  if (data?.publicKey) return pemToSpkiBytes(data.publicKey);
  const b64 = data?.publicKeySpki || data?.spki;
  if (b64) {
    const bin = atob(String(b64).replace(/\s+/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  }
  throw new Error('vault public key missing');
}

/** @type {{ kid: string; key: CryptoKey } | null} */
let cachedPublicKey = null;

export function clearVaultCryptoCache() {
  cachedPublicKey = null;
}

/**
 * @param {{ kid?: string; publicKeyPem?: string; publicKey?: string; publicKeySpki?: string; spki?: string }} data
 */
export async function importVaultRsaPublicKey(data) {
  const kid = String(data?.kid || 'default');
  if (cachedPublicKey?.kid === kid) return cachedPublicKey;

  const spki = spkiFromApi(data);
  const key = await getSubtle().importKey(
    'spki',
    spki,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
  cachedPublicKey = { kid, key };
  return cachedPublicKey;
}

/**
 * @param {string} plaintextUtf8 凭证明文 JSON，如 {"privateKey":"0x..."}
 * @param {{ kid: string; key: CryptoKey }} rsa
 * @returns {Promise<{
 *   v: number;
 *   alg: string;
 *   enc: string;
 *   kid: string;
 *   iv: string;
 *   ek: string;
 *   ct: string;
 * }>}
 */
export async function encryptVaultPlaintext(plaintextUtf8, rsa) {
  const subtle = getSubtle();
  const plain = new TextEncoder().encode(String(plaintextUtf8 || ''));

  const aesKey = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ctBuf = await subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, aesKey, plain);

  const rawAes = new Uint8Array(await subtle.exportKey('raw', aesKey));
  const wrapped = new Uint8Array(
    await subtle.encrypt({ name: 'RSA-OAEP' }, rsa.key, rawAes),
  );

  rawAes.fill(0);

  return {
    v: VAULT_CRYPTO_VERSION,
    alg: VAULT_CRYPTO_ALG,
    enc: VAULT_CRYPTO_ENC,
    kid: rsa.kid,
    iv: bytesToB64url(iv),
    ek: bytesToB64url(wrapped),
    ct: bytesToB64url(ctBuf),
  };
}
