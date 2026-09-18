import { Mail, Phone, MapPin, Clock } from 'lucide-react';

export default function Contact() {
  return (
    <div className="min-h-screen bg-ayurveda-bg">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div>
            <h2 className="text-4xl font-bold text-ayurveda-primary mb-6 font-heading">Get In Touch</h2>
            <p className="text-gray-600 mb-10 font-body text-lg leading-relaxed">
              Have questions about our products or need help with your order? Our team is
              ready to assist you. Reach out to us through any of the following channels.
            </p>

            <div className="space-y-8">
              <div className="flex items-start space-x-6 group">
                <div className="bg-ayurveda-light/30 p-4 rounded-2xl group-hover:bg-ayurveda-primary transition-colors duration-300">
                  <MapPin className="w-6 h-6 text-ayurveda-primary group-hover:text-white transition-colors duration-300" />
                </div>
                <div>
                  <h3 className="font-bold text-ayurveda-primary mb-2 font-heading text-lg">Visit Us</h3>
                  <p className="text-gray-600 font-body leading-relaxed">
                    Jangi Pura, Dabra
                    <br />
                    Gwalior, Madhya Pradesh, India
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-6 group">
                <div className="bg-ayurveda-light/30 p-4 rounded-2xl group-hover:bg-ayurveda-primary transition-colors duration-300">
                  <Phone className="w-6 h-6 text-ayurveda-primary group-hover:text-white transition-colors duration-300" />
                </div>
                <div>
                  <h3 className="font-bold text-ayurveda-primary mb-2 font-heading text-lg">Call Us</h3>
                  <p className="text-gray-600 font-body leading-relaxed">
                    +91 9425308540
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-6 group">
                <div className="bg-ayurveda-light/30 p-4 rounded-2xl group-hover:bg-ayurveda-primary transition-colors duration-300">
                  <Mail className="w-6 h-6 text-ayurveda-primary group-hover:text-white transition-colors duration-300" />
                </div>
                <div>
                  <h3 className="font-bold text-ayurveda-primary mb-2 font-heading text-lg">Email Us</h3>
                  <p className="text-gray-600 font-body leading-relaxed">
                    support@babaayurvedpharmacy.co.in
                    <br />
                    babaayurved@yahoo.in
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-6 group">
                <div className="bg-ayurveda-light/30 p-4 rounded-2xl group-hover:bg-ayurveda-primary transition-colors duration-300">
                  <Clock className="w-6 h-6 text-ayurveda-primary group-hover:text-white transition-colors duration-300" />
                </div>
                <div>
                  <h3 className="font-bold text-ayurveda-primary mb-2 font-heading text-lg">Business Hours</h3>
                  <p className="text-gray-600 font-body leading-relaxed">
                    Monday - Saturday: 9:00 AM - 7:00 PM
                    <br />
                    Sunday: 10:00 AM - 5:00 PM
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
