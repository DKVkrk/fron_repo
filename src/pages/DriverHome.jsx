import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from '../utils/axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import io from 'socket.io-client';
import '../styles/DriverHome.css';
import { baseURL } from '../common/SummaryApi';

const DriverHome = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRides, setPendingRides] = useState([]);
  const [isFetchingRides, setIsFetchingRides] = useState(false);
  const [locationIntervalId, setLocationIntervalId] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [acceptedRides, setAcceptedRides] = useState([]);
  const [locationError, setLocationError] = useState(null);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const socketRef = useRef(null);
  const userIdRef = useRef(localStorage.getItem('userId'));
  const tokenRef = useRef(localStorage.getItem('token'));
  const abortControllerRef = useRef(new AbortController());
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);

  // Add OTP state for each accepted ride
  const [otpInputs, setOtpInputs] = useState({});
  // Add state to track if driver has reached the rider for each ride
  const [reachedRider, setReachedRider] = useState({});
  // State to track if OTP is verified for a specific ride (to enable Complete Ride)
  const [isOtpVerifiedForRide, setIsOtpVerifiedForRide] = useState({});

  // New state for image sharing
  const [receivedImages, setReceivedImages] = useState({}); // Stores images received for each rideId
  const [selectedImageFile, setSelectedImageFile] = useState({}); // Stores the file selected by input

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const generateUniqueKey = (userId, rideIndex) => {
    return `${userId}-${rideIndex}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const updateDriverLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      setLocationError("Geolocation not supported");
      return;
    }

    const handleSuccess = async (position) => {
      const { latitude, longitude } = position.coords;
      const newLocation = { lat: latitude, lng: longitude };
      setCurrentLocation(newLocation);
      setLocationError(null);

      try {
        await axios.post("/api/user/driver/update-location", {
          lat: latitude,
          lng: longitude
        }, {
          headers: {
            'Authorization': `Bearer ${tokenRef.current}`
          }
        });

        if (socketRef.current?.connected) {
          socketRef.current.emit('updateDriverLocation', {
            driverId: userIdRef.current,
            location: newLocation
          });

          // Check for accepted rides to notify riders if driver is close
          acceptedRides.forEach(ride => {
            const riderPickupLat = ride.pickup_location.lat;
            const riderPickupLng = ride.pickup_location.lng;
            const distanceToRider = calculateDistance(
              latitude,
              longitude,
              riderPickupLat,
              riderPickupLng
            );

            // If driver is within 100 meters of pickup location and hasn't notified yet
            if (distanceToRider * 1000 <= 100 && !reachedRider[ride._id]) { // Use ride._id
              socketRef.current.emit('driverReachedRider', {
                riderId: ride.userId,
                rideId: ride._id // Use ride._id
              });
              setReachedRider(prev => ({ ...prev, [ride._id]: true }));
            }
          });
        }
      } catch (error) {
        console.error("Location update error:", error);
        if (error.response?.status === 401) {
          toast.error("Session expired. Please login again.");
          navigate('/login');
        }
      }
    };

    const handleError = (error) => {
      console.error("Geolocation error:", error);
      setLocationError(error.message);
      if (!currentLocation) {
        toast.error(`Location error: ${error.message}`);
      }
    };

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [currentLocation, navigate, acceptedRides, reachedRider, calculateDistance]); // Added dependencies

  const setupSocket = useCallback(() => {
    if (socketRef.current?.connected) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const newSocket = io(baseURL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      auth: { token: tokenRef.current },
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    newSocket.on('connect', () => {
      if (!isMountedRef.current) return;
      console.log('Connected to WebSocket');
      setSocketStatus('connected');
      reconnectAttemptsRef.current = 0;

      if (isOnline && userIdRef.current) {
        newSocket.emit('driverOnline', userIdRef.current);
      }
    });

    newSocket.on('disconnect', (reason) => {
      if (!isMountedRef.current) return;
      console.log('Disconnected:', reason);
      setSocketStatus('disconnected');

      if (reason === 'io server disconnect') {
        setTimeout(() => newSocket.connect(), 1000);
      }
    });

    newSocket.on('connect_error', (error) => {
      if (!isMountedRef.current) return;
      console.error('Connection error:', error);
      setSocketStatus('error');
      reconnectAttemptsRef.current += 1;

      if (reconnectAttemptsRef.current <= 5) {
        setTimeout(() => newSocket.connect(), Math.min(5000, reconnectAttemptsRef.current * 1000));
      }
    });

    newSocket.on('error', (error) => {
      if (!isMountedRef.current) return;
      console.error('WebSocket error:', error);
      setSocketStatus('error');
    });

    newSocket.on('newRideAvailable', (newRideData) => {
      console.log('Received newRideAvailable event:', newRideData);
      toast.info('New ride requested!');
      if (!isMountedRef.current || !isOnline || !currentLocation) return;

      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        newRideData.pickup_location.lat,
        newRideData.pickup_location.lng
      );

      if (distance <= 5) {
        setPendingRides(prev => {
          const exists = prev.some(r =>
            r.userId === newRideData.userId && r.rideIndex === newRideData.rideIndex
          );
          if (exists) return prev;

          return [{
            ...newRideData,
            userId: newRideData.userId,
            rideIndex: newRideData.rideIndex,
            distance: distance.toFixed(2) + ' km',
            uniqueKey: generateUniqueKey(newRideData.userId, newRideData.rideIndex),
            formattedRequestTime: formatDateTime(
              newRideData.request_time || newRideData.createdAt || newRideData.timestamp
            )
          }, ...prev];
        });
      }
    });

    newSocket.on('rideAcceptedByOther', ({ rideId }) => {
      if (!isMountedRef.current) return;
      setPendingRides(prev =>
        prev.filter(r => r._id !== rideId)
      );
      toast.info("Ride accepted by another driver");
    });

    // Handle OTP verification response from server
    newSocket.on('otpVerificationResponse', ({ rideId, success, message }) => {
      if (!isMountedRef.current) return;
      if (success) {
        toast.success(message || 'OTP verified! You can start the ride.');
        setIsOtpVerifiedForRide(prev => ({ ...prev, [rideId]: true }));
        // Optionally update ride status to ongoing immediately here if backend doesn't handle it
        setAcceptedRides(prev => prev.map(ride =>
          ride._id === rideId ? { ...ride, status: 'ongoing' } : ride
        ));
      } else {
        toast.error(message || 'Wrong OTP! Please try again.');
        setIsOtpVerifiedForRide(prev => ({ ...prev, [rideId]: false }));
      }
    });

    newSocket.on('rideCancelled', ({ rideId }) => {
      if (!isMountedRef.current) return;
      setAcceptedRides(prev =>
        prev.filter(r => r._id !== rideId)
      );
      toast.info("Ride was cancelled by the rider");
    });

    // NEW: Listen for incoming image messages
    newSocket.on('imageMessage', ({ rideId, imageUrl, senderId, senderRole }) => {
      if (!isMountedRef.current) return;
      console.log(`Received image for ride ${rideId} from ${senderRole}: ${imageUrl}`);
      setReceivedImages(prev => {
        const currentImages = prev[rideId] || [];
        // Only add if not already present (to prevent duplicates if server echoes back)
        if (!currentImages.some(img => img.imageUrl === imageUrl && img.senderId === senderId)) {
          return {
            ...prev,
            [rideId]: [...currentImages, { imageUrl, senderId, timestamp: new Date() }]
          };
        }
        return prev;
      });

      if (senderId !== userIdRef.current) { // Only show toast if it's from the other party
        toast.info(`New image received for ride ${rideId}`);
      }
    });


    socketRef.current = newSocket;

    return () => {
      newSocket.disconnect();
    };
  }, [isOnline, currentLocation, calculateDistance]);

  const isCancel = (error) => {
    return error && error.name === 'CanceledError';
  };

  const fetchWithRetry = useCallback(async (url, options = {}, retries = 3) => {
    try {
      const response = await axios.get(url, {
        ...options,
        signal: abortControllerRef.current.signal,
        headers: {
          'Authorization': `Bearer ${tokenRef.current}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      return response;
    } catch (error) {
      if (!isMountedRef.current || isCancel(error)) throw error;
      if (retries <= 0 || error.response?.status === 401) throw error;

      await new Promise(res => setTimeout(res, 1000 * (4 - retries)));
      return fetchWithRetry(url, options, retries - 1);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const fetchDriverProfile = async () => {
      try {
        const response = await fetchWithRetry("/api/user/profile");
        if (!isMountedRef.current) return;

        const { isOnline: initialIsOnline, current_location } = response.data;
        setIsOnline(initialIsOnline);

        if (current_location) setCurrentLocation(current_location);

        if (initialIsOnline) {
          updateDriverLocation();
          const interval = setInterval(updateDriverLocation, 15000);
          setLocationIntervalId(interval);
        }
      } catch (error) {
        if (!isCancel(error) && isMountedRef.current) {
          console.error("Profile fetch error:", error);
          if (error.response?.status === 401) {
            navigate('/login');
          }
        }
      } finally {
        if (isMountedRef.current) setIsLoading(false);
      }
    };

    fetchDriverProfile();
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current.abort();
      if (locationIntervalId) clearInterval(locationIntervalId);
    };
  }, [updateDriverLocation, fetchWithRetry, navigate]);

  useEffect(() => {
    if (isMountedRef.current) setupSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [setupSocket]);

  const toggleOnlineStatus = async () => {
    try {
      const newStatus = !isOnline;
      const response = await axios.post(
        "/api/user/driver/toggle-status",
        { isOnline: newStatus },
        { headers: { 'Authorization': `Bearer ${tokenRef.current}` } }
      );

      if (!isMountedRef.current) return;

      setIsOnline(newStatus);
      toast.success(response.data.message);

      if (newStatus) {
        updateDriverLocation();
        const interval = setInterval(updateDriverLocation, 15000);
        setLocationIntervalId(interval);
        if (socketRef.current?.connected) {
          socketRef.current.emit('driverOnline', userIdRef.current);
        }
      } else {
        if (locationIntervalId) clearInterval(locationIntervalId);
        setLocationIntervalId(null);
        setPendingRides([]);
        setAcceptedRides([]);
        // Reset OTP states when going offline
        setOtpInputs({});
        setReachedRider({});
        setIsOtpVerifiedForRide({});
        setReceivedImages({}); // Clear received images
        setSelectedImageFile({}); // Clear selected image file
        if (socketRef.current?.connected) {
          socketRef.current.emit('driverOffline', userIdRef.current);
        }
      }
    } catch (error) {
      console.error("Status toggle error:", error);
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || "Status update failed");
      }
    }
  };

  const fetchPendingRides = useCallback(async () => {
    if (!isOnline || !currentLocation) return;
    try {
      setIsFetchingRides(true);
      const response = await fetchWithRetry("/api/user/driver/pending-rides");
      if (!isMountedRef.current) return;

      const filteredRides = response.data.data
        .filter(ride => !acceptedRides.some(r =>
          r.userId === ride.userId && r.rideIndex === ride.rideIndex
        ))
        .map(ride => ({
          ...ride,
          uniqueKey: generateUniqueKey(ride.userId, ride.rideIndex),
          formattedRequestTime: formatDateTime(
            ride.request_time || ride.createdAt || ride.timestamp || ride.requested_at || null
          )
        }));

      setPendingRides(filteredRides);
    } catch (error) {
      if (!isCancel(error) && isMountedRef.current) {
        console.error("Pending rides error:", error);
        if (error.response?.status === 401) {
          navigate('/login');
        } else {
          toast.error("Failed to fetch pending rides");
        }
      }
    } finally {
      if (isMountedRef.current) setIsFetchingRides(false);
    }
  }, [isOnline, acceptedRides, currentLocation, fetchWithRetry, navigate]);

  const fetchAcceptedRides = useCallback(async () => {
    if (!isOnline) return;
    try {
      setIsFetchingRides(true);
      const response = await fetchWithRetry("/api/user/driver/accepted-rides");
      if (!isMountedRef.current) return;

      setAcceptedRides(response.data.data.map(ride => {
        const acceptedTime = ride.accepted_at || ride.acceptedAt ||
          ride.updatedAt || ride.modified_at || null;

        return {
          ...ride,
          uniqueKey: generateUniqueKey(ride.userId, ride.rideIndex),
          formattedRequestTime: formatDateTime(
            ride.request_time || ride.createdAt || ride.timestamp || ride.requested_at || null
          ),
          formattedAcceptedTime: formatDateTime(acceptedTime),
          accepted_at: acceptedTime || new Date().toISOString()
        };
      }));
    } catch (error) {
      if (!isCancel(error) && isMountedRef.current) {
        console.error("Accepted rides error:", error);
        if (error.response?.status === 401) {
          navigate('/login');
        } else {
          toast.error("Failed to fetch accepted rides");
        }
      }
    } finally {
      if (isMountedRef.current) setIsFetchingRides(false);
    }
  }, [isOnline, fetchWithRetry, navigate]);

  useEffect(() => {
    abortControllerRef.current = new AbortController();
    if (activeTab === 'pending' && isOnline && isMountedRef.current) {
      fetchPendingRides();
    }
    return () => abortControllerRef.current.abort();
  }, [activeTab, isOnline, currentLocation, fetchPendingRides]);

  useEffect(() => {
    abortControllerRef.current = new AbortController();
    if (activeTab === 'accepted' && isOnline && isMountedRef.current) {
      fetchAcceptedRides();
    }
    return () => abortControllerRef.current.abort();
  }, [activeTab, isOnline, fetchAcceptedRides]);

  const handleAcceptRide = async (userId, rideIndex) => {
    console.log('Accepting ride with:', { userId, rideIndex });
    try {
      const response = await axios.post(
        "/api/user/driver/accept-ride",
        { userId, rideIndex },
        { headers: { 'Authorization': `Bearer ${tokenRef.current}` } }
      );

      toast.success(response.data.message);

      setPendingRides(prev => {
        const acceptedRide = prev.find(r =>
          r.userId === userId && r.rideIndex === rideIndex
        );

        if (acceptedRide) {
          const acceptedTime = new Date().toISOString();
          setAcceptedRides(prevAccepted => [{
            ...acceptedRide,
            status: "accepted",
            accepted_at: acceptedTime,
            uniqueKey: generateUniqueKey(userId, rideIndex),
            formattedAcceptedTime: formatDateTime(acceptedTime),
          }, ...prevAccepted]);
          return prev.filter(r => !(r.userId === userId && r.rideIndex === rideIndex));
        }
        return prev;
      });

      // Emit driverAcceptsRide via socket
      if (socketRef.current?.connected) {
        socketRef.current.emit('driverAcceptsRide', {
          rideId: response.data.data.rideMongoId, // Use the actual ride _id from backend
          driverId: userIdRef.current,
          userId: userId,
          driverName: response.data.data.driverName,
          vehicleType: response.data.data.vehicleType,
          driverProfilePhoto: response.data.data.driverProfilePhoto // pass driver photo
        });
      }

    } catch (error) {
      console.error("Accept ride error:", error);
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || "Failed to accept ride");
        fetchPendingRides(); // Re-fetch to update status
      }
    }
  };

  const handleRejectRide = async (userId, rideIndex) => {
    try {
      // In a real app, you might want to send the ride ID not just userId, rideIndex
      // For now, this just removes it from the driver's pending list.
      await axios.post(
        "/api/user/driver/reject-ride",
        { userId, rideIndex },
        { headers: { 'Authorization': `Bearer ${tokenRef.current}` } }
      );

      toast.success("Ride rejected");
      setPendingRides(prev =>
        prev.filter(r => !(r.userId === userId && r.rideIndex === rideIndex))
      );
    } catch (error) {
      console.error("Reject ride error:", error);
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        toast.error("Failed to reject ride");
      }
    }
  };

const handleVerifyOtp = async (rideId, enteredOtp) => {
  try {
    const response = await axios.post(
      "/api/user/ride/verify-otp",
      { rideId, enteredOtp },
      { headers: { 'Authorization': `Bearer ${tokenRef.current}` } }
    );
    // The socket event 'otpVerificationResponse' from the backend will handle toast and state update
  } catch (error) {
    console.error("Error verifying OTP (frontend Axios catch):", error); // More specific log
    console.error("Error response data:", error.response?.data); // Log response data
    console.error("Error status:", error.response?.status); // Log status
    toast.error(error.response?.data?.message || "Failed to verify OTP. Server error."); // Show server message
  }
};


  const handleCompleteRide = async (customerId, rideIndex, rideMongoId) => {
    try {
      if (!isOtpVerifiedForRide[rideMongoId]) {
        toast.error('OTP must be verified before completing the ride.');
        return;
      }

      const response = await axios.put(
        "/api/user/ride/complete",
        { customerId, rideIndex },
        { headers: { 'Authorization': `Bearer ${tokenRef.current}` } }
      );

      toast.success(response.data.message);

      setAcceptedRides(prev =>
        prev.filter(r => !(r.userId === customerId && r.rideIndex === rideIndex))
      );
      // Clean up OTP and reached rider status for the completed ride
      setOtpInputs(prev => {
        const newState = { ...prev };
        delete newState[rideMongoId];
        return newState;
      });
      setReachedRider(prev => {
        const newState = { ...prev };
        delete newState[rideMongoId];
        return newState;
      });
      setIsOtpVerifiedForRide(prev => {
        const newState = { ...prev };
        delete newState[rideMongoId];
        return newState;
      });
      setReceivedImages(prev => { // Clear images for completed ride
        const newState = { ...prev };
        delete newState[rideMongoId];
        return newState;
      });
      setSelectedImageFile(prev => { // Clear selected image file
        const newState = { ...prev };
        delete newState[rideMongoId];
        return newState;
      });

    } catch (error) {
      console.error("Complete ride error:", error);
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        toast.error("Failed to complete ride");
        fetchAcceptedRides();
      }
    }
  };

  // Helper function to format time
  const formatDateTime = (timestamp) => {
    try {
      if (!timestamp) return "Time not available";
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (error) {
      console.error('Date formatting error:', error);
      return "Time not available";
    }
  };

  // NEW: Handle file selection from input
  const handleFileChange = (event, rideId) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file.");
        event.target.value = ''; // Clear file input
        setSelectedImageFile(prev => ({ ...prev, [rideId]: null }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5 MB limit
        toast.error("Image size must be less than 5MB.");
        event.target.value = ''; // Clear file input
        setSelectedImageFile(prev => ({ ...prev, [rideId]: null }));
        return;
      }
      setSelectedImageFile(prev => ({ ...prev, [rideId]: file }));
    } else {
      setSelectedImageFile(prev => ({ ...prev, [rideId]: null }));
    }
  };

  // NEW: Handle image upload on explicit send
  const sendImage = async (rideId, recipientUserId) => {
    const fileToSend = selectedImageFile[rideId];
    if (!fileToSend) {
      toast.error("No image selected to send.");
      return;
    }

    const formData = new FormData();
    formData.append('image', fileToSend);
    formData.append('rideId', rideId);
    formData.append('recipientId', recipientUserId); // The rider's ID

    try {
      toast.info("Sending image...");
      const response = await axios.post('/api/user/send-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${tokenRef.current}`
        }
      });

      if (response.data.success) {
        toast.success("Image sent successfully!");
        // The server will emit the socket event to the recipient AND to the sender for display
        setSelectedImageFile(prev => ({ ...prev, [rideId]: null })); // Clear selected file after sending
      } else {
        toast.error(response.data.message || "Failed to send image.");
      }
    } catch (error) {
      console.error("Error sending image:", error);
      toast.error(error.response?.data?.message || "Error sending image.");
    }
  };

  if (isLoading) {
    return (
      <div className="driver-container loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading driver information...</p>
      </div>
    );
  }

  return (
    <div className="driver-container">
      <ToastContainer position="top-right" autoClose={3000} />

      <header className="driver-header">
        <div className="header-content">
          <h1 className="app-name">
            <span className="material-symbols-outlined">directions_car</span>
            Rideshare Driver
          </h1>
          <div className="profile" onClick={handleProfileClick}>
            <img
              src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
              alt="Profile"
              className="profile-img"
              loading="eager"
            />
          </div>
        </div>
      </header>

      <div className="status-controls">
        <div className="connection-status">
          <span className={`status-dot ${socketStatus}`}></span>
          WebSocket: {socketStatus}
        </div>
        <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
          <span className="status-dot"></span>
          {isOnline ? 'Online' : 'Offline'}
        </div>
        <button
          className={`status-toggle-btn ${isOnline ? 'online' : 'offline'}`}
          onClick={toggleOnlineStatus}
          disabled={locationError && !currentLocation}
        >
          {isOnline ? (
            <>
              <span className="material-symbols-outlined">toggle_off</span>
              Go Offline
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">toggle_on</span>
              Go Online
            </>
          )}
        </button>
      </div>

      <div className="location-info">
        {currentLocation ? (
          <>
            <span className="material-symbols-outlined location-icon">location_on</span>
            <span className="location-text">
              {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
            </span>
          </>
        ) : locationError ? (
          <span className="location-error">
            <span className="material-symbols-outlined">warning</span>
            {locationError}
          </span>
        ) : (
          <span className="location-loading">
            <span className="material-symbols-outlined">location_searching</span>
            Detecting location...
          </span>
        )}
      </div>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Rides
        </button>
        <button
          className={`tab-btn ${activeTab === 'accepted' ? 'active' : ''}`}
          onClick={() => setActiveTab('accepted')}
        >
          Accepted Rides
        </button>
      </div>

      <div className="rides-container">
        {isFetchingRides ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading rides...</p>
          </div>
        ) : activeTab === 'pending' ? (
          pendingRides.length > 0 ? (
            <ul className="rides-list">
              {pendingRides.map((ride) => (
                <li key={ride.uniqueKey} className="ride-card">
                  <div className="ride-info">
                    <h3>
                      <span className="material-symbols-outlined">my_location</span>
                      Ride from {ride.pickup_location.address}
                    </h3>

                    <div className="ride-details">
                      <div className="location-details">
                        <div className="location-row">
                          <span className="material-symbols-outlined location-icon">location_on</span>
                          <div className="address-container">
                            <span className="detail-label">To:</span>
                            <span className="detail-value">{ride.dropoff_location.address}</span>
                          </div>
                        </div>
                      </div>

                      <div className="ride-meta">
                        <div className="meta-item">
                          <span className="detail-label">Requested:</span>
                          <span className="time-display">
                            <span className="material-symbols-outlined">schedule</span>
                            {ride.formattedRequestTime}
                          </span>
                        </div>

                        <div className="meta-item">
                          <span className="detail-label">Distance:</span>
                          <span className="meta-value">{ride.distance}</span>
                        </div>

                        <div className="meta-item">
                          <span className="detail-label">Fare:</span>
                          <span className="fare-display">${ride.fare?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="action-buttons">
                      <button
                        className="action-btn accept-btn"
                        onClick={() => handleAcceptRide(ride.userId, ride.rideIndex)}
                      >
                        <span className="material-symbols-outlined">check_circle</span>
                        Accept Ride
                      </button>
                      <button
                        className="action-btn reject-btn"
                        onClick={() => handleRejectRide(ride.userId, ride.rideIndex)}
                      >
                        <span className="material-symbols-outlined">cancel</span>
                        Reject
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="no-rides">
              <span className="material-symbols-outlined">directions_car</span>
              <p>No pending rides available</p>
            </div>
          )
        ) : acceptedRides.length > 0 ? (
          <ul className="rides-list">
            {acceptedRides.map((ride) => (
              <li key={ride.uniqueKey} className="ride-card">
                <div className="ride-info">
                  <h3>
                    <span className="material-symbols-outlined">my_location</span>
                    Ride to {ride.dropoff_location.address}
                  </h3>

                  <div className="ride-details">
                    <div className="location-details">
                      <div className="location-row">
                        <span className="material-symbols-outlined location-icon">location_on</span>
                        <div className="address-container">
                          <span className="detail-label">From:</span>
                          <span className="detail-value">{ride.pickup_location.address}</span>
                        </div>
                      </div>
                    </div>

                    <div className="ride-meta">
                      <div className="meta-item">
                        <span className="detail-label">Requested:</span>
                        <span className="time-display">
                          <span className="material-symbols-outlined">schedule</span>
                          {ride.formattedRequestTime}
                        </span>
                      </div>

                      <div className="meta-item">
                        <span className="detail-label">Accepted:</span>
                        <span className="time-display">
                          <span className="material-symbols-outlined">schedule</span>
                          {ride.formattedAcceptedTime}
                        </span>
                      </div>

                      <div className="meta-item">
                        <span className="detail-label">Status:</span>
                        <span className="meta-value">{ride.status || 'accepted'}</span>
                      </div>

                      <div className="meta-item">
                        <span className="detail-label">Fare:</span>
                        <span className="fare-display">${ride.fare?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Reached Rider button and OTP input for this ride */}
                  <div className="otp-section">
                    <button
                      onClick={() => setReachedRider(state => ({ ...state, [ride._id]: true }))} // Use ride._id
                      disabled={reachedRider[ride._id]}
                      style={{ marginBottom: '8px', marginRight: '10px' }}
                    >
                      {reachedRider[ride._id] ? 'Reached' : 'Reached Rider'}
                    </button>
                    <label>Enter OTP from Rider:</label>
                    <input
                      type="text"
                      value={otpInputs[ride._id] || ''} // Use ride._id
                      onChange={e => setOtpInputs(inputs => ({ ...inputs, [ride._id]: e.target.value }))}
                      maxLength={6}
                      style={{ marginRight: '10px' }}
                      disabled={!reachedRider[ride._id] || isOtpVerifiedForRide[ride._id]}
                    />
                    <button
                      onClick={() => {
                        const otp = otpInputs[ride._id];
                        if (!reachedRider[ride._id]) {
                          toast.error('You must confirm reaching the rider before entering OTP');
                          return;
                        }
                        if (otp && otp.length === 6) {
                          handleVerifyOtp(ride._id, otp); // Pass ride._id
                        } else {
                          toast.error('Please enter a valid 6-digit OTP');
                        }
                      }}
                      disabled={!reachedRider[ride._id] || isOtpVerifiedForRide[ride._id]}
                    >Verify OTP</button>
                    {isOtpVerifiedForRide[ride._id] && <span style={{ color: 'green', marginLeft: '10px' }}>OTP Verified!</span>}
                  </div>

                  {/* NEW: Image Sharing Section (only if accepted or ongoing) */}
                  {(ride.status === 'accepted' || ride.status === 'ongoing') ? (
                    <div className="image-sharing-section" style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                      <h4>Share Image with Rider:</h4>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, ride._id)} // Handle file change
                        style={{ display: 'block', marginBottom: '10px' }}
                      />
                      {selectedImageFile[ride._id] && (
                        <button
                          onClick={() => sendImage(ride._id, ride.userId)} // Send image
                          style={{ marginBottom: '10px', padding: '8px 15px', cursor: 'pointer' }}
                        >
                          Send Image
                        </button>
                      )}
                      {/* Display received images */}
                      {receivedImages[ride._id]?.length > 0 && (
                        <div className="received-images-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                          <h5>Conversation Images:</h5>
                          {receivedImages[ride._id].map((img, idx) => (
                            <div key={idx} style={{ border: '1px solid #ddd', padding: '5px', borderRadius: '5px', maxWidth: '120px' }}>
                                <img src={img.imageUrl} alt={`Sent/Received ${idx}`} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '3px' }} />
                                <small style={{display: 'block', textAlign: 'center', fontSize: '0.75em'}}>
                                  From {img.senderId === userIdRef.current ? 'You' : 'Rider'} @ {new Date(img.timestamp).toLocaleTimeString()}
                                </small>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}


                  <div className="action-buttons">
                    <button
                      className="action-btn complete-btn"
                      onClick={() => handleCompleteRide(ride.userId, ride.rideIndex, ride._id)} // Pass ride._id
                      disabled={!isOtpVerifiedForRide[ride._id]} // Disable until OTP is verified
                    >
                      <span className="material-symbols-outlined">done_all</span>
                      Complete Ride
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="no-rides">
            <span className="material-symbols-outlined">directions_car</span>
            <p>No accepted rides</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverHome;