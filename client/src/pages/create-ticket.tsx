import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { insertTicketSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Bug, Sparkles } from "lucide-react";
import { Link } from "wouter";

const formSchema = insertTicketSchema.extend({
  title: z.string().min(5, "Title must be at least 5 characters").max(200, "Title too long"),
  description: z.string().min(20, "Description must be at least 20 characters"),
});

type FormData = z.infer<typeof formSchema>;

export default function CreateTicket() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "bug",
      priority: "medium",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await apiRequest("POST", "/api/tickets", data);
      return res.json();
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
