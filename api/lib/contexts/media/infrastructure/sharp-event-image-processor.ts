import path from 'node:path';
import sharp from 'sharp';
import type { EventImageProcessor, UploadEventImageInput } from '../application';
import {
  EVENT_IMAGE_MAX_DIMENSION_PX,
  MediaValidationError,
} from '../domain';

const NORMALIZED_EVENT_IMAGE_MIME_TYPE = 'image/webp';
const NORMALIZED_EVENT_IMAGE_EXTENSION = '.webp';
const NORMALIZED_EVENT_IMAGE_QUALITY = 82;
const SHARP_MAX_INPUT_PIXELS = 64_000_000;

function toWebpFilename(filename: string): string {
  const parsed = path.parse(filename);
  const base = parsed.name || 'event-image';
  return `${base}${NORMALIZED_EVENT_IMAGE_EXTENSION}`;
}

export class SharpEventImageProcessor implements EventImageProcessor {
  async normalizeEventImage(input: UploadEventImageInput): Promise<UploadEventImageInput> {
    if (input.contentType === 'image/gif') {
      await this.assertValidImage(input.bytes, true);
      return input;
    }

    try {
      const bytes = await sharp(input.bytes, {
        animated: false,
        limitInputPixels: SHARP_MAX_INPUT_PIXELS,
      })
        .rotate()
        .resize({
          width: EVENT_IMAGE_MAX_DIMENSION_PX,
          height: EVENT_IMAGE_MAX_DIMENSION_PX,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({
          quality: NORMALIZED_EVENT_IMAGE_QUALITY,
        })
        .toBuffer();

      return {
        filename: toWebpFilename(input.filename),
        contentType: NORMALIZED_EVENT_IMAGE_MIME_TYPE,
        bytes,
      };
    } catch (error) {
      throw toMediaValidationError(error);
    }
  }

  private async assertValidImage(bytes: Buffer, animated: boolean) {
    try {
      const metadata = await sharp(bytes, {
        animated,
        limitInputPixels: SHARP_MAX_INPUT_PIXELS,
      }).metadata();

      if (!metadata.width || !metadata.height) {
        throw new MediaValidationError('Event image is invalid');
      }
    } catch (error) {
      throw toMediaValidationError(error);
    }
  }
}

function toMediaValidationError(error: unknown): MediaValidationError {
  if (error instanceof MediaValidationError) {
    return error;
  }

  return new MediaValidationError('Event image is invalid or could not be processed');
}
