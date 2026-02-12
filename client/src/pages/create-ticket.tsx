import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { insertTicketSchema, APP_LABELS } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Bug, Sparkles, Paperclip, X, FileImage, FileVideo } from "lucide-react";
import { Link } from "wouter";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "video/mp4", "video/webm", "video/quicktime"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 10;

const formSchema = insertTicketSchema.extend({
  title: z.string().min(5, "Title must be at least 5 characters").max(200, "Title too long"),
  description: z.string().min(20, "Description must be at least 20 characters"),
});

type FormData = z.infer<typeof formSchema>;

export default function CreateTicket() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "bug",
      app: "dispatch",
      priority: "medium",
    },
  });

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const valid: File[] = [];
    for (const file of files) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast({ title: "Invalid file type", description: `${file.name} is not a supported image or video format`, variant: "destructive" });
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: "File too large", description: `${file.name} exceeds 10MB limit`, variant: "destructive" });
        continue;
      }
      valid.push(file);
    }
    const combined = [...selectedFiles, ...valid].slice(0, MAX_FILES);
    setSelectedFiles(combined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", "/api/tickets", data);
      const ticket = await res.json();
      if (selectedFiles.length > 0) {
        const uploadData = new globalThis.FormData();
        selectedFiles.forEach((file) => uploadData.append("files", file));
        await fetch(`/api/tickets/${ticket.id}/attachments`, {
          method: "POST",
          body: uploadData,
          credentials: "include",
        });
      }
      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Ticket created!", description: "Your ticket has been submitted successfully." });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create ticket", description: error.message, variant: "destructive" });
    },
  });

  const watchType = form.watch("type");

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button size="icon" variant="ghost" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">New Ticket</h1>
            <p className="text-sm text-muted-foreground">Submit a bug report or feature request</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-6">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant={field.value === "bug" ? "default" : "outline"}
                          className={`flex-1 ${field.value === "bug" ? "bg-red-600 text-white border-red-600" : ""}`}
                          onClick={() => field.onChange("bug")}
                          data-testid="button-type-bug"
                        >
                          <Bug className="h-4 w-4 mr-2" />
                          Bug Report
                        </Button>
                        <Button
                          type="button"
                          variant={field.value === "feature_request" ? "default" : "outline"}
                          className={`flex-1 ${field.value === "feature_request" ? "bg-violet-600 text-white border-violet-600" : ""}`}
                          onClick={() => field.onChange("feature_request")}
                          data-testid="button-type-feature"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Feature Request
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="app"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ticket-app">
                            <SelectValue placeholder="Select application" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(APP_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={watchType === "bug" ? "Brief description of the bug..." : "What feature would you like?"}
                          data-testid="input-ticket-title"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={
                            watchType === "bug"
                              ? "Steps to reproduce, expected behavior, actual behavior..."
                              : "Describe the feature, why it's needed, and how it should work..."
                          }
                          className="min-h-[150px] resize-y"
                          data-testid="input-ticket-description"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {watchType === "bug"
                          ? "Include steps to reproduce, expected vs actual behavior"
                          : "Explain the use case and desired outcome"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ticket-priority">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormLabel>Attachments</FormLabel>
                  <FormDescription>
                    Upload images (PNG, JPG, WebP) or videos (MP4, WebM, MOV) up to 10MB each. Max 10 files.
                  </FormDescription>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={selectedFiles.length >= MAX_FILES}
                      data-testid="button-attach-files"
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      Attach Files
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/jpg,image/webp,video/mp4,video/webm,video/quicktime"
                      onChange={handleFileSelect}
                      className="hidden"
                      data-testid="input-file-upload"
                    />
                    {selectedFiles.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected
                      </span>
                    )}
                  </div>
                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center gap-3 rounded-md border p-2"
                          data-testid={`file-preview-${index}`}
                        >
                          {file.type.startsWith("video/") ? (
                            <FileVideo className="h-5 w-5 text-muted-foreground shrink-0" />
                          ) : (
                            <FileImage className="h-5 w-5 text-muted-foreground shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          {file.type.startsWith("image/") && (
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="h-10 w-10 rounded object-cover shrink-0"
                            />
                          )}
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removeFile(index)}
                            data-testid={`button-remove-file-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <Link href="/">
                    <Button type="button" variant="outline" data-testid="button-cancel">
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-submit-ticket"
                  >
                    {createMutation.isPending ? "Submitting..." : "Submit Ticket"}
                    <Send className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
