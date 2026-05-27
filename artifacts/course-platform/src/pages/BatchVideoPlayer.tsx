import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetMyBatchClasses, getGetMyBatchClassesQueryKey,
  useGetMyBatches, getGetMyBatchesQueryKey,
  useGetMyBatchStats, getGetMyBatchStatsQueryKey,
  useMarkBatchClassWatched,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Search, ChevronDown, ChevronUp, PlayCircle, CheckCircle2, Lock, CalendarClock } from "lucide-react";

type VideoEntry = { title: string; url: string };
type BClass = {
  id: number; batchId: number; weekName?: string | null; moduleName?: string | null;
  title: string; videoUrl?: string | null; videoUrls?: VideoEntry[] | null; isPublished: boolean; isLocked?: boolean; createdAt: string;
  description?: string | null; scheduledAt?: string | null;
};

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let vid: string | null = null;
    if (u.hostname === "youtu.be") {
      vid = u.pathname.slice(1).split("?")[0];
    } else if (u.hostname.includes("youtube.com")) {
      if (u.pathname.includes("/embed/")) {
        vid = u.pathname.split("/embed/")[1]?.split("?")[0] ?? null;
      } else if (u.pathname.includes("/shorts/")) {
        vid = u.pathname.split("/shorts/")[1]?.split("?")[0] ?? null;
      } else {
        vid = u.searchParams.get("v");
      }
    }
    if (!vid) return null;
    return `https://www.youtube.com/embed/${vid}?autoplay=1&rel=0&modestbranding=1`;
  } catch {
    return null;
  }
}

type TreeWeek = { name: string; modules: TreeModule[] };
type TreeModule = { name: string; classes: BClass[] };

function buildTree(classes: BClass[]): TreeWeek[] {
  const weekMap = new Map<string, Map<string, BClass[]>>();
  for (const c of classes) {
    const w = c.weekName ?? "General";
    const m = c.moduleName ?? "General";
    if (!weekMap.has(w)) weekMap.set(w, new Map());
    const mMap = weekMap.get(w)!;
    if (!mMap.has(m)) mMap.set(m, []);
    mMap.get(m)!.push(c);
  }
  return Array.from(weekMap.entries()).map(([wName, mMap]) => ({
    name: wName,
    modules: Array.from(mMap.entries()).map(([mName, cls]) => ({ name: mName, classes: cls })),
  }));
}

export default function BatchVideoPlayer() {
  const params = useParams<{ batchId: string; classId: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const batchId = parseInt(params.batchId ?? "0", 10);
  const classId = parseInt(params.classId ?? "0", 10);

  const { data: classes, isLoading } = useGetMyBatchClasses(batchId, {
    query: { queryKey: getGetMyBatchClassesQueryKey(batchId) },
  });
  const { data: batches } = useGetMyBatches({
    query: { queryKey: getGetMyBatchesQueryKey() },
  });
  const { data: stats } = useGetMyBatchStats(batchId, {
    query: { queryKey: getGetMyBatchStatsQueryKey(batchId) },
  });
  const watchMutation = useMarkBatchClassWatched();

  const watchedIds = useMemo(() => new Set(stats?.watchedClassIds ?? []), [stats?.watchedClassIds]);

  // Auto-redirect to first unwatched class (or first class) when classId=0 or not found
  useEffect(() => {
    if (!isLoading && classes && classes.length > 0 && (classId === 0 || !classes.find((c) => c.id === classId))) {
      const firstUnwatched = classes.find((c) => !watchedIds.has(c.id));
      const target = firstUnwatched ?? classes[0];
      navigate(`/my-classes/watch/${batchId}/${target.id}`);
    }
  }, [isLoading, classes, classId, batchId, navigate, watchedIds]);

  // Mark the current class as watched when it's opened
  const markedRef = useRef<number | null>(null);
  useEffect(() => {
    if (classId && classId !== 0 && !watchedIds.has(classId) && markedRef.current !== classId) {
      markedRef.current = classId;
      watchMutation.mutate(
        { id: batchId, classId, data: { durationMinutes: 0 } },
        {
          onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: getGetMyBatchStatsQueryKey(batchId) });
          },
        }
      );
    }
  }, [classId, batchId, watchedIds, watchMutation, queryClient]);

  const batch = batches?.find((b) => b.id === batchId);
  const current = classes?.find((c) => c.id === classId);
  const idx = classes?.findIndex((c) => c.id === classId) ?? -1;
  const prev = idx > 0 ? classes![idx - 1] : null;
  const next = idx >= 0 && classes && idx < classes.length - 1 ? classes[idx + 1] : null;

  const [search, setSearch] = useState("");
  const [closedWeeks, setClosedWeeks] = useState<Set<string>>(new Set());
  const [closedModules, setClosedModules] = useState<Set<string>>(new Set());
  const [videoIdx, setVideoIdx] = useState(0);

  const tree = useMemo(() => buildTree((classes ?? []) as BClass[]), [classes]);

  const filtered = useMemo(() => {
    if (!search.trim()) return tree;
    const q = search.toLowerCase();
    return tree.map((w) => ({
      ...w,
      modules: w.modules.map((m) => ({
        ...m,
        classes: m.classes.filter((c) => c.title.toLowerCase().includes(q)),
      })).filter((m) => m.classes.length > 0),
    })).filter((w) => w.modules.length > 0);
  }, [tree, search]);

  const toggleWeek = (name: string) => {
    setClosedWeeks((prev) => {
      const s = new Set(prev);
      s.has(name) ? s.delete(name) : s.add(name);
      return s;
    });
  };
  const toggleModule = (key: string) => {
    setClosedModules((prev) => {
      const s = new Set(prev);
      s.has(key) ? s.delete(key) : s.add(key);
      return s;
    });
  };

  useEffect(() => { setVideoIdx(0); }, [classId]);

  const getVideos = (cls: BClass): VideoEntry[] => {
    if (cls.videoUrls && cls.videoUrls.length > 0) return cls.videoUrls;
    if (cls.videoUrl) return [{ title: cls.title, url: cls.videoUrl }];
    return [];
  };

  const currentVideos = current ? getVideos(current) : [];
  const activeVideo = currentVideos[videoIdx] ?? null;

  const goTo = (id: number, vi = 0) => { navigate(`/my-classes/watch/${batchId}/${id}`); setVideoIdx(vi); };
  const embedUrl = activeVideo?.url ? getYoutubeEmbedUrl(activeVideo.url) : null;

  const watchedCount = stats?.watchedCount ?? 0;
  const totalCount = stats?.totalCount ?? 0;

  return (
    <div className="flex flex-col h-screen bg-[#0f1117] text-white">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0 bg-[#1a1d27]">
        <Button
          variant="ghost" size="sm"
          className="text-white/70 hover:text-white hover:bg-white/10 gap-1.5"
          onClick={() => navigate("/my-classes")}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="w-px h-5 bg-white/20" />
        <p className="text-sm font-semibold truncate">{batch?.name ?? "Course"}</p>
        {current && (
          <>
            <div className="w-px h-5 bg-white/20" />
            <p className="text-xs text-white/50 truncate">{current.title}</p>
          </>
        )}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-white/60 tabular-nums">
            {watchedCount} / {totalCount} watched
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 shrink-0 bg-[#1a1d27] border-r border-white/10 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-white/10 shrink-0">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Course Content</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search lesson..."
                className="pl-8 h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary/50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {isLoading && (
              <div className="space-y-2 p-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full bg-white/10" />)}
              </div>
            )}

            {filtered.map((week) => {
              const weekOpen = !closedWeeks.has(week.name);
              const weekVisibleClasses = week.modules.flatMap((m) => m.classes.filter((c) => !c.isLocked && getVideos(c).length > 0));
              if (weekVisibleClasses.length === 0) return null;
              const totalVideos = weekVisibleClasses.reduce((s, c) => s + getVideos(c).length, 0);
              const watchedInWeek = weekVisibleClasses.filter((c) => watchedIds.has(c.id)).length;
              const totalInWeek = weekVisibleClasses.length;
              return (
                <div key={week.name}>
                  {/* Week header */}
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
                    onClick={() => toggleWeek(week.name)}
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{week.name}</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {watchedInWeek}/{totalInWeek} watched · {totalVideos} lessons
                      </p>
                    </div>
                    {weekOpen ? <ChevronUp className="w-4 h-4 text-white/40 shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />}
                  </button>

                  {weekOpen && week.modules.map((mod) => {
                    const modKey = `${week.name}::${mod.name}`;
                    const modOpen = !closedModules.has(modKey);
                    const visibleClasses = mod.classes.filter((c) => !c.isLocked && getVideos(c).length > 0);
                    if (visibleClasses.length === 0) return null;
                    const modVideoCount = visibleClasses.reduce((s, c) => s + getVideos(c).length, 0);
                    return (
                      <div key={modKey}>
                        {/* Module/Class header */}
                        <button
                          className="w-full flex items-center justify-between pl-6 pr-4 py-2.5 text-left hover:bg-white/5 transition-colors bg-white/[0.02]"
                          onClick={() => toggleModule(modKey)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white/80 truncate">{mod.name}</p>
                            <p className="text-[10px] text-white/40">{modVideoCount} {modVideoCount === 1 ? "video" : "videos"}</p>
                          </div>
                          {modOpen ? <ChevronUp className="w-3 h-3 text-white/30 shrink-0 ml-2" /> : <ChevronDown className="w-3 h-3 text-white/30 shrink-0 ml-2" />}
                        </button>

                        {/* Video list */}
                        {modOpen && mod.classes.map((cls) => {
                          const videos = getVideos(cls);
                          const isWatched = watchedIds.has(cls.id);
                          const isLocked = cls.isLocked === true;

                          // Locked (upcoming) module row
                          if (isLocked) {
                            const scheduledDate = cls.scheduledAt ? new Date(cls.scheduledAt) : null;
                            return (
                              <div
                                key={cls.id}
                                className="w-full flex items-start gap-3 pl-8 pr-4 py-2.5 border-l-2 border-transparent opacity-60 cursor-not-allowed"
                              >
                                <Lock className="w-3.5 h-3.5 text-amber-400/70 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-white/40 truncate">{cls.title}</p>
                                  {scheduledDate && (
                                    <p className="text-[10px] text-amber-400/60 mt-0.5 flex items-center gap-1">
                                      <CalendarClock className="w-2.5 h-2.5 shrink-0" />
                                      {scheduledDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                      {" · "}
                                      {scheduledDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          if (videos.length === 0) {
                            return null;
                          }
                          return videos.map((v, vi) => {
                            const isActive = cls.id === classId && videoIdx === vi;
                            return (
                              <button
                                key={`${cls.id}-${vi}`}
                                className={`w-full flex items-center gap-3 pl-8 pr-4 py-2.5 text-left transition-colors ${isActive ? "bg-primary/20 border-l-2 border-primary" : "hover:bg-white/5 border-l-2 border-transparent"}`}
                                onClick={() => goTo(cls.id, vi)}
                              >
                                {isActive
                                  ? <PlayCircle className="w-4 h-4 text-primary shrink-0" />
                                  : isWatched
                                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    : <CheckCircle2 className="w-4 h-4 text-white/20 shrink-0" />
                                }
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs truncate ${isActive ? "text-primary font-medium" : isWatched ? "text-white/50" : "text-white/70"}`}>
                                    {v.title || cls.title}
                                  </p>
                                </div>
                                {isWatched && !isActive && (
                                  <span className="text-[9px] text-emerald-400 font-medium shrink-0">Done</span>
                                )}
                              </button>
                            );
                          });
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {!isLoading && filtered.length === 0 && (
              <p className="text-center text-white/30 text-xs py-10">No lessons found</p>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#0f1117]">
          {/* Video area */}
          <div className="flex-1 flex items-center justify-center bg-black overflow-hidden relative">
            {!current && !isLoading && (
              <p className="text-white/30 text-sm">Select a lesson from the sidebar</p>
            )}
            {isLoading && <Skeleton className="w-full h-full bg-white/5" />}
            {current && (
              embedUrl
                ? (
                  <div className="relative w-full h-full" style={{ isolation: "isolate" }}>
                    <iframe
                      key={embedUrl}
                      src={embedUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      title={activeVideo?.title ?? "Video"}
                    />
                    {/* Screen recording protection overlay */}
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: 0,
                        mixBlendMode: "difference",
                        background: "rgb(1,1,1)",
                        pointerEvents: "none",
                        zIndex: 10,
                        willChange: "transform",
                      }}
                    />
                  </div>
                )
                : activeVideo?.url
                  ? (
                    <div className="relative w-full h-full" style={{ isolation: "isolate" }}>
                      <video
                        key={activeVideo.url}
                        src={activeVideo.url}
                        controls
                        controlsList="nodownload"
                        disablePictureInPicture
                        className="w-full h-full"
                        preload="metadata"
                        autoPlay
                        onContextMenu={(e) => e.preventDefault()}
                      />
                      {/* Screen recording protection overlay */}
                      <div
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          inset: 0,
                          mixBlendMode: "difference",
                          background: "rgb(1,1,1)",
                          pointerEvents: "none",
                          zIndex: 10,
                          willChange: "transform",
                        }}
                      />
                    </div>
                  )
                  : <div className="flex flex-col items-center gap-3 text-white/40">
                      <PlayCircle className="w-16 h-16" />
                      <p className="text-sm">No video available for this lesson</p>
                    </div>
            )}
          </div>

          {/* Bottom bar */}
          <div className="shrink-0 border-t border-white/10 bg-[#1a1d27] px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {current && (
                <>
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    {current.moduleName && (
                      <Badge variant="outline" className="text-[10px] border-white/20 text-white/50 bg-transparent">
                        {current.moduleName}
                      </Badge>
                    )}
                    {watchedIds.has(current.id) && (
                      <Badge className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Watched
                      </Badge>
                    )}
                  </div>
                  <p className="text-base font-semibold text-white truncate">
                    {activeVideo?.title || current.title}
                  </p>
                  {currentVideos.length > 1 && (
                    <p className="text-xs text-white/40 mt-0.5">{videoIdx + 1} / {currentVideos.length} videos in {current.moduleName || current.title}</p>
                  )}
                  {current.description && !currentVideos.length && (
                    <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{current.description}</p>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                disabled={!prev}
                onClick={() => prev && goTo(prev.id)}
                className="border-white/20 text-white bg-transparent hover:bg-white/10 gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
              <Button
                size="sm"
                disabled={!next}
                onClick={() => next && goTo(next.id)}
                className="gap-1.5"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
