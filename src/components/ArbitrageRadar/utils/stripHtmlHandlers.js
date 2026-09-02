/** Remove inline onclick/onchange handlers from legacy HTML render helpers. */
export function stripHtmlHandlers(html) {
  return String(html || '')
    .replace(/\s*onclick="[^"]*"/gi, '')
    .replace(/\s*onchange="[^"]*"/gi, '')
    .replace(/\s*onscroll="[^"]*"/gi, '');
}
