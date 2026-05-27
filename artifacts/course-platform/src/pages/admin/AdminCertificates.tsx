import { useState, useRef, useCallback, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Save, ImageIcon, Move } from "lucide-react";

type Batch = { id: number; name: string; status: string };
type CertConfig = {
  id: number; batchId: number;
  backgroundDataUrl: string | null;
  fontFamily: string; fontColor: string; fontSize: number;
  minMarksPercent: number;
  nameX: string; nameY: string; nameWidth: string; nameHeight: string;
};


async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  if (r.status === 204) return undefined as T;
  return r.json() as Promise<T>;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type NameBox = { x: number; y: number; w: number; h: number };

type DragState = {
  type: "move" | "resize-br" | "resize-bl" | "resize-tr" | "resize-tl";
  startMouseX: number; startMouseY: number;
  startBox: NameBox;
};

export default function AdminCertificates() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [bg, setBg] = useState<string | null>(null);
  const [fontFamily, setFontFamily] = useState("Georgia");
  const [fontColor, setFontColor] = useState("#1a1a2e");
  const [fontSize, setFontSize] = useState(48);
  const [minMarks, setMinMarks] = useState(0);
  const [nameBox, setNameBox] = useState<NameBox>({ x: 0.25, y: 0.55, w: 0.5, h: 0.12 });
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [previewName, setPreviewName] = useState("Student Name");

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  // Dynamically load Google Font when fontFamily changes
  useEffect(() => {
    if (!fontFamily.trim()) return;
    const id = setTimeout(() => {
      const family = fontFamily.replace(/ /g, "+");
      const linkId = "gf-admin-cert-font";
      const existing = document.getElementById(linkId);
      if (existing) existing.remove();
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;700&display=swap`;
      document.head.appendChild(link);
    }, 500);
    return () => clearTimeout(id);
  }, [fontFamily]);

  const { data: batches = [] } = useQuery<Batch[]>({
    queryKey: ["admin", "batches-list"],
    queryFn: () => apiFetch<Batch[]>("/api/admin/batches"),
  });

  const { data: certConfig, isLoading: certLoading } = useQuery<CertConfig | null>({
    queryKey: ["admin", "certificate", selectedBatchId],
    queryFn: () => apiFetch<CertConfig | null>(`/api/admin/batches/${selectedBatchId}/certificate`),
    enabled: !!selectedBatchId,
  });

  useEffect(() => {
    if (certConfig) {
      setBg(certConfig.backgroundDataUrl ?? null);
      setFontFamily(certConfig.fontFamily);
      setFontColor(certConfig.fontColor);
      setFontSize(certConfig.fontSize);
      setMinMarks(certConfig.minMarksPercent);
      setNameBox({
        x: parseFloat(certConfig.nameX),
        y: parseFloat(certConfig.nameY),
        w: parseFloat(certConfig.nameWidth),
        h: parseFloat(certConfig.nameHeight),
      });
    } else if (certConfig === null) {
      setBg(null);
      setFontFamily("Georgia");
      setFontColor("#1a1a2e");
      setFontSize(48);
      setMinMarks(0);
      setNameBox({ x: 0.25, y: 0.55, w: 0.5, h: 0.12 });
    }
  }, [certConfig]);

  const saveMutation = useMutation({
    mutationFn: (payload: object) =>
      apiFetch(`/api/admin/batches/${selectedBatchId}/certificate`, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "certificate", selectedBatchId] });
      toast({ title: "Certificate saved" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const handleSave = () => {
    saveMutation.mutate({
      backgroundDataUrl: bg,
      fontFamily, fontColor, fontSize, minMarksPercent: minMarks,
      nameX: nameBox.x, nameY: nameBox.y, nameWidth: nameBox.w, nameHeight: nameBox.h,
    });
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      toast({ variant: "destructive", title: "Only JPG and PNG images are supported as background" });
      return;
    }
    setUploadingBg(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setBg(dataUrl);
    } catch {
      toast({ variant: "destructive", title: "Failed to read file" });
    } finally {
      setUploadingBg(false);
    }
    e.target.value = "";
  };

  const getContainerRect = useCallback(() => containerRef.current?.getBoundingClientRect() ?? null, []);

  const onMouseDown = useCallback((e: React.MouseEvent, type: DragState["type"]) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { type, startMouseX: e.clientX, startMouseY: e.clientY, startBox: { ...nameBox } };
    setIsDragging(true);
  }, [nameBox]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const rect = getContainerRect();
      if (!rect) return;
      const dx = (e.clientX - d.startMouseX) / rect.width;
      const dy = (e.clientY - d.startMouseY) / rect.height;
      setNameBox((prev) => {
        const b = { ...d.startBox };
        const MIN_W = 0.05; const MIN_H = 0.04;
        if (d.type === "move") {
          b.x = Math.max(0, Math.min(1 - b.w, b.x + dx));
          b.y = Math.max(0, Math.min(1 - b.h, b.y + dy));
        } else if (d.type === "resize-br") {
          b.w = Math.max(MIN_W, Math.min(1 - b.x, b.w + dx));
          b.h = Math.max(MIN_H, Math.min(1 - b.y, b.h + dy));
        } else if (d.type === "resize-bl") {
          const newW = Math.max(MIN_W, b.w - dx);
          b.x = b.x + b.w - newW;
          b.w = newW;
          b.h = Math.max(MIN_H, Math.min(1 - b.y, b.h + dy));
        } else if (d.type === "resize-tr") {
          b.w = Math.max(MIN_W, Math.min(1 - b.x, b.w + dx));
          const newH = Math.max(MIN_H, b.h - dy);
          b.y = b.y + b.h - newH;
          b.h = newH;
        } else if (d.type === "resize-tl") {
          const newW = Math.max(MIN_W, b.w - dx);
          b.x = b.x + b.w - newW;
          b.w = newW;
          const newH = Math.max(MIN_H, b.h - dy);
          b.y = b.y + b.h - newH;
          b.h = newH;
        }
        return b;
      });
    };
    const onUp = () => { setIsDragging(false); dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [isDragging, getContainerRect]);

  const HANDLE = "w-3 h-3 bg-blue-500 border-2 border-white rounded-full absolute shadow";

  return (
    <AdminLayout title="Certificates" subtitle="Design batch certificates and set eligibility rules">
      <div className="space-y-5">

        {/* Batch selector */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Label className="text-sm font-medium text-muted-foreground shrink-0">Select Batch</Label>
              <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Choose a batch..." />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBatchId && (
                <Badge variant="outline" className="capitalize">
                  {batches.find((b) => String(b.id) === selectedBatchId)?.status}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {!selectedBatchId && (
          <Card>
            <CardContent className="py-20 text-center">
              <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Select a batch to configure its certificate</p>
            </CardContent>
          </Card>
        )}

        {selectedBatchId && certLoading && (
          <Card><CardContent className="py-20 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></CardContent></Card>
        )}

        {selectedBatchId && !certLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

            {/* LEFT: Preview */}
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Certificate Preview — drag the box to position the name</p>

                {/* Upload area */}
                {!bg ? (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/30 rounded-xl py-16 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                    <Upload className="w-8 h-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload background image</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">JPG or PNG</p>
                    <input type="file" className="hidden" accept=".jpg,.jpeg,.png" onChange={handleBgUpload} />
                    {uploadingBg && <Loader2 className="w-4 h-4 animate-spin mt-2 text-primary" />}
                  </label>
                ) : (
                  <div className="space-y-2">
                    {/* Preview with draggable name box */}
                    <div
                      ref={containerRef}
                      className="relative select-none overflow-hidden rounded-lg border border-border"
                      style={{ cursor: isDragging ? "grabbing" : "default" }}
                    >
                      <img
                        src={bg}
                        alt="Certificate background"
                        className="w-full block pointer-events-none"
                        draggable={false}
                      />

                      {/* Draggable name box */}
                      <div
                        className="absolute"
                        style={{
                          left: `${nameBox.x * 100}%`,
                          top: `${nameBox.y * 100}%`,
                          width: `${nameBox.w * 100}%`,
                          height: `${nameBox.h * 100}%`,
                          border: "2px dashed #3b82f6",
                          background: "rgba(59,130,246,0.06)",
                          borderRadius: 4,
                          boxSizing: "border-box",
                        }}
                      >
                        {/* Move handle (center) */}
                        <div
                          className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing"
                          onMouseDown={(e) => onMouseDown(e, "move")}
                        >
                          <span
                            style={{
                              fontFamily,
                              color: fontColor,
                              fontSize: `clamp(8px, ${fontSize * (nameBox.w / 0.5) * 0.6}px, 48px)`,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "100%",
                              userSelect: "none",
                              pointerEvents: "none",
                              display: "block",
                              textAlign: "center",
                              lineHeight: 1.2,
                            }}
                          >
                            {previewName}
                          </span>
                        </div>

                        {/* Resize handles */}
                        <div className={`${HANDLE} top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize`} onMouseDown={(e) => onMouseDown(e, "resize-tl")} />
                        <div className={`${HANDLE} top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize`} onMouseDown={(e) => onMouseDown(e, "resize-tr")} />
                        <div className={`${HANDLE} bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize`} onMouseDown={(e) => onMouseDown(e, "resize-bl")} />
                        <div className={`${HANDLE} bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize`} onMouseDown={(e) => onMouseDown(e, "resize-br")} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Move className="w-3 h-3" /> Drag center to move · Drag corners to resize</span>
                      <button
                        className="text-destructive hover:underline text-xs"
                        onClick={() => setBg(null)}
                      >
                        Remove image
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* RIGHT: Settings */}
            <div className="space-y-4">
              {/* Upload button (when bg exists) */}
              {bg && (
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Background Image</Label>
                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm text-muted-foreground">
                      <Upload className="w-4 h-4 shrink-0" />
                      Replace image
                      <input type="file" className="hidden" accept=".jpg,.jpeg,.png" onChange={handleBgUpload} />
                    </label>
                  </CardContent>
                </Card>
              )}

              {/* Font settings */}
              <Card>
                <CardContent className="pt-4 pb-4 space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name Text Style</p>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Font Family</Label>
                    <Input
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      placeholder="e.g. Georgia, Arial, Verdana…"
                      style={{ fontFamily }}
                    />
                    <p className="text-xs text-muted-foreground">Type any font name installed on the system</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Font Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={fontColor}
                        onChange={(e) => setFontColor(e.target.value)}
                        className="w-10 h-9 rounded border border-input cursor-pointer p-0.5"
                      />
                      <Input
                        value={fontColor}
                        onChange={(e) => setFontColor(e.target.value)}
                        className="flex-1 font-mono text-sm"
                        maxLength={7}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Font Size</Label>
                      <span className="text-sm font-mono text-muted-foreground">{fontSize}px</span>
                    </div>
                    <input
                      type="range" min={12} max={96} step={2}
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Preview Name</Label>
                    <Input
                      value={previewName}
                      onChange={(e) => setPreviewName(e.target.value || "Student Name")}
                      placeholder="Type a name to preview..."
                    />
                    <div
                      className="text-center py-2 rounded border border-dashed border-muted-foreground/20 overflow-hidden"
                      style={{ fontFamily, color: fontColor, fontSize: `clamp(10px, ${fontSize * 0.5}px, 48px)` }}
                    >
                      {previewName}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Eligibility */}
              <Card>
                <CardContent className="pt-4 pb-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Eligibility</p>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Minimum Marks (%)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min={0} max={100}
                        value={minMarks}
                        onChange={(e) => setMinMarks(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">% required to download</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Certificate also requires the batch to have ended.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Save */}
              <Button
                className="w-full gap-2"
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Certificate
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
