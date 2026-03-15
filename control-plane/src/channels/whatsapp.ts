// ClawBot Cloud — WhatsApp Cloud API Client
// Wraps Meta's Graph API v18.0 for sending messages and verifying credentials

const GRAPH_API = 'https://graph.facebook.com/v18.0';

export async function sendMessage(
  accessToken: string,
  phoneNumberId: string,
  to: string,
  text: string,
): Promise<void> {
  const url = `${GRAPH_API}/${phoneNumberId}/messages`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(
      `WhatsApp sendMessage failed: ${resp.status} ${resp.statusText} — ${body}`,
    );
  }
}

export async function verifyCredentials(
  accessToken: string,
  phoneNumberId: string,
): Promise<{ phoneNumber: string }> {
  const url = `${GRAPH_API}/${phoneNumberId}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    throw new Error(
      `WhatsApp credential verification failed: ${resp.status}`,
    );
  }

  const data = (await resp.json()) as {
    display_phone_number?: string;
    verified_name?: string;
  };
  return { phoneNumber: data.display_phone_number || phoneNumberId };
}
