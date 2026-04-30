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

/**
 * URL publique de l'application (sans slash final).
 * Utilisée pour générer les liens dans les emails.
 */
function appUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return url.replace(/\/+$/, "");
}

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0a0a0a; background: #f5f5f5; margin: 0; padding: 0; }
  .container { max-width: 560px; margin: 32px auto; background: #ffffff; border-radius: 8px; padding: 32px; }
  h1 { font-size: 20px; margin: 0 0 16px; }
  p { font-size: 14px; line-height: 1.5; margin: 0 0 12px; }
  .button { display: inline-block; background: #1e293b; color: #ffffff !important; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; }
  .footer { font-size: 11px; color: #737373; margin-top: 24px; }
  .quote { background: #f5f5f5; border-left: 3px solid #a3a3a3; padding: 8px 12px; margin: 12px 0; font-size: 13px; white-space: pre-wrap; }
`;

function htmlShell(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${baseStyles}</style></head><body><div class="container">${body}<p class="footer">Tandem by Moortgat — outil de suivi collaboratif de formation.</p></div></body></html>`;
}

/**
 * Email envoyé à un binôme N/N+1 lors de l'activation de leur session par
 * l'admin. Lien vers la page de connexion de leur organisation.
 */
export async function sendSessionActivationEmail(input: {
  recipient: BrevoRecipient;
  firstName: string;
  sessionName: string;
  organisationSlug: string;
}): Promise<void> {
  const link = `${appUrl()}/${input.organisationSlug}/login`;
  const html = htmlShell(
    "Ton parcours Tandem démarre",
    `<h1>Bonjour ${input.firstName},</h1>
     <p>La session <strong>${escapeHtml(input.sessionName)}</strong> vient d'être activée. Tu peux dès maintenant accéder à ton espace Tandem pour commencer à remplir ton compte rendu avec ton binôme.</p>
     <p style="margin: 24px 0;"><a class="button" href="${link}">Accéder à mon Tandem</a></p>
     <p>Si tu n'as pas encore défini ton mot de passe, clique sur "Mot de passe oublié" depuis cette page de connexion.</p>`
  );
  await sendTransactionalEmail({
    to: [input.recipient],
    subject: `Ton parcours Tandem démarre — ${input.sessionName}`,
    htmlContent: html,
    tags: ["session-activation"],
  });
}

/**
 * Email envoyé par un animateur en relance manuelle aux deux membres d'un
 * binôme. Le message libre de l'animateur est inclus s'il en a saisi un.
 */
export async function sendRelanceEmail(input: {
  recipient: BrevoRecipient;
  firstName: string;
  animateurName: string;
  sessionName: string;
  organisationSlug: string;
  pairId: string;
  customMessage: string | null;
}): Promise<void> {
  const link = `${appUrl()}/${input.organisationSlug}/tandem/${input.pairId}`;
  const messageBlock = input.customMessage
    ? `<div class="quote">${escapeHtml(input.customMessage)}</div>`
    : "";
  const html = htmlShell(
    "Rappel — ton Tandem t'attend",
    `<h1>Bonjour ${input.firstName},</h1>
     <p><strong>${escapeHtml(input.animateurName)}</strong>, ton animateur sur la session <strong>${escapeHtml(input.sessionName)}</strong>, te recommande d'avancer sur ton compte rendu Tandem.</p>
     ${messageBlock}
     <p style="margin: 24px 0;"><a class="button" href="${link}">Ouvrir mon Tandem</a></p>
     <p>Tu peux saisir ta partie quand tu veux ; ton binôme sera notifié des modifications en temps réel quand vous serez connectés ensemble.</p>`
  );
  await sendTransactionalEmail({
    to: [input.recipient],
    subject: `Rappel — ${input.sessionName}`,
    htmlContent: html,
    tags: ["animateur-relance"],
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
