import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { map, Observable } from 'rxjs';

type PdfLike = { buffer: Buffer | { type: 'Buffer'; data: number[] }; filename?: string; mimeType?: string };

const asPdf = (v: unknown): PdfLike | null => {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (o.buffer && (Buffer.isBuffer(o.buffer) || (o.buffer as { type?: string }).type === 'Buffer')) return o as unknown as PdfLike;
  // Some endpoints wrap the file: { status, data: { buffer, filename } }
  return o.data ? asPdf(o.data) : null;
};

/**
 * Report exports used to come back as JSON with the PDF bytes as a number
 * array (several times bigger than the file). This sends any
 * { buffer, filename, mimeType } result as a real PDF download instead.
 * Other responses pass through unchanged.
 */
@Injectable()
export class PdfResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((result) => {
        const pdf = asPdf(result);
        if (!pdf) return result;
        const buf = Buffer.isBuffer(pdf.buffer) ? pdf.buffer : Buffer.from(pdf.buffer.data);
        const name = (pdf.filename || 'report.pdf').replace(/[^\w.\- ]+/g, '_');
        const res = context.switchToHttp().getResponse<Response>();
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        return new StreamableFile(buf, {
          type: pdf.mimeType || 'application/pdf',
          disposition: `inline; filename="${name}"`,
          length: buf.length,
        });
      }),
    );
  }
}
