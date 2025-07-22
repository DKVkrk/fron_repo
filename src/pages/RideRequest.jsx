import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "../utils/axios";
import { toast } from "react-toastify";
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
  const [otpInput, setOtpInput] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [showRoute, setShowRoute] = useState(false);

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
    socket.on('otpVerified', ({ success }) => {
      if (success) {
        setOtpVerified(true);
        setShowRoute(true);
        toast.success('OTP verified successfully!');
      }
    });

    socket.on('rideAccepted', async (data) => {
      setRideStatus("accepted");
      setDriverDetails({
        driverId: data.driverId || "",
        driverName: data.driverName || "Driver",
        vehicleType: data.vehicleType || "Standard Car",
        driverProfilePhoto: data.driverProfilePhoto || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
      });
      startTrackingDriver(data.driverId);
      // Always fetch the latest ride details to get OTP
      try {
        if (currentRideId) {
          const res = await axios.get(`/api/user/ride/${currentRideId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          console.log("Ride details response:", res.data); // Debug log
          if (res.data && res.data.data && res.data.data.otp) {
            setRideOtp(res.data.data.otp);
          }
        }
      } catch (err) {
        // fallback: keep previous OTP if any
      }
    });

    socket.on('rideRejected', (data) => {
      setRideStatus("requested");
      toast.info(data.message);
    });

    socket.on('driverLocationUpdate', (location) => {
      setDriverLocation([location.lat, location.lng]);
      updateEta(location);
    });

    socket.on('rideCompleted', (data) => {
      setRideStatus("completed");
      toast.success("Ride completed successfully!");
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
      setTimeout(() => {
        resetRide();
      }, 3000);
    });

    return () => {
      socket.disconnect();
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, [userId, token]);

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

  // Start tracking driver location
  const startTrackingDriver = (driverId) => {
    // Share rider location with driver periodically
    locationIntervalRef.current = setInterval(() => {
      if (pickupCoords && socketRef.current) {
        socketRef.current.emit('shareRiderLocation', {
          driverId,
          location: { lat: pickupCoords[0], lng: pickupCoords[1] }
        });
      }
    }, 5000);
  };

  // Update ETA based on driver location
  const updateEta = (driverLocation) => {
    if (!pickupCoords || !driverLocation) return;
    
    const distance = calculateDistance(
      driverLocation.lat,
      driverLocation.lng,
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
      // Show OTP from API response immediately
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
          vehicleType: vehicleOptions.find(v => v.id === selectedVehicle)?.name || "Standard Car"
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
      setRideStatus("not_requested");
      setCurrentRideId(null);
      setDriverLocation(null);
      setDriverDetails(null);
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
      toast.success("Ride cancelled successfully");
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
    setRideOtp(null); // Reset OTP only when ride is reset
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
    }
  };

  return (
    <div className="ride-request-container">
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
        ) : rideStatus === "accepted" ? (
          <div className="ride-status">
            <h3>Driver is on the way!</h3>
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
            {rideOtp ? (
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
            ) : (
              <div style={{color: 'red'}}>No OTP found for this ride.</div>
            )}
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

          <SetMapView coords={pickupCoords} zoom={15} />

          {pickupCoords && (
            <Marker position={pickupCoords} icon={pickupIcon}>
              <Popup>Pickup Location</Popup>
            </Marker>
          )}

          {selectedDropoffCoords && (
            <Marker position={selectedDropoffCoords} icon={dropoffIcon}>
              <Popup>Dropoff Location</Popup>
            </Marker>
          )}
          {/* Show line between pickup and dropoff as soon as both are set */}
          {pickupCoords && selectedDropoffCoords && (
            <Polyline positions={[pickupCoords, selectedDropoffCoords]} color="purple" />
          )}
          {driverLocation && (
            <Marker position={driverLocation} icon={driverIcon}>
              <Popup>Driver Location</Popup>
            </Marker>
          )}
          {showRoute && pickupCoords && selectedDropoffCoords && (
            <Polyline positions={[pickupCoords, selectedDropoffCoords]} color="green" />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default RideRequest;