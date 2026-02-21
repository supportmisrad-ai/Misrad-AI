/**
 * webpack loader: replaces template literals in @clerk/* packages with
 * regular string equivalents. Template literals containing backslash sequences
 * produce double-escaped characters that break webpack eval-source-map.
 */
module.exports = function clerkSourceFixLoader(source) {
  // Only process if source contains backticks (fast skip for clean files)
  if (!source.includes('`')) return source;

  // Replace template literals that have NO ${} interpolation with single quotes.
  // This is safe because Clerk's locale strings use backticks only as string delimiters.
  return source.replace(/`((?:[^`\\$]|\\.|(?:\$(?!\{)))*)`/g, function(match, inner) {
    // Convert inner content: escape single quotes, unescape backticks
    const converted = inner
      .replace(/\\`/g, '`')   // \` → ` (backtick was escaped, now literal)
      .replace(/'/g, "\\'");   // ' → \' (escape single quotes)
    return "'" + converted + "'";
  });
};
