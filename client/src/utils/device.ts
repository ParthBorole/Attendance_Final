// Client Device Fingerprint Utility for Anti-Proxy Device Lockdown

export function getDeviceId(): string {
  const STORAGE_KEY = 'attendsecure_device_uuid';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  
  if (!deviceId) {
    // Generate a unique device signature combining random entropy with screen & user agent hashes
    const entropy = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const screenSign = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const userAgent = navigator.userAgent.replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    deviceId = `dev_${userAgent}_${screenSign}_${entropy}`;
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  
  return deviceId;
}
