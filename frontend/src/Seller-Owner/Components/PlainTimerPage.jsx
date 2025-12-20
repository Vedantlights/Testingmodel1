import React, { useState, useEffect } from "react";
import '../styles/PlainTimerPage.css';

const PlainTimerPage = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endDate.getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const plans = [
    {
      name: "Basic",
      description: "Perfect for getting started with property listings",
      price: "999",
      duration: "/month",
      icon: "basic",
      features: [
        "Up to 5 Property Listings",
        "Basic Analytics",
        "Email Support",
        "Standard Visibility",
        "30 Days Listing Duration"
      ],
      popular: false
    },
    {
      name: "Professional",
      description: "Best for serious sellers with multiple properties",
      price: "2,499",
      duration: "/month",
      icon: "pro",
      features: [
        "Up to 20 Property Listings",
        "Advanced Analytics & Insights",
        "Priority Support 24/7",
        "Featured Listings",
        "90 Days Listing Duration",
        "Social Media Promotion"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      description: "For agencies and high-volume sellers",
      price: "4,999",
      duration: "/month",
      icon: "enterprise",
      features: [
        "Unlimited Property Listings",
        "Premium Analytics Dashboard",
        "Dedicated Account Manager",
        "Top Search Placement",
        "1 Year Listing Duration",
        "Marketing Campaign Support"
      ],
      popular: false
    }
  ];

  const PlanIcon = ({ type }) => {
    if (type === "basic") {
      return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }
    if (type === "pro") {
      return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
        <path d="M16 3v4M8 3v4M2 11h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
  };

  return (
    <div className="seller-timer-page">
      <div className="seller-timer-content">
        <div className="seller-timer-badge">
          LIMITED TIME OFFER
        </div>

        <h1 className="seller-timer-title">
          <span className="seller-timer-title-purple">3 Months Free</span>
          <br />
          <span className="seller-timer-title-white">Premium Property Upload Access</span>
        </h1>

        <div className="seller-timer-card">
          <div className="seller-timer-header">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              className="seller-timer-clock-icon"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <h2>Your Trial Expires In</h2>
          </div>

          <div className="seller-timer-display">
            {["days", "hours", "minutes", "seconds"].map((unit, idx) => (
              <React.Fragment key={unit}>
                <div className="seller-timer-time-block">
                  <div className="seller-timer-time-box">{String(timeLeft[unit]).padStart(2, "0")}</div>
                  <div className="seller-timer-time-label">{unit.toUpperCase()}</div>
                </div>
                {idx < 3 && <div className="seller-timer-separator">:</div>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Plans Section */}
        <div className="seller-timer-plans-section">
          <div className="seller-timer-plans-header">
            <h2 className="seller-timer-plans-title">Choose Your Plan</h2>
            <p className="seller-timer-plans-subtitle">Select a plan after your free trial ends</p>
            <div className="seller-timer-plans-lock-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Plans unlock after trial ends</span>
            </div>
          </div>

          <div className="seller-timer-plans-container">
            {plans.map((plan, index) => (
              <div 
                key={index} 
                className={`seller-timer-plan-card ${plan.popular ? 'popular' : ''}`}
              >
                {plan.popular && (
                  <div className="seller-timer-popular-badge">MOST POPULAR</div>
                )}
                
                <div className={`seller-timer-plan-icon ${plan.icon}`}>
                  <PlanIcon type={plan.icon} />
                </div>

                <h3 className="seller-timer-plan-name">{plan.name}</h3>
                <p className="seller-timer-plan-description">{plan.description}</p>

                <div className="seller-timer-plan-price-wrapper">
                  <div className="seller-timer-plan-price">
                    <span className="seller-timer-currency">₹</span>
                    <span className="seller-timer-price">{plan.price}</span>
                    <span className="seller-timer-duration">{plan.duration}</span>
                  </div>
                </div>

                <ul className="seller-timer-plan-features">
                  {plan.features.map((feature, idx) => (
                    <li key={idx}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button className="seller-timer-plan-btn" disabled>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Locked
                </button>
              </div>
            ))}

            {/* Blur Overlay */}
            <div className="seller-timer-plans-blur-overlay">
              <div className="seller-timer-blur-content">
                <div className="seller-timer-blur-icon">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3>Plans Locked During Free Trial</h3>
                <p>Enjoy your premium access for free! Plans will be available when your trial period ends.</p>
                <div className="seller-timer-blur-timer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  {timeLeft.days} days remaining
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlainTimerPage;