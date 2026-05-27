import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMyBatches,
  useGetBatchHelpdesk, getGetBatchHelpdeskQueryKey,
  useCreateBatchHelpdeskPost,
  useGetBatchPostComments, getGetBatchPostCommentsQueryKey,
  useCreateBatchPostComment,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  MessageSquare, Plus, ChevronDown, ChevronUp, Loader2,
  AlertCircle, Bug, Star, Globe, GraduationCap,
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-gray-100 text-gray-700",
  investigating: "bg-amber-100 text-amber-700",
  acknowledged: "bg-purple-100 text-purple-700",
  resolved: "bg-green-100 text-green-700",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Course Topics": <AlertCircle className="w-4 h-4 text-red-500" />,
  "Bugs": <Bug className="w-4 h-4 text-orange-500" />,
  "Feature Requests": <Star className="w-4 h-4 text-blue-500" />,
  "Others": <Globe className="w-4 h-4 text-gray-500" />,
};

const CATEGORIES = ["Course Topics", "Bugs", "Feature Requests", "Others"];

import { getAppNow } from "@/hooks/use-app-time";

function timeAgo(dateStr: string) {
  const diff = getAppNow().getTime() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : new Date(dateStr).toLocaleDateString();
}

function PostCard({ post, batchId }: { post: { id: number; title: string; content: string; status: string; category: string; createdAt: string; authorName?: string | null; authorAvatar?: string | null; commentCount: number }; batchId: number }) {
  const [open, setOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const qc = useQueryClient();

  const { data: comments, isLoading: commentsLoading } = useGetBatchPostComments(batchId, post.id, {
    query: { enabled: open, queryKey: getGetBatchPostCommentsQueryKey(batchId, post.id) },
  });

  const addComment = useCreateBatchPostComment({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetBatchPostCommentsQueryKey(batchId, post.id) });
        qc.invalidateQueries({ queryKey: getGetBatchHelpdeskQueryKey(batchId) });
        setCommentText("");
      },
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start gap-3">
          <Avatar className="w-9 h-9 shrink-0 mt-0.5">
            <AvatarImage src={post.authorAvatar ?? undefined} />
            <AvatarFallback>{(post.authorName ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-sm font-medium">{post.authorName ?? "Unknown"}</span>
              <span className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</span>
              <Badge variant="secondary" className={`text-xs ${STATUS_STYLES[post.status] ?? ""}`}>{post.status}</Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {CATEGORY_ICONS[post.category] ?? <Globe className="w-3 h-3" />} {post.category}
              </span>
            </div>
            <h3 className="font-semibold text-sm">{post.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{post.content}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {post.commentCount} comment{post.commentCount !== 1 ? "s" : ""}
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {open && (
          <div className="mt-3 space-y-3">
            {commentsLoading && <Skeleton className="h-10 w-full" />}
            {(comments ?? []).map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                  <AvatarImage src={c.authorAvatar ?? undefined} />
                  <AvatarFallback className="text-[10px]">{(c.authorName ?? "?").slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium">{c.authorName ?? "Unknown"}</span>
                    <span className="text-[11px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="text-sm mt-0.5">{c.content}</p>
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Textarea
                rows={1}
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="resize-none text-sm"
              />
              <Button
                size="sm" className="shrink-0"
                disabled={!commentText.trim() || addComment.isPending}
                onClick={() => addComment.mutate({ id: batchId, postId: post.id, data: { content: commentText } })}
              >
                {addComment.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Reply"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BatchFeed({ batchId }: { batchId: number }) {
  const qc = useQueryClient();
  const [newPost, setNewPost] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Others");

  const { data: posts, isLoading } = useGetBatchHelpdesk(batchId, {
    query: { queryKey: getGetBatchHelpdeskQueryKey(batchId) },
  });

  const createPost = useCreateBatchHelpdeskPost({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetBatchHelpdeskQueryKey(batchId) });
        setNewPost(false);
        setTitle(""); setContent(""); setCategory("Others");
      },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setNewPost(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> New Post
        </Button>
      </div>

      {isLoading && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}

      {!isLoading && (posts ?? []).length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No posts yet. Start the conversation!
          </CardContent>
        </Card>
      )}

      {(posts ?? []).map((p) => (
        <PostCard key={p.id} post={p} batchId={batchId} />
      ))}

      <Dialog open={newPost} onOpenChange={setNewPost}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Help Desk Post</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Describe your issue briefly" />
            </div>
            <div className="space-y-1.5">
              <Label>Details *</Label>
              <Textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Give more details..." />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPost(false)}>Cancel</Button>
            <Button
              disabled={!title.trim() || !content.trim() || createPost.isPending}
              onClick={() => createPost.mutate({ id: batchId, data: { title, content, category } })}
            >
              {createPost.isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
              Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BatchHelpDesk() {
  const { data: batches, isLoading } = useGetMyBatches();
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

  const selectedBatch = batches?.find((b) => b.id === selectedBatchId);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container py-8 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Help Desk</h1>
          <p className="text-sm text-muted-foreground mt-1">Ask questions and get help from your batch community</p>
        </div>

        {isLoading && <p className="text-muted-foreground text-sm">Loading...</p>}

        {!isLoading && (!batches || batches.length === 0) && (
          <Card>
            <CardContent className="py-20 text-center">
              <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="font-semibold text-lg mb-1">No batches found</p>
              <p className="text-sm text-muted-foreground">You need to be added to a batch to use the help desk.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && batches && batches.length > 0 && (
          <>
            {batches.length > 1 && (
              <div className="flex gap-2 mb-6 flex-wrap">
                {batches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBatchId(b.id === selectedBatchId ? null : b.id)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      selectedBatchId === b.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}

            {/* Auto-select if only one batch */}
            {batches.length === 1 && selectedBatchId === null && (
              <BatchFeedAutoSelect batchId={batches[0].id} setSelectedBatchId={setSelectedBatchId} />
            )}

            {selectedBatchId && selectedBatch && (
              <>
                {batches.length > 1 && (
                  <h2 className="text-base font-semibold mb-4 text-muted-foreground">
                    {selectedBatch.name} — Help Desk
                  </h2>
                )}
                <BatchFeed batchId={selectedBatchId} />
              </>
            )}

            {!selectedBatchId && batches.length > 1 && (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground text-sm">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Select a batch above to view its help desk.
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function BatchFeedAutoSelect({ batchId, setSelectedBatchId }: { batchId: number; setSelectedBatchId: (id: number) => void }) {
  useState(() => { setSelectedBatchId(batchId); });
  return null;
}
