export interface ClientDeviceInfo {
  deviceType: "جوال" | "كمبيوتر" | "تابلت";
  os: string;
  browser: string;
  deviceString: string;
  ipAddress: string;
}

let cachedIp: string | null = null;

export async function getClientIp(): Promise<string> {
  if (cachedIp) return cachedIp;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch("https://api.ipify.org?format=json", { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.ip) {
        cachedIp = data.ip;
        return data.ip;
      }
    }
  } catch {
    // fallback
  }
  return "127.0.0.1";
}

export function detectDevice(): { deviceType: "جوال" | "كمبيوتر" | "تابلت"; os: string; browser: string; deviceString: string } {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  
  let deviceType: "جوال" | "كمبيوتر" | "تابلت" = "كمبيوتر";
  if (/iPad|Tablet|PlayBook|Nexus 7|Nexus 10/i.test(ua)) {
    deviceType = "تابلت";
  } else if (/Mobi|Android|iPhone|iPod/i.test(ua)) {
    deviceType = "جوال";
  }

  let os = "نظام آخير";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "متصفح";
  if (/Edg/i.test(ua)) browser = "Edge";
  else if (/Chrome/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox/i.test(ua)) browser = "Firefox";

  const deviceString = `${deviceType} (${os} - ${browser})`;
  return { deviceType, os, browser, deviceString };
}

export async function getFullDeviceInfo(): Promise<ClientDeviceInfo> {
  const dev = detectDevice();
  const ip = await getClientIp();
  return {
    ...dev,
    ipAddress: ip
  };
}
