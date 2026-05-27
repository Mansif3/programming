import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  useGetCurrentUser, getGetCurrentUserQueryKey, useUpdateCurrentUser,
  useRequestUploadUrl, useListDevices, getListDevicesQueryKey, useRemoveDevice,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  User, MapPin, GraduationCap, Link as LinkIcon, Award, Loader2, LogOut, ShieldCheck, Camera, Info,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const NAV_ITEMS = [
  { key: "personal", label: "Personal Information", icon: User },
  { key: "address", label: "Address", icon: MapPin },
  { key: "education", label: "Education", icon: GraduationCap },
  { key: "links", label: "Important Links", icon: LinkIcon },
  { key: "certification", label: "Certification", icon: Award },
];

const EDUCATION_LEVELS = [
  "JSC/JDC/8 pass",
  "SSC/Dakhil/9-10",
  "HSC/Alim/11-12",
  "Diploma",
  "Bachelor's",
  "Master's",
  "PhD",
  "Other",
];

const COUNTRIES = [
  "Bangladesh", "India", "Pakistan", "USA", "UK", "Canada", "Australia",
  "Germany", "France", "UAE", "Saudi Arabia", "Malaysia", "Singapore", "Other",
];


type FormState = {
  name: string; email: string; address: string; phone: string; bio: string;
  addressLine1: string; addressLine2: string; city: string; state: string; zipCode: string; country: string;
  educationLevel: string; examTitle: string; institute: string; passingYear: string;
  cvLink: string; githubLink: string; portfolioLink: string; linkedinLink: string; professionalImageLink: string;
};

const emptyForm = (): FormState => ({
  name: "", email: "", address: "", phone: "", bio: "",
  addressLine1: "", addressLine2: "", city: "", state: "", zipCode: "", country: "",
  educationLevel: "", examTitle: "", institute: "", passingYear: "",
  cvLink: "", githubLink: "", portfolioLink: "", linkedinLink: "", professionalImageLink: "",
});

export default function Profile() {
  const [activeSection, setActiveSection] = useState("personal");
  const [editing, setEditing] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ password: "", confirm: "" });
  const [form, setForm] = useState<FormState>(emptyForm());
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("pp_logged_in");
    toast({ title: "Logged out", description: "You have been signed out." });
    setLocation("/login");
  };

  const { data: user, isLoading } = useGetCurrentUser({
    query: { queryKey: getGetCurrentUserQueryKey() }
  });

  const { data: devices, refetch: refetchDevices } = useListDevices({
    query: { queryKey: getListDevicesQueryKey(), enabled: !!user, retry: false },
  });
  const removeDevice = useRemoveDevice({
    mutation: {
      onSuccess: (data) => {
        if (data.wasCurrent) {
          localStorage.removeItem("pp_logged_in");
          toast({ title: "Logged out", description: "Your current device session has been removed." });
          setLocation("/login");
        } else {
          refetchDevices();
          toast({ title: "Device removed", description: "That device has been logged out." });
        }
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to remove device.", variant: "destructive" });
      },
    },
  });

  useEffect(() => {
    if (user && !editing) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        address: user.address || "",
        phone: user.phone || "",
        bio: user.bio || "",
        addressLine1: user.addressLine1 || "",
        addressLine2: user.addressLine2 || "",
        city: user.city || "",
        state: user.state || "",
        zipCode: user.zipCode || "",
        country: user.country || "",
        educationLevel: user.educationLevel || "",
        examTitle: user.examTitle || "",
        institute: user.institute || "",
        passingYear: user.passingYear || "",
        cvLink: user.cvLink || "",
        githubLink: user.githubLink || "",
        portfolioLink: user.portfolioLink || "",
        linkedinLink: user.linkedinLink || "",
        professionalImageLink: user.professionalImageLink || "",
      });
    }
  }, [user, editing]);

  const updateUser = useUpdateCurrentUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        setEditing(false);
        toast({ title: "Profile updated", description: "Your changes have been saved." });
      },
      onError: (e: any) => toast({
        title: "Failed to save",
        description: e?.data?.error ?? e?.message?.replace(/^HTTP \d+ \w+:\s*/i, "") ?? "Try again",
        variant: "destructive",
      }),
    }
  });

  const requestUploadUrl = useRequestUploadUrl();

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    setAvatarUploading(true);
    try {
      const urlData = await requestUploadUrl.mutateAsync({
        data: { name: file.name, size: file.size, contentType: file.type },
      });
      await fetch(urlData.uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      const avatarUrl = `/api/storage${urlData.objectPath}`;
      await updateUser.mutateAsync({ data: { avatar: avatarUrl } });
      toast({ title: "Profile photo updated" });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload photo. Try again.", variant: "destructive" });
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const passwordMut = useUpdateCurrentUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "Password changed", description: "Your password has been updated." });
        setPwOpen(false);
        setPwForm({ password: "", confirm: "" });
      },
      onError: (e: any) => toast({
        title: "Failed to change password",
        description: e?.response?.data?.error ?? e?.message ?? "Try again",
        variant: "destructive",
      }),
    },
  });

  const savePersonal = () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    updateUser.mutate({ data: { name: form.name, email: form.email, address: form.address, phone: form.phone, bio: form.bio } });
  };

  const saveAddress = () => {
    updateUser.mutate({
      data: {
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2,
        city: form.city,
        state: form.state,
        zipCode: form.zipCode,
        country: form.country,
      },
    });
  };

  const saveEducation = () => {
    updateUser.mutate({
      data: {
        educationLevel: form.educationLevel,
        examTitle: form.examTitle,
        institute: form.institute,
        passingYear: form.passingYear,
      },
    });
  };

  const saveLinks = () => {
    updateUser.mutate({
      data: {
        cvLink: form.cvLink,
        githubLink: form.githubLink,
        portfolioLink: form.portfolioLink,
        linkedinLink: form.linkedinLink,
        professionalImageLink: form.professionalImageLink,
      },
    });
  };

  const submitPassword = () => {
    if (pwForm.password.length < 6) { toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return; }
    if (pwForm.password !== pwForm.confirm) { toast({ title: "Passwords do not match", variant: "destructive" }); return; }
    passwordMut.mutate({ data: { password: pwForm.password } });
  };

  const field = (key: keyof FormState) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm({ ...form, [key]: e.target.value }),
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" data-testid="heading-profile">My profile</h1>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log out
          </Button>
        </div>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Nav */}
          <Card className="w-full lg:w-64 flex-shrink-0 h-fit">
            <CardContent className="p-0">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.key;
                return (
                  <button
                    key={item.key}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left ${
                      isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted/50 text-foreground"
                    } ${item.key === NAV_ITEMS[0].key ? "rounded-t-lg" : ""} ${
                      item.key === NAV_ITEMS[NAV_ITEMS.length - 1].key ? "rounded-b-lg" : ""
                    }`}
                    onClick={() => { setActiveSection(item.key); setEditing(false); }}
                    data-testid={`nav-${item.key}`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              {user?.role === "admin" && (
                <div className="p-3 border-t border-border">
                  <Button className="w-full gap-2" onClick={() => setLocation("/admin")} data-testid="button-admin-panel">
                    <ShieldCheck className="w-4 h-4" />
                    Admin Panel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {NAV_ITEMS.find((n) => n.key === activeSection)?.label || "Personal Information"}
                  {activeSection === "education" && <Info className="w-4 h-4 text-muted-foreground" />}
                </CardTitle>
              </CardHeader>
              <CardContent>

                {/* ── Personal Information ── */}
                {activeSection === "personal" && (
                  <div>
                    {isLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="w-24 h-24 rounded-full mx-auto" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : (
                      <div className="max-w-lg mx-auto">
                        <div className="flex flex-col items-center mb-8 gap-2">
                          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                          <button
                            type="button" onClick={handleAvatarClick} disabled={avatarUploading}
                            className="relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            aria-label="Change profile photo"
                          >
                            <Avatar className="w-24 h-24">
                              <AvatarImage src={user?.avatar || undefined} />
                              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                                {user?.name?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              {avatarUploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                            </span>
                          </button>
                          <p className="text-xs text-muted-foreground">Click photo to change</p>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Student ID (read-only)</Label>
                            <Input value={user?.studentId || "N/A"} readOnly className="bg-muted/30" data-testid="field-student-id" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Full name</Label>
                            <Input {...field("name")} readOnly={!editing} className={editing ? "" : "bg-muted/30"} data-testid="field-full-name" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Email Address</Label>
                            <Input type="email" {...field("email")} readOnly={!editing} className={editing ? "" : "bg-muted/30"} data-testid="field-email" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Phone</Label>
                            <Input
                              type="tel"
                              inputMode="numeric"
                              maxLength={11}
                              value={form.phone}
                              readOnly={!editing}
                              className={editing ? "" : "bg-muted/30"}
                              placeholder={editing ? "01XXXXXXXXX" : ""}
                              data-testid="field-phone"
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, "");
                                setForm({ ...form, phone: digits });
                              }}
                            />
                            {editing && (
                              <p className="text-xs text-muted-foreground mt-1">{form.phone.length}/11 সংখ্যা</p>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Bio</Label>
                            <Textarea rows={3} {...field("bio")} readOnly={!editing} className={editing ? "" : "bg-muted/30"} data-testid="field-bio" />
                          </div>

                          <button type="button" className="text-sm text-primary hover:underline" onClick={() => setPwOpen(true)} data-testid="button-change-password">
                            Change Password
                          </button>

                          {editing ? (
                            <div className="flex gap-2 pt-2">
                              <Button onClick={savePersonal} disabled={updateUser.isPending} data-testid="button-save-profile">
                                {updateUser.isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                                Save Changes
                              </Button>
                              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                            </div>
                          ) : (
                            <Button className="w-full mt-4" onClick={() => setEditing(true)} data-testid="button-edit-profile">
                              Edit Profile
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Address ── */}
                {activeSection === "address" && (
                  <div className="max-w-lg mx-auto space-y-4">
                    <div>
                      <Label className="text-xs mb-1 block">
                        Address Line 1 <span className="text-destructive">*</span>
                      </Label>
                      <Input {...field("addressLine1")} readOnly={!editing} className={editing ? "" : "bg-muted/30"} placeholder={editing ? "House / Flat / Road..." : ""} />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Address Line 2</Label>
                      <Input {...field("addressLine2")} readOnly={!editing} className={editing ? "" : "bg-muted/30"} placeholder={editing ? "Village / Area (optional)..." : ""} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs mb-1 block">
                          City <span className="text-destructive">*</span>
                        </Label>
                        <Input {...field("city")} readOnly={!editing} className={editing ? "" : "bg-muted/30"} />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">
                          State <span className="text-destructive">*</span>
                        </Label>
                        <Input {...field("state")} readOnly={!editing} className={editing ? "" : "bg-muted/30"} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs mb-1 block">
                          Zip Code <span className="text-destructive">*</span>
                        </Label>
                        <Input {...field("zipCode")} readOnly={!editing} className={editing ? "" : "bg-muted/30"} />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">
                          Country <span className="text-destructive">*</span>
                        </Label>
                        {editing ? (
                          <select
                            value={form.country}
                            onChange={(e) => setForm({ ...form, country: e.target.value })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="">Select Country</option>
                            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <Input value={form.country || "Select Country"} readOnly className="bg-muted/30" />
                        )}
                      </div>
                    </div>

                    {editing ? (
                      <div className="flex gap-2 pt-2">
                        <Button onClick={saveAddress} disabled={updateUser.isPending} data-testid="button-save-address">
                          {updateUser.isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                          Submit Query
                        </Button>
                        <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                      </div>
                    ) : (
                      <Button onClick={() => setEditing(true)} data-testid="button-edit-address">Edit Address</Button>
                    )}
                  </div>
                )}

                {/* ── Education ── */}
                {activeSection === "education" && (
                  <div className="max-w-lg mx-auto space-y-4">
                    <div>
                      <Label className="text-xs mb-1 block">Your Education level</Label>
                      {editing ? (
                        <select
                          value={form.educationLevel}
                          onChange={(e) => setForm({ ...form, educationLevel: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">Select level...</option>
                          {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                      ) : (
                        <p className="text-sm text-primary font-medium py-1">
                          {form.educationLevel || <span className="text-muted-foreground italic">Not set</span>}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Exam Title</Label>
                      <Input {...field("examTitle")} readOnly={!editing} className={editing ? "" : "bg-muted/30"} placeholder={editing ? "e.g. HSC" : ""} />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Institute</Label>
                      <Input {...field("institute")} readOnly={!editing} className={editing ? "" : "bg-muted/30"} placeholder={editing ? "School / College / University name" : ""} />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Passing year</Label>
                      <Input {...field("passingYear")} readOnly={!editing} className={editing ? "max-w-[180px]" : "bg-muted/30 max-w-[180px]"} placeholder={editing ? "e.g. 2025" : ""} />
                    </div>

                    {editing ? (
                      <div className="flex gap-2 pt-2">
                        <Button onClick={saveEducation} disabled={updateUser.isPending} data-testid="button-save-education">
                          {updateUser.isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                          Edit Education
                        </Button>
                        <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                      </div>
                    ) : (
                      <Button onClick={() => setEditing(true)} data-testid="button-edit-education">Edit Education</Button>
                    )}
                  </div>
                )}

                {/* ── Important Links ── */}
                {activeSection === "links" && (
                  <div className="max-w-lg mx-auto space-y-4">
                    {[
                      { key: "cvLink" as const, label: "CV Link" },
                      { key: "githubLink" as const, label: "Github link" },
                      { key: "portfolioLink" as const, label: "Portfolio Link" },
                      { key: "linkedinLink" as const, label: "Linkedin profile link" },
                      { key: "professionalImageLink" as const, label: "Good professional Profile image link" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <Label className="text-xs mb-1 block">{label}</Label>
                        <Input
                          type="url"
                          {...field(key)}
                          readOnly={!editing}
                          className={editing ? "" : "bg-muted/30"}
                          placeholder={editing ? "https://..." : ""}
                        />
                      </div>
                    ))}

                    {editing ? (
                      <div className="flex gap-2 pt-2">
                        <Button onClick={saveLinks} disabled={updateUser.isPending} data-testid="button-save-links">
                          {updateUser.isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                          Save Changes
                        </Button>
                        <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                      </div>
                    ) : (
                      <Button onClick={() => setEditing(true)} data-testid="button-edit-links">Edit Links</Button>
                    )}
                  </div>
                )}

                {/* ── Certification ── */}
                {activeSection === "certification" && (
                  <CertificationSection userName={user?.name ?? "Student"} />
                )}

              </CardContent>
            </Card>

            {activeSection === "personal" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Device Activity</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" data-testid="table-device-activity">
                      <thead>
                        <tr className="bg-primary text-primary-foreground">
                          <th className="px-4 py-3 text-left font-medium rounded-tl-md">Serial</th>
                          <th className="px-4 py-3 text-left font-medium">Platform</th>
                          <th className="px-4 py-3 text-left font-medium">Date</th>
                          <th className="px-4 py-3 text-left font-medium rounded-tr-md">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!devices || devices.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground text-xs">
                              No active devices found.
                            </td>
                          </tr>
                        ) : (
                          devices.map((device, idx) => (
                            <tr key={device.id} className="border-t border-border hover:bg-muted/30">
                              <td className="px-4 py-3">{idx + 1}</td>
                              <td className="px-4 py-3">{device.platform}</td>
                              <td className="px-4 py-3">
                                {new Date(device.loginAt).toLocaleDateString("en-GB", {
                                  day: "2-digit", month: "2-digit", year: "numeric",
                                }).replace(/\//g, "-") + " " + new Date(device.loginAt).toLocaleTimeString("en-US", {
                                  hour: "2-digit", minute: "2-digit", hour12: true,
                                })}
                              </td>
                              <td className="px-4 py-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground h-7 text-xs"
                                  disabled={removeDevice.isPending}
                                  onClick={() => removeDevice.mutate({ id: device.id })}
                                >
                                  {removeDevice.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Remove"}
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Enter a new password (at least 6 characters).</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>New password</Label>
              <Input type="password" value={pwForm.password} onChange={(e) => setPwForm({ ...pwForm, password: e.target.value })} data-testid="input-new-password" />
            </div>
            <div className="grid gap-2">
              <Label>Confirm password</Label>
              <Input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} data-testid="input-confirm-password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)}>Cancel</Button>
            <Button onClick={submitPassword} disabled={passwordMut.isPending} data-testid="button-save-password">
              {passwordMut.isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
              Update password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Certification Section ────────────────────────────────────────────────────

type CertEntry = {
  batchId: number;
  batchName: string;
  batchEnded: boolean;
  problemsEnabled: boolean;
  cert: {
    backgroundDataUrl: string | null;
    fontFamily: string;
    fontColor: string;
    fontSize: number;
    minMarksPercent: number;
    nameX: string; nameY: string; nameWidth: string; nameHeight: string;
  };
  marks: { earnedMarks: number; totalMarks: number; percentage: number };
  eligible: boolean;
};

async function ensureGoogleFont(fontFamily: string): Promise<void> {
  const family = fontFamily.replace(/ /g, "+");
  const linkId = "gf-cert-download-font";
  if (!document.getElementById(linkId)) {
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;700&display=swap`;
    document.head.appendChild(link);
  }
  try {
    await document.fonts.load(`${48}px "${fontFamily}"`);
  } catch {
    // best-effort — continue even if font fails to load
  }
}

async function drawCertificate(entry: CertEntry, name: string): Promise<HTMLCanvasElement> {
  await ensureGoogleFont(entry.cert.fontFamily);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No canvas context")); return; }
      ctx.drawImage(img, 0, 0);
      const x = parseFloat(entry.cert.nameX) * canvas.width;
      const y = parseFloat(entry.cert.nameY) * canvas.height;
      const w = parseFloat(entry.cert.nameWidth) * canvas.width;
      const h = parseFloat(entry.cert.nameHeight) * canvas.height;
      ctx.font = `${entry.cert.fontSize}px "${entry.cert.fontFamily}"`;
      ctx.fillStyle = entry.cert.fontColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      let fs = entry.cert.fontSize;
      while (fs > 8 && ctx.measureText(name).width > w * 0.95) {
        fs -= 2;
        ctx.font = `${fs}px "${entry.cert.fontFamily}"`;
      }
      ctx.fillText(name, x + w / 2, y + h / 2);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error("Failed to load background"));
    img.src = entry.cert.backgroundDataUrl ?? "";
  });
}

function CertificationSection({ userName }: { userName: string }) {
  const [downloading, setDownloading] = useState<number | null>(null);

  const { data: entries = [], isLoading } = useQuery<CertEntry[]>({
    queryKey: ["my", "certificates"],
    queryFn: async () => {
      const r = await fetch("/api/my/certificates");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
  });

  const handleDownload = useCallback(async (entry: CertEntry, format: "png" | "pdf") => {
    if (!entry.cert.backgroundDataUrl) return;
    setDownloading(entry.batchId);
    try {
      const canvas = await drawCertificate(entry, userName);
      if (format === "png") {
        const link = document.createElement("a");
        link.download = `certificate-${entry.batchName.replace(/\s+/g, "-")}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } else {
        const { jsPDF } = await import("jspdf");
        const w = canvas.width;
        const h = canvas.height;
        const orientation = w >= h ? "landscape" : "portrait";
        const pdf = new jsPDF({ orientation, unit: "px", format: [w, h], hotfixes: ["px_scaling"] });
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, w, h);
        pdf.save(`certificate-${entry.batchName.replace(/\s+/g, "-")}.pdf`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(null);
    }
  }, [userName]);

  if (isLoading) {
    return (
      <div className="py-10 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No certificates available yet</p>
        <p className="text-xs mt-1">Certificates appear here once your batch has a certificate configured.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Certificates are available after a batch ends and you meet the minimum marks requirement.
      </p>
      {entries.map((entry) => (
        <div key={entry.batchId} className="rounded-xl border border-border overflow-hidden">
          {/* Certificate thumbnail */}
          {entry.cert.backgroundDataUrl && (
            <div className="relative bg-muted">
              <img
                src={entry.cert.backgroundDataUrl}
                alt="Certificate preview"
                className="w-full max-h-40 object-cover object-top opacity-80"
              />
              {entry.eligible && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <Award className="w-3 h-3" /> Eligible
                </div>
              )}
            </div>
          )}
          <div className="p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-semibold text-sm">{entry.batchName}</h3>
                {entry.problemsEnabled !== false && (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      Your marks: <span className="font-medium text-foreground">{entry.marks.percentage}%</span>
                      {entry.marks.totalMarks > 0 && (
                        <> ({entry.marks.earnedMarks}/{entry.marks.totalMarks})</>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      Required: <span className="font-medium text-foreground">{entry.cert.minMarksPercent}%</span>
                    </span>
                  </div>
                )}
                {!entry.batchEnded && (
                  <p className="text-xs text-amber-600 mt-1.5">⏳ Certificate available after batch ends</p>
                )}
                {entry.batchEnded && !entry.eligible && entry.problemsEnabled !== false && (
                  <p className="text-xs text-destructive mt-1.5">
                    You need {entry.cert.minMarksPercent}% marks to download this certificate
                  </p>
                )}
              </div>
              {entry.eligible && (
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    disabled={downloading === entry.batchId}
                    onClick={() => handleDownload(entry, "png")}
                  >
                    {downloading === entry.batchId ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Download PNG
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs"
                    disabled={downloading === entry.batchId}
                    onClick={() => handleDownload(entry, "pdf")}
                  >
                    {downloading === entry.batchId ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Download PDF
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
