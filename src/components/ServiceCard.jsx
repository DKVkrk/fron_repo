// src/components/ServiceCard.jsx
import React from 'react';
import '../styles/styles.css';

const ServiceCard = ({ image, title, description }) => {
  return (
    <div className="service-card">
      <div className="card-image">
        <img src={image} alt={title} />
      </div>
      <div className="card-content">
        <h3>{title}</h3>
        <p>{description}</p>
        <button className="card-link"> {/* Changed <a> to <button> for consistency with other interactive elements */}
          Learn more <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};

export default ServiceCard;