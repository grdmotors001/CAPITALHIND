-- =====================================================================
-- Capital Hind Finance Pvt Ltd (CHFPL)
-- Phase 8: Repossession & Recovery Management
-- MySQL / PDO schema — matches existing PHP/MySQL stack
-- =====================================================================
-- REFERENCED TABLES (confirmed against Phase 10 - Dealer Loan Application Portal spec):
--   loan_applications(id, loan_account_no, customer_id, ...)
--   customer_profiles(id, name, phone, address, ...)
--   users(id, name, role, ...)                    -- for recovery executives / staff
--   dealer_master(id, name, phone, address, ...)  -- existing dealer master
-- If these names differ in your actual DB, update the FK references below
-- before running the migration.
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. SEIZED VEHICLES (Seized Vehicle Entry)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seized_vehicles (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    loan_application_id INT UNSIGNED NOT NULL,
    loan_account_no     VARCHAR(50)  NOT NULL,
    customer_id         INT UNSIGNED NOT NULL,

    vehicle_no          VARCHAR(20)  NOT NULL,
    chassis_no          VARCHAR(50)  NOT NULL,
    engine_no           VARCHAR(50)  DEFAULT NULL,
    vehicle_make_model  VARCHAR(100) DEFAULT NULL,

    seizure_date         DATE NOT NULL,
    seizure_time         TIME DEFAULT NULL,
    seizure_reason       VARCHAR(255) NOT NULL,
    seizure_remarks      TEXT DEFAULT NULL,

    recovery_executive_id INT UNSIGNED NOT NULL,

    -- overall lifecycle status of the seized vehicle
    status  ENUM('seized','parked','ready_for_sale','sold','released')
            NOT NULL DEFAULT 'seized',

    created_by  INT UNSIGNED DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_sv_loan       FOREIGN KEY (loan_application_id) REFERENCES loan_applications(id),
    CONSTRAINT fk_sv_customer   FOREIGN KEY (customer_id)         REFERENCES customer_profiles(id),
    CONSTRAINT fk_sv_executive  FOREIGN KEY (recovery_executive_id) REFERENCES users(id),
    INDEX idx_sv_loan_account (loan_account_no),
    INDEX idx_sv_vehicle_no (vehicle_no),
    INDEX idx_sv_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 2. PARKING YARD MASTER (Yard Master)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parking_yard_master (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    yard_name     VARCHAR(100) NOT NULL,
    yard_type     ENUM('company_yard','factory','dealer') NOT NULL DEFAULT 'company_yard',
    dealer_id     INT UNSIGNED DEFAULT NULL,   -- filled only when yard_type = 'dealer'
    address       TEXT DEFAULT NULL,
    contact_person VARCHAR(100) DEFAULT NULL,
    contact_phone VARCHAR(20) DEFAULT NULL,
    daily_charge  DECIMAL(10,2) DEFAULT 0.00,  -- default per-day yard charge
    is_active     TINYINT(1) NOT NULL DEFAULT 1,

    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_pym_dealer FOREIGN KEY (dealer_id) REFERENCES dealer_master(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 3. VEHICLE PARKING ENTRIES (which vehicle is parked where, and for how long)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle_parking_entries (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    seized_vehicle_id   INT UNSIGNED NOT NULL,
    parking_yard_id     INT UNSIGNED NOT NULL,

    parking_type        ENUM('yard','factory','dealer') NOT NULL,
    parking_ref_id       INT UNSIGNED DEFAULT NULL,  -- dealer_id, when parking_type='dealer'

    entry_date           DATE NOT NULL,
    exit_date            DATE DEFAULT NULL,           -- NULL while still parked

    days_parked           INT UNSIGNED DEFAULT NULL,   -- computed at exit / or via view
    yard_charges_amount   DECIMAL(10,2) DEFAULT 0.00,

    vehicle_status  ENUM('seized','parked','ready_for_sale','sold','released')
                    NOT NULL DEFAULT 'parked',

    remarks  TEXT DEFAULT NULL,

    created_by  INT UNSIGNED DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_vpe_seized FOREIGN KEY (seized_vehicle_id) REFERENCES seized_vehicles(id) ON DELETE CASCADE,
    CONSTRAINT fk_vpe_yard   FOREIGN KEY (parking_yard_id)   REFERENCES parking_yard_master(id),
    CONSTRAINT fk_vpe_dealer FOREIGN KEY (parking_ref_id)    REFERENCES dealer_master(id),
    INDEX idx_vpe_seized (seized_vehicle_id),
    INDEX idx_vpe_status (vehicle_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 4. RECOVERY SETTLEMENT
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recovery_settlements (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    seized_vehicle_id   INT UNSIGNED NOT NULL,

    outstanding_amount   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    recovery_charges     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    customer_settlement  DECIMAL(12,2) NOT NULL DEFAULT 0.00,  -- amount customer pays to release/settle
    waiver_amount        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    final_amount          DECIMAL(12,2) NOT NULL DEFAULT 0.00, -- outstanding + charges - settlement - waiver

    settlement_status  ENUM('pending','approved','rejected','closed') NOT NULL DEFAULT 'pending',
    approved_by        INT UNSIGNED DEFAULT NULL,   -- maker-checker: approver
    approved_at        TIMESTAMP NULL DEFAULT NULL,

    remarks  TEXT DEFAULT NULL,

    created_by  INT UNSIGNED DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_rs_seized   FOREIGN KEY (seized_vehicle_id) REFERENCES seized_vehicles(id) ON DELETE CASCADE,
    CONSTRAINT fk_rs_approver FOREIGN KEY (approved_by)       REFERENCES users(id),
    INDEX idx_rs_seized (seized_vehicle_id),
    INDEX idx_rs_status (settlement_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 5. VEHICLE RESALE / DISPOSAL (Cash or Finance resale)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle_resale_disposal (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    seized_vehicle_id   INT UNSIGNED NOT NULL,

    resale_mode  ENUM('cash','finance') NOT NULL,

    buyer_name    VARCHAR(150) NOT NULL,
    buyer_phone   VARCHAR(20)  DEFAULT NULL,
    buyer_address TEXT DEFAULT NULL,

    sale_amount   DECIMAL(12,2) NOT NULL,
    sale_date     DATE NOT NULL,

    -- filled only when resale_mode = 'finance': links to the new loan created for the buyer
    linked_loan_application_id INT UNSIGNED DEFAULT NULL,
    linked_loan_account_no     VARCHAR(50)  DEFAULT NULL,

    approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    approved_by     INT UNSIGNED DEFAULT NULL,
    approved_at     TIMESTAMP NULL DEFAULT NULL,

    remarks  TEXT DEFAULT NULL,

    created_by  INT UNSIGNED DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_vrd_seized      FOREIGN KEY (seized_vehicle_id) REFERENCES seized_vehicles(id) ON DELETE CASCADE,
    CONSTRAINT fk_vrd_linked_loan FOREIGN KEY (linked_loan_application_id) REFERENCES loan_applications(id),
    CONSTRAINT fk_vrd_approver    FOREIGN KEY (approved_by) REFERENCES users(id),
    INDEX idx_vrd_seized (seized_vehicle_id),
    INDEX idx_vrd_mode (resale_mode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 6. REPOSSESSION HISTORY (audit trail: kisne/kab/kaha/remarks/photos)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS repossession_history (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    seized_vehicle_id   INT UNSIGNED NOT NULL,

    action_type  ENUM('seized','parked','moved','ready_for_sale','sold','released','settlement_updated')
                 NOT NULL,

    performed_by   INT UNSIGNED NOT NULL,   -- kisne (recovery executive / staff)
    performed_at   DATETIME NOT NULL,       -- kab
    location        VARCHAR(255) DEFAULT NULL,

    remarks  TEXT DEFAULT NULL,

    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rh_seized FOREIGN KEY (seized_vehicle_id) REFERENCES seized_vehicles(id) ON DELETE CASCADE,
    CONSTRAINT fk_rh_user   FOREIGN KEY (performed_by)      REFERENCES users(id),
    INDEX idx_rh_seized (seized_vehicle_id),
    INDEX idx_rh_action (action_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 7. REPOSSESSION DOCUMENTS (photos / documents attached to history events)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS repossession_documents (
    id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    repossession_history_id INT UNSIGNED NOT NULL,

    doc_type    ENUM('photo','document') NOT NULL DEFAULT 'photo',
    file_path   VARCHAR(500) NOT NULL,
    file_name   VARCHAR(255) DEFAULT NULL,

    uploaded_by  INT UNSIGNED DEFAULT NULL,
    uploaded_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rd_history FOREIGN KEY (repossession_history_id) REFERENCES repossession_history(id) ON DELETE CASCADE,
    INDEX idx_rd_history (repossession_history_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- VIEWS — for Recovery Dashboard (Module 6)
-- =====================================================================

-- Total seized vehicles, yard stock, ready-for-sale, sold counts
CREATE OR REPLACE VIEW vw_recovery_dashboard_summary AS
SELECT
    COUNT(*)                                                   AS total_seized_vehicles,
    SUM(CASE WHEN status = 'parked'         THEN 1 ELSE 0 END) AS yard_stock,
    SUM(CASE WHEN status = 'ready_for_sale' THEN 1 ELSE 0 END) AS ready_for_sale,
    SUM(CASE WHEN status = 'sold'           THEN 1 ELSE 0 END) AS total_sold,
    SUM(CASE WHEN status = 'released'       THEN 1 ELSE 0 END) AS total_released
FROM seized_vehicles;

-- Total recovery amount collected (from closed settlements)
CREATE OR REPLACE VIEW vw_recovery_amount_summary AS
SELECT
    COALESCE(SUM(final_amount), 0) AS total_recovery_amount,
    COUNT(*)                       AS total_settlements_closed
FROM recovery_settlements
WHERE settlement_status = 'closed';

-- Executive-wise performance: vehicles seized + recovery amount handled
CREATE OR REPLACE VIEW vw_executive_performance AS
SELECT
    u.id                           AS executive_id,
    u.name                         AS executive_name,
    COUNT(DISTINCT sv.id)          AS vehicles_seized,
    SUM(CASE WHEN sv.status IN ('sold','released') THEN 1 ELSE 0 END) AS vehicles_resolved,
    COALESCE(SUM(rs.final_amount), 0) AS total_recovery_amount
FROM users u
LEFT JOIN seized_vehicles sv     ON sv.recovery_executive_id = u.id
LEFT JOIN recovery_settlements rs ON rs.seized_vehicle_id = sv.id AND rs.settlement_status = 'closed'
GROUP BY u.id, u.name;

-- Current parking status per vehicle (latest open parking entry)
CREATE OR REPLACE VIEW vw_current_vehicle_parking AS
SELECT
    sv.id              AS seized_vehicle_id,
    sv.vehicle_no,
    sv.loan_account_no,
    sv.status           AS overall_status,
    vpe.parking_yard_id,
    pym.yard_name,
    pym.yard_type,
    vpe.entry_date,
    vpe.yard_charges_amount,
    DATEDIFF(CURDATE(), vpe.entry_date) AS days_in_yard
FROM seized_vehicles sv
LEFT JOIN vehicle_parking_entries vpe
    ON vpe.seized_vehicle_id = sv.id AND vpe.exit_date IS NULL
LEFT JOIN parking_yard_master pym
    ON pym.id = vpe.parking_yard_id;
