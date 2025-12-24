// Contact.jsx
import React, { useState, useRef } from "react";
import { MapPin, Mail, MessageSquare } from "lucide-react";
import emailjs from "@emailjs/browser";     // ✅ Correct EmailJS package
import '../styles/Contact.css';

export default function Contact() {
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
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  // Email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Phone validation function (supports Indian and international formats)
  const validatePhone = (phone) => {
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && phoneRegex.test(phone);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling

    // Save current scroll position
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

    // Validation with proper checks
    const newErrors = {};
    const trimmedName = formData.name?.trim();
    const trimmedEmail = formData.email?.trim();
    const trimmedPhone = formData.phone?.trim();
    const trimmedSubject = formData.subject?.trim();
    const trimmedMessage = formData.message?.trim();

    if (!trimmedName || trimmedName.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!trimmedEmail) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(trimmedEmail)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!trimmedPhone) {
      newErrors.phone = "Phone number is required";
    } else if (!validatePhone(trimmedPhone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (!trimmedSubject || trimmedSubject.length < 3) {
      newErrors.subject = "Subject must be at least 3 characters";
    }

    if (!trimmedMessage || trimmedMessage.length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Restore scroll position
      window.scrollTo(0, scrollPosition);
      return;
    }

    // Clear errors if validation passes
    setErrors({});

    setIsSubmitting(true);

    // Sanitize inputs before sending
    const templateParams = {
      name: trimmedName,
      from_email: trimmedEmail,
      phone: trimmedPhone,
      subject: trimmedSubject,
      message: trimmedMessage,
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

        // Maintain scroll position after submission
        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollPosition);
        });

        setTimeout(() => setSubmitted(false), 2500);
      })
      .catch((error) => {
        setIsSubmitting(false);
        setErrors({ 
          submit: "Failed to send message. Please check your connection and try again." 
        });
        console.error("EmailJS Error:", error);
        // Scroll to top to show error
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
                Office No.21 & 22, 3rd Floor, S/No. 56<br />
                Aston Plaza, Ambegaon Bk.<br />
                Pune , Maharashtra– 411046
              </p>
            </div>
          </div>

          <a 
            href="mailto:info@indiapropertys.com" 
            className="info-card-clickable"
          >
            <div className="info-icon bg-purple">
              <Mail />
            </div>
            <div className="info-text">
              <h3>Email Us</h3>
              <p>info@indiapropertys.com</p>
            </div>
          </a>

        </div>

        <div className="contact-grid">

          {/* CONTACT FORM */}
          <div className="form-card">
            <div className="form-header">
              <MessageSquare className="header-icon" />
              <h2>Get in Touch</h2>
            </div>

            {submitted && (
              <div className="success-box" role="alert">
                Message sent successfully!
              </div>
            )}

            {errors.submit && (
              <div className="error-box" role="alert">
                {errors.submit}
              </div>
            )}

            <form 
              ref={formRef}
              className="form-inputs" 
              onSubmit={handleSubmit} 
              onKeyDown={(e) => {
                // Prevent Enter key from submitting form and causing scroll jump
                if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                  e.preventDefault();
                }
              }}
              noValidate
            >

              <div className="form-field">
                <label htmlFor="name">Your Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                  minLength={2}
                  className={errors.name ? "error" : ""}
                  aria-invalid={errors.name ? "true" : "false"}
                  aria-describedby={errors.name ? "name-error" : undefined}
                />
                {errors.name && <span className="error-message" id="name-error">{errors.name}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  required
                  className={errors.email ? "error" : ""}
                  aria-invalid={errors.email ? "true" : "false"}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && <span className="error-message" id="email-error">{errors.email}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  required
                  className={errors.phone ? "error" : ""}
                  aria-invalid={errors.phone ? "true" : "false"}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                />
                {errors.phone && <span className="error-message" id="phone-error">{errors.phone}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="subject">Subject</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="How can we help?"
                  required
                  minLength={3}
                  className={errors.subject ? "error" : ""}
                  aria-invalid={errors.subject ? "true" : "false"}
                  aria-describedby={errors.subject ? "subject-error" : undefined}
                />
                {errors.subject && <span className="error-message" id="subject-error">{errors.subject}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  rows="4"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us more..."
                  required
                  minLength={10}
                  className={errors.message ? "error" : ""}
                  aria-invalid={errors.message ? "true" : "false"}
                  aria-describedby={errors.message ? "message-error" : undefined}
                ></textarea>
                {errors.message && <span className="error-message" id="message-error">{errors.message}</span>}
              </div>

              <button type="submit" disabled={isSubmitting} className={isSubmitting ? "submitting" : ""}>
                {isSubmitting ? (
                  <>
                    <span className="spinner"></span>
                    Sending...
                  </>
                ) : (
                  "Submit"
                )}
              </button>

            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
