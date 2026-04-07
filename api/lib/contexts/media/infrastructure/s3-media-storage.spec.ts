import { Readable } from 'node:stream';
import { S3MediaStorage } from './s3-media-storage';

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

describe('S3MediaStorage', () => {
  it('writes event images to the configured bucket', async () => {
    const send = vi.fn().mockResolvedValue({});
    const storage = new S3MediaStorage({
      bucket: 'seventy-media',
      region: 'us-east-1',
      client: { send } as any,
    });

    const result = await storage.saveEventImage({
      filename: 'poster.png',
      contentType: 'image/png',
      bytes: Buffer.from('image-bytes'),
    });

    const commandInput = send.mock.calls[0][0].input;
    expect(commandInput).toMatchObject({
      Bucket: 'seventy-media',
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
    });
    expect(commandInput.Key).toMatch(/^event-images\/.+\.png$/);
    expect(result.publicPath).toMatch(/^\/uploads\/event-images\/.+\.png$/);
  });

  it('reads managed assets from S3', async () => {
    const send = vi.fn().mockResolvedValue({
      Body: {
        transformToByteArray: vi.fn().mockResolvedValue(Uint8Array.from(Buffer.from('hello'))),
      },
      ContentType: 'image/png',
      ContentLength: 5,
      CacheControl: 'public, max-age=60',
      LastModified: new Date('2026-04-04T12:00:00.000Z'),
      ETag: '"etag-1"',
    });
    const storage = new S3MediaStorage({
      bucket: 'seventy-media',
      region: 'us-east-1',
      client: { send } as any,
    });

    const asset = await storage.readManagedAsset('/uploads/event-images/test.png');

    expect(asset?.contentType).toBe('image/png');
    expect(asset?.contentLength).toBe(5);
    expect(asset?.cacheControl).toBe('public, max-age=60');
    expect(asset?.etag).toBe('"etag-1"');
    expect(await streamToBuffer(asset!.body)).toEqual(Buffer.from('hello'));
  });

  it('returns null for missing managed assets', async () => {
    const send = vi.fn().mockRejectedValue({ name: 'NoSuchKey' });
    const storage = new S3MediaStorage({
      bucket: 'seventy-media',
      region: 'us-east-1',
      client: { send } as any,
    });

    await expect(storage.readManagedAsset('/uploads/event-images/missing.png')).resolves.toBeNull();
  });

  it('deletes managed assets from S3', async () => {
    const send = vi.fn().mockResolvedValue({});
    const storage = new S3MediaStorage({
      bucket: 'seventy-media',
      region: 'us-east-1',
      client: { send } as any,
    });

    await storage.deleteManagedAsset('/uploads/event-images/test.png');

    expect(send.mock.calls[0][0].input).toMatchObject({
      Bucket: 'seventy-media',
      Key: 'event-images/test.png',
    });
  });
});
