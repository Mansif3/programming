import { useState } from "react";
import {
  useListPosts, getListPostsQueryKey,
  useCreatePost,
  useListAnnouncements, getListAnnouncementsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare, Search, AlertCircle, Bug, Star, Megaphone, CheckCircle2,
  Plus, Image, Globe, Smartphone
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  investigating: { label: "Investigating", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  acknowledged: { label: "Acknowledged", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  resolved: { label: "Resolved", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Courses Topics": <AlertCircle className="w-4 h-4 text-red-500" />,
  "Bugs": <Bug className="w-4 h-4 text-orange-500" />,
  "Feature Requests": <Star className="w-4 h-4 text-blue-500" />,
  "Others": <Globe className="w-4 h-4 text-gray-500" />,
  "Announcements": <Megaphone className="w-4 h-4 text-blue-400" />,
  "Resolved": <CheckCircle2 className="w-4 h-4 text-green-500" />,
};

import { getAppNow } from "@/hooks/use-app-time";

function timeAgo(dateStr: string) {
  const diff = getAppNow().getTime() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function HelpDesk() {
  const [filter, setFilter] = useState<"all" | "mine" | "admin">("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("Others");
  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useListPosts(
    { filter },
    { query: { queryKey: getListPostsQueryKey({ filter }) } }
  );

  const createPost = useCreatePost({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPostsQueryKey({ filter: "all" }) });
        queryClient.invalidateQueries({ queryKey: getListPostsQueryKey({ filter }) });
        setShowCreate(false);
        setNewTitle("");
        setNewContent("");
      }
    }
  });

  const categoryCounts = {
    "Courses Topics": posts?.filter((p) => p.category === "Courses Topics").length || 0,
    "Bugs": posts?.filter((p) => p.category === "Bugs").length || 0,
    "Feature Requests": posts?.filter((p) => p.category === "Feature Requests").length || 0,
    "Others": posts?.filter((p) => p.category === "Others").length || 0,
    "Announcements": 11,
    "Resolved": posts?.filter((p) => p.status === "resolved").length || 0,
  };

  const filtered = posts?.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container py-8">
        <div className="flex flex-col gap-6">
          {/* Main Feed */}
          <div className="flex-1 min-w-0">
            {/* Create Post Box */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback>AJ</AvatarFallback>
                  </Avatar>
                  <button
                    className="flex-1 text-left px-4 py-2.5 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors"
                    onClick={() => setShowCreate(!showCreate)}
                    data-testid="button-create-post"
                  >
                    Share or Ask Something to Everyone?
                  </button>
                </div>
                {showCreate && (
                  <div className="mt-4 space-y-3">
                    <Input
                      placeholder="Post title..."
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      data-testid="input-post-title"
                    />
                    <Textarea
                      placeholder="What's on your mind?"
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      rows={3}
                      data-testid="input-post-content"
                    />
                    <select
                      className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      data-testid="select-post-category"
                    >
                      <option value="Others">Others</option>
                      <option value="Bugs">Bugs</option>
                      <option value="Feature Requests">Feature Requests</option>
                      <option value="Courses Topics">Courses Topics</option>
                    </select>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                      <Button
                        size="sm"
                        disabled={!newTitle || createPost.isPending}
                        onClick={() => createPost.mutate({ data: { title: newTitle, content: newContent, category: newCategory } })}
                        data-testid="button-submit-post"
                      >
                        {createPost.isPending ? "Posting..." : "Create Post"}
                      </Button>
                    </div>
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-border">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <Image className="w-4 h-4 mr-2" />
                    Photo/Video
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Filter Tabs + Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="flex-1">
                <TabsList className="h-9">
                  <TabsTrigger value="all" className="text-sm">All Posts</TabsTrigger>
                  <TabsTrigger value="mine" className="text-sm">My Posts</TabsTrigger>
                  <TabsTrigger value="admin" className="text-sm">Admin Posts</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative w-full sm:w-52">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-8 h-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search-posts"
                />
              </div>
            </div>

            {/* Posts */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {(filtered || []).map((post) => {
                  const statusCfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.open;
                  return (
                    <Card key={post.id} className="hover:shadow-sm transition-shadow" data-testid={`card-post-${post.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="w-8 h-8 flex-shrink-0">
                              <AvatarImage src={post.author.avatar || undefined} />
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {post.author.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{post.author.name}</p>
                              <p className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</p>
                            </div>
                          </div>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${statusCfg.className}`}>
                            {statusCfg.label}
                          </span>
                        </div>

                        <h3 className="font-semibold text-sm mb-2 leading-snug">{post.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MessageSquare className="w-4 h-4" />
                            <span>{post.commentCount} Comments</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {post.platform && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                {post.platform === "Android App" ? <Smartphone className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                                {post.platform}
                              </span>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {post.category}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {(!filtered || filtered.length === 0) && (
                  <div className="text-center py-16 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No posts found.</p>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
