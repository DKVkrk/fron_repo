import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/styles.css";
import Chatbot from "./chatbot";

function Home() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="home-container">
      {/* Navigation Bar */}
      <div className={`navContainerWrap ${isScrolled ? "scrolled" : ""}`}>
        <div className="nav-content">
          <div className="nav-left">
            <p className="logo">Uber</p>
            <div className={`desktop-menu ${isMobileMenuOpen ? "mobile-open" : ""}`}>
              <p className="menu-list">Ride</p>
              <p className="menu-list">Drive</p>
              <p className="menu-list">Business</p>
              <div className="text-icon">
                <p className="menu-list">About</p>
                <span className="material-symbols-outlined">expand_more</span>
              </div>
            </div>
          </div>
          <div className={`nav-right ${isMobileMenuOpen ? "mobile-open" : ""}`}>
            <div className="text-icon">
              <span className="material-symbols-outlined">language</span>
              <p className="menu-list">EN</p>
            </div>
            <p className="menu-list">Help</p>
            <div className="nav-auth">
              <button className="login-btn" onClick={() => navigate("/login")}>Log In</button>
              <button className="signup-btn" onClick={() => navigate("/signup")}>Sign up</button>
            </div>
          </div>
          <div 
            className="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className="material-symbols-outlined">
              {isMobileMenuOpen ? "close" : "menu"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Main Hero Section */}
        <section className="main-hero">
          <div className="hero-content">
            <div className="hero-text">
              <h1>Go anywhere with Uber</h1>
              <p className="subtitle">Request a ride, hop in, and go</p>
              <div className="hero-buttons">
                <button className="ride-btn">Ride with Uber</button>
                <button className="drive-btn">Drive with Uber</button>
              </div>
            </div>
            <div className="hero-image-container">
              <img
                src="https://www.uber-assets.com/image/upload/f_auto,q_auto:eco,c_fill,w_767,h_960/v1695226426/assets/b9/71b0b4-b082-4d67-9615-3ea8a60e6e2a/original/header-dual.png"
                alt="Uber app screenshot"
                className="hero-image"
                loading="lazy"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <div className="feature-card">
            <div className="feature-image-container">
              <img
                src="https://www.uber-assets.com/image/upload/f_auto,q_auto:eco,c_fill,w_767,h_767/v1684855112/assets/96/4dd3d1-94e7-481e-b28c-08d59353b9e0/original/earner-illustra.png"
                alt="Driver earning with Uber"
                className="feature-image"
                loading="lazy"
              />
            </div>
            <div className="feature-text">
              <h2>Drive when you want, make what you need</h2>
              <p>Make money on your schedule with deliveries or rides—or both. You can use your own car or choose a rental through Uber.</p>
              <div className="feature-buttons">
                <button className="cta-btn">Get Started</button>
                <p onClick={() => navigate("/login")} className="sign-in-link">Already have an account? Sign in</p>
              </div>
            </div>
          </div>

          <div className="feature-card reverse">
            <div className="feature-text">
              <h2>Always the ride you want</h2>
              <p className="subtitle">Request a ride, hop in, and go</p>
              <div className="ride-form">
                <div className="location-wrap">
                  <div className="location-flex">
                    <span className="material-symbols-outlined location-icon">fiber_manual_record</span>
                    <input type="text" className="location" placeholder="Enter location" />
                  </div>
                  <span className="material-symbols-outlined near-me-icon">near_me</span>
                </div>
                <div className="loc-dest-line">
                  <hr />
                </div>
                <div className="location-wrap">
                  <div className="location-flex">
                    <span className="material-symbols-outlined location-icon">stop</span>
                    <input type="text" className="destination" placeholder="Enter destination" />
                  </div>
                </div>
                <button className="prices-btn">See prices</button>
              </div>
            </div>
            <div className="feature-image-container">
              <img
                src="https://www.uber-assets.com/image/upload/f_auto,q_auto:eco,c_fill,w_767,h_767/v1684887342/assets/4b/a6cba6-46dc-4084-960c-60dfef262936/original/rideshare-square.png"
                alt="Ride with Uber"
                className="feature-image"
                loading="lazy"
              />
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-image-container">
              <img
                src="https://www.uber-assets.com/image/upload/f_auto,q_auto:eco,c_fill,w_767,h_767/v1684887108/assets/76/baf1ea-385a-408c-846b-59211086196c/original/u4b-square.png"
                alt="Uber for Business"
                className="feature-image"
                loading="lazy"
              />
            </div>
            <div className="feature-text">
              <h2>The Uber you know, reimagined for business</h2>
              <p>Uber for Business is a platform for managing global rides and meals, and local deliveries, for companies of any size.</p>
              <div className="feature-buttons">
                <button className="cta-btn">Get Started</button>
                <p className="secondary-link">Check out our solutions</p>
              </div>
            </div>
          </div>

          <div className="feature-card reverse">
            <div className="feature-text">
              <h2>Make money by renting out your car</h2>
              <p className="subtitle">Connect with thousands of drivers and earn more per week with Uber's free fleet management tools.</p>
              <button className="prices-btn">See prices</button>
            </div>
            <div className="feature-image-container">
              <img
                src="https://www.uber-assets.com/image/upload/f_auto,q_auto:eco,c_fill,w_767,h_767/v1696243819/assets/18/34e6fd-33e3-4c95-ad7a-f484a8c812d7/original/fleet-management.jpg"
                alt="Rent your car with Uber"
                className="feature-image"
                loading="lazy"
              />
            </div>
          </div>
        </section>

        {/* Ride Options Section */}
        <section className="ride-options-section">
          <h2>Ride with Uber</h2>
          <div className="options-grid">
            {[
              {
                title: "Uber Auto",
                text: "Get affordable Uber Auto rides with no haggling. Request Uber Auto and ride comfortably around your city.",
                img: "https://www.uber-assets.com/image/upload/f_auto,q_auto:eco,c_fill,w_206,h_206/v1649914471/assets/89/8e4239-5e7d-4de7-bf71-00cc32d468db/original/Auto-150X150p4x.png"
              },
              {
                title: "Uber Moto",
                text: "Get affordable bike rides at your doorstep. Skip the crowd and zip through traffic with Uber Moto.",
                img: "https://www.uber-assets.com/image/upload/f_auto,q_auto:eco,c_fill,w_116,h_116/v1649914539/assets/86/82f8b3-e2e6-45f8-a8f7-fdc511f709e0/original/Moto-150X150p4x.png"
              },
              {
                title: "Uber Hourly",
                text: "Book Rentals to save time with one car and driver for your multi-stop trips.",
                img: "https://www.uber-assets.com/image/upload/f_auto,q_auto:eco,c_fill,w_116,h_116/v1630531077/assets/38/494083-cc23-4cf7-801c-0deed7d9ca55/original/uber-hourly.png"
              },
              {
                title: "Uber Intercity",
                text: "Book Intercity to head outstation anytime in convenient and affordable cars.",
                img: "https://www.uber-assets.com/image/upload/f_auto,q_auto:eco,c_fill,w_116,h_116/v1649914597/assets/f7/7f583f-447a-4cf7-8da6-6ad254f0a66b/original/Intercity-150X150p4x.png"
              }
            ].map((veh, i) => (
              <div className="option-card" key={i}>
                <img src={veh.img} alt={veh.title} className="vehicle-img" loading="lazy" />
                <div className="option-details">
                  <h3>{veh.title}</h3>
                  <div className="det-icon">
                    <p>{veh.text}</p>
                    <span className="material-symbols-outlined arrow-icon">arrow_right_alt</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          {[
            {
              title: "Company",
              items: ["About us", "Our offerings", "Newsroom", "Investors", "Blog", "Careers", "AI", "Gift Cards"]
            },
            {
              title: "Products",
              items: ["Ride", "Drive", "Deliver", "Eat", "Uber for business", "Uber Freight"]
            },
            {
              title: "Global citizenship",
              items: ["Safety", "Diversity and Inclusion", "Sustainability"]
            },
            {
              title: "Travel",
              items: ["Reserve", "Airports", "Cities"]
            }
          ].map((section, i) => (
            <div className="footer-section" key={i}>
              <h4>{section.title}</h4>
              <div className="footer-links">
                {section.items.map((item, j) => (
                  <a href="#" key={j} className="footer-link">{item}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="footer-bottom">
          <div className="social-links">
            <span className="material-symbols-outlined">facebook</span>
            <span className="material-symbols-outlined">twitter</span>
            <span className="material-symbols-outlined">instagram</span>
            <span className="material-symbols-outlined">linkedin</span>
          </div>
          <p>© 2023 Uber Technologies Inc. | Cloned by Abhinav Singh</p>
        </div>
      </footer>

      {/* Chatbot Component */}
      <Chatbot />
    </div>
  );
}

export default Home;