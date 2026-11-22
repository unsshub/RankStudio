export interface StyledSpan {
  text: string;
  bold: boolean;
  italic: boolean;
  color: string;
  highlight: string | null;
  fontFamily: string;
  fontSize: number;
}

interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface TiptapNode {
  type: string;
  text?: string;
  marks?: TiptapMark[];
  content?: TiptapNode[];
}

function parseFontSize(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = parseFloat(raw);
    if (Number.isFinite(n)) return n;
  }
  return 64;
}

export function tiptapToSpans(doc: unknown): StyledSpan[][] {
  if (!doc || typeof doc !== "object") {
    return [];
  }
  const root = doc as TiptapNode;
  const blocks = Array.isArray(root.content) ? root.content : [];
  const lines: StyledSpan[][] = [];

  for (const block of blocks) {
    if (!block || !Array.isArray(block.content)) {
      lines.push([]);
      continue;
    }
    const line: StyledSpan[] = [];
    for (const node of block.content) {
      if (node.type === "hardBreak") {
        lines.push(line.splice(0, line.length));
        continue;
      }
      if (node.type !== "text" || typeof node.text !== "string") continue;

      const marks = Array.isArray(node.marks) ? node.marks : [];
      let bold = false;
      let italic = false;
      let color = "#FFFFFF";
      let highlight: string | null = null;
      let fontFamily = "Archivo Black";
      let fontSize = 64;

      for (const mark of marks) {
        if (mark.type === "bold") bold = true;
        if (mark.type === "italic") italic = true;
        if (mark.type === "highlight") {
          highlight = typeof mark.attrs?.color === "string" ? mark.attrs.color : "#FEF08A";
        }
        if (mark.type === "textStyle" && mark.attrs) {
          if (typeof mark.attrs.color === "string" && mark.attrs.color) {
            color = mark.attrs.color;
          }
          if (typeof mark.attrs.fontFamily === "string" && mark.attrs.fontFamily) {
            fontFamily = mark.attrs.fontFamily;
          }
          if (mark.attrs.fontSize !== undefined && mark.attrs.fontSize !== null) {
            fontSize = parseFontSize(mark.attrs.fontSize);
          }
        }
      }

      line.push({
        text: node.text,
        bold,
        italic,
        color,
        highlight,
        fontFamily,
        fontSize,
      });
    }
    lines.push(line);
  }

  return lines;
}
