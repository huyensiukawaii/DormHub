import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { MailerService } from '../../src/modules/mailer/mailer.service';
import { CloudinaryService } from '../../src/common/cloudinary/cloudinary.service';
import { ChatService } from '../../src/modules/chat/chat.service';

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(MailerService)
    .useValue({
      sendMail: jest.fn().mockResolvedValue(true),
      sendApplicationApproved: jest.fn().mockResolvedValue(true),
      sendApplicationRejected: jest.fn().mockResolvedValue(true),
      sendPasswordReset: jest.fn().mockResolvedValue(true),
      sendContractExpiry: jest.fn().mockResolvedValue(true),
      sendInvoiceOverdue: jest.fn().mockResolvedValue(true),
    })
    .overrideProvider(CloudinaryService)
    .useValue({
      uploadBuffer: jest
        .fn()
        .mockResolvedValue({ url: 'https://test.cdn/image.jpg', publicId: 'test-id' }),
    })
    .overrideProvider(ChatService)
    .useValue({
      chat: jest.fn().mockResolvedValue({ reply: 'Mocked AI response' }),
    })
    .compile();

  const app = moduleFixture.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.init();
  return app;
}
