const nodemailer = require('nodemailer');

let transporter = null;
const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

if (smtpConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

async function notifyOwnerOfBooking(booking, room) {
  const subject = `New booking — ${room.name} — ${booking.guest_name}`;
  const body = [
    `Room: ${room.name}`,
    `Guest: ${booking.guest_name} <${booking.guest_email}>`,
    `Check-in: ${booking.checkin}`,
    `Check-out: ${booking.checkout}`,
    `Nights: ${booking.nights}`,
    `Guests: ${booking.guests}`,
    `Total: $${booking.total}`,
    `Booking ID: ${booking.id}`
  ].join('\n');

  if (!smtpConfigured) {
    console.log(`[notify] SMTP not configured — booking logged only:\n${body}`);
    return { sent: false, reason: 'smtp_not_configured' };
  }

  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: process.env.OWNER_EMAIL || process.env.SMTP_USER,
      subject,
      text: body
    });
    return { sent: true };
  } catch (err) {
    console.error('[notify] Failed to send owner email:', err.message);
    return { sent: false, reason: 'send_failed' };
  }
}

module.exports = { notifyOwnerOfBooking, smtpConfigured };
