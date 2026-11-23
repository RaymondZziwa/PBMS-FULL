import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

export interface ReportConfig {
  title: string;
  subtitle?: string;
  filters?: Record<string, any>;
  summary?: any;
  sections: ReportSection[];
  companyInfo: CompanyInfo;
  /** Name of the person who generated the report (shown in the footer). */
  generatedBy?: string;
  /** Wide tables read better sideways. Defaults to portrait. */
  orientation?: 'portrait' | 'landscape';
}

export interface ReportSection {
  title: string;
  type: 'table' | 'summary' | 'chart' | 'text';
  data: any;
  columns?: ColumnConfig[];
  summaryCards?: SummaryCard[];
  /** Optional bold last row, e.g. { label: 'Total', values: { amount: 'UGX 1,000' } }. */
  totals?: { label?: string; values: Record<string, string | number> };
}

export interface ColumnConfig {
  header: string;
  key: string;
  /** Relative width. Columns are scaled to fit the page, so any units work. */
  width: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any, row?: any) => string;
}

export interface SummaryCard {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: [number, number, number]; // RGB accent
}

export interface CompanyInfo {
  id: number;
  name: string;
  email: string;
  tel1: string;
  tel2?: string | null;
  address: string;
  logo?: string | null;
  website: string | null;
  tinNumber: string | null;
  description?: string | null;
}

// Prof Bioresearch brand (same values as the web app's theme).
const BRAND = '#3959A5';
const NAVY = '#1C2C57';
const INK = '#14181F';
const MUTED = '#5B6475';
const LINE = '#DDE2EC';
const TINT = '#EEF2FA';
const ZEBRA = '#F7F8FB';

const FALLBACK_LOGO = path.join(process.cwd(), 'assets', 'pdf-logo.png');

/**
 * Branded A4 PDFs for every report: letterhead with the company logo and
 * contacts, title and filters, summary cards, tables that fit the page and
 * repeat their header on each page, and a footer with page numbers.
 * The ReportConfig shape is unchanged, so existing reports keep working.
 */
@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly M = 40; // page margin
  private readonly FOOTER = 36; // space kept for the footer

  async generateReportPDF(config: ReportConfig): Promise<Buffer> {
    if (!config?.title || !config.companyInfo || !Array.isArray(config.sections)) {
      throw new Error('Invalid report configuration: missing required fields');
    }
    const landscape = config.orientation === 'landscape' || this.needsLandscape(config);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: landscape ? 'landscape' : 'portrait',
          margins: { top: this.M, bottom: this.M, left: this.M, right: this.M },
          bufferPages: true, // needed for "Page x of y"
          info: {
            Title: config.title,
            Author: config.companyInfo.name,
            Creator: 'PBMS',
          },
        });
        const chunks: Buffer[] = [];
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        this.letterhead(doc, config.companyInfo);
        this.titleBlock(doc, config);

        if (config.summary) this.summary(doc, config.summary);
        for (const section of config.sections) this.section(doc, section);

        this.footers(doc, config);
        doc.end();
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Could not build the PDF'));
      }
    });
  }

  // ---------- layout helpers ----------

  private get contentWidth() {
    return (doc: PDFKit.PDFDocument) => doc.page.width - this.M * 2;
  }

  private bottom(doc: PDFKit.PDFDocument) {
    return doc.page.height - this.M - this.FOOTER;
  }

  /** Start a new page if `h` points won't fit; returns true if it did. */
  private ensure(doc: PDFKit.PDFDocument, h: number) {
    if (doc.y + h > this.bottom(doc)) {
      doc.addPage();
      doc.y = this.M;
      return true;
    }
    return false;
  }

  private needsLandscape(config: ReportConfig) {
    return config.sections.some((s) => s.type === 'table' && (s.columns?.length ?? 0) >= 8);
  }

  private logoPath(company: CompanyInfo): string | null {
    const candidates: string[] = [];
    if (company.logo && !/^https?:/i.test(company.logo)) {
      candidates.push(path.join(process.cwd(), company.logo.replace(/^\/+/, '')));
    }
    candidates.push(FALLBACK_LOGO);
    // PDFKit reads PNG and JPEG only.
    return candidates.find((p) => /\.(png|jpe?g)$/i.test(p) && fs.existsSync(p)) ?? null;
  }

  // ---------- blocks ----------

  private letterhead(doc: PDFKit.PDFDocument, company: CompanyInfo) {
    const W = this.contentWidth(doc);
    const top = this.M;
    let textX = this.M;

    const logo = this.logoPath(company);
    if (logo) {
      try {
        doc.image(fs.readFileSync(logo), this.M, top, { fit: [96, 48], align: 'left', valign: 'center' });
        textX = this.M + 108;
      } catch (e) {
        this.logger.warn(`Logo could not be drawn: ${(e as Error).message}`);
      }
    }

    doc.font('Helvetica-Bold').fontSize(15).fillColor(NAVY).text(company.name, textX, top + 6, { width: W * 0.55 - (textX - this.M) });
    if (company.description) {
      doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(company.description, textX, doc.y + 1, {
        width: W * 0.55 - (textX - this.M),
        height: 22,
        ellipsis: true,
      });
    }

    const contact = [
      company.address,
      [company.tel1, company.tel2].filter(Boolean).join('  ·  '),
      [company.email, company.website].filter(Boolean).join('  ·  '),
      company.tinNumber ? `TIN ${company.tinNumber}` : '',
    ].filter(Boolean);
    doc.font('Helvetica').fontSize(8).fillColor(MUTED);
    let cy = top + 4;
    for (const line of contact) {
      doc.text(line, this.M + W * 0.55, cy, { width: W * 0.45, align: 'right' });
      cy += 11;
    }

    const ruleY = Math.max(top + 56, cy + 4);
    doc.rect(this.M, ruleY, W, 2.5).fill(BRAND);
    doc.y = ruleY + 16;
  }

  private titleBlock(doc: PDFKit.PDFDocument, config: ReportConfig) {
    const W = this.contentWidth(doc);
    const generated = new Date().toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const y0 = doc.y;
    doc.font('Helvetica-Bold').fontSize(17).fillColor(INK).text(config.title, this.M, y0, { width: W * 0.7 });
    if (config.subtitle) {
      doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(config.subtitle, this.M, doc.y + 2, { width: W * 0.7 });
    }
    const afterTitle = doc.y;
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(`Generated ${generated}`, this.M + W * 0.6, y0 + 4, { width: W * 0.4, align: 'right' });
    doc.y = afterTitle;

    const filters = Object.entries(config.filters ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== '');
    if (filters.length) {
      doc.y += 8;
      let x = this.M;
      let y = doc.y;
      doc.fontSize(8);
      for (const [k, v] of filters) {
        const label = `${this.humanise(k)}: ${String(v)}`;
        const w = doc.font('Helvetica').widthOfString(label) + 14;
        if (x + w > this.M + W) {
          x = this.M;
          y += 18;
        }
        doc.roundedRect(x, y, w, 14, 7).fill(TINT);
        doc.fillColor(NAVY).text(label, x + 7, y + 3.5, { lineBreak: false });
        x += w + 6;
      }
      doc.y = y + 14;
    }
    doc.y += 16;
  }

  private summary(doc: PDFKit.PDFDocument, summary: any) {
    const cards: SummaryCard[] = Array.isArray(summary) ? summary : Array.isArray(summary?.cards) ? summary.cards : [];
    if (!cards.length) return;
    const W = this.contentWidth(doc);
    const perRow = Math.min(cards.length, W > 600 ? 5 : 4);
    const gap = 10;
    const cw = (W - gap * (perRow - 1)) / perRow;
    const ch = 54;

    for (let i = 0; i < cards.length; i += perRow) {
      this.ensure(doc, ch + 8);
      const y = doc.y;
      cards.slice(i, i + perRow).forEach((card, j) => {
        const x = this.M + j * (cw + gap);
        const accent = card.color ? this.rgb(card.color) : BRAND;
        doc.roundedRect(x, y, cw, ch, 6).fill(ZEBRA);
        doc.rect(x, y + 8, 3, ch - 16).fill(accent);
        doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(String(card.title ?? ''), x + 12, y + 9, { width: cw - 20, lineBreak: false, ellipsis: true });
        doc.font('Helvetica-Bold').fontSize(13).fillColor(INK).text(String(card.value ?? '—'), x + 12, y + 22, { width: cw - 20, lineBreak: false, ellipsis: true });
        if (card.subtitle) {
          doc.font('Helvetica').fontSize(7).fillColor(MUTED).text(String(card.subtitle), x + 12, y + 39, { width: cw - 20, lineBreak: false, ellipsis: true });
        }
      });
      doc.y = y + ch + gap;
    }
    doc.y += 6;
  }

  private section(doc: PDFKit.PDFDocument, section: ReportSection) {
    if (section.type === 'summary') {
      return this.summary(doc, section.summaryCards ?? section.data);
    }
    if (section.type === 'text') return this.text(doc, section);
    return this.table(doc, section);
  }

  private heading(doc: PDFKit.PDFDocument, title: string, count?: number) {
    this.ensure(doc, 60);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text(title, this.M, doc.y, { continued: count !== undefined });
    if (count !== undefined) doc.font('Helvetica').fillColor(MUTED).text(`  (${count})`);
    doc.y += 6;
  }

  private table(doc: PDFKit.PDFDocument, section: ReportSection) {
    const cols = section.columns ?? [];
    const rows: any[] = Array.isArray(section.data) ? section.data : [];
    if (!cols.length) return;

    this.heading(doc, section.title, rows.length);
    const W = this.contentWidth(doc);
    const total = cols.reduce((a, c) => a + (c.width || 1), 0);
    const widths = cols.map((c) => ((c.width || 1) / total) * W);
    const pad = 5;
    const fs = cols.length >= 7 ? 7.5 : 8.5;

    const drawHeader = () => {
      doc.font('Helvetica-Bold').fontSize(fs);
      const h = Math.max(20, ...cols.map((c, i) => doc.heightOfString(c.header, { width: widths[i] - pad * 2 }) + 10));
      const y = doc.y;
      doc.rect(this.M, y, W, h).fill(NAVY);
      let x = this.M;
      cols.forEach((c, i) => {
        doc.fillColor('#FFFFFF').text(c.header, x + pad, y + 5, { width: widths[i] - pad * 2, align: c.align ?? 'left' });
        x += widths[i];
      });
      doc.y = y + h;
    };

    const cell = (c: ColumnConfig, row: any) => {
      const raw = this.get(row, c.key);
      try {
        const v = c.format ? c.format(raw, row) : raw;
        return v === null || v === undefined || v === '' ? '—' : String(v);
      } catch {
        return raw === null || raw === undefined ? '—' : String(raw);
      }
    };

    if (!rows.length) {
      drawHeader();
      doc.font('Helvetica-Oblique').fontSize(fs).fillColor(MUTED).text('No records for this period.', this.M + pad, doc.y + 6, { width: W - pad * 2 });
      doc.y += 14;
      return;
    }

    this.ensure(doc, 40);
    drawHeader();

    const drawRow = (values: string[], i: number, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fs);
      const h = Math.max(16, ...values.map((v, j) => doc.heightOfString(v, { width: widths[j] - pad * 2 }) + 8));
      if (this.ensure(doc, h)) drawHeader();
      const y = doc.y;
      if (bold) doc.rect(this.M, y, W, h).fill(TINT);
      else if (i % 2 === 1) doc.rect(this.M, y, W, h).fill(ZEBRA);
      let x = this.M;
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fs).fillColor(INK);
      values.forEach((v, j) => {
        doc.text(v, x + pad, y + 4, { width: widths[j] - pad * 2, align: cols[j].align ?? 'left' });
        x += widths[j];
      });
      doc.moveTo(this.M, y + h).lineTo(this.M + W, y + h).lineWidth(0.5).strokeColor(LINE).stroke();
      doc.y = y + h;
    };

    rows.forEach((row, i) => {
      // Keep the totals row on the same page as the last row.
      if (section.totals && i === rows.length - 1 && this.ensure(doc, 40)) drawHeader();
      drawRow(cols.map((c) => cell(c, row)), i);
    });

    if (section.totals) {
      const t = section.totals;
      drawRow(
        cols.map((c, j) => (t.values[c.key] !== undefined ? String(t.values[c.key]) : j === 0 ? t.label ?? 'Total' : '')),
        0,
        true,
      );
    }
    doc.y += 16;
  }

  private text(doc: PDFKit.PDFDocument, section: ReportSection) {
    const W = this.contentWidth(doc);
    this.heading(doc, section.title);
    doc.font('Helvetica').fontSize(9).fillColor(INK);
    const items: string[] = typeof section.data === 'string' ? [section.data] : Array.isArray(section.data) ? section.data.filter((x) => typeof x === 'string') : [];
    for (const item of items) {
      this.ensure(doc, doc.heightOfString(item, { width: W }) + 4);
      doc.text(items.length > 1 ? `•  ${item}` : item, this.M, doc.y, { width: W, align: 'left' });
      doc.y += 3;
    }
    doc.y += 10;
  }

  private footers(doc: PDFKit.PDFDocument, config: ReportConfig) {
    const range = doc.bufferedPageRange();
    const c = config.companyInfo;
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const W = doc.page.width - this.M * 2;
      const y = doc.page.height - this.M - 14;
      // Writing below the bottom margin would add a page; lift it temporarily.
      const oldBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.moveTo(this.M, y - 6).lineTo(this.M + W, y - 6).lineWidth(0.5).strokeColor(LINE).stroke();
      const left = [c.name, config.title, config.generatedBy ? `by ${config.generatedBy}` : ''].filter(Boolean).join('  ·  ');
      doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(left, this.M, y, { width: W * 0.75, lineBreak: false, ellipsis: true });
      doc.text(`Page ${i - range.start + 1} of ${range.count}`, this.M + W * 0.75, y, { width: W * 0.25, align: 'right', lineBreak: false });
      doc.page.margins.bottom = oldBottom;
    }
  }

  // ---------- utils ----------

  private get(obj: any, key: string) {
    return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }

  private humanise(k: string) {
    const s = k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  private rgb([r, g, b]: [number, number, number]) {
    return '#' + [r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');
  }
}
