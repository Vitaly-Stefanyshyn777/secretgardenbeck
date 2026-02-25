import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type CloudinarySdk = {
  config: (options: {
    cloud_name: string;
    api_key: string;
    api_secret: string;
  }) => void;
  uploader: {
    upload: (
      file: string,
      options?: Record<string, unknown>,
    ) => Promise<Record<string, unknown>>;
  };
  url: (publicId: string, options?: Record<string, unknown>) => string;
};

@Injectable()
export class CloudinaryService {
  private cloudinaryClient: CloudinarySdk | null = null;
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {}

  private getCloudinaryClient(): CloudinarySdk {
    if (this.cloudinaryClient) {
      return this.cloudinaryClient;
    }

    try {
      const cloudinary = require('cloudinary');
      this.cloudinaryClient = cloudinary.v2 as CloudinarySdk;
      return this.cloudinaryClient;
    } catch (error) {
      throw new ServiceUnavailableException(
        "Cloudinary SDK is not installed. Run 'npm install cloudinary'.",
      );
    }
  }

  private configure(): CloudinarySdk {
    const cloudinary = this.getCloudinaryClient();
    if (this.isConfigured) {
      return cloudinary;
    }

    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException(
        'Cloudinary env vars are missing: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET',
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    this.isConfigured = true;
    return cloudinary;
  }

  async runDemo() {
    const cloudinary = this.configure();

    const uploadResult = await cloudinary.uploader.upload(
      'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg',
      { public_id: 'shoes' },
    );

    const optimizeUrl = cloudinary.url('shoes', {
      fetch_format: 'auto',
      quality: 'auto',
    });

    const autoCropUrl = cloudinary.url('shoes', {
      crop: 'auto',
      gravity: 'auto',
      width: 500,
      height: 500,
    });

    return {
      uploadResult,
      optimizeUrl,
      autoCropUrl,
    };
  }
}
