import React from "react";
import { useNavigate } from "react-router-dom";

const UserHome = () => {
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const handleRequestRideClick = () => {
    navigate("/request-ride");
  };

  return (
    <div>
      <style>{`
        body, html, #root {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
          font-family: Arial, sans-serif;
        }

        .background {
          height: 100vh;
          width: 100%;
          background: linear-gradient(135deg, #2193b0, #6dd5ed);
        }

        .navbar {
          width: 100%;
          background-color: #0f172a;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 40px;
          box-sizing: border-box;
        }

        .logo {
          font-size: 24px;
          font-weight: bold;
        }

        .profile {
          cursor: pointer;
        }

        .profile img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          transition: transform 0.3s ease;
        }

        .profile img:hover {
          transform: scale(1.1);
        }

        .content {
          padding: 20px;
          color: white;
          text-align: center;
        }

        .request-ride-btn {
          margin-top: 20px;
          padding: 12px 24px;
          background-color: #0f172a;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }

        .request-ride-btn:hover {
          background-color: #1e293b;
        }
      `}</style>

      <div className="background">
        <div className="navbar">
          <div className="logo">MyApp - User</div>
          <div className="profile" onClick={handleProfileClick}>
            <img
              src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
              alt="Profile"
            />
          </div>
        </div>

        <div className="content">
          <h1>Welcome, User!</h1>
          <p>This is your dashboard page after login.</p>
          <button className="request-ride-btn" onClick={handleRequestRideClick}>
            Request Ride
          </button>
          <button
            className="request-ride-btn"
            style={{ marginTop: 10, backgroundColor: '#2193b0' }}
            onClick={() => navigate('/rider/history')}
          >
            View Trip History
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserHome;
