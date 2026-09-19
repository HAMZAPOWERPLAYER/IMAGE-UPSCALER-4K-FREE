/**
 * 3x3 Unsharp Mask Sharpening Convolution
 * 
 * MATHEMATICAL FOUNDATION:
 * The unsharp mask enhances high-frequency spatial details by subtracting an unsharp (blurred)
 * version of the image from the original, amplified by a user-controlled factor.
 * In a discrete 3x3 convolution matrix, this can be efficiently expressed as a Laplacian filter:
 * 
 *   [  0,  -k,   0  ]
 *   [ -k, 1+4k, -k  ]
 *   [  0,  -k,   0  ]
 * 
 * where k = (strength / 100) * 0.35.
 * - At strength = 0: k = 0, matrix is identity [0 0 0; 0 1 0; 0 0 0] (no change).
 * - At strength = 50%: k = 0.175, crisp detail enhancement without halos.
 * - At strength = 100%: k = 0.35, high-contrast micro-edge definition.
 * 
 * The alpha channel is copied directly to maintain full transparency fidelity.
 * Edge coordinates clamp safely to image boundaries.
 */

export function applyUnsharpMask(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  strengthPercent: number
): Uint8ClampedArray {
  if (strengthPercent <= 0) {
    return pixels;
  }

  const k = (strengthPercent / 100.0) * 0.35;
  const centerWeight = 1.0 + 4.0 * k;

  const output = new Uint8ClampedArray(pixels.length);

  for (let y = 0; y < height; y++) {
    const yTop = y > 0 ? y - 1 : 0;
    const yBottom = y < height - 1 ? y + 1 : height - 1;

    const rowOffset = y * width * 4;
    const topRowOffset = yTop * width * 4;
    const bottomRowOffset = yBottom * width * 4;

    for (let x = 0; x < width; x++) {
      const xLeft = x > 0 ? x - 1 : 0;
      const xRight = x < width - 1 ? x + 1 : width - 1;

      const curr = rowOffset + x * 4;
      const top = topRowOffset + x * 4;
      const bottom = bottomRowOffset + x * 4;
      const left = rowOffset + xLeft * 4;
      const right = rowOffset + xRight * 4;

      // Red channel
      const r =
        pixels[curr] * centerWeight -
        k * (pixels[top] + pixels[bottom] + pixels[left] + pixels[right]);
      output[curr] = r < 0 ? 0 : r > 255 ? 255 : (r + 0.5) | 0;

      // Green channel
      const g =
        pixels[curr + 1] * centerWeight -
        k * (pixels[top + 1] + pixels[bottom + 1] + pixels[left + 1] + pixels[right + 1]);
      output[curr + 1] = g < 0 ? 0 : g > 255 ? 255 : (g + 0.5) | 0;

      // Blue channel
      const b =
        pixels[curr + 2] * centerWeight -
        k * (pixels[top + 2] + pixels[bottom + 2] + pixels[left + 2] + pixels[right + 2]);
      output[curr + 2] = b < 0 ? 0 : b > 255 ? 255 : (b + 0.5) | 0;

      // Preserve alpha unaltered
      output[curr + 3] = pixels[curr + 3];
    }
  }

  return output;
}
