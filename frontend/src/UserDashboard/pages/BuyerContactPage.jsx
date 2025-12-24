// Contact.jsx
import React, { useState, useEffect, useRef } from "react";
import { MapPin, Mail, MessageSquare } from "lucide-react";
import "../styles/BuyerContactPage.css";

export default function Contact() {
  // Only scroll to top once on component mount, not on every render
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []); // Empty dependency array means it only runs once on mount

  const formRef = useRef(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
      !formData.subject ||
      !formData.message
    ) {
      alert("Please fill all fields");
      // Restore scroll position
      window.scrollTo(0, scrollPosition);
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
        subject: "",
        message: "",
      });

      // Maintain scroll position after submission
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPosition);
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
            Contact Us
          </h1>
          <p className="buyer-header-text">
            We'd love to hear from you! Fill out the form and we'll be in touch.
          </p>
        </div>

        {/* INFO SECTION */}
        <div className="buyer-info-section">

          {/* LOCATION */}
          <div className="buyer-info-card">
            <div className="buyer-info-icon buyer-bg-blue">
              <MapPin />
            </div>
            <div className="buyer-info-text">
              <h3>Visit Us</h3>
              <p>Office No.21 & 22, 3rd Floor, S/No. 56<br />
              Aston Plaza, Ambegaon Bk.<br />
              Pune , Maharashtra– 411046</p>
            </div>
          </div>

          {/* EMAIL */}
          <a 
            href="mailto:info@indiapropertys.com" 
            className="buyer-info-card-clickable"
          >
            <div className="buyer-info-icon buyer-bg-purple">
              <Mail />
            </div>
            <div className="buyer-info-text">
              <h3>Email Us</h3>
              <p>info@indiapropertys.com</p>
            </div>
          </a>

        </div>

        <div className="buyer-contact-grid">

          {/* CONTACT FORM */}
          <div className="buyer-form-card">
            <div className="buyer-form-header">
              <MessageSquare className="buyer-header-icon" />
              <h2>Get in Touch</h2>
            </div>

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
              
              <label>Your Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
              />

              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
              />

              <label>Phone Number</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="‪+91 98765 43210‬"
              />

              <label>Subject</label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="How can we help?"
              />

              <label>Message</label>
              <textarea
                name="message"
                rows="4"
                value={formData.message}
                onChange={handleChange}
                placeholder="Tell us more..."
              ></textarea>

              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Submit"}
              </button>

            </form>
          </div>

        </div>

      </div>
    </div>
  );
}