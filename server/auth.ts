import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { Express } from "express";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashedPassword, salt] = stored.split(".");
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  const keyBuffer = Buffer.from(hashedPassword, "hex");
  return timingSafeEqual(buf, keyBuffer);
}

declare global {
  namespace Express {
    interface User extends import("@shared/schema").User {}
  }
}

export function setupAuth(app: Express) {
  const PgSession = connectPgSimple(session);

  app.use(
    session({
      store: new PgSession({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "bugflow-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const callbackURL = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`
      : process.env.REPL_SLUG
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/auth/google/callback`
        : "http://localhost:5000/api/auth/google/callback";

    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL,
          scope: ["profile", "email"],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const googleId = profile.id;
            const email = profile.emails?.[0]?.value;
            const name = profile.displayName || `${profile.name?.givenName || ""} ${profile.name?.familyName || ""}`.trim();
            const profileImageUrl = profile.photos?.[0]?.value;

            let user = await storage.getUserByGoogleId(googleId);
            if (user) {
              if (!user.isActive) {
                return done(null, false, { message: "Account is deactivated" } as any);
              }
              return done(null, user);
            }

            if (email) {
              user = await storage.getUserByEmail(email);
              if (user) {
                if (!user.isActive) {
                  return done(null, false, { message: "Account is deactivated" } as any);
                }
                await storage.linkGoogleAccount(user.id, googleId, profileImageUrl);
                const updatedUser = await storage.getUser(user.id);
                return done(null, updatedUser || user);
              }
            }

            const randomPassword = randomBytes(32).toString("hex");
            const hashedPw = await hashPassword(randomPassword);
            const baseUsername = email ? email.split("@")[0] : `user_${googleId.slice(0, 8)}`;
            let username = baseUsername;
            let counter = 1;
            while (await storage.getUserByUsername(username)) {
              username = `${baseUsername}${counter}`;
              counter++;
            }

            const newUser = await storage.createUser({
              username,
              email: email || `${googleId}@google.user`,
              password: hashedPw,
              name: name || null,
            });

            await storage.linkGoogleAccount(newUser.id, googleId, profileImageUrl);
            const finalUser = await storage.getUser(newUser.id);
            return done(null, finalUser || newUser);
          } catch (error) {
            return done(error as Error);
          }
        }
      )
    );

    app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

    app.get(
      "/api/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/auth?error=google_failed" }),
      (_req, res) => {
        res.redirect("/");
      }
    );

    console.log("[auth] Google OAuth configured with callback:", callbackURL);
  } else {
    console.log("[auth] Google OAuth not configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)");
  }

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || undefined);
    } catch (error) {
      done(error);
    }
  });
}
