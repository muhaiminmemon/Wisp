import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wind } from 'lucide-react';
import { supabase } from '../supabaseClient';
import '../styles/Login.css';

const Login = () => {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar.readonly',
        },
      });
      if (error) throw error;

      // Manual redirection
      navigate('/dashboard');
    } catch (error) {
      alert(error.message);
    }
  };


  return (
    <div className="login-container">
      <div className="login-card">
        <div className="text-center">
          <Wind className="app-icon" />
          <h2 className="app-name">Wisp</h2>
          <p className="app-description">Streamline your productivity</p>
        </div>
        <button className="google-signin-button" onClick={handleGoogleLogin}>
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            {/* SVG paths */}
          </svg>
          Sign in with Google
        </button>
        <p className="terms-text">
          By signing in, you agree to our{' '}
          <a href="#" className="terms-link">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="terms-link">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
