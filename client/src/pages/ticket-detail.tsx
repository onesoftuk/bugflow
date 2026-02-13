import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Ticket, Comment, Attachment, TicketHistory } from "@shared/schema";
import { STATUS_LABELS, APP_LABELS, PRIORITY_LABELS } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Bug, Sparkles, Clock, Send, ArrowRightLeft, MessageSquare,
  Paperclip, Upload, History, UserCheck, Lock, Image, Trash2,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";

const statusColors: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  waiting_on_user: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  resolved: "bg-green-500/10 text-green-700 dark:text-green-300",
  closed: "bg-muted text-muted-foreground",
  rejected: "bg-red-500/10 text-red-700 dark:text-red-300",
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  medium: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  critical: "bg-red-500/10 text-red-600 dark:text-red-400",
};

type CommentWithUser = Comment & { user: { username: string; role: string } };
type DevUser = { id: string; username: string; name: string | null; role: string };

export default function TicketDetail() {
  const [, params] = useRoute("/tickets/:id");
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const isAdminOrDev = user?.role === "admin" || user?.role === "dev";
  const isAdmin = user?.role === "admin";

  const ticketId = params?.id;

  const { data: ticket, isLoading: ticketLoading } = useQuery<Ticket>({
    queryKey: ["/api/tickets", ticketId],
    enabled: !!ticketId,
  });

  const { data: comments, isLoading: commentsLoading } = useQuery<CommentWithUser[]>({
    queryKey: ["/api/tickets", ticketId, "comments"],
    enabled: !!ticketId,
  });

  const { data: ticketAttachments } = useQuery<Attachment[]>({
    queryKey: ["/api/tickets", ticketId, "attachments"],
    enabled: !!ticketId,
  });

  const { data: history } = useQuery<TicketHistory[]>({
    queryKey: ["/api/tickets", ticketId, "history"],
    enabled: !!ticketId,
  });

  const { data: devUsers } = useQuery<DevUser[]>({
    queryKey: ["/api/admin/devs"],
    enabled: isAdminOrDev,
  });

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/tickets/${ticketId}/comments`, { content: comment, ticketId, isInternal });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId, "history"] });
      setComment("");
      toast({ title: "Comment added" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add comment", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/tickets/${ticketId}/status`, {
        status: newStatus,
        comment: `Status changed to ${STATUS_LABELS[newStatus]}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId, "history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
      setNewStatus("");
      toast({ title: "Status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (assignedToUserId: string | null) => {
      await apiRequest("PATCH", `/api/tickets/${ticketId}/assign`, { assignedToUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId, "history"] });
      toast({ title: "Assignment updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign", description: error.message, variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append("files", f));
      const res = await fetch(`/api/tickets/${ticketId}/attachments`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId, "attachments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId, "history"] });
      toast({ title: "Files uploaded" });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/tickets/${ticketId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
      toast({ title: "Ticket deleted" });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete ticket", description: error.message, variant: "destructive" });
    },
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) uploadMutation.mutate(e.dataTransfer.files);
  }, [uploadMutation]);

  if (ticketLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card><CardContent className="p-6 space-y-4"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card><CardContent className="p-12 text-center"><h3 className="font-semibold mb-2">Ticket not found</h3><Link href="/"><Button variant="outline">Back to Dashboard</Button></Link></CardContent></Card>
      </div>
    );
  }

  const isBug = ticket.type === "bug";

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button size="icon" variant="ghost" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate" data-testid="text-ticket-title">
              {ticket.title}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Created {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
            </p>
          </div>
          {isAdmin && (
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive shrink-0"
              onClick={() => setShowDeleteDialog(true)}
              data-testid="button-delete-ticket"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {showDeleteDialog && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium text-destructive">
                Are you sure you want to permanently delete this ticket? This will remove all comments, attachments, and history.
              </p>
              <p className="text-sm text-muted-foreground">
                Type <strong>DELETE</strong> to confirm:
              </p>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="Type DELETE to confirm"
                data-testid="input-delete-confirm"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => { setShowDeleteDialog(false); setDeleteConfirm(""); }}
                  data-testid="button-cancel-delete"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleteConfirm !== "DELETE" || deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate()}
                  data-testid="button-confirm-delete"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete Ticket"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className={`p-1.5 rounded-md ${isBug ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-violet-500/10 text-violet-600 dark:text-violet-400"}`}>
                {isBug ? <Bug className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              </div>
              <Badge variant="outline" className="text-xs">
                {isBug ? "Bug Report" : "Feature Request"}
              </Badge>
              <Badge variant="outline" className={`text-xs ${statusColors[ticket.status]}`} data-testid="badge-ticket-status">
                {STATUS_LABELS[ticket.status]}
              </Badge>
              <Badge variant="outline" className={`text-xs ${priorityColors[ticket.priority]}`}>
                {PRIORITY_LABELS[ticket.priority]}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {APP_LABELS[ticket.app]}
              </Badge>
            </div>

            {ticket.assignedToName && (
              <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                <UserCheck className="h-4 w-4" />
                <span>Assigned to <strong className="text-foreground">{ticket.assignedToName}</strong></span>
              </div>
            )}

            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-sm leading-relaxed" data-testid="text-ticket-description">
                {ticket.description}
              </p>
            </div>

            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Last updated {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}</span>
            </div>
          </CardContent>
        </Card>

        {isAdminOrDev && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Manage Ticket
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="w-[180px]" data-testid="select-new-status">
                    <SelectValue placeholder="Change status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => updateStatusMutation.mutate()}
                  disabled={!newStatus || newStatus === ticket.status || updateStatusMutation.isPending}
                  data-testid="button-update-status"
                >
                  {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
                </Button>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-3 flex-wrap">
                  <Select
                    value={ticket.assignedToUserId || "unassigned"}
                    onValueChange={(v) => assignMutation.mutate(v === "unassigned" ? null : v)}
                  >
                    <SelectTrigger className="w-[200px]" data-testid="select-assign">
                      <SelectValue placeholder="Assign to..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {devUsers?.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name || d.username} ({d.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attachments
              {ticketAttachments && <span className="text-muted-foreground font-normal text-sm">({ticketAttachments.length}/10)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ticketAttachments && ticketAttachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {ticketAttachments.map((att) => (
                  <a
                    key={att.id}
                    href={`/api/attachments/${att.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative border rounded-md overflow-hidden hover-elevate"
                    data-testid={`attachment-${att.id}`}
                  >
                    <img
                      src={`/api/attachments/${att.id}/download`}
                      alt={att.originalName}
                      className="w-full h-24 object-cover"
                    />
                    <div className="p-2">
                      <p className="text-xs truncate">{att.originalName}</p>
                      <p className="text-[10px] text-muted-foreground">{(att.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
            <div
              className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              data-testid="dropzone-upload"
            >
              <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {uploadMutation.isPending ? "Uploading..." : "Drop images here or click to upload"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP up to 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && uploadMutation.mutate(e.target.files)}
                data-testid="input-file-upload"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Notes
            {comments && <span className="text-muted-foreground font-normal text-sm">({comments.length})</span>}
          </h2>

          {commentsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i}><CardContent className="p-4"><div className="flex gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-full" /></div></div></CardContent></Card>
              ))}
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((c) => (
                <Card
                  key={c.id}
                  className={`${c.isStatusChange ? "border-l-2 border-l-primary" : ""} ${c.isInternal ? "bg-amber-500/5 border-amber-500/20" : ""}`}
                  data-testid={`comment-${c.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {c.user.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{c.user.username}</span>
                          {c.user.role === "admin" && <Badge variant="secondary" className="text-[10px]">Admin</Badge>}
                          {c.user.role === "dev" && <Badge variant="secondary" className="text-[10px]">Dev</Badge>}
                          {c.isStatusChange && (
                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">
                              <ArrowRightLeft className="h-3 w-3 mr-1" />
                              Status Update
                            </Badge>
                          )}
                          {c.isInternal && (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300">
                              <Lock className="h-3 w-3 mr-1" />
                              Internal
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {format(new Date(c.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{c.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No notes yet. Be the first to add one.</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4">
              <Textarea
                placeholder={isInternal ? "Add an internal note (only visible to admin/dev)..." : "Add a public note..."}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[80px] resize-y mb-3"
                data-testid="input-comment"
              />
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {isAdminOrDev && (
                  <div className="flex items-center gap-2">
                    <Switch
                      id="internal-note"
                      checked={isInternal}
                      onCheckedChange={setIsInternal}
                      data-testid="switch-internal"
                    />
                    <Label htmlFor="internal-note" className="text-sm text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Internal note
                    </Label>
                  </div>
                )}
                <div className="flex justify-end flex-1">
                  <Button
                    onClick={() => addCommentMutation.mutate()}
                    disabled={!comment.trim() || addCommentMutation.isPending}
                    data-testid="button-submit-comment"
                  >
                    {addCommentMutation.isPending ? "Sending..." : "Add Note"}
                    <Send className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {history && history.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <History className="h-4 w-4" />
              Activity Timeline
            </h2>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {history.map((h) => (
                    <div key={h.id} className="flex gap-3 text-sm" data-testid={`history-${h.id}`}>
                      <div className="mt-0.5 p-1 rounded-full bg-muted">
                        {h.kind === "STATUS_CHANGED" && <ArrowRightLeft className="h-3 w-3" />}
                        {h.kind === "CREATED" && <Sparkles className="h-3 w-3" />}
                        {h.kind === "ASSIGNED" && <UserCheck className="h-3 w-3" />}
                        {h.kind === "PUBLIC_NOTE" && <MessageSquare className="h-3 w-3" />}
                        {h.kind === "INTERNAL_NOTE" && <Lock className="h-3 w-3" />}
                        {h.kind === "ATTACHMENT_ADDED" && <Image className="h-3 w-3" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{h.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {h.actorName} &middot; {format(new Date(h.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
