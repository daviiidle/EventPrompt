import type { Env } from "./utils";

export async function sendSms(
  env: Env,
  to: string,
  bodyText: string
): Promise<{ sid: string }> {
  const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);

  const body = new URLSearchParams({
    From: env.TWILIO_FROM_NUMBER || "",
    To: to,
    Body: bodyText,
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  if (!res.ok) {
    throw new Error(`Twilio failed: ${await res.text()}`);
  }

  return res.json();
}
