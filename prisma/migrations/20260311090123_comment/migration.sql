-- CreateTable
CREATE TABLE "Comment" (
    "name" TEXT NOT NULL,
    "comment" TEXT NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE UNIQUE INDEX "Comment_name_key" ON "Comment"("name");
