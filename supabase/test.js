import { createClient } from '@supabase/supabase-js'

// Create a single supabase client for interacting with your database
 const supabase = createClient('https://lipsifsuqjhauemmrwrz.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcHNpZnN1cWpoYXVlbW1yd3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMjE4NDQsImV4cCI6MjA4Nzc5Nzg0NH0.Dsu2jCNyi3y9S8RAVBsCdNPzU2UQQ8iPeTVuXT-pKyA')
// const { data } = await supabase.from('profiles').select('*')
// console.log(data)


try {
      const { error } = await supabase.auth.signUp({
        email: 'said.aldiev@gmail.com',
        password: 'password'
      });
      console.log("I am here")
      if (error)  {
        console.log(error)
        throw error;
      }
    //   toast.success('Check your email to confirm your account');
    } catch (e) {
        console.log(e)
    //   toast.error(e.message || 'Failed to sign up');
    } finally {
    //   setLoading(false);
    }