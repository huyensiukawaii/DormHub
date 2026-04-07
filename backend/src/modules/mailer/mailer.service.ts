import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

export type SendMailInput = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.transporter = this.createTransporter();
  }

  private createTransporter(): Transporter | null {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT', '587'));
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const secure = this.configService.get<string>('SMTP_SECURE', 'false') === 'true';

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP chưa được cấu hình (cần SMTP_HOST/SMTP_USER/SMTP_PASS). Mailer sẽ tạm thời không gửi email.',
      );
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendMail(input: SendMailInput): Promise<boolean> {
    const from = this.configService.get<string>('SMTP_FROM', 'DormHub <no-reply@dormhub.local>');

    if (!this.transporter) {
      this.logger.warn(`Bỏ qua gửi mail vì chưa có SMTP. to=${input.to} subject=${input.subject}`);
      return false;
    }

    await this.transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    return true;
  }

  async sendPasswordResetEmail(to: string, resetUrl: string, rawToken?: string): Promise<boolean> {
    const subject = 'Đặt lại mật khẩu DormHub';

    const textLines = [
      'Bạn vừa yêu cầu đặt lại mật khẩu DormHub.',
      '',
      `Link đặt lại mật khẩu: ${resetUrl}`,
    ];

    if (rawToken) {
      textLines.push('', `Hoặc nhập mã token này: ${rawToken}`);
    }

    textLines.push('', 'Nếu bạn không yêu cầu, vui lòng bỏ qua email này.');

    const text = textLines.join('\n');

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
        <h2>Đặt lại mật khẩu DormHub</h2>
        <p>Bạn vừa yêu cầu đặt lại mật khẩu.</p>
        <p>
          <a href="${resetUrl}">Bấm vào đây để đặt lại mật khẩu</a>
        </p>
        ${rawToken ? `<p>Hoặc nhập mã token: <b>${rawToken}</b></p>` : ''}
        <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
      </div>
    `;

    return this.sendMail({ to, subject, text, html });
  }
}
