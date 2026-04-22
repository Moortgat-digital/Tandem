/**
 * Client Brevo pour les emails transactionnels.
 *
 * ⚠️ Rappel métier : pas d'email automatique à la validation d'une étape Tandem.
 * Les seuls envois sont :
 *   - invitation de compte (déclenchée par Admin)
 *   - reset mot de passe (déclenché par l'utilisateur)
 *   - notification d'intervention admin sur un rapport
 *   - relance manuelle envoyée par un Animateur
 */

export type BrevoRecipient = { email: string; name?: string };

export type BrevoSendParams = {
  to: BrevoRecipient[];
  subject: string;
  htmlContent: string;
  replyTo?: BrevoRecipient;
  tags?: string[];
  params?: Record<string, string | number | boolean>;
};

export type BrevoSendResult = { messageId: string };

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export async function sendTransactionalEmail(
  input: BrevoSendParams
): Promise<BrevoSendResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not set");
  }

  const sender = {
    email: process.env.EMAIL_FROM ?? "tandem@moortgat.com",
    name: process.env.EMAIL_FROM_NAME ?? "Tandem by Moortgat",
  };

  const res = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      to: input.to,
      subject: input.subject,
      htmlContent: input.htmlContent,
      replyTo: input.replyTo,
      tags: input.tags,
      params: input.params,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo API error ${res.status}: ${body}`);
  }

  const json = (await res.json()) as { messageId?: string };
  return { messageId: json.messageId ?? "" };
}

/**
 * Remplace les variables dynamiques dans un template.
 * Ex. "Bonjour {PRENOM_N}, clique sur {LIEN_ACCES}."
 */
export function interpolate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{([A-Z0-9_]+)\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key]! : `{${key}}`
  );
}
