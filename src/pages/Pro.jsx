// src/pages/Profile.jsx
import React, { useEffect, useState, useRef } from "react";
import "../styles/Pro.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// SVG fallback for avatar (base64 encoded)
const FALLBACK_AVATAR = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiB2aWV3Qm94PSIwIDAgMTUwIDE1MCI+PHJlY3QgZmlsbD0iI2RkZCIgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiLz48dGV4dCBmaWxsPSIjNjY2IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIEF2YXRhcjwvdGV4dD48L3N2Zz4=";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(false);
  const [updatedData, setUpdatedData] = useState({ name: "", email: "", role: "" });
  const [editMode, setEditMode] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(FALLBACK_AVATAR);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const API_BASE_URL = "http://localhost:8000";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchUserData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/user/details`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
          const userInfo = data.user || data.data?.user || data.data;
          if (userInfo) {
            setUser(userInfo);
            setUpdatedData({
              name: userInfo.name || "",
              email: userInfo.email || "",
              role: userInfo.role || "",
            });
            setAvatarPreview(userInfo.avatar?.url || FALLBACK_AVATAR);
          } else {
            setError(true);
            toast.error("User data is not in the expected format.");
          }
        } else {
          setError(true);
          toast.error(data.message || "Failed to fetch user details.");
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("token");
            navigate("/login");
          }
        }
      } catch (error) {
        setError(true);
        toast.error("An error occurred while fetching user data.");
        console.error("Fetch error:", error);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleChange = (e) => {
    setUpdatedData({ ...updatedData, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match("image.*")) {
        toast.error("Please select an image file");
        return;
      }
      
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Authentication token not found. Please log in again.");
      navigate("/login");
      return;
    }

    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/user/update-user`,
        updatedData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data?.success) {
        setUser(prev => ({ ...prev, ...updatedData }));
        toast.success("User details updated successfully!");
        setEditMode(false);
      } else {
        toast.error(response.data?.message || "Failed to update user details.");
      }
    } catch (err) {
      console.error("Update error:", err);
      const errorMsg = err.response?.data?.message || "An error occurred while updating details.";
      toast.error(errorMsg);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      toast.info("Please select an image file first.");
      return;
    }
    
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Authentication token not found. Please log in again.");
      navigate("/login");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", avatarFile);

    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/user/upload-avatar`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data?.success) {
        const newAvatarUrl = response.data.data?.avatar;
        setUser(prev => ({
          ...prev,
          avatar: { url: newAvatarUrl }
        }));
        setAvatarPreview(newAvatarUrl);
        toast.success("Avatar uploaded successfully!");
        setAvatarFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        toast.error(response.data?.message || "Failed to upload avatar.");
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error(err.response?.data?.message || "An error occurred during avatar upload.");
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    
    try {
      await axios.get(`${API_BASE_URL}/api/user/logout`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      localStorage.removeItem("token");
      toast.success("Logged out successfully!");
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
      toast.error(err.response?.data?.message || "Logout failed. Please try again.");
      localStorage.removeItem("token");
      navigate("/login");
    }
  };

  if (error && !user) {
    return <div className="error-message">⚠️ Error loading user data. Please try refreshing or logging in again.</div>;
  }

  if (!user) {
    return <div className="loading">Loading user data...</div>;
  }

  return (
    <div className="profile-container">
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      
      <h1>Welcome, {user.name}!</h1>

      <div className="profile-card">
        <div className="avatar-section">
          <img
            src={avatarPreview}
            alt="User Avatar"
            className="profile-avatar"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = FALLBACK_AVATAR;
            }}
          />
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="avatar-input"
            ref={fileInputRef}
            id="avatarUpload"
            style={{ display: 'none' }}
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="upload-avatar-btn-styled"
          >
            Change Avatar
          </button>
          {avatarFile && (
            <button onClick={handleAvatarUpload} className="upload-avatar-btn">
              Upload Selected Image
            </button>
          )}
        </div>

        <div className="profile-details">
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role}</p>
          <p><strong>Joined:</strong> {new Date(user.createdAt).toLocaleString()}</p>
          {user.role === 'driver' && user.license_number && (
            <p>
              <strong>License No:</strong> {user.license_number} 
              {user.verify_license ? " (Verified)" : " (Pending Verification)"}
            </p>
          )}
        </div>
      </div>

      <button 
        className="edit-toggle-btn" 
        onClick={() => setEditMode(!editMode)}
      >
        {editMode ? "Cancel Edit" : "Edit Details"}
      </button>

      {editMode && (
        <form onSubmit={handleUpdate} className="form-section">
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={updatedData.name}
            onChange={handleChange}
            placeholder="Full Name"
            required
          />
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={updatedData.email}
            onChange={handleChange}
            placeholder="Email Address"
            required
          />
          <button type="submit" className="update-details-btn">
            Update Details
          </button>
        </form>
      )}

      <button onClick={handleLogout} className="logout-button">
        Logout
      </button>
    </div>
  );
};

export default Profile;