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

export const lovableCloudAuth = {
  async getSession() {
    const { data, error } = await lovableCloudClient.auth.getSession();
    if (error) throw error;
    return data.session;
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
    return { session: data.session };
  },

  async signInWithGoogle(redirectUri: string) {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: redirectUri,
    });

    if (result.error) throw result.error;
    return { redirected: Boolean(result.redirected) };
  },

  async signOut() {
    const { error } = await lovableCloudClient.auth.signOut();
    if (error) throw error;
  },
};
