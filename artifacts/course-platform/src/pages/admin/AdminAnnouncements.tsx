import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  useListAnnouncements, useCreateAnnouncement, useDeleteAnnouncement,
  getListAnnouncementsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Plus, Megaphone, Trash2, Loader2, Clock } from "lucide-react";

export default function AdminAnnouncements() {
  const { data: announcements, isLoading } = useListAnnouncements();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", content: "" });

  const invalidate = () => qc.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() });

  const createMut = useCreateAnnouncement({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Announcement posted", description: "Students will see it on their dashboard." });
        setOpen(false);
        setForm({ title: "", content: "" });
      },
      onError: (e: any) => toast({ title: "Failed to post", description: e?.message ?? "Try again", variant: "destructive" }),
    },
  });

  const deleteMut = useDeleteAnnouncement({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Announcement deleted" }); setDeleteId(null); },
      onError: (e: any) => toast({ title: "Failed to delete", description: e?.message ?? "Try again", variant: "destructive" }),
    },
  });

  const submit = () => {
    if (!form.title || !form.content) {
      toast({ title: "Title and content are required", variant: "destructive" });
      return;
    }
    createMut.mutate({ data: { title: form.title, content: form.content } });
  };

  return (
    <AdminLayout
      title="Announcements"
      subtitle={`${announcements?.length ?? 0} active announcements visible to students`}
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-new-announcement">
              <Plus className="w-4 h-4" /> New announcement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Post a new announcement</DialogTitle>
              <DialogDescription>This will appear on every student's dashboard immediately.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. New course launching next week" data-testid="input-announcement-title" />
              </div>
              <div className="grid gap-2">
                <Label>Content *</Label>
                <Textarea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Write your message..." data-testid="input-announcement-content" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={createMut.isPending} data-testid="button-save-announcement">
                {createMut.isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                Post
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading...</div>
      ) : announcements?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Megaphone className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-medium">No announcements yet</p>
            <p className="text-sm text-muted-foreground mt-1">Post your first announcement to reach all students.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {announcements?.map((a) => (
            <Card key={a.id} data-testid={`announcement-${a.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{a.title}</p>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed whitespace-pre-wrap">{a.content}</p>
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(a.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <Button
                    size="icon" variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                    onClick={() => setDeleteId(a.id)}
                    data-testid={`button-delete-announcement-${a.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
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
            <AlertDialogTitle>Delete this announcement?</AlertDialogTitle>
            <AlertDialogDescription>It will be removed from all student dashboards.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMut.mutate({ id: deleteId })}
              className="bg-red-600 hover:bg-red-700"
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
