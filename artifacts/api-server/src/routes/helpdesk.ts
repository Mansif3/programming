import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, postsTable, commentsTable, usersTable } from "@workspace/db";

const router: IRouter = Router();

const DEFAULT_USER_ID = 1;

async function getUserById(id: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  return user || { id: 0, name: "Unknown", email: "", role: "student", studentId: null, avatar: null, bio: null };
}

router.get("/helpdesk/posts", async (req, res): Promise<void> => {
  const { category, filter } = req.query;
  let posts;
  if (category && typeof category === "string") {
    posts = await db.select().from(postsTable).where(eq(postsTable.category, category)).orderBy(sql`${postsTable.createdAt} DESC`);
  } else {
    posts = await db.select().from(postsTable).orderBy(sql`${postsTable.createdAt} DESC`);
  }

  const result = await Promise.all(
    posts.map(async (post) => {
      const author = await getUserById(post.authorId);
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(commentsTable)
        .where(eq(commentsTable.postId, post.id));
      return {
        ...post,
        author,
        commentCount: count,
        createdAt: post.createdAt.toISOString(),
      };
    })
  );
  res.json(result);
});

router.post("/helpdesk/posts", async (req, res): Promise<void> => {
  const { title, content, category } = req.body;
  if (!title || !category) {
    res.status(400).json({ error: "title and category are required" });
    return;
  }
  const [post] = await db.insert(postsTable).values({
    title,
    content: content || "",
    category,
    authorId: DEFAULT_USER_ID,
    status: "open",
  }).returning();
  const author = await getUserById(post.authorId);
  res.status(201).json({ ...post, author, commentCount: 0, createdAt: post.createdAt.toISOString() });
});

router.delete("/helpdesk/posts/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(commentsTable).where(eq(commentsTable.postId, id));
  await db.delete(postsTable).where(eq(postsTable.id, id));
  res.status(204).end();
});

router.patch("/helpdesk/posts/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status } = req.body ?? {};
  const allowed = ["open", "investigating", "acknowledged", "resolved"];
  if (!status || !allowed.includes(status)) {
    res.status(400).json({ error: "valid status required" });
    return;
  }
  const [post] = await db.update(postsTable).set({ status }).where(eq(postsTable.id, id)).returning();
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }
  const author = await getUserById(post.authorId);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(commentsTable)
    .where(eq(commentsTable.postId, id));
  res.json({ ...post, author, commentCount: count, createdAt: post.createdAt.toISOString() });
});

router.get("/helpdesk/posts/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id));
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  const author = await getUserById(post.authorId);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(commentsTable)
    .where(eq(commentsTable.postId, id));

  res.json({ ...post, author, commentCount: count, createdAt: post.createdAt.toISOString() });
});

router.get("/helpdesk/posts/:id/comments", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const comments = await db.select().from(commentsTable).where(eq(commentsTable.postId, id)).orderBy(commentsTable.createdAt);
  const result = await Promise.all(
    comments.map(async (comment) => {
      const author = await getUserById(comment.authorId);
      return { ...comment, author, createdAt: comment.createdAt.toISOString() };
    })
  );
  res.json(result);
});

router.post("/helpdesk/posts/:id/comments", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { content } = req.body;
  if (content == null) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const [comment] = await db.insert(commentsTable).values({
    postId: id,
    content,
    authorId: DEFAULT_USER_ID,
  }).returning();
  const author = await getUserById(comment.authorId);
  res.status(201).json({ ...comment, author, createdAt: comment.createdAt.toISOString() });
});

export default router;
