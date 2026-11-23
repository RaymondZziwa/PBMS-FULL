-- Email and password are only needed for employees who sign in to the system.
-- (MySQL allows many NULLs in a UNIQUE column, so people without an email don't clash.)
ALTER TABLE `employees` MODIFY `email` VARCHAR(191) NULL,
    MODIFY `password` VARCHAR(191) NULL;
