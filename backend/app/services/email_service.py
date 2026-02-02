import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging

logger = logging.getLogger("clipbuilder")

class EmailService:
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", 587))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_pass = os.getenv("SMTP_PASS", "")
        self.smtp_from = os.getenv("SMTP_FROM_EMAIL", self.smtp_user)
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

    def send_email(self, to_email: str, subject: str, html_content: str):
        if not self.smtp_user or not self.smtp_pass:
            logger.warning("SMTP not configured (SMTP_USER/SMTP_PASS missing). Email to %s NOT sent.", to_email)
            return

        logger.info("Preparing to send email to=%s subject='%s' host=%s:%s user=%s", 
                    to_email, subject, self.smtp_host, self.smtp_port, self.smtp_user)

        msg = MIMEMultipart()
        msg["From"] = self.smtp_from
        msg["To"] = to_email
        msg["Subject"] = subject

        # Attach text content as fallback? For now keeping HTML as requested.
        msg.attach(MIMEText(html_content, "html"))

        try:
            # Logic: Try STARTTLS (587) first or SSL (465) depending on port.
            # Gmail uses 587 for TLS, 465 for SSL.
            
            if self.smtp_port == 465:
                logger.debug("Connecting via SMTP_SSL to %s:%s", self.smtp_host, self.smtp_port)
                with smtplib.SMTP_SSL(self.smtp_host, self.smtp_port) as server:
                    # server.set_debuglevel(1) # Uncomment to see raw SMTP traffic in console
                    logger.debug("Logging in as %s...", self.smtp_user)
                    server.login(self.smtp_user, self.smtp_pass)
                    
                    logger.debug("Sending message...")
                    server.send_message(msg)
            else:
                logger.debug("Connecting via SMTP (STARTTLS) to %s:%s", self.smtp_host, self.smtp_port)
                with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=30) as server:
                    # server.set_debuglevel(1)
                    server.ehlo()
                    
                    if server.has_extn("STARTTLS"):
                        logger.debug("Starting TLS...")
                        server.starttls()
                        server.ehlo() # Re-identify after TLS
                    
                    logger.debug("Logging in as %s...", self.smtp_user)
                    server.login(self.smtp_user, self.smtp_pass)
                    
                    logger.debug("Sending message...")
                    server.send_message(msg)

            logger.info("SUCCESS: Email '%s' sent to %s", subject, to_email)

        except smtplib.SMTPAuthenticationError as e:
            logger.error("SMTP Auth Error: Failed to login. Check SMTP_USER/SMTP_PASS. Details: %s", e)
        except smtplib.SMTPConnectError as e:
            logger.error("SMTP Connect Error: Failed to connect to %s:%s. Details: %s", self.smtp_host, self.smtp_port, e)
        except smtplib.SMTPException as e:
            logger.error("SMTP Generic Error: %s", e)
        except Exception as e:
            logger.error("Unexpected Error sending email to %s: %s", to_email, str(e), exc_info=True)

    def send_password_reset_email(self, user_email: str, token: str):
        reset_link = f"{self.frontend_url}/reset-password?token={token}"
        
        # ... (Template remains the same, included for completeness in file update if needed, but tool allows overwrite)
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; color: #1f2937; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }}
                .header {{ background-color: #1a1a1a; padding: 24px; text-align: center; }}
                .header h1 {{ color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }}
                .content {{ padding: 32px; }}
                .button {{ display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin-top: 24px; }}
                .footer {{ background-color: #f4f4f5; padding: 16px; text-align: center; font-size: 12px; color: #71717a; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>ClipBuilder</h1>
                </div>
                <div class="content">
                    <h2>Recuperação de Senha</h2>
                    <p>Olá,</p>
                    <p>Recebemos uma solicitação para redefinir a senha da sua conta no ClipBuilder.</p>
                    <p>Para criar uma nova senha, clique no botão abaixo:</p>
                    <p style="text-align: center;">
                        <a href="{reset_link}" class="button">Redefinir Senha</a>
                    </p>
                    <p>Se você não solicitou esta alteração, pode ignorar este e-mail com segurança.</p>
                    <p>O link expirará em breve.</p>
                </div>
                <div class="footer">
                    <p>&copy; 2024 ClipBuilder. Todos os direitos reservados.</p>
                </div>
            </div>
        </body>
        </html>
        """
        self.send_email(user_email, "Recuperação de Senha - ClipBuilder", html_content)
