import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import crypto from 'crypto';
import environment from "../../config/environment";

const transporter = nodemailer.createTransport({
  service: environment.SMTP_SERVICE,
  host: environment.SMTP_HOST,
  port: environment.SMTP_PORT,
  secure: environment.SMTP_SECURE,
  auth: {
    user: environment.SMTP_USER,
    pass: environment.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  },
  pool: true,
  maxConnections: 5,
  rateDelta: 1000,
  rateLimit: 5,
});

/**
 * Generate a random activation token
 * @returns {string} Random hex string token
 */
export const generateActivationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

const renderMailHtml = async (
  template: string,
  data: Record<string, any>
): Promise<string> => {
  try {
    const templatePath = path.join(__dirname, `templates/${template}`);
    const content = await ejs.renderFile(templatePath, data);
    
    if (typeof content !== 'string') {
      throw new Error('Template rendering did not return a string');
    }
    
    return content;
  } catch (error) {
    console.error('Error rendering email template:', error);
    throw new Error(`Failed to render email template: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const sendActivationEmail = async (
  email: string, 
  username: string,
  fullName: string,
  activationToken: string
): Promise<void> => {
  try {
    const activationLink = `${environment.FRONTEND_URL}/auth/activation?token=${activationToken}`;

    const createdAt = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const html = await renderMailHtml('registration-success.ejs', {
      username,
      fullName,
      email,
      createdAt,
      activationLink
    });

    const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@e-learning-smpn37>`;

    await transporter.sendMail({
      from: `"E-Learning SMPN 37" <${environment.SMTP_USER}>`,
      to: email,
      subject: "Aktivasi Akun E-Learning SMPN 37",
      html,
      messageId,
      headers: {
        'Message-ID': messageId,
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
      }
    });

  } catch (error: any) {
    console.error('Error sending activation email:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      command: error.command
    });
    throw new Error('Gagal mengirim email aktivasi');
  }
};

transporter.verify((error) => {
  if (error) {
    console.error('SMTP Connection Error:', error);
  }
});
