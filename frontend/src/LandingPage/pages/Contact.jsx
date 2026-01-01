// Contact.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Mail, MessageSquare, ChevronDown } from "lucide-react";
import emailjs from "@emailjs/browser";     // ✅ Correct EmailJS package
import '../styles/Contact.css';

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
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [errors, setErrors] = useState({});

  // Memoize handleChange to prevent unnecessary re-renders
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  }, [errors]);

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
    // Prevent default form submission behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Save current scroll position
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

    // Validation with proper checks
    const newErrors = {};
    const trimmedName = formData.name?.trim();
    const trimmedEmail = formData.email?.trim();
    const trimmedPhone = formData.phone?.trim();
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

    if (!trimmedMessage || trimmedMessage.length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Restore scroll position
      window.scrollTo({
        top: scrollPosition,
        behavior: 'auto'
      });
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
      subject: "Contact Form Inquiry",
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
      })
      .catch((error) => {
        setIsSubmitting(false);
        setErrors({ 
          submit: "Failed to send message. Please check your connection and try again." 
        });
        console.error("EmailJS Error:", error);
        // Scroll to top to show error
        window.scrollTo({ top: 0, behavior: 'auto' });
      });
  };

  return (
    <div className="contact-main">
      <div className="contact-container">

        {/* HEADER */}
        <div className="contact-header">
          <h1 className="contact-title">
            Get In Touch
          </h1>
          <p className="header-text">
            Contact us for a free quote or emergency service
          </p>
        </div>

        {/* TWO COLUMN LAYOUT */}
        <div className="contact-two-column">
          
          {/* LEFT COLUMN - CONTACT INFORMATION */}
          <div className="contact-info-card">
            <h2 className="contact-info-title">Contact Information</h2>
            
            <div className="contact-info-item">
              <div className="contact-info-label">Phone</div>
              <a href="tel:+918433517958" className="contact-info-link">
                +918433517958
              </a>
            </div>

            <div className="contact-info-item">
              <div className="contact-info-label">Email</div>
              <a href="mailto:info@indiapropertys.com" className="contact-info-link">
                info@indiapropertys.com
              </a>
            </div>

            <div className="contact-info-item">
              <div className="contact-info-label">Address</div>
              <a 
                href="https://www.google.com/maps/search/?api=1&query=Office+No.21+%26+22,+3rd+Floor,+S%2FNo.+56,+Aston+Plaza,+Ambegaon+Bk.,+Pune,+Maharashtra+411046"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-info-address"
              >
                Office No.21 & 22, 3rd Floor, S/No. 56<br />
                Aston Plaza, Ambegaon Bk.<br />
                Pune, Maharashtra– 411046
              </a>
            </div>
          </div>

          {/* RIGHT COLUMN - CONTACT FORM */}
          <div className="form-card">
            <h2 className="form-title">Send Us a Message</h2>

            {submitted && (
              <div className="success-box">
                Message sent successfully!
              </div>
            )}

            {errors.submit && (
              <div className="error-box">
                {errors.submit}
              </div>
            )}

            <form 
              ref={formRef}
              className="form-inputs"
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
                className={errors.name ? "error" : ""}
              />
              {errors.name && <span className="error-message">{errors.name}</span>}

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Your Email"
                className={errors.email ? "error" : ""}
              />
              {errors.email && <span className="error-message">{errors.email}</span>}

              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone Number"
                className={errors.phone ? "error" : ""}
              />
              {errors.phone && <span className="error-message">{errors.phone}</span>}

              <textarea
                name="message"
                rows="4"
                value={formData.message}
                onChange={handleChange}
                placeholder="Message"
                className={errors.message ? "error" : ""}
              ></textarea>
              {errors.message && <span className="error-message">{errors.message}</span>}

              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>

            </form>
          </div>

        </div>

        {/* FAQ Section */}
        <div className="faq-section">
          <h2 className="faq-title">Frequently Asked Questions</h2>
          <div className="faq-list">
            {[
              {
                question: "How do I list a property?",
                answer: "To list your property, log in to your seller dashboard and click on 'My Properties'. Then click the 'Add Property' button and fill in all the required details including property type, location, price, and images. Once submitted, your property will be reviewed and published."
              },
              {
                question: "How can I contact the property owner?",
                answer: "You can contact property owners directly through our chat feature. Simply click on the 'Chat' button on any property listing page, or use the ChatUs page in your dashboard. Property owners will receive your message and can respond to your inquiries."
              },
              {
                question: "Is my data secure?",
                answer: "Yes, we take data security seriously. All your personal information, including contact details and property data, is encrypted and stored securely. We follow industry-standard security practices and never share your information with third parties without your consent."
              },
              {
                question: "How do I edit my profile?",
                answer: "To edit your profile, go to your dashboard and click on 'Profile' in the navigation menu. From there, you can update your personal information, contact details, profile picture, and other settings. Remember to save your changes before leaving the page."
              },
              {
                question: "How can I get support?",
                answer: "You can get support by filling out the contact form on this page, or by emailing us directly at info@indiapropertys.com. Our support team typically responds within 24 hours. You can also call us at +918433517958 during business hours."
              }
            ].map((faq, index) => (
              <div key={index} className={`faq-item ${openFaqIndex === index ? 'open' : ''}`}>
                <button
                  className="faq-question"
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                >
                  <span>{faq.question}</span>
                  <ChevronDown 
                    size={20} 
                    className={`faq-icon ${openFaqIndex === index ? 'open' : ''}`}
                  />
                </button>
                {openFaqIndex === index && (
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
