import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { AuthContext } from '../Context/AuthContext';
import { toast } from 'react-toastify';

function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
  const res = await API.post('/auth/login', form);
  login(res.data.token, res.data.user.email);
  toast.success('Login successful!');
  navigate('/');
} catch (err) {
  toast.error(err.response?.data?.message || 'Login failed');
}};

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 relative">

      <div className="w-full text-center py-5 fixed top-0 left-0 z-10 bg-white/80 shadow-md backdrop-blur-sm">
        <h1 className="text-4xl font-extrabold text-blue-700 drop-shadow">Welcome to SignMate</h1>
      </div>

      <div className="flex justify-center items-center h-screen pt-24">
        <form
          onSubmit={handleSubmit}
          className="bg-white/90 p-8 rounded-2xl shadow-2xl backdrop-blur-md w-full max-w-md animate-zoomIn"
        >
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Login to Continue</h2>

          <input
            type="email"
            placeholder="Email"
            required
            className="border border-gray-300 p-3 mb-4 w-full rounded-md focus:ring-2 focus:ring-blue-400"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            required
            className="border border-gray-300 p-3 mb-6 w-full rounded-md focus:ring-2 focus:ring-blue-400"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <button className="bg-blue-600 hover:bg-blue-700 text-white py-3 w-full rounded-md font-semibold shadow">
            Login
          </button>

          <p className="mt-5 text-center text-sm text-gray-600">
            Don’t have an account?{' '}
            <Link to="/register" className="text-blue-600 font-medium hover:underline">Register Here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
