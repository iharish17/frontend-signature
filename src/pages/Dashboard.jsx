import React, { useContext } from 'react';
import { AuthContext } from '../Context/AuthContext';

function Dashboard() {
  const { user } = useContext(AuthContext);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 text-center p-6">
           
      <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-purple-600 to-pink-600 animate-pulse mb-4">
        Welcome, {user?.email || 'User'}!
      </h1>
     
      <p className="text-gray-700 max-w-xl text-lg">
        This is your secure space to digitally sign documents. With SignMate, you can upload your PDF, place your signature exactly where you want, and download a legally signed copy — all in seconds.
      </p>

      <p className="mt-4 text-sm text-gray-500 italic">
        Sign smarter. Sign faster. SignMate ✍️
      </p>
    </div>
  );
}

export default Dashboard;
