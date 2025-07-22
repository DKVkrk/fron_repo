// src/pages/SignupOptions.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SignupOptions.css'; // Link to its dedicated CSS

const SignupOptions = () => {
  const navigate = useNavigate();

  const handleRiderSignup = () => {
    navigate('/signup/user'); // Navigate to the user signup page
  };

  const handleDriverSignup = () => {
    navigate('/signup/driver'); // Navigate to the driver signup page
  };

  return (
    <div className="signup-options-page">
      <div className="container">
        {/* User Signup Option */}
        <div className="option-box" onClick={handleRiderSignup}>
          <div className="icon">🧍‍♂️</div>
          <h3>Sign Up as Rider</h3>
          <p>Book rides in seconds, track drivers, and travel safely with RideNow.</p>
          <button className="btn">Continue as Rider</button>
        </div>

        {/* Driver Signup Option */}
        <div className="option-box" onClick={handleDriverSignup}>
          <div className="icon">🚗</div>
          <h3>Sign Up as Driver</h3>
          <p>Drive with RideNow and earn by helping others reach their destination.</p>
          <button className="btn">Continue as Driver</button>
        </div>
      </div>
    </div>
  );
};

export default SignupOptions;