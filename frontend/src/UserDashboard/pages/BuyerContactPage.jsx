// Contact.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Mail, MessageSquare } from "lucide-react";
import "../styles/BuyerContactPage.css";

export default function Contact() {
  // Only scroll to top once on component mount, not on every render
  useEffect(() => {
    // Use auto behavior for instant scroll without lag
    window.scrollTo({
      top: 0,
      behavior: 'auto' // Changed from default 'smooth' to 'auto' for better performance
    });
  }, []); // Empty dependency array means it only runs once on mount

  const formRef = useRef(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Memoize handleChange to prevent unnecessary re-renders
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = (e) => {
    // Prevent default form submission behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Save current scroll position
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.message
    ) {
      alert("Please fill all fields");
      // Restore scroll position - use auto behavior for better performance
      window.scrollTo({
        top: scrollPosition,
        behavior: 'auto'
      });
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setFormData({
        name: "",
        email: "",
        phone: "",
        message: "",
      });

      // Maintain scroll position after submission - use smooth scroll only if needed
      // Using requestAnimationFrame for better performance
      requestAnimationFrame(() => {
        window.scrollTo({
          top: scrollPosition,
          behavior: 'auto' // Use 'auto' instead of 'smooth' for better performance
        });
      });

      setTimeout(() => setSubmitted(false), 2500);
    }, 1500);
  };

  return (
    <div className="buyer-contact-main">
      <div className="buyer-contact-container">

        {/* HEADER */}
        <div className="buyer-contact-header">
          <h1 className="buyer-contact-title">
            Get In Touch
          </h1>
          <p className="buyer-header-text">
            Contact us for a free quote or emergency service
          </p>
        </div>

        {/* TWO COLUMN LAYOUT */}
        <div className="buyer-contact-two-column">
          
          {/* LEFT COLUMN - CONTACT INFORMATION */}
          <div className="buyer-contact-info-card">
            <h2 className="buyer-contact-info-title">Contact Information</h2>
            
            <div className="buyer-contact-info-item">
              <div className="buyer-contact-info-label">Phone</div>
              <a href="tel:+919876543210" className="buyer-contact-info-link">
                +91 98765 43210
              </a>
            </div>

            <div className="buyer-contact-info-item">
              <div className="buyer-contact-info-label">Email</div>
              <a href="mailto:info@indiapropertys.com" className="buyer-contact-info-link">
                info@indiapropertys.com
              </a>
            </div>

            <div className="buyer-contact-info-item">
              <div className="buyer-contact-info-label">Address</div>
              <a 
                href="https://www.google.com/maps/search/?api=1&query=Office+No.21+%26+22,+3rd+Floor,+S%2FNo.+56,+Aston+Plaza,+Ambegaon+Bk.,+Pune,+Maharashtra+411046"
                target="_blank"
                rel="noopener noreferrer"
                className="buyer-contact-info-address"
              >
                Office No.21 & 22, 3rd Floor, S/No. 56<br />
                Aston Plaza, Ambegaon Bk.<br />
                Pune, Maharashtra– 411046
              </a>
            </div>
          </div>

          {/* RIGHT COLUMN - CONTACT FORM */}
          <div className="buyer-form-card">
            <h2 className="buyer-form-title">Send Us a Message</h2>

            {submitted && (
              <div className="buyer-success-box">
                Message sent successfully!
              </div>
            )}

            <form 
              ref={formRef}
              className="buyer-form-inputs"
              onSubmit={handleSubmit}
              onKeyDown={(e) => {
                // Prevent Enter key from submitting form and causing scroll jump (except in textarea)
                if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                  e.preventDefault();
                }
              }}
            >
              
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your Name"
              />

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Your Email"
              />

              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone Number"
              />

              <textarea
                name="message"
                rows="4"
                value={formData.message}
                onChange={handleChange}
                placeholder="Message"
              ></textarea>

              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>

            </form>
          </div>

        </div>

      </div>
    </div>
  );
}