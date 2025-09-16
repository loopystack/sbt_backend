import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from jinja2 import Environment, FileSystemLoader, select_autoescape
import os
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME
        
        # Setup Jinja2 environment for email templates
        template_dir = os.path.join(os.path.dirname(__file__), "..", "templates", "email")
        os.makedirs(template_dir, exist_ok=True)
        
        self.jinja_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape(['html', 'xml'])
        )

    async def send_email(
        self,
        to_emails: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send email using SMTP"""
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = ", ".join(to_emails)

            # Add text part
            if text_content:
                text_part = MIMEText(text_content, "plain")
                message.attach(text_part)

            # Add HTML part
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)

            # Create SMTP connection
            context = ssl.create_default_context()
            
            # Use SMTP_SSL for port 465, SMTP with STARTTLS for port 587
            if self.smtp_port == 465:
                # Use SMTP_SSL for Gmail with port 465
                with smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, context=context) as server:
                    server.login(self.smtp_username, self.smtp_password)
                    server.sendmail(self.from_email, to_emails, message.as_string())
            else:
                # Use SMTP with STARTTLS for port 587
                with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                    server.starttls(context=context)
                    server.login(self.smtp_username, self.smtp_password)
                    server.sendmail(self.from_email, to_emails, message.as_string())

            logger.info(f"Email sent successfully to {to_emails}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_emails}: {str(e)}")
            return False

    def render_template(self, template_name: str, **kwargs) -> str:
        """Render email template"""
        try:
            template = self.jinja_env.get_template(template_name)
            return template.render(**kwargs)
        except Exception as e:
            logger.error(f"Failed to render template {template_name}: {str(e)}")
            return ""

    async def send_verification_email(self, email: str, username: str, verification_token: str) -> bool:
        """Send email verification email"""
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"
        
        html_content = self.render_template(
            "verification.html",
            username=username,
            verification_url=verification_url,
            app_name=settings.APP_NAME
        )
        
        if not html_content:
            # Fallback HTML if template doesn't exist
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Verify Your Email</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2c3e50;">Welcome to {settings.APP_NAME}!</h2>
                    <p>Hi {username},</p>
                    <p>Thank you for registering with {settings.APP_NAME}. To complete your registration, please verify your email address by clicking the link below:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{verification_url}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email Address</a>
                    </div>
                    <p>If you didn't create an account with {settings.APP_NAME}, please ignore this email.</p>
                    <p>This link will expire in 24 hours.</p>
                    <p>Best regards,<br>The {settings.APP_NAME} Team</p>
                </div>
            </body>
            </html>
            """
        
        text_content = f"""
        Welcome to {settings.APP_NAME}!
        
        Hi {username},
        
        Thank you for registering with {settings.APP_NAME}. To complete your registration, please verify your email address by visiting this link:
        
        {verification_url}
        
        If you didn't create an account with {settings.APP_NAME}, please ignore this email.
        
        This link will expire in 24 hours.
        
        Best regards,
        The {settings.APP_NAME} Team
        """
        
        return await self.send_email(
            to_emails=[email],
            subject=f"Verify your email address - {settings.APP_NAME}",
            html_content=html_content,
            text_content=text_content
        )

    async def send_password_reset_email(self, email: str, username: str, reset_token: str) -> bool:
        """Send password reset email"""
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
        
        html_content = self.render_template(
            "password_reset.html",
            username=username,
            reset_url=reset_url,
            app_name=settings.APP_NAME
        )
        
        if not html_content:
            # Fallback HTML if template doesn't exist
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Password Reset</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2c3e50;">Password Reset Request</h2>
                    <p>Hi {username},</p>
                    <p>We received a request to reset your password for your {settings.APP_NAME} account.</p>
                    <p>Click the link below to reset your password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_url}" style="background-color: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
                    </div>
                    <p>If you didn't request a password reset, please ignore this email. Your password will not be changed.</p>
                    <p>This link will expire in 1 hour.</p>
                    <p>Best regards,<br>The {settings.APP_NAME} Team</p>
                </div>
            </body>
            </html>
            """
        
        text_content = f"""
        Password Reset Request
        
        Hi {username},
        
        We received a request to reset your password for your {settings.APP_NAME} account.
        
        Click the link below to reset your password:
        {reset_url}
        
        If you didn't request a password reset, please ignore this email. Your password will not be changed.
        
        This link will expire in 1 hour.
        
        Best regards,
        The {settings.APP_NAME} Team
        """
        
        return await self.send_email(
            to_emails=[email],
            subject=f"Password Reset - {settings.APP_NAME}",
            html_content=html_content,
            text_content=text_content
        )


# Create email service instance
email_service = EmailService()
