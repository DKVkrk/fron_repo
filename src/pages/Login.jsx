// src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/login.css';
// ✅ Fix all imports like this:
import axios from '../utils/axios';

import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('/api/user/login', {
        email: formData.email,
        password: formData.password
      });

      console.log("Login response:", response.data); // Debug response shape

      if (response?.data?.success) {
        const accessToken = response.data.data.accesstoken;
        const role = response.data.data.user?.role;
        const userId = response.data.data.user?._id || response.data.data.user?.id;
        console.log('Login API response:', response.data);
        console.log('Extracted userId:', userId);

        if (!role) {
          toast.error("User role missing in response.");
          return;
        }

        localStorage.setItem("token", accessToken);
        localStorage.setItem("role", role);
        if (userId) localStorage.setItem("userId", userId);
        else console.warn('userId is missing, not set in localStorage!');

        toast.success("Login successful!");

        setTimeout(() => {
          if (role === "user") {
            navigate("/user/home");
          } else if (role === "driver") {
            navigate("/driver/home");
          } else {
            navigate("/"); // fallback route
          }
        }, 1000);
      } else {
        toast.error("Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      const message = error?.response?.data?.message || "Something went wrong";

      if (message === "User not register") {
        toast.error("Email is not registered.");
      } else if (message === "Check your password") {
        toast.error("Incorrect password.");
      } else if (message === "Contact to Admin") {
        toast.error("Your account is not active. Please contact admin.");
      } else if (message === "provide email, password") {
        toast.error("Please enter both email and password.");
      } else {
        toast.error(message);
      }
    }
  };

  return (
    <div className="login-page">
      <ToastContainer />
      <div className="login-container">
        <h2 className="login-title">Welcome Back!</h2>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="text"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your password"
              required
            />
          </div>
          <div className="form-options">
            <Link to="/forgotpassword" className="forgot-password-link">
              Forgot password?
            </Link>
          </div>
          <button type="submit" className="login-button">Log In</button>
        </form>
        <div className="signup-link-container">
          <p>Don't have an account? <Link to="/signup" className="signup-link">Sign Up</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;