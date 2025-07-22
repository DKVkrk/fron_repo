import React, { useState } from 'react';
import Axios from '../utils/axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/forgot.css';

const ForgotAndResetPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const sendOtp = async () => {
    if (!email) return toast.error('Please enter your email.');

    try {
      // Add '/api' prefix here to match backend routes
      const res = await Axios.put('/api/user/forgot-password', { email });
      toast.success('OTP sent to your email!');
      setStep(2);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send OTP');
    }
  };

  const resetPassword = async () => {
    if (!email || !otp || !newPassword) return toast.error('Please fill all fields.');

    try {
      // Add '/api' prefix here as well
      const res = await Axios.put('/api/user/reset-password', { email, otp, newPassword });
      toast.success('Password reset successfully!');
      setStep(1);
      setEmail('');
      setOtp('');
      setNewPassword('');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to reset password');
    }
  };

  return (
    <div className="forgot-reset-container">
      <ToastContainer />
      <div className="form-box">
        <h2>{step === 1 ? 'Forgot Password' : 'Reset Password'}</h2>

        <input
          type="email"
          placeholder="Enter your registered email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {step === 2 && (
          <>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </>
        )}

        <button onClick={step === 1 ? sendOtp : resetPassword}>
          {step === 1 ? 'Send OTP' : 'Reset Password'}
        </button>
      </div>
    </div>
  );
};

export default ForgotAndResetPassword;
