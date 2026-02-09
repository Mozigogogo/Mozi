'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';

export default function GoogleAuthProvider({ children }) {
  return (
    <GoogleOAuthProvider clientId="82511929000-gku12p2fik09c774knagec6l33fflelo.apps.googleusercontent.com">
      {children}
    </GoogleOAuthProvider>
  );
}
