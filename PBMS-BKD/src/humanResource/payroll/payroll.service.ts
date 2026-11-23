import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateAttendanceDto,
  UpdateAttendanceDto,
} from 'src/dto/attendance.dto';
import {
  CreatePayrollPeriodDto,
  PaymentStructureDto,
} from 'src/dto/payroll.dto';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  async createAttendance(createAttendanceDto: CreateAttendanceDto) {
    const { date, employeeId, timeIn, timeOut, notes } = createAttendanceDto;

    // Check if employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    // Check if attendance already exists for this employee on this date
    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        date,
        employeeId,
      },
    });

    if (existingAttendance) {
      throw new ConflictException(
        `Attendance already recorded for this employee on date ${date}`,
      );
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        date,
        employeeId,
        timeIn: new Date(timeIn),
        timeOut: timeOut ? new Date(timeOut) : null,
        notes: notes || null,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      message: 'Attendance recorded successfully',
      data: attendance,
      status: 201,
    };
  }

  async getDailyAttendanceSheet(date?: string) {
    // Use provided date or default to today
    const targetDate = date ? new Date(date) : new Date();
    const dateString = targetDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD


    // Get all attendances for the specified date
    const attendances = await this.prisma.attendance.findMany({
      where: {
        date: dateString,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            dept: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: {
        timeIn: 'asc', // Order by time in ascending order
      },
    });

    // Calculate summary statistics
    const totalEmployees = attendances.length;
    const employeesPresent = attendances.filter(
      (att) => att.timeOut !== null,
    ).length;
    const employeesStillWorking = attendances.filter(
      (att) => att.timeOut === null,
    ).length;

    // Calculate average working hours for those who have clocked out
    const employeesWithTimeOut = attendances.filter(
      (att) => att.timeOut !== null,
    );
    const totalWorkingHours = employeesWithTimeOut.reduce((total, att) => {
      const hoursWorked =
        att?.timeIn && att?.timeOut
          ? (att.timeOut.getTime() - att.timeIn.getTime()) / (1000 * 60 * 60)
          : 0;
      return total + hoursWorked;
    }, 0);

    const averageWorkingHours =
      employeesWithTimeOut.length > 0
        ? totalWorkingHours / employeesWithTimeOut.length
        : 0;

    // Format the response with additional calculated fields
    const formattedAttendances = attendances.map((attendance) => {
      const hoursWorked = attendance.timeOut
        ? (attendance.timeOut.getTime() - attendance.timeIn.getTime()) /
          (1000 * 60 * 60)
        : null;

      const status = attendance.timeOut ? 'CLOCKED_OUT' : 'STILL_WORKING';

      return {
        ...attendance,
        hoursWorked: hoursWorked ? Number(hoursWorked.toFixed(2)) : null,
        status,
      };
    });

    return {
      message: `Daily attendance sheet retrieved successfully for ${dateString}`,
      data: {
        date: dateString,
        summary: {
          totalEmployees,
          employeesPresent,
          employeesStillWorking,
          averageWorkingHours: Number(averageWorkingHours.toFixed(2)),
          totalWorkingHours: Number(totalWorkingHours.toFixed(2)),
        },
        attendances: formattedAttendances,
      },
      status: 200,
    };
  }

  async getAllAttendances() {
    const attendances = await this.prisma.attendance.findMany({
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return {
      message: 'Attendances retrieved successfully',
      data: attendances,
      status: 200,
    };
  }

  async getAttendanceById(id: number) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance with ID ${id} not found`);
    }

    return {
      message: 'Attendance retrieved successfully',
      data: attendance,
      status: 200,
    };
  }

  async getAttendancesByEmployee(employeeId: number) {
    // Check if employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    const attendances = await this.prisma.attendance.findMany({
      where: { employeeId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return {
      message: 'Employee attendances retrieved successfully',
      data: attendances,
      status: 200,
    };
  }

  async updateAttendance(
    id: number,
    updateAttendanceDto: UpdateAttendanceDto,
  ) {
    const company = await this.prisma.company.findFirst();
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance with ID ${id} not found`);
    }

    if (!updateAttendanceDto.timeOut) {
      throw new BadRequestException(`timeOut is required to update attendance`);
    }

    const timeIn = attendance.timeIn;
    const timeOut = new Date(updateAttendanceDto.timeOut);

    // Calculate hours worked
    const hoursWorked =
      (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60);

    const expectedHours = company?.workHours || 8;
    const hoursMissed = Math.max(expectedHours - hoursWorked, 0); // Avoid negative

    const updatedAttendance = await this.prisma.attendance.update({
      where: { id },
      data: {
        timeOut,
        missedHours: hoursMissed,
        ...(updateAttendanceDto.notes !== undefined && {
          notes: updateAttendanceDto.notes || null,
        }),
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      message: 'Attendance updated successfully',
      data: updatedAttendance,
      status: 200,
    };
  }

  async deleteAttendance(id: number) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance with ID ${id} not found`);
    }

    await this.prisma.attendance.delete({
      where: { id },
    });

    return {
      message: 'Attendance deleted successfully',
      status: 200,
    };
  }

  async getAttendanceSummaryByPeriod(startDate: string, endDate: string) {
    // 1. Get company details
    const company = await this.prisma.company.findFirst();

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const workHours = company.workHours || 8;

    // 2. Get employees and attendance records in range
    const employees = await this.prisma.employee.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        salary: true,
        isActive: true,
        branch: { select: { name: true } },
        role: { select: { name: true } },
        dept: { select: { name: true } },
        Attendance: {
          where: {
            date: { gte: startDate, lte: endDate },
          },
          select: { date: true, timeIn: true, timeOut: true },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    // 3. Days in the range (inclusive), and the calendar months it covers.
    //    Dates are 'YYYY-MM-DD' strings, so work in UTC to avoid timezone drift.
    const start = new Date(`${startDate.slice(0, 10)}T00:00:00Z`);
    const end = new Date(`${endDate.slice(0, 10)}T00:00:00Z`);
    const DAY = 1000 * 60 * 60 * 24;
    const totalDays = Math.round((end.getTime() - start.getTime()) / DAY) + 1;

    const months: { month: string; label: string; days: number }[] = [];
    for (let d = new Date(start); d <= end; d = new Date(d.getTime() + DAY)) {
      const key = d.toISOString().slice(0, 7); // YYYY-MM
      const last = months[months.length - 1];
      if (last && last.month === key) {
        last.days += 1;
      } else {
        months.push({
          month: key,
          label: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]} ${d.getUTCFullYear()}`,
          days: 1,
        });
      }
    }

    const hoursWorked = (a: { timeIn: Date; timeOut: Date | null }) =>
      a.timeOut ? (new Date(a.timeOut).getTime() - new Date(a.timeIn).getTime()) / (1000 * 60 * 60) : 0;

    // 4. Months each person was already paid for in another payroll that overlaps
    //    this one, so the screen can stop anyone being paid twice for a month.
    const alreadyPaid = await this.paidMonthsByEmployee(start, end);

    // 5. Compute totals per employee, overall and per month
    const report = employees.map((emp) => {
      const totalWorkedHours = emp.Attendance.reduce((sum, a) => sum + hoursWorked(a), 0);

      const totalExpectedHours = totalDays * workHours;
      const totalMissedHours = Math.max(
        totalExpectedHours - totalWorkedHours,
        0,
      );

      const attendanceRate =
        totalExpectedHours > 0
          ? ((totalWorkedHours / totalExpectedHours) * 100).toFixed(2)
          : '0';

      // Per month, so payroll can pay (and fine) only the months someone is paid for.
      const monthly = months.map((m) => {
        const worked = emp.Attendance.filter((a) => String(a.date).slice(0, 7) === m.month).reduce(
          (sum, a) => sum + hoursWorked(a),
          0,
        );
        const expected = m.days * workHours;
        return {
          month: m.month,
          label: m.label,
          days: m.days,
          expectedHours: expected,
          workedHours: +worked.toFixed(2),
          missedHours: +Math.max(expected - worked, 0).toFixed(2),
        };
      });

      return {
        employeeId: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        salary: emp.salary,
        branch: emp.branch?.name || 'N/A',
        role: emp.role?.name || 'N/A',
        department: emp.dept?.name || 'N/A',
        totalDays,
        totalExpectedHours,
        totalWorkedHours: +totalWorkedHours.toFixed(2),
        totalMissedHours: +totalMissedHours.toFixed(2),
        attendanceRate: `${attendanceRate}%`,
        isActive: emp.isActive,
        months: monthly,
        alreadyPaid: (alreadyPaid.get(emp.id) ?? []).filter((p) =>
          months.some((m) => m.month === p.month),
        ),
      };
    });

    // 6. Return structured response
    return {
      status: 200,
      message: 'Attendance summary fetched successfully',
      company: {
        id: company.id,
        name: company.name,
        workHours: company.workHours,
      },
      dateRange: { startDate, endDate },
      months,
      data: report,
    };
  }

  /** 'YYYY-MM' for every calendar month touched by [start, end]. */
  private monthKeys(start: Date, end: Date): string[] {
    const keys: string[] = [];
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    while (d <= end) {
      keys.push(d.toISOString().slice(0, 7));
      d.setUTCMonth(d.getUTCMonth() + 1);
    }
    return keys;
  }

  /**
   * employeeId → months already paid in saved payrolls overlapping [start, end].
   * Newer payrolls record paidMonths; older ones paid the whole period.
   */
  private async paidMonthsByEmployee(start: Date, end: Date, excludePeriodId?: number) {
    const periods = await this.prisma.payrollPeriods.findMany({
      where: {
        periodStart: { lte: end },
        periodEnd: { gte: start },
        ...(excludePeriodId !== undefined ? { id: { not: excludePeriodId } } : {}),
      },
      select: {
        id: true,
        periodStart: true,
        periodEnd: true,
        payrolls: { select: { paymentStructure: true } },
      },
    });

    const result = new Map<number, { month: string; payrollPeriodId: number }[]>();
    for (const period of periods) {
      const wholePeriod = this.monthKeys(new Date(period.periodStart), new Date(period.periodEnd));
      for (const payroll of period.payrolls) {
        const ps = (payroll.paymentStructure ?? {}) as Record<string, unknown>;
        const employeeId = Number(ps.employeeId);
        if (!Number.isFinite(employeeId)) continue;
        const months = Array.isArray(ps.paidMonths)
          ? ps.paidMonths
              .map((m) => (typeof m === 'string' ? m : (m as { month?: string })?.month))
              .filter((m): m is string => typeof m === 'string')
          : wholePeriod;
        const list = result.get(employeeId) ?? [];
        for (const month of months) list.push({ month, payrollPeriodId: period.id });
        result.set(employeeId, list);
      }
    }
    return result;
  }

  /** Checks a payroll before saving it, and works out the total on the server. */
  private preparePayroll(dto: Partial<CreatePayrollPeriodDto>) {
    const rows = Array.isArray(dto.paymentStructure) ? dto.paymentStructure : [];
    if (rows.length === 0) throw new BadRequestException('Add at least one person to the payroll');
    const start = new Date(dto.periodStart as unknown as string);
    const end = new Date(dto.periodEnd as unknown as string);
    const payDate = new Date(dto.payDate as unknown as string);
    if ([start, end, payDate].some((d) => isNaN(d.getTime()))) {
      throw new BadRequestException('Period start, end and pay date are required');
    }
    if (end < start) throw new BadRequestException('The period ends before it starts');

    const seen = new Set<number>();
    let total = 0;
    for (const row of rows) {
      const id = Number(row.employeeId);
      if (!Number.isFinite(id)) throw new BadRequestException('Every row needs an employee');
      if (seen.has(id)) throw new BadRequestException(`${row.name ?? 'Someone'} appears twice in this payroll`);
      seen.add(id);
      const net = Number(row.netPay);
      if (!Number.isFinite(net) || net < 0) {
        throw new BadRequestException(`Net pay for ${row.name ?? 'someone'} is not valid`);
      }
      total += net;
    }
    return { rows, start, end, payDate, total: Math.round(total * 100) / 100, employeeIds: seen };
  }

  /** Refuse to pay someone twice for the same month. */
  private async assertNoDoublePay(
    rows: PaymentStructureDto[],
    start: Date,
    end: Date,
    excludePeriodId?: number,
  ) {
    const paid = await this.paidMonthsByEmployee(start, end, excludePeriodId);
    const clashes: string[] = [];
    for (const row of rows) {
      const r = row as unknown as { employeeId: number; name?: string; paidMonths?: Array<{ month?: string } | string> };
      const months = Array.isArray(r.paidMonths)
        ? r.paidMonths.map((m) => (typeof m === 'string' ? m : m?.month)).filter(Boolean)
        : this.monthKeys(start, end);
      const already = paid.get(Number(r.employeeId)) ?? [];
      const overlap = already.filter((p) => months.includes(p.month));
      if (overlap.length) {
        clashes.push(`${r.name ?? `Employee ${r.employeeId}`} (${overlap.map((o) => o.month).join(', ')})`);
      }
    }
    if (clashes.length) {
      throw new ConflictException(`Already paid in another payroll: ${clashes.join('; ')}`);
    }
  }

  // Create a Payroll Period along with Payroll records
  async createPayrollPeriod(dto: CreatePayrollPeriodDto) {
    const { rows, start, end, payDate, total } = this.preparePayroll(dto);
    await this.assertNoDoublePay(rows, start, end);

    const payrollPeriod = await this.prisma.payrollPeriods.create({
      data: {
        periodStart: start,
        periodEnd: end,
        payDate,
        totalSpent: total,
        payrolls: {
          create: rows.map((p) => ({
            paymentStructure: p as unknown as Prisma.InputJsonObject,
          })),
        },
      },
      include: { payrolls: true },
    });

    return {
      data: payrollPeriod,
      status: 201,
      message: 'Payroll saved',
    };
  }

  // Get a single Payroll Period by ID
  async getPayrollPeriod(id: number) {
    const payrollPeriod = await this.prisma.payrollPeriods.findUnique({
      where: { id },
      include: { payrolls: true },
    });

    if (!payrollPeriod) throw new NotFoundException('Payroll period not found');
    return payrollPeriod;
  }

  // List all Payroll Periods
  async listPayrollPeriods() {
    const payrolls = await this.prisma.payrollPeriods.findMany({
      include: { payrolls: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: payrolls,
      status: 200,
      message: 'Payroll periods fetched successfully',
    };
  }

  // Update a Payroll Period (dates only)
  async updatePayrollPeriod(id: number, dto: Partial<CreatePayrollPeriodDto>) {
    await this.getPayrollPeriod(id);
    const payrollPeriod = await this.prisma.payrollPeriods.update({
      where: { id },
      data: {
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        payDate: dto.payDate,
      },
      include: { payrolls: true },
    });
    return { data: payrollPeriod, status: 200, message: 'Payroll updated' };
  }

  /**
   * Replace the people in a payroll period. (The old version upserted by
   * employeeId into the payroll's own id, which overwrote unrelated payrolls.)
   */
  async upsertPayrolls(payrollPeriodId: number, payrolls: PaymentStructureDto[]) {
    const period = await this.getPayrollPeriod(payrollPeriodId);
    const { rows, start, end, total } = this.preparePayroll({
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      payDate: period.payDate,
      paymentStructure: payrolls,
    });
    await this.assertNoDoublePay(rows, start, end, payrollPeriodId);

    const [, , updated] = await this.prisma.$transaction([
      this.prisma.payroll.deleteMany({ where: { payrollPeriodId } }),
      this.prisma.payroll.createMany({
        data: rows.map((p) => ({
          payrollPeriodId,
          paymentStructure: p as unknown as Prisma.InputJsonObject,
        })),
      }),
      this.prisma.payrollPeriods.update({
        where: { id: payrollPeriodId },
        data: { totalSpent: total },
        include: { payrolls: true },
      }),
    ]);
    return { data: updated, status: 200, message: 'Payroll updated' };
  }

  // Delete a payroll period and everyone's pay records in it
  async deletePayrollPeriod(id: number) {
    await this.getPayrollPeriod(id);
    await this.prisma.$transaction([
      this.prisma.payroll.deleteMany({ where: { payrollPeriodId: id } }),
      this.prisma.payrollPeriods.delete({ where: { id } }),
    ]);
    return { data: { id }, status: 200, message: 'Payroll deleted' };
  }
}
