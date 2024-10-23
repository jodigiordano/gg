// Returns true if the string is a number string otherwise false.
export const stringIsNumber = (s: string): boolean =>
  s.trim().search(/^-?[0-9]*\.?[0-9]+$/) === 0;

// Returns true if the string is only whitespace and nothing else.
export const isOnlyWhitespace = (s: string): boolean => s.search(/^\s+$/) === 0;
