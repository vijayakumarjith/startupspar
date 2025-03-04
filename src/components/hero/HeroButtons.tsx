import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { slideIn } from '../../utils/animations';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const HeroButtons = () => {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // User signed in successfully
    } catch (error) {
      console.error('Error signing in:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <motion.div
      variants={slideIn("up")}
      initial="initial"
      animate="animate"
      className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:space-x-4 w-full sm:w-auto px-4 sm:px-0"
    >
      <motion.button
        onClick={handleSignIn}
        disabled={isSigningIn}
        className="w-full sm:w-auto inline-flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 px-8 rounded-full text-lg hover:scale-105 transition-transform duration-300 hover:shadow-lg hover:shadow-purple-500/25"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isSigningIn ? 'Signing In...' : 'Signin'}
      </motion.button>
      <motion.a
        href="https://chat.whatsapp.com/JVfjSOxUEPB7avK8nbiHrK"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full sm:w-auto inline-flex items-center justify-center bg-green-600 text-white font-bold py-4 px-8 rounded-full text-lg hover:scale-105 transition-transform duration-300 hover:shadow-lg hover:shadow-green-500/25"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageCircle className="w-5 h-5 mr-2" />
        Join Community
      </motion.a>
    </motion.div>
  );
};

export default HeroButtons;
