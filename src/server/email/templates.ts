import type { Email } from './mailer.ts'

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** One branded layout for every transactional email: black field, orange action. */
const layout = (title: string, body: string, action: { label: string; url: string }) => `<!doctype html>
<html><body style="margin:0;background:#0b0b0c;font-family:Archivo,Helvetica,Arial,sans-serif;color:#f5f2ee">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#151517;border:1px solid #2a2a2e;border-radius:16px;padding:32px">
        <tr><td style="font-size:13px;letter-spacing:.2em;color:#ff6a1a;font-weight:800">TCGRANK</td></tr>
        <tr><td style="padding-top:20px;font-size:26px;font-weight:800;line-height:1.15">${escape(title)}</td></tr>
        <tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#c9c4bd">${body}</td></tr>
        <tr><td style="padding-top:28px">
          <a href="${escape(action.url)}" style="display:inline-block;background:#ff6a1a;color:#0b0b0c;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:10px">${escape(action.label)}</a>
        </td></tr>
        <tr><td style="padding-top:24px;font-size:12px;color:#8a857f">If you didn't ask for this, you can ignore this email.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

export const magicLinkEmail = (to: string, url: string): Email => ({
  to,
  subject: 'Your tcgRank sign-in link',
  html: layout('Tap in to your league', 'This link signs you in to tcgRank. It expires in 5 minutes.', {
    label: 'Sign in',
    url,
  }),
  text: `Sign in to tcgRank: ${url}\n\nThis link expires in 5 minutes.`,
})

export const resetPasswordEmail = (to: string, url: string): Email => ({
  to,
  subject: 'Reset your tcgRank password',
  html: layout('Reset your password', 'Choose a new password for your tcgRank account.', {
    label: 'Choose a new password',
    url,
  }),
  text: `Reset your tcgRank password: ${url}`,
})

export const verifyEmail = (to: string, url: string): Email => ({
  to,
  subject: 'Confirm your email for tcgRank',
  html: layout('Confirm your email', 'One tap and you are ready to join leagues and track your record.', {
    label: 'Confirm email',
    url,
  }),
  text: `Confirm your email for tcgRank: ${url}`,
})
