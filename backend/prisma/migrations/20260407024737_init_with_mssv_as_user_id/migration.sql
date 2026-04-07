-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF', 'STUDENT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "BuildingStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('STANDARD', 'AIR_CONDITIONED');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'CLOSED');

-- CreateEnum
CREATE TYPE "BedStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('NEW_REGISTRATION', 'RENEWAL');

-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('UPCOMING', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApplicationType" AS ENUM ('NEW', 'RENEWAL');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'TERMINATED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MeterType" AS ENUM ('ELECTRICITY', 'WATER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('ELECTRICAL', 'PLUMBING', 'AIR_CONDITIONER', 'DOOR_LOCK', 'FURNITURE', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'URGENT');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "total_floors" INTEGER NOT NULL,
    "description" TEXT,
    "status" "BuildingStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "building_id" INTEGER NOT NULL,
    "floor" INTEGER NOT NULL,
    "gender" "Gender" NOT NULL,
    "room_type" "RoomType" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "price_per_month" DECIMAL(12,0) NOT NULL,
    "description" TEXT,
    "status" "RoomStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "room_id" INTEGER NOT NULL,
    "position" TEXT,
    "status" "BedStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "student_code" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "date_of_birth" DATE,
    "id_card_number" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "faculty" TEXT,
    "class_name" TEXT,
    "hometown_province" TEXT,
    "hometown_distance" INTEGER,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "emergency_contact_relation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_periods" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "type" "PeriodType" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "PeriodStatus" NOT NULL DEFAULT 'UPCOMING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_applications" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "period_id" INTEGER NOT NULL,
    "type" "ApplicationType" NOT NULL DEFAULT 'NEW',
    "current_room_id" INTEGER,
    "want_same_room" BOOLEAN NOT NULL DEFAULT true,
    "is_first_year" BOOLEAN NOT NULL DEFAULT false,
    "is_poor_household" BOOLEAN NOT NULL DEFAULT false,
    "is_near_poor" BOOLEAN NOT NULL DEFAULT false,
    "is_orphan" BOOLEAN NOT NULL DEFAULT false,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_policy_family" BOOLEAN NOT NULL DEFAULT false,
    "gpa_last_semester" DECIMAL(3,2),
    "was_resident" BOOLEAN NOT NULL DEFAULT false,
    "priority_score" INTEGER NOT NULL DEFAULT 0,
    "priority_details" JSONB,
    "documents" JSONB,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "approved_room_id" INTEGER,
    "approved_priority" INTEGER,
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_choices" (
    "id" SERIAL NOT NULL,
    "application_id" INTEGER NOT NULL,
    "room_id" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL,

    CONSTRAINT "room_choices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "student_id" INTEGER NOT NULL,
    "room_id" INTEGER NOT NULL,
    "bed_id" INTEGER,
    "application_id" INTEGER,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "monthly_rent" DECIMAL(12,0) NOT NULL,
    "is_room_leader" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "checked_in_at" TIMESTAMP(3),
    "checked_out_at" TIMESTAMP(3),
    "termination_reason" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meter_readings" (
    "id" SERIAL NOT NULL,
    "room_id" INTEGER NOT NULL,
    "meter_type" "MeterType" NOT NULL,
    "reading_month" DATE NOT NULL,
    "previous_reading" DECIMAL(12,2) NOT NULL,
    "current_reading" DECIMAL(12,2) NOT NULL,
    "consumption" DECIMAL(12,2) NOT NULL,
    "recorded_by" INTEGER,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meter_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "room_id" INTEGER NOT NULL,
    "billing_month" DATE NOT NULL,
    "room_fee" DECIMAL(12,0) NOT NULL,
    "electricity_fee" DECIMAL(12,0) NOT NULL,
    "water_fee" DECIMAL(12,0) NOT NULL,
    "total_amount" DECIMAL(12,0) NOT NULL,
    "electricity_usage" DECIMAL(12,2) NOT NULL,
    "water_usage" DECIMAL(12,2) NOT NULL,
    "occupants_count" INTEGER NOT NULL,
    "due_date" DATE NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "payment_proof" TEXT,
    "paid_at" TIMESTAMP(3),
    "approved_by" INTEGER,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_tickets" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "room_id" INTEGER NOT NULL,
    "reported_by" INTEGER NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "images" JSONB,
    "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "TicketStatus" NOT NULL DEFAULT 'NEW',
    "handled_by" INTEGER,
    "handled_at" TIMESTAMP(3),
    "resolution_note" TEXT,
    "completed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "rating" INTEGER,
    "rating_comment" TEXT,
    "rated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "type" TEXT,
    "reference_type" TEXT,
    "reference_id" INTEGER,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updated_by" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "buildings_code_key" ON "buildings"("code");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_code_key" ON "rooms"("code");

-- CreateIndex
CREATE INDEX "rooms_building_id_idx" ON "rooms"("building_id");

-- CreateIndex
CREATE INDEX "rooms_status_idx" ON "rooms"("status");

-- CreateIndex
CREATE UNIQUE INDEX "beds_code_key" ON "beds"("code");

-- CreateIndex
CREATE INDEX "beds_room_id_idx" ON "beds"("room_id");

-- CreateIndex
CREATE INDEX "beds_status_idx" ON "beds"("status");

-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_student_code_key" ON "students"("student_code");

-- CreateIndex
CREATE INDEX "students_student_code_idx" ON "students"("student_code");

-- CreateIndex
CREATE INDEX "registration_periods_semester_idx" ON "registration_periods"("semester");

-- CreateIndex
CREATE INDEX "registration_periods_status_idx" ON "registration_periods"("status");

-- CreateIndex
CREATE INDEX "registration_applications_student_id_idx" ON "registration_applications"("student_id");

-- CreateIndex
CREATE INDEX "registration_applications_period_id_idx" ON "registration_applications"("period_id");

-- CreateIndex
CREATE INDEX "registration_applications_status_idx" ON "registration_applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "room_choices_application_id_priority_key" ON "room_choices"("application_id", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "room_choices_application_id_room_id_key" ON "room_choices"("application_id", "room_id");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_code_key" ON "contracts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_application_id_key" ON "contracts"("application_id");

-- CreateIndex
CREATE INDEX "contracts_student_id_idx" ON "contracts"("student_id");

-- CreateIndex
CREATE INDEX "contracts_room_id_idx" ON "contracts"("room_id");

-- CreateIndex
CREATE INDEX "contracts_bed_id_idx" ON "contracts"("bed_id");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "meter_readings_room_id_idx" ON "meter_readings"("room_id");

-- CreateIndex
CREATE INDEX "meter_readings_reading_month_idx" ON "meter_readings"("reading_month");

-- CreateIndex
CREATE UNIQUE INDEX "meter_readings_room_id_meter_type_reading_month_key" ON "meter_readings"("room_id", "meter_type", "reading_month");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_code_key" ON "invoices"("code");

-- CreateIndex
CREATE INDEX "invoices_room_id_idx" ON "invoices"("room_id");

-- CreateIndex
CREATE INDEX "invoices_billing_month_idx" ON "invoices"("billing_month");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_room_id_billing_month_key" ON "invoices"("room_id", "billing_month");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_tickets_code_key" ON "maintenance_tickets"("code");

-- CreateIndex
CREATE INDEX "maintenance_tickets_room_id_idx" ON "maintenance_tickets"("room_id");

-- CreateIndex
CREATE INDEX "maintenance_tickets_reported_by_idx" ON "maintenance_tickets"("reported_by");

-- CreateIndex
CREATE INDEX "maintenance_tickets_status_idx" ON "maintenance_tickets"("status");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_applications" ADD CONSTRAINT "registration_applications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_applications" ADD CONSTRAINT "registration_applications_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "registration_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_applications" ADD CONSTRAINT "registration_applications_current_room_id_fkey" FOREIGN KEY ("current_room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_applications" ADD CONSTRAINT "registration_applications_approved_room_id_fkey" FOREIGN KEY ("approved_room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_applications" ADD CONSTRAINT "registration_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_choices" ADD CONSTRAINT "room_choices_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "registration_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_choices" ADD CONSTRAINT "room_choices_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "registration_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_handled_by_fkey" FOREIGN KEY ("handled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
