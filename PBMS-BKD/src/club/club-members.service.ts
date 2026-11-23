import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClubMember, ClubMemberStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from 'src/prisma/prisma.service';
import { CLUB_AUDIENCE, CLUB_TOKEN_TTL, clubSecret, forgetMember } from './club-auth';
import { CLUB_PHOTO_DIR, CLUB_PRIVATE_DIR, clubPhotoUrl } from './club-files';
import { ClubNotifyService } from './club-notify.service';
import {
  CLUB_ID_TYPES,
  CLUB_TITLES,
  MAX_NEXT_OF_KIN,
  chargeFor,
  cleanText,
  clubFees,
  fullName,
  isEmail,
  newCardNumber,
  normalisePhone,
  tempPassword,
} from './club.constants';

type Files = { photo?: Express.Multer.File[]; attachments?: Express.Multer.File[] };

type KinInput = { fullName?: unknown; relationship?: unknown; address?: unknown; phone?: unknown; email?: unknown; profession?: unknown };

/** Profile fields shared by registration and admin edits. */
type ProfileInput = {
  title?: unknown;
  surname?: unknown;
  firstName?: unknown;
  otherName?: unknown;
  idType?: unknown;
  idNumber?: unknown;
  country?: unknown;
  district?: unknown;
  county?: unknown;
  subCounty?: unknown;
  address?: unknown;
  phone1?: unknown;
  phone2?: unknown;
  email?: unknown;
  profession?: unknown;
  nextOfKin?: KinInput[];
};

const FULL_INCLUDE = {
  nextOfKin: { orderBy: { position: 'asc' } },
  attachments: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.ClubMemberInclude;

// Compared against when the account doesn't exist, so both cases take as long.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const fail = (field: string, message: string) => new BadRequestException({ statusCode: 400, message, field });

@Injectable()
export class ClubMembersService {
  private readonly logger = new Logger(ClubMembersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly notifier: ClubNotifyService,
  ) {}

  // ---------------------------------------------------------------- shaping

  /** What a member (or staff) sees. Never includes the password hash. */
  shape(m: ClubMember & { nextOfKin?: unknown[]; attachments?: Array<{ id: number; label: string; mimeType: string; size: number; createdAt: Date }> }) {
    const { password, tokenVersion, photo, ...rest } = m;
    void password;
    void tokenVersion;
    return {
      ...rest,
      name: fullName(m),
      photoUrl: clubPhotoUrl(photo),
      hasPassword: !!password,
      attachments: m.attachments?.map((a) => ({ id: a.id, label: a.label, mimeType: a.mimeType, size: a.size, createdAt: a.createdAt })),
    };
  }

  // ---------------------------------------------------------------- validation

  private validateProfile(input: ProfileInput, partial = false) {
    const data: Record<string, unknown> = {};
    const need = (key: keyof ProfileInput, label: string, max = 120) => {
      if (partial && input[key] === undefined) return;
      const v = cleanText(input[key], max);
      if (!v) throw fail(key, `Enter ${label}`);
      data[key] = v;
    };
    const opt = (key: keyof ProfileInput, max = 120) => {
      if (input[key] === undefined) return;
      data[key] = cleanText(input[key], max);
    };

    if (!partial || input.title !== undefined) {
      const title = CLUB_TITLES.find((t) => t.toLowerCase() === String(input.title ?? '').trim().toLowerCase().replace('.', ''));
      if (!title) throw fail('title', 'Choose a title');
      data.title = title;
    }
    need('surname', 'your surname', 80);
    need('firstName', 'your first name', 80);
    opt('otherName', 80);

    if (!partial || input.idType !== undefined) {
      if (!CLUB_ID_TYPES.includes(input.idType as (typeof CLUB_ID_TYPES)[number])) throw fail('idType', 'Choose National ID or Passport');
      data.idType = input.idType;
    }
    if (!partial || input.idNumber !== undefined) {
      const id = cleanText(input.idNumber, 40)?.toUpperCase().replace(/\s+/g, '');
      if (!id || id.length < 5) throw fail('idNumber', 'Enter the ID or passport number');
      if (data.idType === 'NATIONAL_ID' && !/^[A-Z0-9]{14}$/.test(id)) throw fail('idNumber', 'A Ugandan National ID number (NIN) has 14 letters and numbers');
      data.idNumber = id;
    }

    need('country', 'your country', 60);
    const uganda = String(data.country ?? input.country ?? '').toLowerCase() === 'uganda';
    if (uganda) {
      need('district', 'your district', 80);
      opt('county', 120);
      opt('subCounty', 120);
      opt('address', 255);
    } else if (!partial || input.address !== undefined) {
      need('address', 'where you live', 255);
      if (input.country !== undefined) {
        data.district = null;
        data.county = null;
        data.subCounty = null;
      }
    }

    if (!partial || input.phone1 !== undefined) {
      const p = normalisePhone(input.phone1);
      if (!p) throw fail('phone1', 'Enter a valid phone number, e.g. 0772 123456 or +254 712 345678');
      data.phone1 = p;
    }
    if (input.phone2 !== undefined) {
      const raw = cleanText(input.phone2, 30);
      const p = raw ? normalisePhone(raw) : null;
      if (raw && !p) throw fail('phone2', 'Check the second phone number, or leave it empty');
      if (p && p === data.phone1) throw fail('phone2', 'The second number is the same as the first');
      data.phone2 = p;
    }
    if (input.email !== undefined) {
      const e = cleanText(input.email, 191)?.toLowerCase() ?? null;
      if (e && !isEmail(e)) throw fail('email', 'Enter a valid email address, or leave it empty');
      data.email = e;
    }
    opt('profession', 120);

    let kin: Prisma.ClubNextOfKinCreateWithoutMemberInput[] | undefined;
    if (!partial || input.nextOfKin !== undefined) {
      const list = Array.isArray(input.nextOfKin) ? input.nextOfKin.slice(0, MAX_NEXT_OF_KIN) : [];
      kin = [];
      list.forEach((k, i) => {
        const anything = Object.values(k ?? {}).some((v) => cleanText(v));
        if (!anything && i > 0) return; // optional, left empty
        const name = cleanText(k?.fullName, 160);
        const rel = cleanText(k?.relationship, 60);
        const phone = normalisePhone(k?.phone);
        const label = i === 0 ? 'next of kin' : `next of kin ${i + 1}`;
        if (!name) throw fail(`nextOfKin.${i}.fullName`, `Enter the ${label}'s full name`);
        if (!rel) throw fail(`nextOfKin.${i}.relationship`, `Enter how the ${label} is related to you`);
        if (!phone) throw fail(`nextOfKin.${i}.phone`, `Enter a valid phone number for the ${label}`);
        const email = cleanText(k?.email, 191)?.toLowerCase() ?? null;
        if (email && !isEmail(email)) throw fail(`nextOfKin.${i}.email`, `Check the ${label}'s email`);
        kin!.push({ position: kin!.length + 1, fullName: name, relationship: rel, address: cleanText(k?.address, 255), phone, email, profession: cleanText(k?.profession, 120) });
      });
      if (!kin.length) throw fail('nextOfKin.0.fullName', 'Add at least one next of kin');
    }
    return { data, kin };
  }

  /** Friendly message when phone, email or ID is already used. */
  private async assertUnique(data: Record<string, unknown>, exceptId?: number) {
    const checks: Array<[string, Prisma.ClubMemberWhereInput, string]> = [];
    if (data.phone1) checks.push(['phone1', { phone1: data.phone1 as string }, 'This phone number is already registered']);
    if (data.email) checks.push(['email', { email: data.email as string }, 'This email is already registered']);
    if (data.idNumber) checks.push(['idNumber', { idNumber: data.idNumber as string }, 'This ID or passport number is already registered']);
    for (const [field, where, message] of checks) {
      const found = await this.prisma.clubMember.findFirst({ where: { ...where, ...(exceptId ? { NOT: { id: exceptId } } : {}) }, select: { id: true } });
      if (found) throw new ConflictException({ statusCode: 409, message, field });
    }
  }

  private async discard(files?: Files) {
    for (const f of [...(files?.photo ?? []), ...(files?.attachments ?? [])]) await unlink(f.path).catch(() => undefined);
  }

  // ---------------------------------------------------------------- registration & sign-in

  async register(raw: string | undefined, files: Files) {
    try {
      let body: ProfileInput & { agree?: unknown; attachmentLabels?: unknown };
      try {
        body = JSON.parse(raw ?? '{}');
      } catch {
        throw new BadRequestException('The form could not be read. Please try again.');
      }
      if (body.agree !== true) throw fail('agree', 'Please confirm the information is true and that you accept the terms');
      const { data, kin } = this.validateProfile(body);
      await this.assertUnique(data);
      const labels = Array.isArray(body.attachmentLabels) ? body.attachmentLabels : [];
      const docs = files?.attachments ?? [];
      if (!docs.length) throw fail('attachments', 'Attach a copy of your National ID or passport');

      const member = await this.prisma.clubMember.create({
        data: {
          ...(data as Prisma.ClubMemberCreateInput),
          agreedAt: new Date(),
          photo: files?.photo?.[0]?.filename ?? null,
          nextOfKin: { create: kin },
          attachments: {
            create: docs.map((f, i) => ({ label: cleanText(labels[i], 120) ?? (i === 0 ? 'ID / passport' : `Attachment ${i + 1}`), fileName: f.filename, mimeType: f.mimetype, size: f.size })),
          },
        },
      });
      return { status: 201, data: { id: member.id, name: fullName(member) }, message: 'Application received. We will let you know once it has been reviewed.' };
    } catch (e) {
      await this.discard(files);
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('Some of these details are already registered');
      throw e;
    }
  }

  private async findByIdentifier(identifier: string) {
    const id = identifier.trim();
    if (id.includes('@')) return this.prisma.clubMember.findUnique({ where: { email: id.toLowerCase() } });
    const phone = normalisePhone(id);
    return phone ? this.prisma.clubMember.findUnique({ where: { phone1: phone } }) : null;
  }

  sign(m: ClubMember) {
    return this.jwt.signAsync({ sub: m.id, v: m.tokenVersion }, { secret: clubSecret(), audience: CLUB_AUDIENCE, expiresIn: CLUB_TOKEN_TTL });
  }

  async login(identifier: unknown, password: unknown) {
    if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier.trim() || !password) {
      throw new BadRequestException('Enter your email or phone number and password');
    }
    const m = await this.findByIdentifier(identifier);
    // Same message whether the account exists or not.
    const wrong = new UnauthorizedException('Those details don\'t match our records');
    if (!m) {
      await bcrypt.compare(password, DUMMY_HASH); // keep timing similar
      throw wrong;
    }
    if (m.status === 'PENDING') throw new ForbiddenException('Your application is still being reviewed. We\'ll send your sign-in details once it\'s approved.');
    if (m.status === 'REJECTED') throw new ForbiddenException('Your application was not approved. Please contact Prof Bioresearch.');
    if (!m.password || !(await bcrypt.compare(password, m.password))) throw wrong;
    if (m.status === 'SUSPENDED') throw new ForbiddenException('Your membership is suspended. Please contact Prof Bioresearch.');
    if (m.status === 'DEACTIVATED') throw new ForbiddenException('This membership has been deactivated.');

    const updated = await this.prisma.clubMember.update({ where: { id: m.id }, data: { lastLoginAt: new Date() }, include: FULL_INCLUDE });
    return { status: 200, data: { token: await this.sign(updated), member: this.shape(updated) }, message: 'Signed in' };
  }

  async changePassword(m: ClubMember, current: unknown, next: unknown) {
    if (typeof current !== 'string' || typeof next !== 'string') throw new BadRequestException('Enter your current and new password');
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) throw fail('newPassword', 'Use at least 8 characters with letters and numbers');
    if (!m.password || !(await bcrypt.compare(current, m.password))) throw fail('currentPassword', 'Your current password is wrong');
    if (await bcrypt.compare(next, m.password)) throw fail('newPassword', 'Choose a password different from the current one');
    const updated = await this.prisma.clubMember.update({
      where: { id: m.id },
      data: { password: await bcrypt.hash(next, 10), mustChangePassword: false, tokenVersion: { increment: 1 } },
      include: FULL_INCLUDE,
    });
    forgetMember(m.id);
    // Other devices are signed out; this one gets a fresh token.
    return { status: 200, data: { token: await this.sign(updated), member: this.shape(updated) }, message: 'Password changed' };
  }

  // ---------------------------------------------------------------- the member's own account

  async me(m: ClubMember) {
    const full = await this.prisma.clubMember.findUniqueOrThrow({ where: { id: m.id }, include: FULL_INCLUDE });
    const fees = clubFees();
    return { status: 200, data: { ...this.shape(full), registrationCharge: chargeFor(fees.registration) } };
  }

  /** Members can update their contacts, address, profession and next of kin. Name and ID stay with staff. */
  async updateMe(m: ClubMember, input: ProfileInput) {
    const allowed: ProfileInput = {
      phone2: input.phone2,
      email: input.email,
      profession: input.profession,
      country: input.country,
      district: input.district,
      county: input.county,
      subCounty: input.subCounty,
      address: input.address,
      nextOfKin: input.nextOfKin,
    };
    const { data, kin } = this.validateProfile(allowed, true);
    await this.assertUnique({ email: data.email }, m.id);
    const updated = await this.prisma.$transaction(async (tx) => {
      if (kin) {
        await tx.clubNextOfKin.deleteMany({ where: { memberId: m.id } });
        await tx.clubNextOfKin.createMany({ data: kin.map((k) => ({ ...k, memberId: m.id })) });
      }
      return tx.clubMember.update({ where: { id: m.id }, data: data as Prisma.ClubMemberUpdateInput, include: FULL_INCLUDE });
    });
    forgetMember(m.id);
    return { status: 200, data: this.shape(updated), message: 'Your details were saved' };
  }

  async setPhoto(memberId: number, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Choose a photo');
    const old = await this.prisma.clubMember.findUnique({ where: { id: memberId }, select: { photo: true } });
    if (!old) {
      await unlink(file.path).catch(() => undefined);
      throw new NotFoundException('Member not found');
    }
    const updated = await this.prisma.clubMember.update({ where: { id: memberId }, data: { photo: file.filename }, include: FULL_INCLUDE });
    if (old.photo) await unlink(join(CLUB_PHOTO_DIR, old.photo)).catch(() => undefined);
    forgetMember(memberId);
    return { status: 200, data: this.shape(updated), message: 'Photo updated' };
  }

  // ---------------------------------------------------------------- staff: list & view

  async list(q: { status?: string; search?: string; page?: string; pageSize?: string }) {
    const status = Object.values(ClubMemberStatus).includes(q.status as ClubMemberStatus) ? (q.status as ClubMemberStatus) : undefined;
    const s = cleanText(q.search, 80);
    const phone = s ? normalisePhone(s) : null;
    const where: Prisma.ClubMemberWhereInput = {
      ...(status ? { status } : {}),
      ...(s
        ? {
            OR: [
              { surname: { contains: s } },
              { firstName: { contains: s } },
              { otherName: { contains: s } },
              { cardNumber: { contains: s.toUpperCase() } },
              { idNumber: { contains: s.toUpperCase() } },
              { email: { contains: s.toLowerCase() } },
              ...(phone ? [{ phone1: phone }, { phone2: phone }] : [{ phone1: { contains: s.replace(/\D/g, '') || s } }]),
            ],
          }
        : {}),
    };
    const pageSize = Math.min(100, Math.max(5, Number(q.pageSize) || 25));
    const page = Math.max(1, Number(q.page) || 1);
    const [rows, total, counts] = await Promise.all([
      this.prisma.clubMember.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, title: true, surname: true, firstName: true, otherName: true, phone1: true, email: true, district: true, country: true, status: true, cardNumber: true, photo: true, createdAt: true, activatedAt: true },
      }),
      this.prisma.clubMember.count({ where }),
      this.prisma.clubMember.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    return {
      status: 200,
      data: {
        rows: rows.map((r) => ({ ...r, name: fullName(r), photoUrl: clubPhotoUrl(r.photo) })),
        total,
        page,
        pageSize,
        counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
      },
      message: 'Members fetched',
    };
  }

  async get(id: number) {
    const m = await this.prisma.clubMember.findUnique({ where: { id }, include: FULL_INCLUDE });
    if (!m) throw new NotFoundException('Member not found');
    const payments = await this.prisma.clubPayment.findMany({ where: { memberId: id }, orderBy: { createdAt: 'desc' }, take: 20 });
    return { status: 200, data: { ...this.shape(m), payments } };
  }

  async adminUpdate(id: number, input: ProfileInput) {
    const exists = await this.prisma.clubMember.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Member not found');
    const { data, kin } = this.validateProfile(input, true);
    await this.assertUnique(data, id);
    const updated = await this.prisma.$transaction(async (tx) => {
      if (kin) {
        await tx.clubNextOfKin.deleteMany({ where: { memberId: id } });
        await tx.clubNextOfKin.createMany({ data: kin.map((k) => ({ ...k, memberId: id })) });
      }
      return tx.clubMember.update({ where: { id }, data: data as Prisma.ClubMemberUpdateInput, include: FULL_INCLUDE });
    });
    forgetMember(id);
    return { status: 200, data: this.shape(updated), message: 'Member details saved' };
  }

  async attachmentFile(memberId: number, attachmentId: number) {
    const a = await this.prisma.clubAttachment.findFirst({ where: { id: attachmentId, memberId } });
    if (!a) throw new NotFoundException('Attachment not found');
    return { path: join(CLUB_PRIVATE_DIR, a.fileName), mimeType: a.mimeType, name: `${a.label}${a.fileName.slice(a.fileName.lastIndexOf('.'))}` };
  }

  // ---------------------------------------------------------------- staff: decisions

  /** Gives a unique card number (retries on the rare clash). */
  private async uniqueCardNumber() {
    for (let i = 0; i < 20; i++) {
      const n = newCardNumber();
      if (!(await this.prisma.clubMember.findUnique({ where: { cardNumber: n }, select: { id: true } }))) return n;
    }
    throw new ConflictException('Could not create a card number. Try again.');
  }

  async approve(id: number, staffId: number) {
    const m = await this.prisma.clubMember.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Member not found');
    if (m.status !== 'PENDING' && m.status !== 'REJECTED') throw new ConflictException('Only pending or rejected applications can be approved');

    const password = tempPassword();
    const cardNumber = m.cardNumber ?? (await this.uniqueCardNumber());
    const updated = await this.prisma.clubMember.update({
      where: { id },
      data: {
        status: 'AWAITING_PAYMENT',
        statusNote: null,
        cardNumber,
        password: await bcrypt.hash(password, 10),
        mustChangePassword: true,
        tokenVersion: { increment: 1 },
        approvedAt: new Date(),
        approvedById: staffId,
      },
      include: FULL_INCLUDE,
    });
    forgetMember(id);
    const charge = chargeFor(clubFees().registration);
    const sentVia = await this.notifier.notify(updated, {
      subject: 'Your Monk Club membership is approved',
      lines: [
        'Your application to the Monk Loyalty Club has been approved.',
        `Sign in with your ${updated.email ? 'email' : 'phone number'} and the temporary password below. You will be asked to choose your own password.`,
        `To activate your membership, pay the registration fee of UGX ${charge.base.toLocaleString('en-US')} in the app.`,
      ],
      facts: { 'Card number': cardNumber, 'Sign in with': updated.email ?? updated.phone1, 'Temporary password': password },
    });
    return {
      status: 200,
      // The temporary password is shown once to staff, so they can pass it on if the message didn't arrive.
      data: { member: this.shape(updated), temporaryPassword: password, notified: sentVia },
      message: sentVia.sent ? `Approved. Sign-in details sent by ${sentVia.channel}.` : 'Approved. The message could not be sent: give the member the temporary password yourself.',
    };
  }

  async reject(id: number, reason: unknown) {
    const note = cleanText(reason, 500);
    if (!note) throw fail('reason', 'Give a reason, so the applicant knows what to fix');
    const m = await this.prisma.clubMember.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Member not found');
    if (m.status !== 'PENDING') throw new ConflictException('Only pending applications can be rejected');
    const updated = await this.prisma.clubMember.update({ where: { id }, data: { status: 'REJECTED', statusNote: note }, include: FULL_INCLUDE });
    const sentVia = await this.notifier.notify(updated, {
      subject: 'Your Monk Club application',
      lines: ['Unfortunately your application to the Monk Loyalty Club was not approved this time.', `Reason: ${note}`, 'You can contact Prof Bioresearch if you have questions.'],
    });
    return { status: 200, data: { member: this.shape(updated), notified: sentVia }, message: 'Application rejected' };
  }

  /** suspend | reactivate | deactivate */
  async setStatus(id: number, action: string, reason?: unknown) {
    const m = await this.prisma.clubMember.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Member not found');
    const note = cleanText(reason, 500);
    let status: ClubMemberStatus;
    if (action === 'suspend') {
      if (!['ACTIVE', 'AWAITING_PAYMENT'].includes(m.status)) throw new ConflictException('Only active members can be suspended');
      status = 'SUSPENDED';
    } else if (action === 'deactivate') {
      if (['PENDING', 'REJECTED', 'DEACTIVATED'].includes(m.status)) throw new ConflictException('This member cannot be deactivated');
      status = 'DEACTIVATED';
    } else if (action === 'reactivate') {
      if (!['SUSPENDED', 'DEACTIVATED'].includes(m.status)) throw new ConflictException('Only suspended or deactivated members can be reactivated');
      const paid = await this.prisma.clubPayment.count({ where: { memberId: id, purpose: 'REGISTRATION', status: 'SUCCESSFUL' } });
      status = paid ? 'ACTIVE' : 'AWAITING_PAYMENT';
    } else throw new BadRequestException('Unknown action');

    const updated = await this.prisma.clubMember.update({
      where: { id },
      // Suspending or deactivating signs the member out everywhere.
      data: { status, statusNote: note, ...(status === 'SUSPENDED' || status === 'DEACTIVATED' ? { tokenVersion: { increment: 1 } } : {}) },
      include: FULL_INCLUDE,
    });
    forgetMember(id);
    const words = { SUSPENDED: 'suspended', DEACTIVATED: 'deactivated', ACTIVE: 'reactivated', AWAITING_PAYMENT: 'reactivated' } as Record<string, string>;
    await this.notifier.notify(updated, {
      subject: `Your Monk Club membership was ${words[status]}`,
      lines: [`Your Monk Loyalty Club membership has been ${words[status]}.`, ...(note ? [`Note: ${note}`] : [])],
    });
    return { status: 200, data: this.shape(updated), message: `Member ${words[status]}` };
  }

  async resetPassword(id: number) {
    const m = await this.prisma.clubMember.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Member not found');
    if (!['ACTIVE', 'AWAITING_PAYMENT'].includes(m.status)) throw new ConflictException('Only approved members have a password to reset');
    const password = tempPassword();
    const updated = await this.prisma.clubMember.update({
      where: { id },
      data: { password: await bcrypt.hash(password, 10), mustChangePassword: true, tokenVersion: { increment: 1 } },
    });
    forgetMember(id);
    const sentVia = await this.notifier.notify(updated, {
      subject: 'Your new Monk Club password',
      lines: ['Your Monk Club password was reset by Prof Bioresearch. Sign in with the temporary password below and choose a new one.'],
      facts: { 'Temporary password': password },
    });
    return { status: 200, data: { temporaryPassword: password, notified: sentVia }, message: 'Password reset' };
  }

  async remove(id: number) {
    const m = await this.prisma.clubMember.findUnique({ where: { id }, include: { attachments: true } });
    if (!m) throw new NotFoundException('Member not found');
    // Payments stay (with the member's name) because they're part of the wallet's history.
    await this.prisma.clubMember.delete({ where: { id } });
    forgetMember(id);
    for (const a of m.attachments) await unlink(join(CLUB_PRIVATE_DIR, a.fileName)).catch(() => undefined);
    if (m.photo) await unlink(join(CLUB_PHOTO_DIR, m.photo)).catch(() => undefined);
    this.logger.log(`Club member ${id} deleted`);
    return { status: 200, data: { id }, message: 'Member deleted' };
  }
}
