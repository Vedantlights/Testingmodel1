import React, { useState, useEffect, useRef } from "react";
import "../styles/PlainTimerPage.css";
import { sellerDashboardAPI } from '../../services/api.service';

const PlainTimerPage = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    const fetchAndStartTimer = async () => {
      try {
        const response = await sellerDashboardAPI.getStats();
        
        let endDate;
        
        if (response.success && response.data?.subscription?.end_date) {
          // Use actual subscription end_date from database
          endDate = new Date(response.data.subscription.end_date);
          
          if (isNaN(endDate.getTime())) {
            throw new Error('Invalid end date format');
          }
        } else {
          // Fallback: 3 months from now (shouldn't happen if subscription exists)
          endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 3);
        }
        
        // Clear any existing timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        
        // Start timer
        timerRef.current = setInterval(() => {
          const now = new Date().getTime();
          const distance = endDate.getTime() - now;

          if (distance < 0) {
            if (timerRef.current) clearInterval(timerRef.current);
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
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching subscription data:', err);
        // Fallback to 3 months from now
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 3);
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        
        timerRef.current = setInterval(() => {
          const now = new Date().getTime();
          const distance = endDate.getTime() - now;

          if (distance < 0) {
            if (timerRef.current) clearInterval(timerRef.current);
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
        
        setLoading(false);
      }
    };

    fetchAndStartTimer();
    
    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
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

  if (loading) {
    return (
      <div className="timer-page">
        <div className="timer-content">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading subscription data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="timer-page">
      <div className="timer-content">
        <div className="badge">
          LIMITED TIME OFFER
        </div>

        <h1 className="title">
          <span className="title-purple">3 Months Free</span>
          <br />
          <span className="title-white">Premium Property Upload Access</span>
        </h1>

        <div className="timer-card">
          <div className="timer-header">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              className="clock-icon"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <h2>Your Trial Expires In</h2>
          </div>

          <div className="timer-display">
            {["days", "hours", "minutes", "seconds"].map((unit, idx) => (
              <React.Fragment key={unit}>
                <div className="time-block">
                  <div className="time-box">{String(timeLeft[unit]).padStart(2, "0")}</div>
                  <div className="time-label">{unit.toUpperCase()}</div>
                </div>
                {idx < 3 && <div className="separator">:</div>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Plans Section */}
        <div className="timer-plans-section">
          <div className="timer-plans-header">
            <h2 className="timer-plans-title">Choose Your Plan</h2>
            <p className="timer-plans-subtitle">Select a plan after your free trial ends</p>
            <div className="timer-plans-lock-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Plans unlock after trial ends</span>
            </div>
          </div>

          <div className="timer-plans-container">
            {plans.map((plan, index) => (
              <div 
                key={index} 
                className={`timer-plan-card ${plan.popular ? 'popular' : ''}`}
              >
                {plan.popular && (
                  <div className="timer-popular-badge">MOST POPULAR</div>
                )}
                
                <div className={`timer-plan-icon ${plan.icon}`}>
                  <PlanIcon type={plan.icon} />
                </div>

                <h3 className="timer-plan-name">{plan.name}</h3>
                <p className="timer-plan-description">{plan.description}</p>

                <div className="timer-plan-price-wrapper">
                  <div className="timer-plan-price">
                    <span className="timer-currency">₹</span>
                    <span className="timer-price">{plan.price}</span>
                    <span className="timer-duration">{plan.duration}</span>
                  </div>
                </div>

                <ul className="timer-plan-features">
                  {plan.features.map((feature, idx) => (
                    <li key={idx}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button className="timer-plan-btn" disabled>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Locked
                </button>
              </div>
            ))}

            {/* Blur Overlay */}
            <div className="timer-plans-blur-overlay">
              <div className="timer-blur-content">
                <div className="timer-blur-icon">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3>Plans Locked During Free Trial</h3>
                <p>Enjoy your premium access for free! Plans will be available when your trial period ends.</p>
                <div className="timer-blur-timer">
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
