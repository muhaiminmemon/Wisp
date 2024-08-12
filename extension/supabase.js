import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://otuzfokbkjwprdcqomjv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90dXpmb2tia2p3cHJkY3FvbWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjM0NzA2MjYsImV4cCI6MjAzOTA0NjYyNn0.k8tXhA5XyhnTJHrEZfep-RDF7gmdErRX9f4upBi5HWg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)