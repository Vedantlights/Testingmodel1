// Contact.jsx
import React, { useState } from "react";
import { MapPin, Mail, MessageSquare, Phone } from "lucide-react";
import "../styles/BuyerContactPage.css";

export default function Contact() {
    window.scrollTo(0,0);
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

  const handleSubmit = () => {
    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.subject ||
      !formData.message
    ) {
      alert("Please fill all fields");
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
              <p>Office No. 22, 3rd Floor,<br />
              Aston Plaza, Ambegaon Bk.<br />
              Pune – 411046</p>
            </div>
          </div>

          {/* EMAIL */}
          <div className="buyer-info-card">
            <div className="buyer-info-icon buyer-bg-purple">
              <Mail />
            </div>
            <div className="buyer-info-text">
              <h3>Email Us</h3>
              <p>sudhakarpoul@vedantlights.com<br />
              shital@vedantlights.com</p>
            </div>
          </div>

          {/* PHONE */}
          <div className="buyer-info-card">
            <div className="buyer-info-icon buyer-bg-blue">
              <Phone />
            </div>
            <div className="buyer-info-text">
              <h3>Call Us</h3>
              <p>‪+91 9860638920‬ / 9890770189 </p>
            </div>
          </div>

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

            <div className="buyer-form-inputs">
              
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

              <button onClick={handleSubmit} disabled={isSubmitting}>
  {isSubmitting ? "Sending..." : "Submit"}
</button>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}