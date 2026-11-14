import zlib from "zlib";

interface ZipFileInput {
  name: string;
  content: Buffer | string;
  comment?: string;
}

// Pre-computed CRC32 table
const CRC_TABLE = (() => {
  let c: number;
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function calculateCrc32(buf: Buffer): number {
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function dosDateTime(date: Date): { dosTime: number; dosDate: number } {
  const dosTime =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((date.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f);
  return { dosTime, dosDate };
}

/**
 * Production-quality zero-dependency in-memory PKZIP archive generator.
 * Fully compatible with standard unzip utilities, Windows Explorer, and macOS Archive Utility.
 */
export function createZipArchive(files: ZipFileInput[]): Buffer {
  const now = new Date();
  const { dosTime, dosDate } = dosDateTime(now);

  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];

  let currentOffset = 0;

  for (const file of files) {
    const rawContent = Buffer.isBuffer(file.content)
      ? file.content
      : Buffer.from(file.content, "utf8");

    const uncompressedSize = rawContent.length;
    const crc = calculateCrc32(rawContent);

    // Deflate compression
    let compressedData: Buffer = Buffer.from(zlib.deflateRawSync(rawContent, { level: 6 }));
    let compressionMethod = 8; // Deflate

    // If deflate ended up larger (e.g. tiny text or already-compressed media), store uncompressed
    if (compressedData.length >= uncompressedSize) {
      compressedData = Buffer.from(rawContent);
      compressionMethod = 0; // Stored
    }

    const compressedSize = compressedData.length;
    const sanitizedName = file.name.replace(/\\/g, "/").replace(/^\/+/, "");
    const nameBuffer = Buffer.from(sanitizedName, "utf8");
    const nameLength = nameBuffer.length;

    // --- Local File Header (30 bytes + name) ---
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local header signature
    localHeader.writeUInt16LE(20, 4); // Min version (2.0)
    localHeader.writeUInt16LE(0x0800, 6); // Flags: UTF-8 filename
    localHeader.writeUInt16LE(compressionMethod, 8); // Method
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(nameLength, 26);
    localHeader.writeUInt16LE(0, 28); // Extra field length

    const localRecord = Buffer.concat([localHeader, nameBuffer, compressedData]);
    localParts.push(localRecord);

    // --- Central Directory Header (46 bytes + name) ---
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Central directory signature
    centralHeader.writeUInt16LE(20, 4); // Version made by
    centralHeader.writeUInt16LE(20, 6); // Version needed
    centralHeader.writeUInt16LE(0x0800, 8); // Flags: UTF-8
    centralHeader.writeUInt16LE(compressionMethod, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressedSize, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(nameLength, 28);
    centralHeader.writeUInt16LE(0, 30); // Extra field len
    centralHeader.writeUInt16LE(0, 32); // Comment len
    centralHeader.writeUInt16LE(0, 34); // Disk start
    centralHeader.writeUInt16LE(0, 36); // Internal attrs
    centralHeader.writeUInt32LE(0, 38); // External attrs
    centralHeader.writeUInt32LE(currentOffset, 42); // Relative offset of local header

    const centralRecord = Buffer.concat([centralHeader, nameBuffer]);
    centralParts.push(centralRecord);

    currentOffset += localRecord.length;
  }

  const centralDirectoryBuffer = Buffer.concat(centralParts);
  const centralDirectoryOffset = currentOffset;
  const centralDirectorySize = centralDirectoryBuffer.length;
  const totalEntries = files.length;

  // --- End of Central Directory Record (22 bytes) ---
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4); // Disk number
  eocd.writeUInt16LE(0, 6); // Disk with start of CD
  eocd.writeUInt16LE(totalEntries, 8); // Entries on this disk
  eocd.writeUInt16LE(totalEntries, 10); // Total entries
  eocd.writeUInt32LE(centralDirectorySize, 12); // Size of central directory
  eocd.writeUInt32LE(centralDirectoryOffset, 16); // Offset of central directory
  eocd.writeUInt16LE(0, 20); // ZIP comment len

  return Buffer.concat([...localParts, centralDirectoryBuffer, eocd]);
}
