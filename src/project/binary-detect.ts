export function isLikelyBinary(buffer: Buffer): boolean {
  if (buffer.length === 0) {
    return false;
  }

  const sample = buffer.subarray(0, Math.min(buffer.length, 8000));
  let suspicious = 0;

  for (const byte of sample) {
    if (byte === 0) {
      return true;
    }

    if (byte < 7 || (byte > 13 && byte < 32)) {
      suspicious += 1;
    }
  }

  return suspicious / sample.length > 0.3;
}
