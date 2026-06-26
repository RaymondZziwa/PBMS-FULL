-- AlterTable
ALTER TABLE `massageServicePayments` MODIFY `paymentMethod` ENUM('CASH', 'MTN_MOMO', 'AIRTEL_MOMO', 'CARD', 'PROF_MOMO', 'PATIENT_ACCOUNT') NOT NULL;

-- AlterTable
ALTER TABLE `project_payments` MODIFY `paymentMethod` ENUM('CASH', 'MTN_MOMO', 'AIRTEL_MOMO', 'CARD', 'PROF_MOMO', 'PATIENT_ACCOUNT') NOT NULL;

-- AlterTable
ALTER TABLE `sale_payment_transaction_history` MODIFY `payment_method` ENUM('CASH', 'MTN_MOMO', 'AIRTEL_MOMO', 'CARD', 'PROF_MOMO', 'PATIENT_ACCOUNT') NOT NULL;

-- AlterTable
ALTER TABLE `salesPayments` MODIFY `paymentMethod` ENUM('CASH', 'MTN_MOMO', 'AIRTEL_MOMO', 'CARD', 'PROF_MOMO', 'PATIENT_ACCOUNT') NOT NULL;
