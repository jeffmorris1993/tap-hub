import "server-only";

import qrcode from "qrcode-generator";

/**
 * A scalable QR code as an inline SVG string, for the check-in display screen.
 *
 * Server-rendered on purpose: the kiosk is a tablet or TV that may sit on the
 * same page for hours, and there's no reason to ship an encoder and run it in
 * that browser when the URL is known at render time.
 *
 * Type number 0 lets the library pick the smallest version that fits; level M
 * tolerates ~15% damage, which is the right trade for a screen (no print wear)
 * at a check-in desk.
 */
export function qrSvg(text: string): string {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  // `scalable` emits a viewBox with no fixed width/height, so CSS sizes it.
  return qr.createSvgTag({ cellSize: 1, margin: 0, scalable: true });
}
