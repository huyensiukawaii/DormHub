import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor() {
    // cloudinary automatically reads CLOUDINARY_URL env var
    cloudinary.config(true);
  }

  async uploadBuffer(
    buffer: Buffer,
    originalName: string,
    folder: string,
  ): Promise<{ url: string; publicId: string }> {
    // Extract extension (ASCII-safe) and build a clean public_id
    const ext = originalName.split('.').pop()?.toLowerCase() ?? '';
    const safeId = `${Date.now()}${ext ? '.' + ext : ''}`;

    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder,
          // 'raw' serves all file types (PDF, images, docs) with correct content-type
          resource_type: 'raw',
          public_id: safeId,
          access_mode: 'public',
          type: 'upload',
        },
        (error, result) => {
          if (error || !result) {
            reject(new InternalServerErrorException('Upload file thất bại'));
          } else {
            resolve({ url: result.secure_url, publicId: result.public_id });
          }
        },
      );

      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);
      readable.pipe(upload);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }).catch(() => {});
  }
}
