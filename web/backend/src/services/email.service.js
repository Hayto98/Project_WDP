const nodemailer = require('nodemailer');
const { email } = require('../config/env');

let transporter = null;

function isConfigured() {
  return Boolean(email.enabled && email.smtpHost && email.from);
}

function getTransporter() {
  if (!isConfigured()) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: email.smtpHost,
    port: email.smtpPort,
    secure: email.smtpSecure,
    auth: email.smtpUser
      ? {
        user: email.smtpUser,
        pass: email.smtpPass,
      }
      : undefined,
  });
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const mailer = getTransporter();
  if (!mailer) {
    return { sent: false, skipped: true, reason: 'EMAIL_NOT_CONFIGURED' };
  }

  const info = await mailer.sendMail({
    from: email.from,
    to,
    subject,
    text,
    html,
  });

  return { sent: true, messageId: info.messageId };
}

function paperUrl(paper) {
  return paper.original_url || paper.url || (paper.doi ? `https://doi.org/${paper.doi}` : '');
}

async function sendFollowPaperEmail(user, subject, paper) {
  if (!user?.email) return { sent: false, skipped: true, reason: 'NO_RECIPIENT' };

  const title = paper.title || 'Paper mới';
  const url = paperUrl(paper);
  const source = paper.source_name || paper.sources?.[0]?.source_name || 'Research Corpus';
  const year = paper.publication_year ? ` (${paper.publication_year})` : '';
  const text = [
    `Paper mới khớp mục theo dõi "${subject.value}"`,
    '',
    `${title}${year}`,
    `Nguồn: ${source}`,
    url ? `Link: ${url}` : '',
    '',
    'Bạn nhận email này vì đã bật kênh Email cho mục theo dõi trong ResearchTrends.',
  ].filter(Boolean).join('\n');

  return sendMail({
    to: user.email,
    subject: `[ResearchTrends] Paper mới: ${title.slice(0, 100)}`,
    text,
  });
}

async function sendFollowDigestEmail(user, frequency, items) {
  if (!user?.email) return { sent: false, skipped: true, reason: 'NO_RECIPIENT' };
  if (!Array.isArray(items) || items.length === 0) {
    return { sent: false, skipped: true, reason: 'NO_DIGEST_ITEMS' };
  }

  const title = frequency === 'weekly' ? 'Tổng hợp paper theo dõi tuần này' : 'Tổng hợp paper theo dõi hôm nay';
  const lines = items.slice(0, 20).flatMap((item, index) => {
    const paper = item.paper || {};
    const url = paperUrl(paper);
    return [
      `${index + 1}. ${paper.title || item.title || 'Paper mới'}`,
      `   Chủ đề: ${item.subject?.value || 'Theo dõi'} · Nguồn: ${paper.source_name || item.source || 'Research Corpus'}`,
      url ? `   Link: ${url}` : '',
    ].filter(Boolean);
  });

  const text = [
    title,
    '',
    ...lines,
    '',
    'Bạn nhận email này vì đã bật kênh Email cho mục theo dõi trong ResearchTrends.',
  ].join('\n');

  return sendMail({
    to: user.email,
    subject: `[ResearchTrends] ${title}`,
    text,
  });
}

module.exports = {
  isConfigured,
  sendMail,
  sendFollowPaperEmail,
  sendFollowDigestEmail,
};
