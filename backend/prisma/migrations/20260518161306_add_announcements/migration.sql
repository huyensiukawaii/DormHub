-- CreateTable
CREATE TABLE "announcement_posts" (
    "id" SERIAL NOT NULL,
    "building_id" INTEGER,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "images" JSONB,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "pinned_at" TIMESTAMP(3),
    "author_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcement_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_reactions" (
    "post_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "emoji" TEXT NOT NULL,

    CONSTRAINT "announcement_reactions_pkey" PRIMARY KEY ("post_id","user_id")
);

-- CreateIndex
CREATE INDEX "announcement_posts_building_id_idx" ON "announcement_posts"("building_id");

-- CreateIndex
CREATE INDEX "announcement_posts_is_pinned_idx" ON "announcement_posts"("is_pinned");

-- CreateIndex
CREATE INDEX "announcement_posts_created_at_idx" ON "announcement_posts"("created_at");

-- CreateIndex
CREATE INDEX "announcement_reactions_post_id_idx" ON "announcement_reactions"("post_id");

-- AddForeignKey
ALTER TABLE "announcement_posts" ADD CONSTRAINT "announcement_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_posts" ADD CONSTRAINT "announcement_posts_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_reactions" ADD CONSTRAINT "announcement_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "announcement_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_reactions" ADD CONSTRAINT "announcement_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
