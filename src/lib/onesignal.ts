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
