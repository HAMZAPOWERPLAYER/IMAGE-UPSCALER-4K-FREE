/**
 * Pure JavaScript Zero-Dependency ZIP Writer (PKZIP Store Method)
 * 
 * WHY STORE METHOD (METHOD 0)?
 * 1. Image files (JPEG, PNG, WebP) are already internally compressed using algorithms like
 *    DEFLATE, Discrete Cosine Transform, and VP8 entropy encoding. Attempting another compression
 *    layer on compressed imagery costs significant client-side CPU with near 0% size benefit.
 * 2. The Store method (compression method = 0) simply packages files with checksums and directory
 *    headers, meaning zero external libraries (like JSZip or pako) are needed.
 * 3. 100% compatibility: Standard operating system archive tools (macOS Finder, Windows Explorer,
 *    Linux unzip, iOS and Android Files apps) extract Store-method ZIP files instantly.
 * 
 * PKZIP BINARY STRUCTURE OVERVIEW:
 * A valid ZIP archive is laid out sequentially:
 *   [Local File Header 1]
 *   [File Data 1]
 *   [Local File Header 2]
 *   [File Data 2]
 *   ...
 *   [Central Directory Header 1]
 *   [Central Directory Header 2]
 *   ...
 *   [End of Central Directory Record (EOCD)]
 */

export interface ZipFileInput {
  name: string;
  data: Uint8Array;
  date?: Date;
}

// Precomputed CRC-32 lookup table (polynomial 0xEDB88320)
let crcTable: Uint32Array | null = null;

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  crcTable = table;
  return table;
}

/**
 * Computes standard IEEE 802.3 32-bit Cyclic Redundancy Check (CRC-32)
 */
export function computeCrc32(data: Uint8Array): number {
  const table = getCrcTable();
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Encodes a JavaScript Date into standard MS-DOS format (16-bit time + 16-bit date)
 */
function toDosDateTime(date: Date = new Date()): { time: number; date: number } {
  const year = date.getFullYear();
  const dosYear = year >= 1980 ? year - 1980 : 0;
  const dosMonth = date.getMonth() + 1;
  const dosDay = date.getDate();
  const dosDate = ((dosYear & 0x7F) << 9) | ((dosMonth & 0x0F) << 5) | (dosDay & 0x1F);

  const dosHour = date.getHours();
  const dosMinute = date.getMinutes();
  const dosSecond = Math.floor(date.getSeconds() / 2);
  const dosTime = ((dosHour & 0x1F) << 11) | ((dosMinute & 0x3F) << 5) | (dosSecond & 0x1F);

  return { time: dosTime, date: dosDate };
}

/**
 * Creates a valid ZIP archive Blob containing the provided files.
 */
export function createZipArchive(files: ZipFileInput[]): Blob {
  const encoder = new TextEncoder();
  const localHeadersAndData: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];

  let currentOffset = 0;

  for (const file of files) {
    const filenameBytes = encoder.encode(file.name);
    const dataBytes = file.data;
    const crc = computeCrc32(dataBytes);
    const size = dataBytes.length;
    const { time, date } = toDosDateTime(file.date || new Date());

    // 1. Local File Header (30 bytes + filename)
    // Signature: 0x04034b50 ("PK\x03\x04")
    const localHeader = new Uint8Array(30 + filenameBytes.length);
    const localView = new DataView(localHeader.buffer);

    localView.setUint32(0, 0x04034b50, true); // Local file header signature
    localView.setUint16(4, 20, true);         // Version needed to extract (2.0)
    localView.setUint16(6, 0x0800, true);     // General purpose bit flag (bit 11 = UTF-8 filename)
    localView.setUint16(8, 0, true);          // Compression method: 0 = Store (no compression)
    localView.setUint16(10, time, true);      // File last modification time
    localView.setUint16(12, date, true);      // File last modification date
    localView.setUint32(14, crc, true);       // CRC-32 checksum
    localView.setUint32(18, size, true);      // Compressed size
    localView.setUint32(22, size, true);      // Uncompressed size
    localView.setUint16(26, filenameBytes.length, true); // Filename length
    localView.setUint16(28, 0, true);         // Extra field length (0)
    localHeader.set(filenameBytes, 30);

    localHeadersAndData.push(localHeader);
    localHeadersAndData.push(dataBytes);

    // 2. Central Directory Header (46 bytes + filename)
    // Signature: 0x02014b50 ("PK\x01\x02")
    const centralHeader = new Uint8Array(46 + filenameBytes.length);
    const centralView = new DataView(centralHeader.buffer);

    centralView.setUint32(0, 0x02014b50, true); // Central file header signature
    centralView.setUint16(4, 20, true);         // Version made by (2.0)
    centralView.setUint16(6, 20, true);         // Version needed to extract (2.0)
    centralView.setUint16(8, 0x0800, true);     // General purpose bit flag (bit 11 = UTF-8 filename)
    centralView.setUint16(10, 0, true);         // Compression method: 0 = Store
    centralView.setUint16(12, time, true);      // File last modification time
    centralView.setUint16(14, date, true);      // File last modification date
    centralView.setUint32(16, crc, true);       // CRC-32
    centralView.setUint32(20, size, true);      // Compressed size
    centralView.setUint32(24, size, true);      // Uncompressed size
    centralView.setUint16(28, filenameBytes.length, true); // Filename length
    centralView.setUint16(30, 0, true);         // Extra field length
    centralView.setUint16(32, 0, true);         // File comment length
    centralView.setUint16(34, 0, true);         // Disk number start
    centralView.setUint16(36, 0, true);         // Internal file attributes
    centralView.setUint32(38, 0, true);         // External file attributes
    centralView.setUint32(42, currentOffset, true); // Relative offset of local header
    centralHeader.set(filenameBytes, 46);

    centralHeaders.push(centralHeader);

    // Advance offset for the next file
    currentOffset += localHeader.length + dataBytes.length;
  }

  // 3. Calculate Central Directory Size and Offset
  let centralDirectorySize = 0;
  for (const ch of centralHeaders) {
    centralDirectorySize += ch.length;
  }
  const centralDirectoryOffset = currentOffset;

  // 4. End of Central Directory Record (EOCD - 22 bytes)
  // Signature: 0x06054b50 ("PK\x05\x06")
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);

  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true);          // Number of this disk
  eocdView.setUint16(6, 0, true);          // Disk where central directory starts
  eocdView.setUint16(8, files.length, true);  // Number of central directory records on this disk
  eocdView.setUint16(10, files.length, true); // Total number of central directory records
  eocdView.setUint32(12, centralDirectorySize, true); // Size of central directory
  eocdView.setUint32(16, centralDirectoryOffset, true); // Offset of central directory
  eocdView.setUint16(20, 0, true);         // Comment length (0)

  // Combine all segments into a single Blob
  const allParts: (Uint8Array)[] = [
    ...localHeadersAndData,
    ...centralHeaders,
    eocd,
  ];

  return new Blob(allParts as BlobPart[], { type: 'application/zip' });
}

/**
 * Initiates an automatic browser download of a Blob file.
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 150);
}
