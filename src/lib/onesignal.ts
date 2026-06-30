// OneSignal Web SDK initializer (client-only)
let initPromise: Promise<void> | null = null;

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
  }
}

export function initOneSignal(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = new Promise<void>((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];

    // Inject SDK script once
    if (!document.querySelector('script[data-onesignal-sdk]')) {
      const s = document.createElement("script");
      s.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
      s.defer = true;
      s.setAttribute("data-onesignal-sdk", "true");
      document.head.appendChild(s);
    }

    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId: "6da04869-46cd-422b-a0f6-c3f8c4f86a24",
          allowLocalhostAsSecureOrigin: true,
        });
      } catch (e) {
        console.error("OneSignal init failed", e);
      } finally {
        resolve();
      }
    });
  });

  return initPromise;
}

const OPTIN_KEY = "fridgy_notifications_optin";

export function getNotificationsOptIn(): boolean | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(OPTIN_KEY);
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

export function setNotificationsOptIn(value: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(OPTIN_KEY, value ? "true" : "false");
}

/** Initialize OneSignal and request the native permission prompt. */
export async function requestNotificationsPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    await initOneSignal();
    return await new Promise<boolean>((resolve) => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          await OneSignal.Notifications.requestPermission();
          const granted = OneSignal.Notifications.permission === true;
          resolve(granted);
        } catch (e) {
          console.error("OneSignal permission request failed", e);
          resolve(false);
        }
      });
    });
  } catch {
    return false;
  }
}

