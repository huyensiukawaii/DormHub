import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
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
  private static readonly templateCache = new Map<string, string>();

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

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async loadTemplate(templateFileName: string): Promise<string> {
    const candidates = [
      path.join(__dirname, 'templates', templateFileName),
      path.join(process.cwd(), 'dist', 'src', 'modules', 'mailer', 'templates', templateFileName),
      path.join(process.cwd(), 'dist', 'modules', 'mailer', 'templates', templateFileName),
      path.join(process.cwd(), 'src', 'modules', 'mailer', 'templates', templateFileName),
    ];

    let lastErr: unknown;
    for (const absPath of candidates) {
      const cached = MailerService.templateCache.get(absPath);
      if (cached) return cached;

      try {
        const content = await readFile(absPath, 'utf8');
        MailerService.templateCache.set(absPath, content);
        return content;
      } catch (err) {
        lastErr = err;
      }
    }

    throw lastErr;
  }

  private async renderHtmlTemplate(params: {
    templateFileName: string;
    variables: Record<string, string | number | null | undefined>;
    rawVariables?: Record<string, string | null | undefined>;
  }): Promise<string> {
    const template = await this.loadTemplate(params.templateFileName);
    const rawVars = params.rawVariables ?? {};
    const vars = params.variables;

    // Triple braces: {{{var}}} => raw injection
    let rendered = template.replace(/\{\{\{\s*([a-zA-Z0-9_]+)\s*\}\}\}/g, (_m, key: string) => {
      const v = rawVars[key];
      return v == null ? '' : String(v);
    });

    // Double braces: {{var}} => escaped
    rendered = rendered.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
      const v = vars[key];
      return v == null ? '' : this.escapeHtml(String(v));
    });

    return rendered;
  }

  private buildTextEmail(params: {
    heading: string;
    lines: string[];
    ctaLabel?: string;
    ctaHref?: string;
    footerLines?: string[];
  }): string {
    const textLines: string[] = [];

    textLines.push(params.heading);
    textLines.push('');
    textLines.push(...params.lines.filter(Boolean));

    if (params.ctaLabel && params.ctaHref) {
      textLines.push('');
      textLines.push(`${params.ctaLabel}: ${params.ctaHref}`);
    }

    if (params.footerLines?.length) {
      textLines.push('');
      textLines.push(...params.footerLines);
    }

    return textLines.join('\n');
  }

  async sendMail(input: SendMailInput): Promise<boolean> {
    const appName = this.configService.get<string>('APP_NAME', 'DormHub');
    const from = this.configService.get<string>('SMTP_FROM', `${appName} <no-reply@dormhub.local>`);

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

  async sendApplicationApprovedEmail(params: {
    to: string;
    studentName: string;
    periodName: string;
    roomCode: string;
    buildingName: string;
    moveInDate?: string | null;
    moveOutDate?: string | null;
    loginUrl: string;
  }): Promise<boolean> {
    const appName = this.configService.get<string>('APP_NAME', 'DormHub');
    const subject = `[${appName}] Đơn đăng ký KTX của bạn đã được duyệt`;

    const formatDate = (d: string) =>
      new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const moveInRowHtml = params.moveInDate
      ? `<tr><td style="font-size:14px;color:#374151;padding:4px 0">&#128197; Ngày nhận phòng</td><td style="font-size:14px;font-weight:700;color:#111827;text-align:right">${formatDate(params.moveInDate)}</td></tr>`
      : '';
    const moveOutRowHtml = params.moveOutDate
      ? `<tr><td style="font-size:14px;color:#374151;padding:4px 0">&#128197; Ngày trả phòng</td><td style="font-size:14px;font-weight:700;color:#111827;text-align:right">${formatDate(params.moveOutDate)}</td></tr>`
      : '';

    const html = await this.renderHtmlTemplate({
      templateFileName: 'application-approved.html',
      variables: {
        appName,
        studentName: params.studentName,
        periodName: params.periodName,
        roomCode: params.roomCode,
        buildingName: params.buildingName,
        loginUrl: params.loginUrl,
        year: new Date().getFullYear(),
      },
      rawVariables: { moveInRowHtml, moveOutRowHtml },
    });

    const text = `Xin chào ${params.studentName},\n\nĐơn đăng ký KTX của bạn cho đợt ${params.periodName} đã được duyệt.\nPhòng: ${params.roomCode} - ${params.buildingName}\n${params.moveInDate ? `Ngày nhận phòng: ${formatDate(params.moveInDate)}\n` : ''}Đăng nhập tại: ${params.loginUrl}`;

    return this.sendMail({ to: params.to, subject, text, html });
  }

  async sendApplicationRejectedEmail(params: {
    to: string;
    studentName: string;
    periodName: string;
    rejectionReason: string;
  }): Promise<boolean> {
    const appName = this.configService.get<string>('APP_NAME', 'DormHub');
    const subject = `[${appName}] Kết quả xét duyệt đơn đăng ký KTX`;

    const html = await this.renderHtmlTemplate({
      templateFileName: 'application-rejected.html',
      variables: {
        appName,
        studentName: params.studentName,
        periodName: params.periodName,
        rejectionReason: params.rejectionReason,
        year: new Date().getFullYear(),
      },
    });

    const text = `Xin chào ${params.studentName},\n\nĐơn đăng ký KTX của bạn cho đợt ${params.periodName} chưa được chấp thuận.\nLý do: ${params.rejectionReason}\n\nBạn có thể nộp đơn lại ở các đợt tiếp theo.`;

    return this.sendMail({ to: params.to, subject, text, html });
  }

  async sendPasswordResetEmail(to: string, resetUrl: string, rawToken?: string): Promise<boolean> {
    const appName = this.configService.get<string>('APP_NAME', 'DormHub');
    const ttlRaw = this.configService.get<string>('RESET_PASSWORD_TTL_MINUTES');
    const ttlMinutes = ttlRaw ? Number(ttlRaw) : undefined;

    const subject = `Đặt lại mật khẩu ${appName}`;
    const normalizedTtlMinutes =
      Number.isFinite(ttlMinutes) && (ttlMinutes ?? 0) > 0 ? ttlMinutes : undefined;

    const ctaLabel = 'Đặt lại mật khẩu';

    const text = this.buildTextEmail({
      heading: subject,
      lines: [
        'Bạn vừa yêu cầu đặt lại mật khẩu.',
        normalizedTtlMinutes ? `Link có hiệu lực trong ${normalizedTtlMinutes} phút.` : '',
        rawToken ? `Mã token: ${rawToken}` : '',
        'Nếu bạn không yêu cầu, vui lòng bỏ qua email này.',
      ],
      ctaLabel,
      ctaHref: resetUrl,
      footerLines: ['—', appName],
    });

    const tokenHtml = rawToken
      ? `<p style="margin: 12px 0 0">Hoặc nhập mã token: <b>${this.escapeHtml(rawToken)}</b></p>`
      : '';

    const ttlHtml = normalizedTtlMinutes
      ? `<p style="margin: 8px 0 0; color:#374151">Link có hiệu lực trong <b>${this.escapeHtml(String(normalizedTtlMinutes))}</b> phút.</p>`
      : '';

    const html = await this.renderHtmlTemplate({
      templateFileName: 'password-reset.html',
      variables: {
        subject,
        appName,
        heading: 'Đặt lại mật khẩu',
        intro: 'Bạn vừa yêu cầu đặt lại mật khẩu.',
        resetUrl,
        ctaLabel,
        outro: 'Nếu bạn không yêu cầu, vui lòng bỏ qua email này.',
        year: new Date().getFullYear(),
      },
      rawVariables: {
        ttlHtml,
        tokenHtml,
      },
    });

    return this.sendMail({ to, subject, text, html });
  }
}
