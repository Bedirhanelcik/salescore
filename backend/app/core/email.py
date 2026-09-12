"""Minimal transactional email sender (stdlib smtplib only - no new dependency).

Deliberately fails soft: if SMTP isn't configured (the default in local/dev
environments), `send_email` returns False instead of raising, so a feature like
the support ticket form keeps working - the ticket is still saved to the
database - it just isn't emailed anywhere. Only a configured, reachable SMTP
server is required for the email to actually go out.
"""

import logging
import smtplib
from email.message import EmailMessage
from email.utils import make_msgid

from app.core.config import settings

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SUPPORT_EMAIL and settings.SUPPORT_FROM_EMAIL)


def send_email(*, to: str, subject: str, body: str) -> bool:
    """Sends a plain-text email. Returns whether it was actually sent.

    `subject` and `body` are rendered as plain text only (EmailMessage.set_content),
    never interpolated into HTML - this is what keeps user-supplied ticket content
    (subject/message) from being able to inject markup into an HTML email client.
    """
    if not is_configured():
        logger.info("Email not sent (SMTP not configured): subject=%r to=%r", subject, to)
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.SUPPORT_FROM_EMAIL
    message["To"] = to
    message["Message-ID"] = make_msgid()
    message.set_content(body)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
            smtp.starttls()
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            smtp.send_message(message)
        return True
    except (OSError, smtplib.SMTPException) as exc:
        logger.warning("Failed to send email to %r: %s", to, exc)
        return False


__all__ = ["is_configured", "send_email"]
