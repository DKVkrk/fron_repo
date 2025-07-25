import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import L from "leaflet"; // This line is crucial!
import "leaflet/dist/leaflet.css";
import axios from "../utils/axios";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import io from "socket.io-client";
import { baseURL } from "../common/SummaryApi";
import "../styles/RideRequest.css";
// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

// Custom icons
const pickupIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [30, 40],
});

const dropoffIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
  iconSize: [30, 40],
});

const driverIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
  iconSize: [30, 30],
});

function SetMapView({ coords, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView(coords, zoom);
  }, [coords, zoom, map]);
  return null;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
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
}

const RideRequest = () => {
  const [pickupCoords, setPickupCoords] = useState(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [selectedDropoffCoords, setSelectedDropoffCoords] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [fare, setFare] = useState(0);
  const [isCalculatingFare, setIsCalculatingFare] = useState(false);
  const [rideStatus, setRideStatus] = useState("not_requested");
  const [driverLocation, setDriverLocation] = useState(null);
  const [currentRideId, setCurrentRideId] = useState(null);
  const [driverDetails, setDriverDetails] = useState(null);
  const [eta, setEta] = useState(null);
  const socketRef = useRef(null);
  const locationIntervalRef = useRef(null);
  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");
  const mapRef = useRef(null);

  // Add OTP and ride progress state
  const [rideOtp, setRideOtp] = useState(null);
  const [otpVerified, setOtpVerified] = useState(false);
  const [driverReached, setDriverReached] = useState(false); // New state for driver reached

  // New state for image sharing
  const [receivedImages, setReceivedImages] = useState({}); // Stores images received for each rideId
  const [selectedImageFile, setSelectedImageFile] = useState(null); // Stores the file selected by input

  const vehicleOptions = [
    {
      id: 1,
      name: "Standard Car",
      icon: "https://cdn-icons-png.flaticon.com/512/744/744465.png",
      baseRate: 40,
      perKmRate: 12,
      capacity: "4 passengers",
      estimatedTime: "5-10 min"
    },
    {
      id: 2,
      name: "Premium Car",
      icon: "https://cdn-icons-png.flaticon.com/512/3079/3079021.png",
      baseRate: 60,
      perKmRate: 18,
      capacity: "4 passengers",
      estimatedTime: "5-10 min"
    },
    {
      id: 3,
      name: "Bike",
      icon: "https://cdn-icons-png.flaticon.com/512/2972/2972185.png",
      baseRate: 20,
      perKmRate: 8,
      capacity: "1 passenger",
      estimatedTime: "3-7 min"
    },
    {
      id: 4,
      name: "SUV",
      icon: "https://cdn-icons-png.flaticon.com/512/2489/2489753.png",
      baseRate: 70,
      perKmRate: 20,
      capacity: "6 passengers",
      estimatedTime: "7-12 min"
    }
  ];

  // Initialize socket connection
  useEffect(() => {
    const socket = io(baseURL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket server, registering userId:', userId);
      socket.emit('registerUser', userId);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      toast.error('Connection error. Trying to reconnect...');
    });

    socket.on('otpGenerated', ({ otp }) => {
      setRideOtp(otp);
      toast.info(`Your ride OTP: ${otp}`);
    });

    socket.on('otpVerificationResponse', ({ rideId, success, message }) => {
      if (rideId === currentRideId) {
        if (success) {
          setOtpVerified(true);
          toast.success(message || 'OTP verified successfully! Your ride has started.');
          setRideStatus("ongoing"); // Change status to ongoing after OTP verification
        } else {
          setOtpVerified(false);
          toast.error(message || 'Wrong OTP! Please try again.');
        }
      }
    });

    socket.on('rideAccepted', (data) => {
      setRideStatus("accepted");
      setDriverDetails({
        driverId: data.driverId || "",
        driverName: data.driverName || "Driver",
        vehicleType: data.vehicleType || "Standard Car",
        driverProfilePhoto: data.driverProfilePhoto || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
      });
      // OTP is now provided in the initial ride request response, so no need to fetch here
      console.log("Ride Accepted Data:", data);
      toast.success("Your ride has been accepted! Driver is on the way.");
    });

    socket.on('driverLocationUpdate', (location) => {
      setDriverLocation([location.lat, location.lng]);
      updateEta(location);
    });

    socket.on('driverReachedRider', ({ riderId, rideId }) => {
      if (riderId === userId && rideId === currentRideId) {
        setDriverReached(true);
        toast.info("Your driver has arrived!");
      }
    });

    socket.on('rideRejected', (data) => {
      setRideStatus("not_requested"); // Go back to not_requested for re-request
      setCurrentRideId(null);
      setDriverLocation(null);
      setDriverDetails(null);
      toast.info(data.message || "Driver rejected your ride. Please request again.");
    });

    socket.on('rideCompleted', (data) => {
      if (data.userId === userId && data.rideId === currentRideId) {
        setRideStatus("completed");
        toast.success("Ride completed successfully!");
        if (locationIntervalRef.current) {
          clearInterval(locationIntervalRef.current);
        }
        setTimeout(() => {
          resetRide();
        }, 3000);
      }
    });

    socket.on('rideCancelled', ({ rideId }) => {
      if (rideId === currentRideId) {
        toast.info("Your ride was cancelled.");
        resetRide();
      }
    });

    // NEW: Listen for incoming image messages
    socket.on('imageMessage', ({ rideId, imageUrl, senderId, senderRole }) => {
      if (rideId === currentRideId) {
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
        if (senderId !== userId) { // Only show toast if it's from the other party
          toast.info(`New image received for your ride!`);
        }
      }
    });


    return () => {
      socket.disconnect();
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, [userId, token, currentRideId, pickupCoords]); // Added currentRideId to dependencies for socket events

  // Get current location for pickup
  useEffect(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setPickupCoords([latitude, longitude]);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          setPickupAddress(data.display_name || "Current Location");
        } catch {
          toast.error("Failed to get pickup address");
        }
      },
      () => {
        toast.error("Unable to retrieve your location");
      }
    );
  }, []);

  // Calculate fare
  useEffect(() => {
    if (pickupCoords && selectedDropoffCoords && selectedVehicle) {
      calculateFare();
    }
  }, [pickupCoords, selectedDropoffCoords, selectedVehicle]);

  const calculateFare = () => {
    if (!pickupCoords || !selectedDropoffCoords || !selectedVehicle) return;

    setIsCalculatingFare(true);

    const distance = calculateDistance(
      pickupCoords[0],
      pickupCoords[1],
      selectedDropoffCoords[0],
      selectedDropoffCoords[1]
    );

    const selectedVehicleData = vehicleOptions.find(v => v.id === selectedVehicle);
    if (selectedVehicleData) {
      const calculatedFare = selectedVehicleData.baseRate + (distance * selectedVehicleData.perKmRate);
      setFare(Math.round(calculatedFare));
    }

    setIsCalculatingFare(false);
  };

  // Update ETA based on driver location
  const updateEta = (driverLoc) => {
    if (!pickupCoords || !driverLoc) return;

    const distance = calculateDistance(
      driverLoc[0], // driverLoc is already an array [lat, lng]
      driverLoc[1],
      pickupCoords[0],
      pickupCoords[1]
    );

    // Assuming average speed of 30 km/h in city traffic
    const minutes = Math.round((distance / 30) * 60);
    setEta(minutes < 1 ? "Less than a minute" : `${minutes} minutes`);
  };

  // Handle dropoff change
  const handleDropoffChange = async (e) => {
    const query = e.target.value;
    setDropoffAddress(query);

    if (query.length < 3) {
      setDropoffSuggestions([]);
      return;
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&countrycodes=in&limit=5`
      );
      const data = await res.json();
      setDropoffSuggestions(data);
    } catch {
      toast.error("Failed to fetch dropoff suggestions");
    }
  };

  // Handle dropoff select
  const handleDropoffSelect = (place) => {
    setDropoffAddress(place.display_name);
    setSelectedDropoffCoords([parseFloat(place.lat), parseFloat(place.lon)]);
    setDropoffSuggestions([]);
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!pickupAddress || !dropoffAddress || !pickupCoords || !selectedDropoffCoords) {
      toast.error("Please provide valid pickup and dropoff locations.");
      return;
    }

    if (!selectedVehicle) {
      toast.error("Please select a vehicle type.");
      return;
    }

    const pickup_location = {
      lat: pickupCoords[0],
      lng: pickupCoords[1],
      address: pickupAddress
    };

    const dropoff_location = {
      lat: selectedDropoffCoords[0],
      lng: selectedDropoffCoords[1],
      address: dropoffAddress
    };

    try {
      const response = await axios.post("/api/user/ride/request", {
        pickup_location,
        dropoff_location,
        fare,
        vehicle_type: vehicleOptions.find(v => v.id === selectedVehicle)?.name || "Standard Car"
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setCurrentRideId(response.data.data.rideId);
      setRideStatus("requested");
      if (response.data.data.otp) {
        setRideOtp(response.data.data.otp);
        toast.info(`Your ride OTP: ${response.data.data.otp}`);
      }
      toast.success("Ride requested successfully! Searching for drivers...");
      // Emit newRideRequest event via socket
      if (socketRef.current) {
        socketRef.current.emit('newRideRequest', {
          userId,
          rideId: response.data.data.rideId,
          pickup_location,
          dropoff_location,
          fare,
          vehicleType: vehicleOptions.find(v => v.id === selectedVehicle)?.name || "Standard Car",
          otp: response.data.data.otp // Include OTP for new ride requests
        });
      }
    } catch (error) {
      console.error("Ride request error:", error);
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        // Handle logout here
      } else {
        toast.error(error.response?.data?.message || "Failed to request ride");
      }
    }
  };

  // Cancel ride
  const cancelRide = async () => {
    try {
      await axios.put(`/api/user/ride/cancel/${currentRideId}`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      toast.success("Ride cancelled successfully");
      // Emit socket event to notify driver about cancellation
      if (socketRef.current && driverDetails?.driverId) {
        socketRef.current.emit('riderCancelledRide', {
          rideId: currentRideId,
          driverId: driverDetails.driverId
        });
      }
      resetRide();
    } catch (error) {
      toast.error("Failed to cancel ride");
      console.error(error);
    }
  };

  // Reset ride after completion
  const resetRide = () => {
    setRideStatus("not_requested");
    setCurrentRideId(null);
    setDriverLocation(null);
    setDriverDetails(null);
    setDropoffAddress("");
    setSelectedDropoffCoords(null);
    setSelectedVehicle(null);
    setFare(0);
    setRideOtp(null);
    setOtpVerified(false);
    setDriverReached(false); // Reset driver reached status
    setReceivedImages({}); // Clear received images on reset
    setSelectedImageFile(null); // Clear selected image file
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  };

  // NEW: Handle file selection from input
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file.");
        event.target.value = ''; // Clear file input
        setSelectedImageFile(null);
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5 MB limit
        toast.error("Image size must be less than 5MB.");
        event.target.value = ''; // Clear file input
        setSelectedImageFile(null);
        return;
      }
      setSelectedImageFile(file);
    } else {
      setSelectedImageFile(null);
    }
  };

  // NEW: Handle image upload on explicit send
  const sendImage = async (rideId, recipientDriverId) => {
    if (!selectedImageFile) {
      toast.error("No image selected to send.");
      return;
    }

    const formData = new FormData();
    formData.append('image', selectedImageFile);
    formData.append('rideId', rideId);
    formData.append('recipientId', recipientDriverId); // The driver's ID

    try {
      toast.info("Sending image...");
      const response = await axios.post('/api/user/send-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        toast.success("Image sent successfully!");
        // The server will emit the socket event to the recipient AND to the sender for display
        setSelectedImageFile(null); // Clear selected file after sending
      } else {
        toast.error(response.data.message || "Failed to send image.");
      }
    } catch (error) {
      console.error("Error sending image:", error);
      toast.error(error.response?.data?.message || "Error sending image.");
    }
  };


  return (
    <div className="ride-request-container">
      <ToastContainer position="top-right" autoClose={3000} /> {/* Added ToastContainer here */}
      <div className="ride-request-form">
        <h2>Request a Ride</h2>
        {rideStatus === "not_requested" ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Pickup Location:</label>
              <input
                type="text"
                value={pickupAddress}
                readOnly
                disabled
                placeholder="Detecting your location..."
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ position: "relative" }}>
              <label>Dropoff Location:</label>
              <input
                type="text"
                value={dropoffAddress}
                onChange={handleDropoffChange}
                placeholder="Enter dropoff location"
                className="form-input"
                autoComplete="off"
              />
              {dropoffSuggestions.length > 0 && (
                <ul className="suggestions-list">
                  {dropoffSuggestions.map((place) => (
                    <li
                      key={place.place_id}
                      onClick={() => handleDropoffSelect(place)}
                      className="suggestion-item"
                    >
                      {place.display_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="vehicle-selection">
              <h3>Choose Your Ride</h3>
              <div className="vehicle-options">
                {vehicleOptions.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className={`vehicle-option ${selectedVehicle === vehicle.id ? "selected" : ""}`}
                    onClick={() => setSelectedVehicle(vehicle.id)}
                  >
                    <img
                      src={vehicle.icon}
                      alt={vehicle.name}
                      className="vehicle-icon"
                      loading="eager" // Prevent lazy loading
                    />
                    <div className="vehicle-info">
                      <h4>{vehicle.name}</h4>
                      <p>{vehicle.capacity}</p>
                      <p>ETA: {vehicle.estimatedTime}</p>
                      {pickupCoords && selectedDropoffCoords && selectedVehicle === vehicle.id && (
                        <p className="fare">₹{fare}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="request-button"
              disabled={!selectedVehicle || isCalculatingFare}
            >
              {isCalculatingFare ? "Calculating Fare..." : "Request Ride"}
            </button>
          </form>
        ) : rideStatus === "requested" ? (
          <div className="ride-status">
            <h3>Looking for drivers...</h3>
            <div className="loading-spinner"></div>
            <button onClick={cancelRide} className="cancel-button">
              Cancel Ride
            </button>
          </div>
        ) : rideStatus === "accepted" || rideStatus === "ongoing" ? ( // Show accepted/ongoing ride details
          <div className="ride-status">
            <h3>{rideStatus === "accepted" ? "Driver is on the way!" : "Your ride is ongoing!"}</h3>
            {eta && <p className="eta">ETA: {eta}</p>}
            {driverDetails && (
              <div className="driver-info">
                <img
                  src={driverDetails.driverProfilePhoto || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"}
                  alt="Driver"
                  loading="eager"
                  className="driver-profile-photo"
                />
                <div>
                  <h4>{driverDetails.driverName || "Driver"}</h4>
                  <p>Vehicle: {driverDetails.vehicleType || "Standard Car"}</p>
                </div>
              </div>
            )}
            {driverReached && rideStatus === "accepted" && ( // Only show "arrived" message if still accepted
              <p style={{ color: 'green', fontWeight: 'bold', marginTop: '10px' }}>Your driver has arrived!</p>
            )}
            {rideOtp && (
              <div className="otp-section" style={{ margin: '16px 0' }}>
                <label>Your Ride OTP:</label>
                <input
                  type="text"
                  value={rideOtp}
                  readOnly
                  disabled
                  style={{
                    width: '120px',
                    fontWeight: 'bold',
                    color: '#e67e22',
                    fontSize: '1.2em',
                    marginLeft: '10px',
                    textAlign: 'center',
                    letterSpacing: '2px',
                    background: '#f8f8f8',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                />
              </div>
            )}

            {/* NEW: Image Sharing Section (only if accepted or ongoing) */}
            {currentRideId && driverDetails?.driverId && (rideStatus === 'accepted' || rideStatus === 'ongoing') ? (
                <div className="image-sharing-section" style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    <h4>Share Image with Driver:</h4>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange} // Handle file change
                        style={{ display: 'block', marginBottom: '10px' }}
                    />
                     {selectedImageFile && (
                        <button
                          onClick={() => sendImage(currentRideId, driverDetails.driverId)} // Send image
                          style={{ marginBottom: '10px', padding: '8px 15px', cursor: 'pointer' }}
                        >
                          Send Image
                        </button>
                      )}
                     {/* Display received images */}
                     {receivedImages[currentRideId]?.length > 0 && (
                        <div className="received-images-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                          <h5>Conversation Images:</h5>
                          {receivedImages[currentRideId].map((img, idx) => (
                            <div key={idx} style={{ border: '1px solid #ddd', padding: '5px', borderRadius: '5px', maxWidth: '120px' }}>
                                <img src={img.imageUrl} alt={`Sent/Received ${idx}`} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '3px' }} />
                                <small style={{display: 'block', textAlign: 'center', fontSize: '0.75em'}}>
                                  From {img.senderId === userId ? 'You' : 'Driver'} @ {new Date(img.timestamp).toLocaleTimeString()}
                                </small>
                            </div>
                          ))}
                        </div>
                      )}
                </div>
            ) : null}

            <button onClick={cancelRide} className="cancel-button">
              Cancel Ride
            </button>
          </div>
        ) : rideStatus === "completed" ? (
          <div className="ride-status">
            <h3>Ride Completed!</h3>
            <p>Thank you for using our service.</p>
            <button
              onClick={resetRide}
              className="request-button"
              style={{ marginTop: '20px' }}
            >
              Request Another Ride
            </button>
          </div>
        ) : null}
      </div>

      <div className="ride-request-map">
        <MapContainer
          center={pickupCoords || [20.5937, 78.9629]}
          zoom={13}
          className="map-container"
          scrollWheelZoom={true}
          zoomControl={true}
          whenCreated={map => { mapRef.current = map; }}
        >
          <TileLayer
            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {rideStatus === "not_requested" && pickupCoords && (
            <SetMapView coords={pickupCoords} zoom={15} />
          )}
          {rideStatus === "requested" && pickupCoords && (
            <SetMapView coords={pickupCoords} zoom={15} />
          )}
          {rideStatus === "accepted" && driverLocation && (
            <SetMapView coords={driverLocation} zoom={15} />
          )}
          {rideStatus === "ongoing" && driverLocation && ( // Center map on driver location during ongoing
            <SetMapView coords={driverLocation} zoom={15} />
          )}
          {rideStatus === "completed" && pickupCoords && (
            <SetMapView coords={pickupCoords} zoom={13} />
          )}

          {/* Pickup Marker */}
          {pickupCoords && (
            <Marker position={pickupCoords} icon={pickupIcon}>
              <Popup>Pickup Location</Popup>
            </Marker>
          )}

          {/* Dropoff Marker */}
          {selectedDropoffCoords && (
            <Marker position={selectedDropoffCoords} icon={dropoffIcon}>
              <Popup>Dropoff Location</Popup>
            </Marker>
          )}

          {/* Initial route line when selecting dropoff */}
          {rideStatus === "not_requested" && pickupCoords && selectedDropoffCoords && (
            <Polyline positions={[pickupCoords, selectedDropoffCoords]} color="purple" />
          )}

          {/* Driver Location Marker - Visible when ride is accepted/ongoing */}
          {driverLocation && (rideStatus === "accepted" || rideStatus === "ongoing") && (
            <Marker position={driverLocation} icon={driverIcon}>
              <Popup>Driver Location</Popup>
            </Marker>
          )}

          {/* Driver Approaching Rider Line - Visible when ride is accepted */}
          {rideStatus === "accepted" && driverLocation && pickupCoords && (
            <Polyline positions={[driverLocation, pickupCoords]} color="blue" weight={5} />
          )}

          {/* Full Ride Route Line - Visible when OTP is verified (ride ongoing) */}
          {otpVerified && pickupCoords && selectedDropoffCoords && (rideStatus === "ongoing" || rideStatus === "completed") && (
            <Polyline positions={[pickupCoords, selectedDropoffCoords]} color="green" weight={5} />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default RideRequest;