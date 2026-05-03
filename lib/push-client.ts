const urlBase64ToUint8Array = (base64: string): Uint8Array<ArrayBuffer> => {
    const padding = "=".repeat((4 - base64.length % 4) % 4);
    const base64url = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");

    return (Uint8Array.from(atob(base64url), c => c.charCodeAt(0)));
}

const getServiceWorkerRegistration = async (timeoutMs = 10000): Promise<ServiceWorkerRegistration> => {
    return Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Service worker registration timed out")), timeoutMs)
        )
    ]);
}

export async function subscribeToPush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.warn("Push not supported on this browser/device.");
        return;
    }

    const reg = await getServiceWorkerRegistration();

    // Check for existing subscription
    const existing = await reg.pushManager.getSubscription();

    if (existing) {
        await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(existing)
        });
        
        return;
    }

    const res = await fetch("/api/push/vapid-public-key");
    const { publicKey } = await res.json();

    const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription)
    });
}