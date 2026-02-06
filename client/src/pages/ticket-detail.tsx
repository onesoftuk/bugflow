import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Ticket, Comment, User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Bug, Sparkles, Clock, Send, ArrowRightLeft, MessageSquare } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";

const statusColors: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  under_review: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  resolved: "bg-green-500/10 text-green-700 dark:text-green-300",
  closed: "bg-muted text-muted-foreground",
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  medium: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  critical: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  under_review: "Under Review",
  resolved: "Resolved",
  closed: "Closed",
};

type CommentWithUser = Comment & { user: { username: string; role: string } };

export default function TicketDetail() {
  const [, params] = useRoute("/tickets/:id");
  const { user } = useAuth();
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [newStatus, setNewStatus] = useState("");
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

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/tickets/${ticketId}/comments`, { content: comment, ticketId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId, "comments"] });
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
        comment: `Status changed to ${statusLabels[newStatus]}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets", ticketId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setNewStatus("");
      toast({ title: "Status updated", description: `Ticket status changed to ${statusLabels[newStatus]}` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  if (ticketLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="font-semibold mb-2">Ticket not found</h3>
            <Link href="/">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
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
        </div>

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
                {statusLabels[ticket.status]}
              </Badge>
              <Badge variant="outline" className={`text-xs ${priorityColors[ticket.priority]}`}>
                {ticket.priority} priority
              </Badge>
            </div>

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

        {isAdmin && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Update Status
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3 flex-wrap">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="w-[180px]" data-testid="select-new-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => updateStatusMutation.mutate()}
                disabled={!newStatus || newStatus === ticket.status || updateStatusMutation.isPending}
                data-testid="button-update-status"
              >
                {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Comments
            {comments && <span className="text-muted-foreground font-normal text-sm">({comments.length})</span>}
          </h2>

          {commentsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((c) => (
                <Card key={c.id} className={c.isStatusChange ? "border-l-2 border-l-primary" : ""} data-testid={`comment-${c.id}`}>
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
                          {c.user.role === "admin" && (
                            <Badge variant="secondary" className="text-[10px]">Admin</Badge>
                          )}
                          {c.isStatusChange && (
                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary">
                              <ArrowRightLeft className="h-3 w-3 mr-1" />
                              Status Update
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
                <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment.</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4">
              <Textarea
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[80px] resize-y mb-3"
                data-testid="input-comment"
              />
              <div className="flex justify-end">
                <Button
                  onClick={() => addCommentMutation.mutate()}
                  disabled={!comment.trim() || addCommentMutation.isPending}
                  data-testid="button-submit-comment"
                >
                  {addCommentMutation.isPending ? "Sending..." : "Add Comment"}
                  <Send className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
