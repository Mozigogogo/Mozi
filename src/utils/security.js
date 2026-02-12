// 简单的混淆加密，防止明文存储
// 注意：前端存储永远无法做到绝对安全，因为密钥必须在客户端代码中。
// 这主要防止窥屏和简单的 LocalStorage 检查。

const SALT = 'MOZI_SECURE_SALT_2024_V1_#9X';

export const encrypt = (text) => {
  if (!text) return '';
  try {
    const textToChars = (text) => text.split('').map((c) => c.charCodeAt(0));
    const byteHex = (n) => ("0" + Number(n).toString(16)).substr(-2);
    const applySaltToChar = (code) => textToChars(SALT).reduce((a, b) => a ^ b, code);

    return text
      .split('')
      .map(textToChars)
      .map(applySaltToChar)
      .map(byteHex)
      .join('');
  } catch (e) {
    console.error('Encryption failed', e);
    return '';
  }
};

export const decrypt = (encoded) => {
  if (!encoded) return '';
  try {
    const textToChars = (text) => text.split('').map((c) => c.charCodeAt(0));
    const applySaltToChar = (code) => textToChars(SALT).reduce((a, b) => a ^ b, code);
    
    return encoded
      .match(/.{1,2}/g)
      .map((hex) => parseInt(hex, 16))
      .map(applySaltToChar)
      .map((charCode) => String.fromCharCode(charCode))
      .join('');
  } catch (e) {
    console.error('Decryption failed', e);
    return '';
  }
};
