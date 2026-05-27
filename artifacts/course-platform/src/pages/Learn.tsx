import { useState } from "react";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  useGetCourse, getGetCourseQueryKey,
  useGetEnrollment, getGetEnrollmentQueryKey,
  useCompleteLesson,
  useGetLesson, getGetLessonQueryKey
} from "@workspace/api-client-react";
import { PlayCircle, CheckCircle2, ChevronLeft, ChevronRight, Menu, Bookmark, AlertTriangle } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useQueryClient } from "@tanstack/react-query";

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
    return `https://www.youtube.com/embed/${vid}?rel=0&modestbranding=1`;
  } catch {
    return null;
  }
}

export default function Learn() {
  const params = useParams();
  const courseId = parseInt(params.courseId || "0", 10);
  const lessonId = parseInt(params.lessonId || "0", 10);
  const queryClient = useQueryClient();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: course, isLoading: courseLoading } = useGetCourse(courseId, { 
    query: { enabled: !!courseId, queryKey: getGetCourseQueryKey(courseId) } 
  });
  
  const { data: enrollment } = useGetEnrollment(courseId, {
    query: { enabled: !!courseId, queryKey: getGetEnrollmentQueryKey(courseId) }
  });

  const { data: lesson, isLoading: lessonLoading } = useGetLesson(lessonId, {
    query: { enabled: !!lessonId, queryKey: getGetLessonQueryKey(lessonId) }
  });

  const completeLessonMutation = useCompleteLesson();

  const handleComplete = () => {
    if (!lesson) return;
    completeLessonMutation.mutate({ id: lessonId }, {
      onSuccess: () => {
        // Optimistically update
        queryClient.invalidateQueries({ queryKey: getGetCourseQueryKey(courseId) });
        queryClient.invalidateQueries({ queryKey: getGetEnrollmentQueryKey(courseId) });
        queryClient.invalidateQueries({ queryKey: getGetLessonQueryKey(lessonId) });
      }
    });
  };

  if (courseLoading || lessonLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-background"><Skeleton className="h-[400px] w-[800px] rounded-xl" /></div>;
  }

  if (!course || !lesson) {
    return <div className="h-screen flex items-center justify-center">Lesson not found</div>;
  }

  // Find next/prev lessons
  let prevLessonId: number | null = null;
  let nextLessonId: number | null = null;
  
  const flatLessons = course.modules.flatMap(m => m.lessons || []);
  const currentIndex = flatLessons.findIndex(l => l.id === lessonId);
  
  if (currentIndex > 0) prevLessonId = flatLessons[currentIndex - 1].id;
  if (currentIndex < flatLessons.length - 1) nextLessonId = flatLessons[currentIndex + 1].id;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card border-r">
      <div className="p-4 border-b">
        <Link href="/my-classes" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Classes
        </Link>
        <h2 className="font-bold text-lg mb-2">{course.title}</h2>
        <div className="flex items-center gap-3">
          <Progress value={enrollment?.progress || 0} className="h-2 flex-1" />
          <span className="text-xs font-medium">{enrollment?.progress || 0}%</span>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2">
          <Accordion type="multiple" defaultValue={course.modules.map(m => `m-${m.id}`)}>
            {course.modules.map((module) => (
              <AccordionItem key={module.id} value={`m-${module.id}`} className="border-b-0">
                <AccordionTrigger className="hover:no-underline py-3 px-2 text-sm font-semibold">
                  <div className="flex flex-col items-start">
                    <span className="text-xs text-muted-foreground font-normal">Week {module.weekNumber}</span>
                    <span>{module.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div className="flex flex-col gap-1">
                    {module.lessons?.map((l) => {
                      const isActive = l.id === lessonId;
                      return (
                        <Link 
                          key={l.id} 
                          href={`/learn/${course.id}/${l.id}`}
                          className={`flex items-start gap-3 p-2 rounded-md text-sm transition-colors ${
                            isActive 
                              ? 'bg-primary/10 text-primary font-medium' 
                              : 'hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          <div className="mt-0.5">
                            {l.isCompleted ? (
                              <CheckCircle2 className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-green-500'}`} />
                            ) : (
                              <PlayCircle className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                            )}
                          </div>
                          <div className="flex-1 leading-tight">
                            {l.title}
                            <div className="text-xs mt-1 opacity-70">{l.duration}</div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-80 shrink-0">
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 border-b flex items-center justify-between px-4 lg:px-8 bg-card shrink-0">
          <div className="flex items-center gap-4">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <h1 className="font-semibold truncate hidden sm:block">{lesson.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              <Bookmark className="w-4 h-4 mr-2" /> Bookmark
            </Button>
            {lesson.isCompleted ? (
              <Button variant="secondary" size="sm" className="text-green-500 font-medium">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Completed
              </Button>
            ) : (
              <Button 
                size="sm" 
                onClick={handleComplete} 
                disabled={completeLessonMutation.isPending}
              >
                Mark Complete
              </Button>
            )}
          </div>
        </header>

        {/* Video Area */}
        <ScrollArea className="flex-1">
          <div className="max-w-5xl mx-auto p-4 lg:p-8">
            <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl mb-8 border border-border/50">
              {lesson.videoUrl && getYoutubeEmbedUrl(lesson.videoUrl) ? (
                <iframe
                  key={lesson.videoUrl}
                  src={getYoutubeEmbedUrl(lesson.videoUrl)!}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  title={lesson.title}
                />
              ) : lesson.videoUrl ? (
                <video
                  key={lesson.videoUrl}
                  src={lesson.videoUrl}
                  controls
                  controlsList="nodownload"
                  className="w-full h-full"
                  preload="metadata"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
                  <PlayCircle className="w-16 h-16 mb-3 opacity-40" />
                  <p className="font-medium text-sm">এই লেসনে কোনো ভিডিও নেই</p>
                </div>
              )}
            </div>

            <div className="mb-12">
              <h2 className="text-3xl font-bold mb-4">{lesson.title}</h2>
              <div className="prose dark:prose-invert max-w-none text-muted-foreground">
                <p>In this lesson, we will cover the fundamental concepts related to {lesson.title.toLowerCase()}. Make sure to follow along with the coding exercises.</p>
                <p>Resources mentioned in this video:</p>
                <ul>
                  <li><a href="#" className="text-primary hover:underline">Official Documentation</a></li>
                  <li><a href="#" className="text-primary hover:underline">Source Code Repository</a></li>
                </ul>
              </div>
            </div>

            {/* Copyright Warning */}
            <div className="bg-muted/50 border rounded-lg p-4 flex items-start gap-4 mb-12">
              <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <strong className="text-foreground block mb-1">Copyright Notice</strong>
                Downloading or distributing this content without permission is strictly prohibited and may result in account termination.
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between border-t pt-8 pb-16">
              {prevLessonId ? (
                <Link href={`/learn/${course.id}/${prevLessonId}`}>
                  <Button variant="outline" size="lg">
                    <ChevronLeft className="w-4 h-4 mr-2" /> Previous Lesson
                  </Button>
                </Link>
              ) : (
                <div />
              )}
              
              {nextLessonId && (
                <Link href={`/learn/${course.id}/${nextLessonId}`}>
                  <Button size="lg">
                    Next Lesson <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
