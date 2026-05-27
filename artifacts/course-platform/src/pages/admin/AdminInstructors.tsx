import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  useListInstructors, useListCourses, useCreateInstructor, useDeleteInstructor,
  getListInstructorsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, BookOpen, Trash2, Loader2 } from "lucide-react";

export default function AdminInstructors() {
  const { data: instructors, isLoading } = useListInstructors();
  const { data: courses } = useListCourses();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", title: "", bio: "", avatar: "" });

  const invalidate = () => qc.invalidateQueries({ queryKey: getListInstructorsQueryKey() });

  const createMut = useCreateInstructor({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Instructor added", description: `${form.name} is now on the team.` });
        setOpen(false);
        setForm({ name: "", title: "", bio: "", avatar: "" });
      },
      onError: (e: any) => toast({ title: "Failed to add instructor", description: e?.message ?? "Try again", variant: "destructive" }),
    },
  });

  const deleteMut = useDeleteInstructor({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Instructor removed" }); setDeleteId(null); },
      onError: (e: any) => toast({ title: "Cannot delete", description: e?.message ?? "Instructor may have active courses", variant: "destructive" }),
    },
  });

  const courseCount = (id: number) => (courses ?? []).filter((c) => c.instructor.id === id).length;

  const submit = () => {
    if (!form.name || !form.title) {
      toast({ title: "Name and title are required", variant: "destructive" });
      return;
    }
    createMut.mutate({
      data: {
        name: form.name,
        title: form.title,
        bio: form.bio || undefined,
        avatar: form.avatar || undefined,
      },
    });
  };

  return (
    <AdminLayout
      title="Instructors"
      subtitle={`${instructors?.length ?? 0} instructors teaching across the platform`}
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-new-instructor">
              <Plus className="w-4 h-4" /> Add instructor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add new instructor</DialogTitle>
              <DialogDescription>Instructors can be assigned to courses after creation.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="n">Name *</Label>
                <Input id="n" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" data-testid="input-instructor-name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="t">Title *</Label>
                <Input id="t" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Senior Software Engineer" data-testid="input-instructor-title" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="a">Avatar URL</Label>
                <Input id="a" value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} placeholder="https://..." data-testid="input-instructor-avatar" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="b">Bio</Label>
                <Textarea id="b" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Short bio..." data-testid="input-instructor-bio" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={createMut.isPending} data-testid="button-save-instructor">
                {createMut.isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                Add instructor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading instructors...</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {instructors?.map((i) => (
            <Card key={i.id} className="overflow-hidden hover:shadow-md transition-shadow" data-testid={`instructor-${i.id}`}>
              <div className="h-20 bg-gradient-to-br from-primary/20 via-primary/10 to-violet-500/10" />
              <CardContent className="p-5 -mt-10">
                <Avatar className="w-16 h-16 ring-4 ring-card mb-3">
                  <AvatarImage src={i.avatar} />
                  <AvatarFallback>{i.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <p className="font-semibold text-sm">{i.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{i.title}</p>
                {i.bio && <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">{i.bio}</p>}

                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <BookOpen className="w-3 h-3" /> {courseCount(i.id)} courses
                  </Badge>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline" size="sm"
                    className="flex-1 h-8 text-xs gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteId(i.id)}
                    data-testid={`button-delete-${i.id}`}
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this instructor?</AlertDialogTitle>
            <AlertDialogDescription>If they're currently assigned to any courses, the deletion will fail. Reassign their courses first.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMut.mutate({ id: deleteId })}
              className="bg-red-600 hover:bg-red-700"
            >Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
