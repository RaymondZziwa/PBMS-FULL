-- Speed up attendance lookups (daily sheet, payroll summaries) and payroll overlap checks.
CREATE INDEX `Attendance_date_idx` ON `Attendance`(`date`);
CREATE INDEX `Attendance_employeeId_date_idx` ON `Attendance`(`employeeId`, `date`);
CREATE INDEX `PayrollPeriods_periodStart_periodEnd_idx` ON `PayrollPeriods`(`periodStart`, `periodEnd`);
