import sharp from 'sharp';
import { SharpEventImageProcessor } from './sharp-event-image-processor';

function makePngBuffer(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 220, g: 80, b: 80 },
    },
  }).png().toBuffer();
}

describe('SharpEventImageProcessor', () => {
  it('normalizes raster uploads to webp and constrains dimensions', async () => {
    const processor = new SharpEventImageProcessor();
    const input = {
      filename: 'poster.png',
      contentType: 'image/png',
      bytes: await makePngBuffer(2400, 1200),
    };

    const result = await processor.normalizeEventImage(input);
    const metadata = await sharp(result.bytes).metadata();

    expect(result.contentType).toBe('image/webp');
    expect(result.filename).toBe('poster.webp');
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(1600);
    expect(metadata.height).toBe(800);
  });

  it('passes gif uploads through after validating they are real images', async () => {
    const processor = new SharpEventImageProcessor();
    const gifBytes = Buffer.from(
      '47494638396101000100800000ffffff00000021f90401000000002c00000000010001000002024401003b',
      'hex',
    );

    const result = await processor.normalizeEventImage({
      filename: 'loop.gif',
      contentType: 'image/gif',
      bytes: gifBytes,
    });

    expect(result).toEqual({
      filename: 'loop.gif',
      contentType: 'image/gif',
      bytes: gifBytes,
    });
  });

  it('rejects invalid image bytes', async () => {
    const processor = new SharpEventImageProcessor();

    await expect(processor.normalizeEventImage({
      filename: 'bad.png',
      contentType: 'image/png',
      bytes: Buffer.from('not-an-image'),
    })).rejects.toThrow('could not be processed');
  });
});
