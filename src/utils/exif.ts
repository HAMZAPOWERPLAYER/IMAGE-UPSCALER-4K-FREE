/**
 * EXIF Orientation Parser & Image Normalization
 * 
 * WHY THIS IS NEEDED:
 * Smartphone cameras (especially iOS and Android) capture image sensor pixels in a fixed orientation
 * and write an EXIF tag (Tag 0x0112) indicating how the device was held (portrait, upside down, etc.).
 * If an app processes raw image buffers without reading this tag, photos will be processed sideways
 * or inverted. Additionally, original EXIF tags frequently leak sensitive user data such as precise
 * GPS coordinates, camera serial numbers, and capture timestamps.
 * 
 * By parsing the EXIF orientation upfront, normalizing pixel orientation onto an HTML5 Canvas,
 * and re-exporting the buffer, we achieve two critical goals:
 * 1. Photos are displayed and upscaled right-side-up.
 * 2. All privacy-leaking metadata (GPS, device info) is cleanly stripped from the final export.
 */

export interface ExifParseResult {
  orientation: number; // 1 = Normal, 2 = Flip H, 3 = 180, 4 = Flip V, 5 = Transpose, 6 = 90 CW, 7 = Transverse, 8 = 270 CW
}

/**
 * Extracts EXIF Orientation from a raw JPEG buffer.
 * Gracefully returns 1 (normal) if parsing fails, if it's not a JPEG, or if tag 0x0112 is absent.
 */
export function getExifOrientation(buffer: ArrayBuffer): number {
  try {
    const view = new DataView(buffer);

    // JPEG files must begin with SOI marker 0xFFD8
    if (view.byteLength < 4 || view.getUint16(0, false) !== 0xFFD8) {
      return 1;
    }

    let offset = 2;
    const length = view.byteLength;

    // Scan through JPEG markers until APP1 (0xFFE1) or SOS/EOI
    while (offset < length - 4) {
      const marker = view.getUint16(offset, false);
      offset += 2;

      // APP1 marker contains EXIF metadata
      if (marker === 0xFFE1) {
        const app1Length = view.getUint16(offset, false);
        offset += 2;

        // Check for 'Exif\0\0' string (0x45786966 0x0000)
        if (
          offset + 6 <= length &&
          view.getUint32(offset, false) === 0x45786966 &&
          view.getUint16(offset + 4, false) === 0x0000
        ) {
          const tiffStart = offset + 6;
          return parseTiffOrientation(view, tiffStart);
        }
        offset += app1Length - 2;
      } else if ((marker & 0xFF00) === 0xFF00) {
        // Skip other markers with a length field
        // Markers 0xFFD8 (SOI), 0xFFD9 (EOI), 0xFF00 (escaped) have no length
        if (marker === 0xFFDA || marker === 0xFFD9) {
          break; // Start of Scan or End of Image
        }
        const segmentLength = view.getUint16(offset, false);
        offset += segmentLength;
      } else {
        break;
      }
    }
  } catch {
    // If any byte read overflows or file is truncated, silently fallback to normal
  }

  return 1;
}

/**
 * Parses the TIFF header inside the APP1 segment to find IFD0 tag 0x0112 (Orientation).
 */
function parseTiffOrientation(view: DataView, tiffStart: number): number {
  if (tiffStart + 8 > view.byteLength) return 1;

  // TIFF Byte Order: 'II' (0x4949) = Little-Endian, 'MM' (0x4D4D) = Big-Endian
  const byteOrderMarker = view.getUint16(tiffStart, false);
  let littleEndian = false;

  if (byteOrderMarker === 0x4949) {
    littleEndian = true;
  } else if (byteOrderMarker === 0x4D4D) {
    littleEndian = false;
  } else {
    return 1; // Invalid TIFF byte order
  }

  // TIFF magic constant 0x002A (42)
  if (view.getUint16(tiffStart + 2, littleEndian) !== 0x002A) {
    return 1;
  }

  // Offset to first IFD (Image File Directory 0)
  const firstIfdOffset = view.getUint32(tiffStart + 4, littleEndian);
  if (firstIfdOffset < 8) return 1;

  const ifd0Offset = tiffStart + firstIfdOffset;
  if (ifd0Offset + 2 > view.byteLength) return 1;

  const numEntries = view.getUint16(ifd0Offset, littleEndian);

  // Each IFD entry is exactly 12 bytes
  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifd0Offset + 2 + i * 12;
    if (entryOffset + 12 > view.byteLength) break;

    const tag = view.getUint16(entryOffset, littleEndian);

    // Tag 0x0112 is Orientation
    if (tag === 0x0112) {
      // Type is SHORT (3), count is 1. The value is stored in the 2-byte value field
      const orientation = view.getUint16(entryOffset + 8, littleEndian);
      if (orientation >= 1 && orientation <= 8) {
        return orientation;
      }
      return 1;
    }
  }

  return 1;
}

/**
 * Normalizes an uploaded File onto an HTMLCanvasElement according to its EXIF orientation.
 * Returns a standardized Canvas containing upright pixels and its clean dimensions.
 */
export async function normalizeImage(file: File): Promise<{
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  orientation: number;
}> {
  // Read first 128KB of file to extract EXIF header quickly without loading the whole file into RAM
  let orientation = 1;
  if (file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) {
    try {
      const slice = file.slice(0, 131072);
      const buffer = await slice.arrayBuffer();
      orientation = getExifOrientation(buffer);
    } catch {
      orientation = 1;
    }
  }

  // Decode the image
  const imgBitmap = await createImageBitmap(file);
  const srcW = imgBitmap.width;
  const srcH = imgBitmap.height;

  // Determine output canvas dimensions: orientations 5, 6, 7, 8 swap width & height
  const isSwapped = orientation >= 5 && orientation <= 8;
  const targetW = isSwapped ? srcH : srcW;
  const targetH = isSwapped ? srcW : srcH;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to create 2D canvas context for normalization');
  }

  // Apply transformation matrix according to EXIF orientation
  ctx.save();
  switch (orientation) {
    case 2: // Flip horizontal
      ctx.translate(targetW, 0);
      ctx.scale(-1, 1);
      break;
    case 3: // 180 rotate
      ctx.translate(targetW, targetH);
      ctx.rotate(Math.PI);
      break;
    case 4: // Flip vertical
      ctx.translate(0, targetH);
      ctx.scale(1, -1);
      break;
    case 5: // Transpose: 90 CW + Flip H
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 6: // 90 CW
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(0, -srcH);
      break;
    case 7: // Transverse: 270 CW + Flip H
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(targetW, -srcH);
      ctx.scale(-1, 1);
      break;
    case 8: // 270 CW (or 90 CCW)
      ctx.rotate(-0.5 * Math.PI);
      ctx.translate(-srcW, 0);
      break;
    case 1:
    default:
      // Normal: no transform needed
      break;
  }

  ctx.drawImage(imgBitmap, 0, 0);
  ctx.restore();
  imgBitmap.close();

  return {
    canvas,
    ctx,
    width: targetW,
    height: targetH,
    orientation,
  };
}
