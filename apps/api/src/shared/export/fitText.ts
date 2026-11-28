export interface FittedText {
  text: string;
  size: number;
}

type Measure = (text: string, size: number) => number;

/**
 * Fit one line into `width`: shrink towards `minSize` first, then cut with an ellipsis. PDFKit's
 * own `ellipsis` still wraps on spaces, which pushed long names out of their card.
 */
export function fitText(measure: Measure, text: string, width: number, size: number, minSize = size): FittedText {
  let current = size;
  while (current > minSize && measure(text, current) > width) current -= 0.5;
  if (measure(text, current) <= width) return { text, size: current };
  let cut = text.length;
  while (cut > 1 && measure(`${text.slice(0, cut).trimEnd()}…`, current) > width) cut -= 1;
  return { text: `${text.slice(0, cut).trimEnd()}…`, size: current };
}
