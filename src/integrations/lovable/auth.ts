import { lovable } from ".";
import { supabase as lovableCloudClient } from "@/integrations/supabase/client";

type AuthStateHandler = (event: string, session: unknown) => void;

type PasswordCredentials = {
  email: string;
  password: string;
};

type SignUpCredentials = PasswordCredentials & {
  fullName: string;
  companyName: string;
  emailRedirectTo: string;
};

type EnsureProfileOptions = {
  fullName?: string | null;
  companyName?: string | null;
};

type LovableCloudRpcClient = {
  rpc: (
    functionName: "ensure_current_user_profile",
    args: { _company_name: string | null; _profile_name: string | null },
  ) => Promise<{ error: Error | null }>;
};

export const lovableCloudAuth = {
  async getSession() {
    const { data, error } = await lovableCloudClient.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getUser() {
    const { data, error } = await lovableCloudClient.auth.getUser();

    if (error) {
      if (error.message.toLowerCase().includes("auth session missing")) return null;
      throw error;
    }

    return data.user ?? null;
  },

  async getVerifiedSession(options?: { ensureProfile?: boolean }) {
    const session = await this.getSession();
    if (!session) return null;

    const user = await this.getUser();
    if (!user) return null;

    if (options?.ensureProfile) {
      await this.ensureCurrentUserProfile();
    }

    return { session, user };
  },

  async getAccessToken() {
    const session = await this.getSession();
    return session?.access_token ?? null;
  },

  onAuthStateChange(handler: AuthStateHandler) {
    const { data } = lovableCloudClient.auth.onAuthStateChange((event, session) => {
      handler(event, session);
    });

    return () => data.subscription.unsubscribe();
  },

  async signInWithPassword(credentials: PasswordCredentials) {
    const { error } = await lovableCloudClient.auth.signInWithPassword(credentials);
    if (error) throw error;

    return this.getVerifiedSession({ ensureProfile: true });
  },

  async signUpWithPassword(credentials: SignUpCredentials) {
    const { data, error } = await lovableCloudClient.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        emailRedirectTo: credentials.emailRedirectTo,
        data: {
          full_name: credentials.fullName,
          company_name: credentials.companyName,
        },
      },
    });

    if (error) throw error;

    if (!data.session) return { session: null, user: null };

    await this.ensureCurrentUserProfile({
      fullName: credentials.fullName,
      companyName: credentials.companyName,
    });

    const verified = await this.getVerifiedSession();
    return verified ?? { session: null, user: null };
  },

  async signInWithGoogle(redirectUri: string) {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: redirectUri,
    });

    if (result.error) throw result.error;
    if (!result.redirected) await this.ensureCurrentUserProfile();
    return { redirected: Boolean(result.redirected) };
  },

  async ensureCurrentUserProfile(options?: EnsureProfileOptions) {
    const client = lovableCloudClient as unknown as LovableCloudRpcClient;
    const { error } = await client.rpc("ensure_current_user_profile", {
      _company_name: options?.companyName ?? null,
      _profile_name: options?.fullName ?? null,
    });

    if (error) throw error;
  },

  async signOut() {
    const { error } = await lovableCloudClient.auth.signOut();
    if (error) throw error;
  },
};
