-- CreateEnum
CREATE TYPE "LoadType" AS ENUM ('single', 'pair', 'band', 'bodyweight');

-- CreateEnum
CREATE TYPE "Measure" AS ENUM ('reps', 'seconds');

-- CreateEnum
CREATE TYPE "Feeling" AS ENUM ('easy', 'good', 'hard');

-- CreateEnum
CREATE TYPE "LoadMode" AS ENUM ('single', 'pair');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "trainingDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "weeklyGoal" INTEGER NOT NULL DEFAULT 3;

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "handleCount" INTEGER NOT NULL,
    "handleGrams" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grams" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "Plate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedWeight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grams" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "FixedWeight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Band" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "resistance" TEXT,
    "count" INTEGER NOT NULL,

    CONSTRAINT "Band_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "loadType" "LoadType" NOT NULL,
    "measure" "Measure" NOT NULL DEFAULT 'reps',
    "perSide" BOOLEAN NOT NULL DEFAULT false,
    "easierId" TEXT,
    "harderId" TEXT,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ProgramDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramExercise" (
    "id" TEXT NOT NULL,
    "programDayId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL,
    "targetMin" INTEGER NOT NULL,
    "targetMax" INTEGER NOT NULL,
    "loadGrams" INTEGER,
    "loadMode" "LoadMode",

    CONSTRAINT "ProgramExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programDayId" TEXT,
    "date" DATE NOT NULL,
    "isShort" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "clientId" TEXT NOT NULL,

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "amount" INTEGER,
    "loadGrams" INTEGER,
    "feeling" "Feeling",
    "skippedForPain" BOOLEAN NOT NULL DEFAULT false,
    "loggedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "SetLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_userId_key" ON "Equipment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Plate_userId_grams_key" ON "Plate"("userId", "grams");

-- CreateIndex
CREATE INDEX "FixedWeight_userId_idx" ON "FixedWeight"("userId");

-- CreateIndex
CREATE INDEX "Band_userId_idx" ON "Band"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_slug_key" ON "Exercise"("slug");

-- CreateIndex
CREATE INDEX "Exercise_easierId_idx" ON "Exercise"("easierId");

-- CreateIndex
CREATE INDEX "Exercise_harderId_idx" ON "Exercise"("harderId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramDay_userId_key_key" ON "ProgramDay"("userId", "key");

-- CreateIndex
CREATE INDEX "ProgramExercise_exerciseId_idx" ON "ProgramExercise"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramExercise_programDayId_order_key" ON "ProgramExercise"("programDayId", "order");

-- CreateIndex
CREATE INDEX "WorkoutSession_userId_date_idx" ON "WorkoutSession"("userId", "date");

-- CreateIndex
CREATE INDEX "WorkoutSession_programDayId_idx" ON "WorkoutSession"("programDayId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSession_userId_clientId_key" ON "WorkoutSession"("userId", "clientId");

-- CreateIndex
CREATE INDEX "SetLog_sessionId_idx" ON "SetLog"("sessionId");

-- CreateIndex
CREATE INDEX "SetLog_userId_exerciseId_loggedAt_idx" ON "SetLog"("userId", "exerciseId", "loggedAt");

-- CreateIndex
CREATE INDEX "SetLog_exerciseId_idx" ON "SetLog"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "SetLog_userId_clientId_key" ON "SetLog"("userId", "clientId");

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plate" ADD CONSTRAINT "Plate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedWeight" ADD CONSTRAINT "FixedWeight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Band" ADD CONSTRAINT "Band_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_easierId_fkey" FOREIGN KEY ("easierId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_harderId_fkey" FOREIGN KEY ("harderId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramDay" ADD CONSTRAINT "ProgramDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramExercise" ADD CONSTRAINT "ProgramExercise_programDayId_fkey" FOREIGN KEY ("programDayId") REFERENCES "ProgramDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramExercise" ADD CONSTRAINT "ProgramExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_programDayId_fkey" FOREIGN KEY ("programDayId") REFERENCES "ProgramDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetLog" ADD CONSTRAINT "SetLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetLog" ADD CONSTRAINT "SetLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetLog" ADD CONSTRAINT "SetLog_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
