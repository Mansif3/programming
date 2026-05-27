import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  useListPosts, useUpdatePostStatus, useDeletePost,
  useListComments, useCreateComment,
  getListPostsQueryKey, getListCommentsQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageSquare, Search, Reply, CheckCircle2, Clock, AlertCircle, Trash2, Send, Loader2, ChevronDown, ChevronUp } from "lucide-react";

const STATUS_META: Record<string, { color: string; icon: any; label: string }> = {
  open: { color: "bg-amber-50 text-amber-700 border-amber-200", icon: AlertCircle, label: "Open" },
  investigating: { color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock, label: "Investigating" },
  acknowledged: { color: "bg-violet-50 text-violet-700 border-violet-200", icon: Clock, label: "Acknowledged" },
  resolved: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2, label: "Resolved" },
};

function PostComments({ postId, onClose }: { postId: number; onClose: () => void }) {
  const { data: comments, isLoading } = useListComments(postId, {
    query: { queryKey: getListCommentsQueryKey(postId) },
  });
  const qc = useQueryClient();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);

  const createComment = useCreateComment({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) });
        qc.invalidateQueries({ queryKey: getListPostsQueryKey() });
        setText("");
      },
      onError: (e: any) => toast({ title: "Failed to send", description: e?.message ?? "Try again", variant: "destructive" }),
    },
  });

  useEffect(() => { textRef.current?.focus(); }, []);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    createComment.mutate({ id: postId, data: { content: trimmed } });
  };

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      {isLoading && <p className="text-xs text-muted-foreground">Loading comments…</p>}
      {!isLoading && comments && comments.length > 0 && (
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar className="w-6 h-6 shrink-0 mt-0.5">
                <AvatarImage src={(c.author as any)?.avatar ?? undefined} />
                <AvatarFallback className="text-[9px]">{(c.author as any)?.name?.slice(0, 2) ?? "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 bg-muted/50 rounded-md px-3 py-2">
                <p className="text-xs font-medium">{(c.author as any)?.name ?? "Unknown"}</p>
                <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {!isLoading && (!comments || comments.length === 0) && (
        <p className="text-xs text-muted-foreground">No comments yet.</p>
      )}
      <div className="flex gap-2 items-end">
        <Textarea
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a reply…"
          className="text-xs resize-none min-h-[60px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
          }}
        />
        <div className="flex flex-col gap-1 shrink-0">
          <Button size="sm" className="h-7 text-xs gap-1" onClick={submit} disabled={!text.trim() || createComment.isPending}>
            {createComment.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Send
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onClose}>Close</Button>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">Ctrl+Enter to send</p>
    </div>
  );
}

export default function AdminHelpDesk() {
  const { data: posts, isLoading } = useListPosts();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const updateStatus = useUpdatePostStatus({
    mutation: {
      onSuccess: (_d, vars: any) => {
        qc.invalidateQueries({ queryKey: getListPostsQueryKey() });
        toast({ title: "Status updated", description: `Post marked as ${vars.data.status}.` });
      },
      onError: (e: any) => toast({ title: "Failed to update", description: e?.message ?? "Try again", variant: "destructive" }),
    },
  });

  const deletePost = useDeletePost({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListPostsQueryKey() });
        setDeleteId(null);
        toast({ title: "Post deleted", description: "The post has been removed." });
      },
      onError: (e: any) => toast({ title: "Failed to delete", description: e?.message ?? "Try again", variant: "destructive" }),
    },
  });

  const filtered = (posts ?? [])
    .filter((p) => tab === "all" || p.status === tab)
    .filter((p) => p.title.toLowerCase().includes(q.toLowerCase()) || p.content.toLowerCase().includes(q.toLowerCase()));

  const counts = {
    all: posts?.length ?? 0,
    open: posts?.filter((p) => p.status === "open").length ?? 0,
    investigating: posts?.filter((p) => p.status === "investigating").length ?? 0,
    resolved: posts?.filter((p) => p.status === "resolved").length ?? 0,
  };

  return (
    <AdminLayout title="Help Desk" subtitle="Moderate community posts and respond to support requests">
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList>
            <TabsTrigger value="all">All <Badge variant="secondary" className="ml-2">{counts.all}</Badge></TabsTrigger>
            <TabsTrigger value="open">Open <Badge variant="secondary" className="ml-2">{counts.open}</Badge></TabsTrigger>
            <TabsTrigger value="investigating">Investigating <Badge variant="secondary" className="ml-2">{counts.investigating}</Badge></TabsTrigger>
            <TabsTrigger value="resolved">Resolved <Badge variant="secondary" className="ml-2">{counts.resolved}</Badge></TabsTrigger>
          </TabsList>
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search posts..." value={q} onChange={(e) => setQ(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        <TabsContent value={tab} className="space-y-3 mt-4">
          {isLoading && <p className="text-sm text-muted-foreground p-6 text-center">Loading...</p>}
          {!isLoading && filtered.length === 0 && (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No posts in this view</CardContent></Card>
          )}
          {filtered.map((p) => {
            const meta = STATUS_META[p.status];
            const Icon = meta.icon;
            const isExpanded = expandedId === p.id;
            return (
              <Card key={p.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarImage src={p.author.avatar ?? undefined} />
                      <AvatarFallback>{p.author.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                        <div>
                          <p className="font-semibold text-sm">{p.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.author.name} · {p.category} · {new Date(p.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline" className={`gap-1 ${meta.color}`}>
                          <Icon className="w-3 h-3" /> {meta.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{p.content}</p>

                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border flex-wrap">
                        <Button
                          size="sm" variant="outline" className="h-7 text-xs gap-1.5"
                          onClick={() => setExpandedId(isExpanded ? null : p.id)}
                        >
                          <Reply className="w-3 h-3" /> Reply
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          className={`h-7 text-xs gap-1.5 ${isExpanded ? "bg-muted" : ""}`}
                          onClick={() => setExpandedId(isExpanded ? null : p.id)}
                        >
                          {isExpanded
                            ? <ChevronUp className="w-3 h-3" />
                            : <ChevronDown className="w-3 h-3" />
                          }
                          <MessageSquare className="w-3 h-3" /> {p.commentCount} comments
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 ml-auto">
                              Change status
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(["open", "investigating", "acknowledged", "resolved"] as const).map((s) => (
                              <DropdownMenuItem
                                key={s}
                                disabled={p.status === s || updateStatus.isPending}
                                onClick={() => updateStatus.mutate({ id: p.id, data: { status: s } })}
                              >
                                {STATUS_META[s].label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {p.status !== "resolved" && (
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                            disabled={updateStatus.isPending}
                            onClick={() => updateStatus.mutate({ id: p.id, data: { status: "resolved" } })}
                          >
                            <CheckCircle2 className="w-3 h-3" /> Mark resolved
                          </Button>
                        )}
                        <Button
                          size="sm" variant="outline"
                          className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                          onClick={() => setDeleteId(p.id)}
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </Button>
                      </div>

                      {isExpanded && (
                        <PostComments postId={p.id} onClose={() => setExpandedId(null)} />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the post and all its comments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => { if (deleteId !== null) deletePost.mutate({ id: deleteId }); }}
              disabled={deletePost.isPending}
            >
              {deletePost.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
