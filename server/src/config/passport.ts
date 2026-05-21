import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/call',
      proxy: true,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        if (!email) {
          return done(new Error('Google did not provide an email address'), false);
        }

        // Case 1: user exists with this googleId → return them
        let user = await User.findOne({ googleId: profile.id });
        if (user) return done(null, user);

        // Case 2: user exists with this email (registered via password) → link Google
        user = await User.findOne({ email });
        if (user) {
          user.googleId = profile.id;
          if (!user.avatar && profile.photos?.[0]?.value) {
            user.avatar = profile.photos[0].value;
          }
          user.isEmailVerified = true; // Google accounts are pre-verified
          await user.save();
          return done(null, user);
        }

        // Case 3: brand new user → create
        const newUser = await User.create({
          email,
          googleId: profile.id,
          displayName: profile.displayName || email.split('@')[0],
          avatar: profile.photos?.[0]?.value,
          isEmailVerified: true,
          // passwordHash intentionally omitted
        });

        return done(null, newUser);
      } catch (err) {
        return done(err as Error, false);
      }
    }
  )
);

export default passport;
