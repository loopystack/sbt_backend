from typing import List, Optional
from jinja2 import Environment, FileSystemLoader, select_autoescape
import os
import logging
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send"


class EmailService:
    """Email service using SendGrid API only. All emails are sent via SendGrid."""

    def __init__(self):
        self.from_email = (settings.SMTP_FROM_EMAIL or "").strip()
        self.from_name = (settings.SMTP_FROM_NAME or "Soccer Betting App").strip()
        self.sendgrid_api_key = (settings.SENDGRID_API_KEY or "").strip()

        template_dir = os.path.join(os.path.dirname(__file__), "..", "templates", "email")
        os.makedirs(template_dir, exist_ok=True)
        self.jinja_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape(["html", "xml"]),
        )

    async def send_email(
        self,
        to_emails: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """Send email via SendGrid. All app email goes through SendGrid."""
        if not self.sendgrid_api_key:
            logger.error("SENDGRID_API_KEY is not set; cannot send email")
            return False
        if not self.from_email:
            logger.error("SMTP_FROM_EMAIL must be set for SendGrid sender")
            return False
        # SendGrid requires: text/plain first, then text/html
        content = []
        if text_content:
            content.append({"type": "text/plain", "value": text_content})
        content.append({"type": "text/html", "value": html_content})
        payload = {
            "personalizations": [{"to": [{"email": email} for email in to_emails]}],
            "from": {"email": self.from_email, "name": self.from_name},
            "subject": subject,
            "content": content,
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                r = await client.post(
                    SENDGRID_API_URL,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {self.sendgrid_api_key}",
                        "Content-Type": "application/json",
                    },
                )
            if 200 <= r.status_code < 300:
                logger.info("Email sent via SendGrid to %s", to_emails)
                return True
            logger.error("SendGrid API error %s: %s", r.status_code, r.text)
            return False
        except Exception as e:
            logger.exception("Failed to send email via SendGrid to %s: %s", to_emails, e)
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
        verification_url = f"{settings.frontend_url}/verify-email?token={verification_token}"
        
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
        reset_url = f"{settings.frontend_url}/reset-password?token={reset_token}"
        
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

    async def send_bet_settlement_email(
        self, 
        email: str, 
        username: str, 
        match_teams: str,
        match_result: str,
        bet_outcome: str,
        bet_won: bool,
        bet_amount: float,
        winnings: float = 0.0,
        profit: float = 0.0
    ) -> bool:
        """Send bet settlement notification email"""
        
        if bet_won:
            subject = f"🎉 Congratulations! You Won Your Bet - {settings.APP_NAME}"
            status_emoji = "🏆"
            status_text = "WON"
            status_color = "#27ae60"
            result_message = f"Congratulations! Your bet was successful and you've won <strong>${winnings:.2f}</strong> (profit: <strong style='color: #27ae60;'>+${profit:.2f}</strong>)."
        else:
            subject = f"⚽ Bet Settlement Update - {settings.APP_NAME}"
            status_emoji = "❌"
            status_text = "LOST"
            status_color = "#e74c3c"
            result_message = f"Unfortunately, your bet was not successful this time. Better luck next time!"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Bet Settlement</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 20px auto; background-color: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="margin: 0; font-size: 28px;">{status_emoji} Bet Settled!</h1>
                </div>
                
                <!-- Content -->
                <div style="padding: 30px;">
                    <p style="font-size: 16px; margin-bottom: 20px;">Hi <strong>{username}</strong>,</p>
                    
                    <p style="font-size: 16px; margin-bottom: 25px;">The match you bet on has finished and your bet has been settled!</p>
                    
                    <!-- Match Details Card -->
                    <div style="background-color: #f8f9fa; border-left: 4px solid {status_color}; padding: 20px; margin: 25px 0; border-radius: 5px;">
                        <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 18px;">⚽ Match Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #7f8c8d; font-size: 14px;">Match:</td>
                                <td style="padding: 8px 0; font-weight: bold; text-align: right; font-size: 14px;">{match_teams}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #7f8c8d; font-size: 14px;">Final Score:</td>
                                <td style="padding: 8px 0; font-weight: bold; text-align: right; font-size: 14px;">{match_result}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #7f8c8d; font-size: 14px;">Your Bet:</td>
                                <td style="padding: 8px 0; font-weight: bold; text-align: right; font-size: 14px;">{bet_outcome}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #7f8c8d; font-size: 14px;">Bet Amount:</td>
                                <td style="padding: 8px 0; font-weight: bold; text-align: right; font-size: 14px;">${bet_amount:.2f}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <!-- Result Card -->
                    <div style="background-color: {status_color}; color: white; padding: 25px; margin: 25px 0; border-radius: 8px; text-align: center;">
                        <h2 style="margin: 0 0 10px 0; font-size: 32px;">{status_emoji} {status_text}</h2>
                        {f'<p style="margin: 0; font-size: 24px; font-weight: bold;">${winnings:.2f}</p>' if bet_won else '<p style="margin: 0; font-size: 16px;">Loss: ${:.2f}</p>'.format(bet_amount)}
                        {f'<p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Profit: +${profit:.2f}</p>' if bet_won else ''}
                    </div>
                    
                    <p style="font-size: 16px; margin: 25px 0;">{result_message}</p>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{settings.frontend_url}/dashboard" style="background-color: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">View Dashboard</a>
                    </div>
                    
                    <p style="font-size: 14px; color: #7f8c8d; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                        Keep betting and good luck with your next bets! 🍀
                    </p>
                    
                    <p style="font-size: 14px; color: #7f8c8d; margin-top: 20px;">
                        Best regards,<br>
                        <strong>The {settings.APP_NAME} Team</strong>
                    </p>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0; font-size: 12px; color: #7f8c8d;">
                        You received this email because you placed a bet on {settings.APP_NAME}.<br>
                        <a href="{settings.frontend_url}" style="color: #667eea; text-decoration: none;">Visit {settings.APP_NAME}</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        {status_emoji} Bet Settlement Notification
        
        Hi {username},
        
        The match you bet on has finished and your bet has been settled!
        
        ⚽ MATCH DETAILS
        ─────────────────────────────────
        Match: {match_teams}
        Final Score: {match_result}
        Your Bet: {bet_outcome}
        Bet Amount: ${bet_amount:.2f}
        
        🎯 RESULT: {status_text}
        ─────────────────────────────────
        {'Winnings: $' + str(winnings) + ' (Profit: +$' + str(profit) + ')' if bet_won else 'Loss: -$' + str(bet_amount)}
        
        {result_message}
        
        View your dashboard: {settings.frontend_url}/dashboard
        
        {'Keep betting and good luck with your next bets! 🍀' if not bet_won else 'Congratulations on your win! 🎉'}
        
        Best regards,
        The {settings.APP_NAME} Team
        """
        
        return await self.send_email(
            to_emails=[email],
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )


# Create email service instance
email_service = EmailService()
