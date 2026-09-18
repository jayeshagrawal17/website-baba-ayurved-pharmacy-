import { Sprout, ScrollText, MapPin, Leaf } from 'lucide-react';

export default function About() {
  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section - Clean and Bold */}
      <section className="relative pt-20 md:pt-28 pb-16 md:pb-20 bg-gradient-to-b from-ayurveda-bg to-white overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 bg-ayurveda-primary/10 text-ayurveda-primary px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <Leaf className="w-4 h-4" />
              <span>Est. 1874</span>
            </div>
            <h1 className="text-4xl md:text-7xl font-bold text-ayurveda-primary font-heading mb-6 tracking-tight leading-[1.1]">
              150 Years of <br/>
              <span className="text-ayurveda-secondary">Healing Wisdom</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 font-body max-w-xl mx-auto leading-relaxed">
              From Phoolchand Aushdhalaya to Baba Ayurveda — our journey of purity, tradition, and trust.
            </p>
          </div>
        </div>
      </section>

      {/* Story Section - Minimal Two Column */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 md:gap-20 items-center">
            {/* Image */}
            <div className="relative">
              <img
                src="https://images.pexels.com/photos/4498606/pexels-photo-4498606.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Ayurvedic Preparation"
                className="w-full h-[350px] md:h-[500px] object-cover rounded-3xl shadow-lg"
              />
              <div className="absolute -bottom-6 -right-4 md:-bottom-8 md:-right-8 bg-ayurveda-primary text-white p-5 md:p-8 rounded-2xl shadow-xl max-w-[200px] md:max-w-xs">
                <p className="font-heading text-lg md:text-2xl italic leading-snug">"Purity above profit."</p>
                <p className="text-xs md:text-sm opacity-80 mt-2 font-medium">— Our Founding Principle</p>
              </div>
            </div>

            {/* Text */}
            <div className="space-y-6 md:space-y-8">
              <div>
                <span className="text-ayurveda-accent tracking-widest uppercase text-xs font-bold">Our Story</span>
                <h2 className="text-3xl md:text-5xl font-bold text-ayurveda-primary font-heading mt-2 leading-tight">
                  Rooted in Tradition
                </h2>
              </div>
              <p className="text-gray-600 text-base md:text-lg font-body leading-relaxed">
                Ayurveda is not a trend to us. It is our inheritance. Our story began over 150 years ago under the name <strong className="text-ayurveda-primary">'Phoolchand Aushdhalaya.'</strong> For generations, our family served the community, formulating medicines with a single principle: purity above profit.
              </p>
              <p className="text-gray-600 text-base md:text-lg font-body leading-relaxed">
                In 1999, we evolved. Located in the heart of Madhya Pradesh, we have exclusive access to a network of trusted farmers. We know exactly which soil grows the potent Ashwagandha and which season yields the true Shilajit.
              </p>
              <div className="pt-4 border-l-4 border-ayurveda-accent pl-6">
                <p className="text-ayurveda-primary text-lg md:text-xl font-heading italic">
                  "We use raw herbs. No extracts. No shortcuts. Because you deserve the whole herb—just as nature intended."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Us Section - Clean Cards */}
      <section className="py-16 md:py-24 bg-ayurveda-bg/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-ayurveda-accent tracking-widest uppercase text-xs font-bold">Our Promise</span>
            <h2 className="text-3xl md:text-5xl font-bold font-heading text-ayurveda-primary mt-2">Why We're Different</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: Sprout,
                title: 'Whole Herb Promise',
                desc: 'We preserve the natural synergy of raw herbs. No standardized extracts.'
              },
              {
                icon: MapPin,
                title: 'Sourcing Advantage',
                desc: "A 150-year relationship with Madhya Pradesh's finest herb farmers."
              },
              {
                icon: ScrollText,
                title: 'Scripture Standard',
                desc: 'Formulations strictly true to ancient Ayurvedic scriptures.'
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-lg transition-shadow duration-300 text-center">
                <div className="bg-ayurveda-light w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-5">
                  <item.icon className="w-7 h-7 md:w-8 md:h-8 text-ayurveda-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-3 font-heading text-ayurveda-primary">{item.title}</h3>
                <p className="text-gray-600 text-sm md:text-base leading-relaxed font-body">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Quote + Certifications */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          {/* Mission Quote */}
          <div className="max-w-3xl mx-auto text-center mb-16 md:mb-20">
            <div className="bg-gradient-to-br from-ayurveda-primary to-ayurveda-secondary p-8 md:p-12 rounded-3xl shadow-xl">
              <p className="text-xl md:text-3xl font-heading font-bold text-white italic leading-relaxed">
                "We founded <span className="text-ayurveda-accent">BABA AYURVEDA</span> with a bold mission: To make Ayurveda not just the medicine of the past, but the medicine of the future."
              </p>
            </div>
          </div>
          
          {/* Certifications */}
          <div className="grid grid-cols-4 gap-4 md:gap-12 max-w-4xl mx-auto">
            {[
              { img: '/Ministry of Ayush.png', title: 'Ministry of AYUSH' },
              { img: '/cruelty-free.png', title: 'Cruelty Free' },
              { img: '/GMP Certified.png', title: 'GMP Certified' },
              { img: '/Handpicked ingredient.png', title: 'Handpicked Ingredients' },
            ].map((item, idx) => (
              <div key={idx} className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 md:w-24 md:h-24 mb-3">
                  <img 
                    src={item.img} 
                    alt={item.title}
                    className="w-14 h-14 md:w-20 md:h-20 object-contain opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"
                  />
                </div>
                <h3 className="text-[10px] md:text-sm font-semibold text-gray-700 font-body leading-tight">{item.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
