import { and, eq, isNull } from "drizzle-orm";
import { androidPairing, db, notification } from "@workspace/db";

type PushPayload = {
  title: string;
  body: string;
  data: { tab: "index" | "waiting" | "alerts" | "approvals"; notificationId: string };
  categoryId: string;
};

function categoryFor(kind: string, targetRef: string | null) {
  if (/approval|governance/i.test(kind) || /governance/i.test(targetRef ?? "")) return { tab: "approvals" as const, categoryId: "approval" };
  if (/waiting/i.test(kind) || /waiting/i.test(targetRef ?? "")) return { tab: "waiting" as const, categoryId: "waiting" };
  return { tab: "alerts" as const, categoryId: "brief" };
}

async function sendToToken(token: string, payload: PushPayload) {
  const message = {
    to: token,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    categoryId: payload.categoryId,
    channelId: payload.categoryId,
    priority: "high",
  };

  if (token.startsWith("ExpoPushToken[")) {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(message),
    });
    if (!response.ok) throw new Error(`Expo push failed (${response.status})`);
    return;
  }

  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) throw new Error("FCM_SERVER_KEY is not configured.");
  const response = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `key=${serverKey}` },
    body: JSON.stringify({ to: token, priority: "high", notification: { title: payload.title, body: payload.body, channel_id: payload.categoryId }, data: payload.data }),
  });
  if (!response.ok) throw new Error(`FCM push failed (${response.status})`);
}

export async function deliverCriticalAndroidPushes() {
  const [pending, pairings] = await Promise.all([
    db.select().from(notification).where(and(eq(notification.severity, "critical"), eq(notification.status, "unread"), isNull(notification.pushSentAt))).limit(25),
    db.select().from(androidPairing).where(and(eq(androidPairing.active, true))),
  ]);
  const devices = pairings.filter((pairing) => pairing.fcmToken && (!pairing.expiresAt || pairing.expiresAt > new Date()));
  for (const alert of pending) {
    const category = categoryFor(alert.kind, alert.targetRef);
    const payload: PushPayload = {
      title: alert.title,
      body: alert.body ?? "Lee has a critical signal waiting.",
      data: { tab: category.tab, notificationId: alert.id },
      categoryId: category.categoryId,
    };
    let delivered = false;
    for (const device of devices) {
      try {
        await sendToToken(device.fcmToken!, payload);
        delivered = true;
      } catch (error) {
        console.error("Android push delivery failed", { pairingId: device.id, notificationId: alert.id, error: String(error) });
      }
    }
    if (delivered) await db.update(notification).set({ pushSentAt: new Date() }).where(eq(notification.id, alert.id));
  }
}