import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import type { TransitionPresentation } from "@remotion/transitions";
import type { TransitionType } from "./schema.js";

export function getTransitionPresentation(
  type: TransitionType,
  width = 1080,
  height = 1920
): TransitionPresentation<any> | null {
  switch (type) {
    case "none":
      return null;
    case "fade":
      return fade();
    case "slide":
      return slide({ direction: "from-right" });
    case "wipe":
      return wipe({ direction: "from-left" });
    case "flip":
      return flip({ direction: "from-right" });
    case "clockWipe":
      return clockWipe({ width, height });
  }
}
