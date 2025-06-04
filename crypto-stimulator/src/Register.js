import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase'; // Make sure firebase.js exports both `auth` and `db`
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, 'users', uid), {
        uid,
        username,
        email,
        phone,
        createdAt: new Date(),
        balance: 0,
        profit: 0,
      });

      alert('Registration successful!');
      navigate('/dashboard');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleRegister} className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Create an Account</h2>
        <input
          type="text"
          placeholder="Username"
          className="w-full p-3 mb-4 border border-gray-300 rounded-md"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 mb-4 border border-gray-300 rounded-md"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="tel"
          placeholder="Phone Number"
          className="w-full p-3 mb-4 border border-gray-300 rounded-md"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 mb-4 border border-gray-300 rounded-md"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          className="w-full p-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          Register
        </button>
        <p className="mt-4 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-500 hover:underline">
            Log In
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;