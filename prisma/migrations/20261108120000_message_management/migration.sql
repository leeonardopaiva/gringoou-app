-- Gestão de mensagens: privacidade, solicitações, arquivar/silenciar/excluir por pessoa e apagar mensagem própria.
CREATE TYPE "MessagePolicy" AS ENUM ('EVERYONE', 'FRIENDS', 'NOBODY');
CREATE TYPE "ConversationRequestStatus" AS ENUM ('ACCEPTED', 'PENDING');

ALTER TABLE "User" ADD COLUMN "messagePolicy" "MessagePolicy" NOT NULL DEFAULT 'EVERYONE';
ALTER TABLE "MarketplaceConversation" ADD COLUMN "requestStatus" "ConversationRequestStatus" NOT NULL DEFAULT 'ACCEPTED';
ALTER TABLE "MarketplaceMessage" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE TABLE "ConversationState" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "mutedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ConversationState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConversationState_conversationId_userId_key" ON "ConversationState"("conversationId", "userId");
CREATE INDEX "ConversationState_userId_idx" ON "ConversationState"("userId");

ALTER TABLE "ConversationState" ADD CONSTRAINT "ConversationState_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MarketplaceConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationState" ADD CONSTRAINT "ConversationState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
