const urlBase64ToUint8Array = (base64: string): Uint8Array<ArrayBuffer> => {
    const padding = "=".repeat((4 - base64.length % 4) % 4);
    const base64url = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");

    return (Uint8Array.from(atob(base64url), c => c.charCodeAt(0)));
}

export async function subscribeToPush() {
    const reg = await navigator.serviceWorker.ready;

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