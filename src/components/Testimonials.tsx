import React, { FC } from "react";

const safeArray = (value: any) => (Array.isArray(value) ? value : []);

interface Testimonial {
  name: string;
  testimonial: string;
}
interface TestimonialsProps {
  title: string;
  data: Testimonial[];
}
const Testimonials: React.FC<TestimonialsProps> = ({ title, data }) => {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 animate-fade-in">
      <h2 className="text-3xl font-bold text-center replica-heading text-gray-900" role="heading" aria-level="2">{title}</h2>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {safeArray(data).map((item, index) => (
          <div key={index} className="border p-4 rounded replica-card hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-white shadow-sm">
            <p className="font-semibold replica-text text-lg text-gray-800">{item.name}</p>
            <p className="text-gray-600 mt-2">{item.testimonial}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
export default Testimonials;