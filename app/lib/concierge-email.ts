import {CONTACT} from '~/lib/contact';

export type ConciergeInquiry = {
  inquiryType: string;
  name: string;
  email: string;
  location: string;
  phone: string | null;
  message: string;
  submittedAt: string;
};

type ConciergeEmailEnv = {
  RESEND_API_KEY?: string;
  CONCIERGE_EMAIL_TO?: string;
  CONCIERGE_EMAIL_FROM?: string;
};

const DEFAULT_FROM = 'The Kashmir Weaver Concierge <concierge@thekashmirweaver.shop>';

export function formatConciergeInquiryEmail(inquiry: ConciergeInquiry) {
  const lines = [
    `Type: ${inquiry.inquiryType}`,
    `Name: ${inquiry.name}`,
    `Email: ${inquiry.email}`,
    `Location: ${inquiry.location}`,
    inquiry.phone ? `Phone: ${inquiry.phone}` : null,
    '',
    'Message:',
    inquiry.message,
    '',
    `Submitted: ${inquiry.submittedAt}`,
  ].filter((line): line is string => line !== null);

  const text = lines.join('\n');
  const html = lines
    .map((line) => (line === '' ? '<br>' : `<p>${escapeHtml(line)}</p>`))
    .join('');

  return {
    subject: `[Concierge] ${inquiry.inquiryType} — ${inquiry.name}`,
    text,
    html,
  };
}

export async function sendConciergeInquiryEmail(
  inquiry: ConciergeInquiry,
  env: ConciergeEmailEnv,
): Promise<{ok: true} | {ok: false; error: string}> {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error('Concierge email skipped: RESEND_API_KEY is not configured.');
    return {ok: false, error: 'Concierge email is not configured.'};
  }

  const to = env.CONCIERGE_EMAIL_TO?.trim() || CONTACT.email;
  const from = env.CONCIERGE_EMAIL_FROM?.trim() || DEFAULT_FROM;
  const {subject, text, html} = formatConciergeInquiryEmail(inquiry);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: inquiry.email,
        subject,
        text,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('Concierge email failed:', response.status, body);
      return {ok: false, error: 'Unable to deliver inquiry email.'};
    }

    return {ok: true};
  } catch (error) {
    console.error('Concierge email error:', error);
    return {ok: false, error: 'Unable to deliver inquiry email.'};
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
