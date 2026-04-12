-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `token` VARCHAR(500) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_tokens_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `companies` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `bin` VARCHAR(13) NOT NULL,
    `address` TEXT NOT NULL,
    `challan_prefix` VARCHAR(20) NOT NULL DEFAULT 'CH',
    `next_challan_no` INTEGER NOT NULL DEFAULT 1,
    `fiscal_year_start` TINYINT NOT NULL DEFAULT 7,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_companies` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `company_id` BIGINT NOT NULL,
    `role` ENUM('admin', 'operator') NOT NULL,

    UNIQUE INDEX `user_companies_user_id_company_id_key`(`user_id`, `company_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `company_id` BIGINT NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `bin_nid` VARCHAR(50) NULL,
    `phone` VARCHAR(30) NULL,
    `address` TEXT NULL,
    `is_vds_entity` BOOLEAN NOT NULL DEFAULT false,
    `vds_entity_type` VARCHAR(50) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `company_id` BIGINT NOT NULL,
    `product_code` VARCHAR(50) NULL,
    `hs_code` VARCHAR(20) NULL,
    `service_code` VARCHAR(20) NULL,
    `name` VARCHAR(200) NOT NULL,
    `name_bn` VARCHAR(200) NULL,
    `type` ENUM('product', 'service') NOT NULL,
    `vat_rate` DECIMAL(5, 2) NOT NULL,
    `sd_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `specific_duty_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `truncated_base_pct` DECIMAL(5, 2) NOT NULL DEFAULT 100,
    `unit` VARCHAR(50) NOT NULL DEFAULT 'pcs',
    `unit_price` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `company_id` BIGINT NOT NULL,
    `customer_id` BIGINT NULL,
    `invoice_type` ENUM('sales', 'purchase') NOT NULL,
    `challan_no` VARCHAR(50) NOT NULL,
    `challan_date` DATE NOT NULL,
    `subtotal` DECIMAL(14, 2) NOT NULL,
    `sd_total` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `vat_total` DECIMAL(14, 2) NOT NULL,
    `specific_duty_total` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `grand_total` DECIMAL(14, 2) NOT NULL,
    `vds_applicable` BOOLEAN NOT NULL DEFAULT false,
    `vds_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `net_receivable` DECIMAL(14, 2) NOT NULL,
    `status` ENUM('draft', 'approved', 'cancelled', 'locked') NOT NULL DEFAULT 'draft',
    `created_by` BIGINT NOT NULL,
    `approved_by` BIGINT NULL,
    `locked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoices_company_id_challan_no_key`(`company_id`, `challan_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `invoice_id` BIGINT NOT NULL,
    `product_id` BIGINT NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `description_bn` VARCHAR(255) NULL,
    `hs_code` VARCHAR(20) NULL,
    `qty` DECIMAL(14, 3) NOT NULL,
    `unit_price` DECIMAL(14, 2) NOT NULL,
    `vat_rate` DECIMAL(5, 2) NOT NULL,
    `sd_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `specific_duty_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `truncated_base_pct` DECIMAL(5, 2) NOT NULL DEFAULT 100,
    `taxable_value` DECIMAL(14, 2) NOT NULL,
    `sd_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `vat_amount` DECIMAL(14, 2) NOT NULL,
    `specific_duty_line` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `line_total` DECIMAL(14, 2) NOT NULL,
    `grand_total` DECIMAL(14, 2) NOT NULL,
    `vds_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `vds_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vds_certificates` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `company_id` BIGINT NOT NULL,
    `certificate_no` VARCHAR(50) NOT NULL,
    `certificate_date` DATE NOT NULL,
    `fiscal_year` VARCHAR(9) NOT NULL,
    `tax_month` VARCHAR(7) NOT NULL,
    `role` ENUM('deductor', 'deductee') NOT NULL,
    `invoice_id` BIGINT NULL,
    `counterparty_name` VARCHAR(200) NOT NULL,
    `counterparty_bin` VARCHAR(13) NOT NULL,
    `counterparty_address` TEXT NULL,
    `total_value` DECIMAL(14, 2) NOT NULL,
    `vat_amount` DECIMAL(14, 2) NOT NULL,
    `vds_rate` DECIMAL(5, 2) NOT NULL,
    `vds_amount` DECIMAL(14, 2) NOT NULL,
    `status` ENUM('draft', 'finalized', 'cancelled') NOT NULL DEFAULT 'draft',
    `notes` TEXT NULL,
    `created_by` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vds_certificates_company_id_certificate_no_key`(`company_id`, `certificate_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `treasury_deposits` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `company_id` BIGINT NOT NULL,
    `challan_no` VARCHAR(50) NOT NULL,
    `deposit_date` DATE NOT NULL,
    `fiscal_year` VARCHAR(9) NOT NULL,
    `tax_month` VARCHAR(7) NOT NULL,
    `bank_name` VARCHAR(200) NOT NULL,
    `bank_branch` VARCHAR(200) NULL,
    `account_code` VARCHAR(50) NULL,
    `total_amount` DECIMAL(14, 2) NOT NULL,
    `status` ENUM('pending', 'deposited', 'verified') NOT NULL DEFAULT 'pending',
    `notes` TEXT NULL,
    `created_by` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `treasury_deposits_company_id_challan_no_key`(`company_id`, `challan_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vds_certificate_deposits` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `certificate_id` BIGINT NOT NULL,
    `deposit_id` BIGINT NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,

    UNIQUE INDEX `vds_certificate_deposits_certificate_id_deposit_id_key`(`certificate_id`, `deposit_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vat_returns` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `company_id` BIGINT NOT NULL,
    `tax_month` VARCHAR(7) NOT NULL,
    `fiscal_year` VARCHAR(9) NOT NULL,
    `total_sales_value` DECIMAL(14, 2) NOT NULL,
    `output_vat` DECIMAL(14, 2) NOT NULL,
    `sd_payable` DECIMAL(14, 2) NOT NULL,
    `total_purchase_value` DECIMAL(14, 2) NOT NULL,
    `input_vat` DECIMAL(14, 2) NOT NULL,
    `vds_credit` DECIMAL(14, 2) NOT NULL,
    `carry_forward` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `increasing_adjustment` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `decreasing_adjustment` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `net_payable` DECIMAL(14, 2) NOT NULL,
    `musak_91_json` JSON NOT NULL,
    `status` ENUM('draft', 'reviewed', 'submitted', 'locked') NOT NULL DEFAULT 'draft',
    `generated_by` BIGINT NOT NULL,
    `reviewed_by` BIGINT NULL,
    `reviewed_at` DATETIME(3) NULL,
    `submitted_at` DATETIME(3) NULL,
    `submitted_by` BIGINT NULL,
    `locked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vat_returns_company_id_tax_month_key`(`company_id`, `tax_month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `company_id` BIGINT NULL,
    `user_id` BIGINT NULL,
    `method` VARCHAR(10) NOT NULL,
    `path` VARCHAR(500) NOT NULL,
    `status_code` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_company_id_created_at_idx`(`company_id`, `created_at`),
    INDEX `audit_logs_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_companies` ADD CONSTRAINT `user_companies_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_companies` ADD CONSTRAINT `user_companies_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vds_certificates` ADD CONSTRAINT `vds_certificates_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vds_certificates` ADD CONSTRAINT `vds_certificates_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vds_certificates` ADD CONSTRAINT `vds_certificates_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `treasury_deposits` ADD CONSTRAINT `treasury_deposits_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `treasury_deposits` ADD CONSTRAINT `treasury_deposits_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vds_certificate_deposits` ADD CONSTRAINT `vds_certificate_deposits_certificate_id_fkey` FOREIGN KEY (`certificate_id`) REFERENCES `vds_certificates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vds_certificate_deposits` ADD CONSTRAINT `vds_certificate_deposits_deposit_id_fkey` FOREIGN KEY (`deposit_id`) REFERENCES `treasury_deposits`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vat_returns` ADD CONSTRAINT `vat_returns_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vat_returns` ADD CONSTRAINT `vat_returns_generated_by_fkey` FOREIGN KEY (`generated_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vat_returns` ADD CONSTRAINT `vat_returns_reviewed_by_fkey` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vat_returns` ADD CONSTRAINT `vat_returns_submitted_by_fkey` FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
