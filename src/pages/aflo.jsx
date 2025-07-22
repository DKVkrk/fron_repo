import React from "react";
import { useNavigate } from "react-router-dom";

const NavbarPage = () => {
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate("/profile");
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
      `}</style>

      <div className="background">
        <div className="navbar">
          <div className="logo">MyApp</div>
          <div className="profile" onClick={handleProfileClick}>
            <img
              src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
              alt="Profile"
            />
          </div>
        </div>

        <div className="content">
          <h1>Welcome!</h1>
          <p>This is your dashboard page after login.</p>
        </div>
      </div>
    </div>
  );
};

export default NavbarPage;
