export async function calculateBufferSHA256(buffer: ArrayBuffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer); // Calculate the hash
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // Convert the hash to an array
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // Convert the array to a hex-string
}

export async function calculateBlobSHA256(blob: Blob) {
  const buffer = await blob.arrayBuffer(); // Get the binary data
  return await calculateBufferSHA256(buffer);
}
