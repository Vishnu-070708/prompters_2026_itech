export function generateTrackingId(existingComplaintIds = [], random = Math.random) {
  const usedIds = new Set(existingComplaintIds);

  try {
    const stored = globalThis.localStorage?.getItem('civic_complaints_data');
    const storedComplaints = stored ? JSON.parse(stored) : [];
    if (Array.isArray(storedComplaints)) {
      storedComplaints.forEach((complaint) => usedIds.add(complaint.id));
    }
  } catch {
    // The current in-memory IDs are still enough if storage is unavailable or malformed.
  }

  const firstNumber = 1000 + Math.floor(random() * 9000);
  for (let offset = 0; offset < 9000; offset += 1) {
    const number = 1000 + ((firstNumber - 1000 + offset) % 9000);
    const candidate = `CR-${number}`;
    if (!usedIds.has(candidate)) return candidate;
  }

  throw new Error('Unable to create a unique tracking ID. Please try again.');
}
