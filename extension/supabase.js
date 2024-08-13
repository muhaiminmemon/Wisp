import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://otuzfokbkjwprdcqomjv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90dXpmb2tia2p3cHJkY3FvbWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjM0NzA2MjYsImV4cCI6MjAzOTA0NjYyNn0.k8tXhA5XyhnTJHrEZfep-RDF7gmdErRX9f4upBi5HWg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { data, error };
}

export async function syncScreenTime(screenTimeData) {
  const { data, error } = await supabase
    .from('screen_time')
    .insert(screenTimeData);
  return { data, error };
}