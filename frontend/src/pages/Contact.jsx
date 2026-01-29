import { useState } from 'react';
import { MapPin, Phone, Clock, Send, User, Mail } from 'lucide-react';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const msg = encodeURIComponent(
      `📬 *Contact Form Submission*\n\n` +
      `👤 Name: ${formData.name}\n` +
      `📧 Email: ${formData.email}\n` +
      `📋 Subject: ${formData.subject}\n\n` +
      `💬 Message:\n${formData.message}`
    );
    window.open(`https://wa.me/15551831644?text=${msg}`, '_blank');
    setSubmitted(true);
    setFormData({ name: '', email: '', subject: '', message: '' });
    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div>
      {/* Hero Section */}
      <section 
        className="relative text-white pt-24 sm:pt-28 pb-12 sm:pb-16 bg-cover bg-center"
        style={{ backgroundImage: "url('/breadcumb-bg.png')", backgroundColor: '#eac793' }}
      >
        <div className="relative max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">Contact Us</h1>
          <p className="text-base sm:text-lg text-gray-200 max-w-2xl mx-auto">
            We're here to help and answer any questions<br className="hidden sm:block" />Reach out and let's start a conversation!
          </p>
        </div>
      </section>

      {/* Contact Info & Form Section */}
      <section className="py-10 sm:py-12 md:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
            {/* Left - Contact Information Card */}
            <div className="relative bg-[#f5f1e8] rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 overflow-hidden">
              {/* Decorative leaves */}
              <img 
                src="/leaf-decoration.png" 
                alt="" 
                className="absolute right-0 top-1/3 w-24 sm:w-32 h-auto opacity-80 pointer-events-none hidden sm:block"
                onError={(e) => e.target.style.display = 'none'}
              />
              
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                CONTACT <span className="text-[#ff9924]">INFORMATION</span>
              </h2>
              <p className="text-gray-500 text-xs sm:text-sm mb-8 sm:mb-10 max-w-sm">
                Relax and enjoy your food in our cozy restaurant, or take it to-go. Great taste, great service — every visit is a flavorful experience worth coming back for.
              </p>

              <div className="space-y-6 sm:space-y-8">
                {/* Address */}
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#fee2e2] rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg">Address</h3>
                    <p className="text-gray-500 text-xs sm:text-sm">8502 Preston Rd. Inglewood, Maine 98380</p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#d1fae5] rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg">Contact Info</h3>
                    <p className="text-gray-500 text-xs sm:text-sm">Mobile: +258-6547-98749</p>
                    <p className="text-gray-500 text-xs sm:text-sm">Email: info@baralo.com</p>
                  </div>
                </div>

                {/* Opening Hours */}
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#fef3c7] rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg">Opening Hours</h3>
                    <p className="text-gray-500 text-xs sm:text-sm">Monday - Saturday: 9:00am - 10:00pm</p>
                    <p className="text-gray-500 text-xs sm:text-sm">Sunday are Closed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Contact Form */}
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Get In Touch!</h2>
              
              {submitted && (
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                  Thank you! Your message has been sent via WhatsApp.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {/* Name and Email Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-3 sm:px-4 py-3 sm:py-4 pr-10 sm:pr-12 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-gray-300 transition-colors text-gray-700 placeholder-gray-400 text-sm sm:text-base"
                      placeholder="Your name"
                    />
                    <User className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  </div>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-3 sm:px-4 py-3 sm:py-4 pr-10 sm:pr-12 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-gray-300 transition-colors text-gray-700 placeholder-gray-400 text-sm sm:text-base"
                      placeholder="Your Email"
                    />
                    <Mail className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  </div>
                </div>

                {/* Subject Dropdown */}
                <div className="relative">
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-3 sm:px-4 py-3 sm:py-4 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-gray-300 transition-colors text-gray-700 appearance-none cursor-pointer text-sm sm:text-base"
                  >
                    <option value="" disabled>Personal Training</option>
                    <option value="general">General Inquiry</option>
                    <option value="order">Order Related</option>
                    <option value="feedback">Feedback</option>
                    <option value="complaint">Complaint</option>
                    <option value="other">Other</option>
                  </select>
                  <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-3 sm:px-4 py-3 sm:py-4 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-gray-300 transition-colors resize-none text-gray-700 placeholder-gray-400 text-sm sm:text-base"
                    placeholder="Write Messages..."
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="bg-gray-900 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2 uppercase text-xs sm:text-sm tracking-wide w-full sm:w-auto justify-center"
                >
                  Send Message Now
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
