import Navbar from "@/components/Navbar";
import HeroSection from "@/components/home/HeroSection";
import BestSellers from "@/components/home/BestSellers";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import CategoriesSection from "@/components/home/CategoriesSection";
import OfferBanner from "@/components/home/OfferBanner";
import Newsletter from "@/components/home/Newsletter";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <BestSellers />
        <CategoriesSection />
        <FeaturedProducts />
        <OfferBanner />
        <Newsletter />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
