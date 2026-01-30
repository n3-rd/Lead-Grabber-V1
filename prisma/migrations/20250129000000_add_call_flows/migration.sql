-- CreateTable
CREATE TABLE "call_flows" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "greetingAudioUrl" TEXT,
    "queueHoldAudioUrl" TEXT,
    "allUnavailableAudioUrl" TEXT,
    "backupCellAudioUrl" TEXT,
    "failoverConfig" JSONB,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_flow_rules" (
    "id" TEXT NOT NULL,
    "callFlowId" TEXT NOT NULL,
    "ruleTitle" TEXT NOT NULL,
    "schedule" JSONB NOT NULL,
    "promptsAudioUrl" TEXT,
    "keyPrompts" JSONB NOT NULL,
    "failoverCount" INTEGER NOT NULL DEFAULT 2,
    "failoverDelayMinutes" INTEGER NOT NULL DEFAULT 2,
    "failoverAudioUrl" TEXT,
    "hangupAudioUrl" TEXT,
    "leaveMessageOnHash" BOOLEAN NOT NULL DEFAULT true,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_flow_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "call_flows_companyId_idx" ON "call_flows"("companyId");

-- CreateIndex
CREATE INDEX "call_flow_rules_callFlowId_idx" ON "call_flow_rules"("callFlowId");

-- AddForeignKey
ALTER TABLE "call_flows" ADD CONSTRAINT "call_flows_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_flow_rules" ADD CONSTRAINT "call_flow_rules_callFlowId_fkey" FOREIGN KEY ("callFlowId") REFERENCES "call_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
