const nodemailer = require('nodemailer')
require('dotenv').config()

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
})

const sendTicketCreatedEmail = async (ticket, department, dutyPerson) => {
  // Build recipient list: duty person + generic person
  const recipients = []

  // Add duty person if assigned
  if (dutyPerson) {
    recipients.push(dutyPerson.email)
  }

  // Add generic email for department
  if (department === 'NERLDC IT') {
    recipients.push(process.env.GENERIC_IT_EMAIL)
  } else {
    recipients.push(process.env.GENERIC_OT_EMAIL)
  }

  const toEmails = recipients.filter(Boolean).join(',')

  const dutyBanner = dutyPerson
    ? `<div style="background:#fef9c3;border-bottom:2px solid #f0a500;padding:16px 24px;">
        <p style="margin:0;font-size:13px;color:#78350f;">📌 Today's Duty Officer</p>
        <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#1a3a6b;">
          <span style="background:#1a3a6b;color:#fff;padding:4px 16px;border-radius:4px;">
            ${dutyPerson.name}
          </span>
        </p>
        // drop3
      </div>`
    : `<div style="background:#fef2f2;border-bottom:2px solid #b91c1c;padding:16px 24px;">
        <p style="margin:0;font-size:14px;font-weight:700;color:#b91c1c;">
          ⚠️ No duty officer assigned for today
        </p>
      </div>`

  const mailOptions = {
    from: `"Control Room Ticketing" <${process.env.GMAIL_USER}>`,
    to: toEmails,
    subject: `[${ticket.severity.toUpperCase()}] New Ticket: ${ticket.ticket_no} — ${ticket.title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;border:1px solid #cccccc;">

        <div style="background:#1a3a6b;padding:16px 24px;border-bottom:4px solid #f0a500;">
          <h2 style="color:#fff;margin:0;font-size:18px;">⚡ Control Room Ticketing System</h2>
          <p style="color:#c8d8f0;margin:4px 0 0;font-size:12px;">New Ticket Alert — Action Required</p>
        </div>

        ${dutyBanner}

        <div style="padding:24px;background:#fff;">
          <p style="font-size:14px;color:#1a1a1a;margin-bottom:20px;">
            A new ticket has been raised and requires attention.
          </p>

          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#e8eef6;">
                <th style="padding:10px 14px;text-align:left;border:1px solid #ccc;color:#1a3a6b;text-transform:uppercase;">Ticket No</th>
                <th style="padding:10px 14px;text-align:left;border:1px solid #ccc;color:#1a3a6b;text-transform:uppercase;">Title</th>
                <th style="padding:10px 14px;text-align:left;border:1px solid #ccc;color:#1a3a6b;text-transform:uppercase;">Severity</th>
                <th style="padding:10px 14px;text-align:left;border:1px solid #ccc;color:#1a3a6b;text-transform:uppercase;">Department</th>
                <th style="padding:10px 14px;text-align:left;border:1px solid #ccc;color:#1a3a6b;text-transform:uppercase;">Raised By</th>
                <th style="padding:10px 14px;text-align:left;border:1px solid #ccc;color:#1a3a6b;text-transform:uppercase;">Date & Time</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:10px 14px;border:1px solid #e0e0e0;font-weight:700;color:#1a3a6b;">${ticket.ticket_no}</td>
                <td style="padding:10px 14px;border:1px solid #e0e0e0;">${ticket.title}</td>
                <td style="padding:10px 14px;border:1px solid #e0e0e0;">
                  <span style="padding:3px 10px;font-weight:700;text-transform:uppercase;font-size:11px;border:1px solid;
                    ${ticket.severity === 'critical' ? 'color:#991b1b;border-color:#fca5a5;background:#fef2f2;' : ''}
                    ${ticket.severity === 'high' ? 'color:#9a3412;border-color:#fdba74;background:#fff7ed;' : ''}
                    ${ticket.severity === 'medium' ? 'color:#166534;border-color:#86efac;background:#f0fdf4;' : ''}
                    ${ticket.severity === 'low' ? 'color:#1e40af;border-color:#93c5fd;background:#eff6ff;' : ''}
                  ">${ticket.severity}</span>
                </td>
                <td style="padding:10px 14px;border:1px solid #e0e0e0;">${department}</td>
                <td style="padding:10px 14px;border:1px solid #e0e0e0;">${ticket.created_by || '—'}</td>
                <td style="padding:10px 14px;border:1px solid #e0e0e0;">${new Date(ticket.created_at).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          ${ticket.description ? `
          <div style="margin-top:20px;padding:14px;background:#f9fafb;border:1px solid #e0e0e0;">
            <p style="font-size:12px;font-weight:700;color:#555;text-transform:uppercase;margin-bottom:6px;">Description</p>
            <p style="font-size:13px;color:#1a1a1a;margin:0;">${ticket.description}</p>
          </div>` : ''}
        </div>

        <div style="background:#f5f5f5;padding:12px 24px;border-top:1px solid #e0e0e0;">
          <p style="font-size:11px;color:#888;margin:0;">
            This is an automated alert from the Control Room Ticketing System. Do not reply to this email.
          </p>
        </div>
      </div>
    `
  }

  await transporter.sendMail(mailOptions)
  console.log(`📧 Email sent for ${ticket.ticket_no} → To: ${toEmails}`)
}

module.exports = { sendTicketCreatedEmail }