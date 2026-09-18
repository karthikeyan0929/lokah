/**
 * Local Storage Conversion History & Offline Services
 */

const STORAGE_KEY = 'lokah_conversion_history_v1';

export function saveConversionRecord(record) {
  try {
    const history = getConversionHistory();
    const newEntry = {
      id: `conv_${Date.now()}`,
      fileName: record.fileName,
      pageCount: record.pageCount,
      timestamp: new Date().toISOString(),
      outputSizeFormatted: record.outputSizeFormatted,
      format: record.format || 'JPEG',
      durationSeconds: record.durationSeconds || '2.5'
    };

    history.unshift(newEntry);
    // Keep max 20 latest records
    const trimmed = history.slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    return newEntry;
  } catch (err) {
    console.warn('Could not save history to localStorage', err);
    return null;
  }
}

export function getConversionHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearConversionHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn(err);
  }
}

/**
 * Temporary Share Link Generator (Mock / Service Provider Interface for Cloud Storage / Backend API)
 */
export function generateTemporaryShareLink(fileName, expiresInHours = 24) {
  const token = Math.random().toString(36).substring(2, 12);
  const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000).toLocaleString();
  const shareUrl = `${window.location.origin}/#share?id=${token}&file=${encodeURIComponent(fileName)}`;

  return {
    shareUrl,
    token,
    expiresAt,
    isLocalNotice: 'Client-side generated share URL (ready for backend API / Cloud integration).'
  };
}
