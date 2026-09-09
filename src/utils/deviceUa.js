/** UA 粗判是否移动端（与 home/page 等处逻辑对齐） */
export function isProbablyMobileUa(ua = '') {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(String(ua || ''));
}

export function isProbablyPcUa(ua = '') {
  return !isProbablyMobileUa(ua);
}
