import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, ArrowRight, Shield, Users, Bell } from "lucide-react";
import logoImg from "@assets/favicon_1770388281198.ico";
import { Redirect } from "wouter";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register, user, isLoading } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
  });

  if (user) {
    return <Redirect to="/" />;
  }

  const onLogin = async (data: LoginForm) => {
    try {
      await login(data);
      toast({ title: "Welcome back!", description: "You've been logged in successfully." });
    } catch (error: any) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    }
  };

  const onRegister = async (data: RegisterForm) => {
    try {
      await register({ username: data.username, email: data.email, password: data.password });
      toast({ title: "Account created!", description: "Welcome to BugFlow." });
    } catch (error: any) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:flex-1 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        <div className="relative z-10 flex flex-col justify-center p-12 text-primary-foreground">
          <div className="flex items-center gap-3 mb-8">
            <img src={logoImg} alt="BugFlow" className="h-10 w-10 rounded-md" />
            <h1 className="text-3xl font-bold tracking-tight">BugFlow</h1>
          </div>
          <p className="text-xl font-medium mb-3 text-primary-foreground/90">
            Track bugs. Request features. Ship better software.
          </p>
          <p className="text-sm text-primary-foreground/70 mb-12 max-w-md">
            A streamlined platform for teams to report issues, suggest improvements, and keep everyone in the loop with real-time status updates.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-md bg-primary-foreground/10 shrink-0">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Role-Based Access</h3>
                <p className="text-sm text-primary-foreground/70">Admins manage statuses while users submit and track their tickets.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-md bg-primary-foreground/10 shrink-0">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Email Notifications</h3>
                <p className="text-sm text-primary-foreground/70">Get notified when your ticket status changes so you never miss an update.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-md bg-primary-foreground/10 shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Collaborative</h3>
                <p className="text-sm text-primary-foreground/70">Add comments, discuss solutions, and resolve issues together.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img src={logoImg} alt="BugFlow" className="h-8 w-8 rounded-md" />
            <h1 className="text-2xl font-bold tracking-tight">BugFlow</h1>
          </div>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">
                {isLogin ? "Welcome back" : "Create an account"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {isLogin
                  ? "Sign in to your account to continue"
                  : "Register to start tracking bugs and features"}
              </p>
            </CardHeader>
            <CardContent>
              {isLogin ? (
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your username" data-testid="input-login-username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter your password" data-testid="input-login-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginForm.formState.isSubmitting}
                      data-testid="button-login"
                    >
                      {loginForm.formState.isSubmitting ? "Signing in..." : "Sign in"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </Form>
              ) : (
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Choose a username" data-testid="input-register-username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter your email" data-testid="input-register-email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Create a password" data-testid="input-register-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm your password" data-testid="input-register-confirm-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerForm.formState.isSubmitting}
                      data-testid="button-register"
                    >
                      {registerForm.formState.isSubmitting ? "Creating account..." : "Create account"}
                      <Sparkles className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </Form>
              )}

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-toggle-auth-mode"
                >
                  {isLogin
                    ? "Don't have an account? Register"
                    : "Already have an account? Sign in"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
