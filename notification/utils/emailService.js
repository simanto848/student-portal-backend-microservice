import { config } from 'shared';
import transporter from './mailTransporter.js';

class EmailService {
    constructor() {
        this.from = config.email.from;
        this.companyName = config.app.companyName;
        this.supportEmail = config.email.user;
        this.loginUrl = config.client.frontendUrl;
        this.helpCenterUrl = config.app.helpCenterUrl;
        this.companyLogoUrl = config.app.companyLogoUrl;
    }

    async sendNotificationEmail(to, data) {
        try {
            const { title, content, summary, priority = 'medium', publishedAt } = data;

            const priorityColors = {
                low: '#6b7280',
                medium: '#3b82f6',
                high: '#f97316',
                urgent: '#ef4444'
            };

            const priorityLabels = {
                low: 'Low Priority',
                medium: 'Medium Priority',
                high: 'High Priority',
                urgent: 'Urgent'
            };

            const priorityColor = priorityColors[priority] || priorityColors.medium;
            const priorityLabel = priorityLabels[priority] || priorityLabels.medium;

            const formattedDate = publishedAt
                ? new Date(publishedAt).toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
                : new Date().toLocaleString();

            const html = this.generateEmailTemplate({
                title,
                content,
                summary,
                priorityColor,
                priorityLabel,
                formattedDate
            });

            const subject = `[${priorityLabel}] ${title}`;

            const mailOptions = {
                from: `"${this.from}" <${config.email.user}>`,
                to,
                subject,
                html,
                text: this.generatePlainText({ title, content, summary, priorityLabel, formattedDate })
            };

            const info = await transporter.sendMail(mailOptions);
            console.log(`[EmailService] Notification email sent to ${to}:`, info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error(`[EmailService] Failed to send email to ${to}:`, error.message);
            throw error;
        }
    }

    /**
     * Generate HTML email template
     */
    generateEmailTemplate({ title, content, summary, priorityColor, priorityLabel, formattedDate }) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #588157 0%, #3a5a40 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .header .company-name {
            font-size: 14px;
            opacity: 0.9;
            margin-top: 8px;
        }
        .priority-badge {
            display: inline-block;
            background-color: ${priorityColor};
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-top: 12px;
            text-transform: uppercase;
        }
        .content {
            padding: 30px;
        }
        .notification-title {
            font-size: 20px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 8px;
        }
        .notification-date {
            font-size: 13px;
            color: #666;
            margin-bottom: 20px;
        }
        .notification-summary {
            background-color: #f8f9fa;
            border-left: 4px solid ${priorityColor};
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 0 8px 8px 0;
            font-style: italic;
            color: #555;
        }
        .notification-content {
            font-size: 15px;
            color: #444;
            white-space: pre-wrap;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #588157 0%, #3a5a40 100%);
            color: white !important;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin-top: 20px;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #eee;
        }
        .footer a {
            color: #588157;
            text-decoration: none;
        }
        .footer .social-links {
            margin-top: 12px;
        }
        @media only screen and (max-width: 480px) {
            body {
                padding: 10px;
            }
            .header {
                padding: 20px;
            }
            .content {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${this.companyLogoUrl ? `<img src="${this.companyLogoUrl}" alt="${this.companyName}" style="max-height: 50px; margin-bottom: 10px;">` : ''}
            <h1>📢 New Notification</h1>
            <div class="company-name">${this.companyName}</div>
            <span class="priority-badge">${priorityLabel}</span>
        </div>

        <div class="content">
            <div class="notification-title">${title}</div>
            <div class="notification-date">📅 ${formattedDate}</div>

            ${summary ? `<div class="notification-summary">${summary}</div>` : ''}

            <div class="notification-content">${content.replace(/\n/g, '<br>')}</div>

            <a href="${this.loginUrl}" class="cta-button">View in Portal →</a>
        </div>

        <div class="footer">
            <p>This notification was sent from ${this.companyName}.</p>
            <p>If you have any questions, contact us at <a href="mailto:${this.supportEmail}">${this.supportEmail}</a></p>
            <p><a href="${this.helpCenterUrl}">Help Center</a> | <a href="${this.loginUrl}">Student Portal</a></p>
            <div class="social-links">
                <small>© ${new Date().getFullYear()} ${this.companyName}. All rights reserved.</small>
            </div>
        </div>
    </div>
</body>
</html>
        `.trim();
    }

    /**
     * Generate plain text version of email
     */
    generatePlainText({ title, content, summary, priorityLabel, formattedDate }) {
        let text = `
${this.companyName} - New Notification
========================================

[${priorityLabel}] ${title}

Date: ${formattedDate}
`;
        if (summary) {
            text += `\nSummary: ${summary}\n`;
        }

        text += `
----------------------------------------
${content}
----------------------------------------

View in Portal: ${this.loginUrl}

If you have any questions, contact us at ${this.supportEmail}

© ${new Date().getFullYear()} ${this.companyName}. All rights reserved.
        `.trim();

        return text;
    }


    async sendBulkNotificationEmails(recipients, notificationData) {
        const results = {
            successful: [],
            failed: []
        };

        for (const recipient of recipients) {
            try {
                await this.sendNotificationEmail(recipient.email || recipient, notificationData);
                results.successful.push(recipient.email || recipient);
            } catch (error) {
                results.failed.push({
                    email: recipient.email || recipient,
                    error: error.message
                });
            }
        }

        return results;
    }
}

export default new EmailService();
