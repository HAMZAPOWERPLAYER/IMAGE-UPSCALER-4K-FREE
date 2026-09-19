/**
 * Edge-Preserving Denoising & Micro-Contrast Clarity Boost
 * 
 * Used prior to and following Lanczos3 interpolation to prevent JPEG compression artifacts
 * from being amplified during upscaling, and giving photographic results maximum crispness.
 */

/**
 * Fast 3x3 Edge-Preserving Bilateral Denoise Filter.
 * Smooths out flat JPEG macroblocks and high-frequency camera noise while preserving high-contrast edges.
 */
export function applyEdgePreservingDenoise(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  strengthPercent: number
): Uint8ClampedArray {
  if (strengthPercent <= 0) return pixels;

  const strength = Math.min(Math.max(strengthPercent, 0), 100) / 100.0;
  // Color distance threshold (sigma_r): small threshold preserves edges; higher smooths more
  const threshold = 12.0 + strength * 28.0;
  const invTwoSigmaSq = 1.0 / (2.0 * threshold * threshold);

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
      const cR = pixels[curr];
      const cG = pixels[curr + 1];
      const cB = pixels[curr + 2];

      let totalWeight = 1.0;
      let sumR = cR;
      let sumG = cG;
      let sumB = cB;

      // 4-connected neighbors
      const neighbors = [
        topRowOffset + x * 4,
        bottomRowOffset + x * 4,
        rowOffset + xLeft * 4,
        rowOffset + xRight * 4,
      ];

      for (let n = 0; n < 4; n++) {
        const nIdx = neighbors[n];
        const nR = pixels[nIdx];
        const nG = pixels[nIdx + 1];
        const nB = pixels[nIdx + 2];

        const dR = cR - nR;
        const dG = cG - nG;
        const dB = cB - nB;
        const distSq = dR * dR + dG * dG + dB * dB;

        // Fast Gaussian weight based on color similarity
        const weight = Math.exp(-distSq * invTwoSigmaSq);
        totalWeight += weight;
        sumR += nR * weight;
        sumG += nG * weight;
        sumB += nB * weight;
      }

      const invTotal = 1.0 / totalWeight;
      output[curr] = (sumR * invTotal + 0.5) | 0;
      output[curr + 1] = (sumG * invTotal + 0.5) | 0;
      output[curr + 2] = (sumB * invTotal + 0.5) | 0;
      output[curr + 3] = pixels[curr + 3];
    }
  }

  return output;
}

/**
 * Dynamic Clarity & S-Curve Tone Boost.
 * Refines mid-tone contrast and saturation so upscaled images look crisp and vibrant.
 */
export function applyClarityBoost(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(pixels.length);
  const total = width * height * 4;

  for (let i = 0; i < total; i += 4) {
    let r = pixels[i];
    let g = pixels[i + 1];
    let b = pixels[i + 2];

    // Compute luminance
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    const normalizedLuma = luma / 255.0;

    // Gentle S-curve transformation: f(x) = 3x^2 - 2x^3
    const sLuma = (3 * normalizedLuma * normalizedLuma - 2 * normalizedLuma * normalizedLuma * normalizedLuma) * 255.0;
    const lumaDelta = (sLuma - luma) * 0.28; // Subtle 28% strength

    r += lumaDelta;
    g += lumaDelta;
    b += lumaDelta;

    // Subtle 5% saturation expansion
    const newLuma = 0.299 * r + 0.587 * g + 0.114 * b;
    r = newLuma + (r - newLuma) * 1.06;
    g = newLuma + (g - newLuma) * 1.06;
    b = newLuma + (b - newLuma) * 1.06;

    output[i] = r < 0 ? 0 : r > 255 ? 255 : (r + 0.5) | 0;
    output[i + 1] = g < 0 ? 0 : g > 255 ? 255 : (g + 0.5) | 0;
    output[i + 2] = b < 0 ? 0 : b > 255 ? 255 : (b + 0.5) | 0;
    output[i + 3] = pixels[i + 3];
  }

  return output;
}
