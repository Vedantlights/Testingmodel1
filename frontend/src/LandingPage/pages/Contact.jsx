// Contact.jsx
import React, { useState } from "react";
import { MapPin, Mail, MessageSquare, Phone } from "lucide-react";
import emailjs from "@emailjs/browser";     // ✅ Correct EmailJS package
import '../styles/Contact.css';

export default function Contact() {
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
    e.preventDefault();

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

    const templateParams = {
      name: formData.name,
      from_email: formData.email,
      phone: formData.phone,
      subject: formData.subject,
      message: formData.message,
    };

    emailjs
      .send(
        "service_u3pcl8w",     // ✅ Your Service ID
        "template_1mhs7ka",    // ✅ Your Template ID
        templateParams,
        "y-_TIttAryQQ9iiBC"    // ✅ Your Public Key
      )
      .then(() => {
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
      })
      .catch((error) => {
        setIsSubmitting(false);
        alert("Failed to send message. Please try again.");
        console.error("EmailJS Error:", error);
      });
  };

  return (
    <div className="contact-main">
      <div className="contact-container">

        {/* HEADER */}
        <div className="contact-header">
          <h1 className="contact-title">Contact Us</h1>
          <p className="header-text">
            We'd love to hear from you! Fill out the form and we'll be in touch.
          </p>
        </div>

        {/* INFO SECTION */}
        <div className="info-section">

          <div className="info-card">
            <div className="info-icon bg-blue">
              <MapPin />
            </div>
            <div className="info-text">
              <h3>Visit Us</h3>
              <p>
                Office No. 22, 3rd Floor,<br />
                Aston Plaza, Ambegaon Bk.<br />
                Pune – 411046
              </p>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon bg-purple">
              <Mail />
            </div>
            <div className="info-text">
              <h3>Email Us</h3>
              <p>info@indiapropertys.com</p>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon bg-blue">
              <Phone />
            </div>
            <div className="info-text">
              <h3>Call Us</h3>
              <p>+91 9860638920 / 9890770189</p>
            </div>
          </div>

        </div>

        <div className="contact-grid">

          {/* CONTACT FORM */}
          <div className="form-card">
            <div className="form-header">
              <MessageSquare className="header-icon" />
              <h2>Get in Touch</h2>
            </div>

            {submitted && (
              <div className="success-box">
                Message sent successfully!
              </div>
            )}

            <form className="form-inputs" onSubmit={handleSubmit}>

              <label>Your Name</label>
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
                placeholder="+91 98765 43210"
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
