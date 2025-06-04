import React, { useState } from 'react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // Auth logic here
    console.log(email, password);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-white text-2xl font-semibold mb-6 text-center">Login</h2>
        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 mb-4 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 mb-4 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          onClick={handleLogin}
          className="w-full p-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors font-bold"
        >
          Log In
        </button>
      </div>
    </div>
  );
};

export default Login;