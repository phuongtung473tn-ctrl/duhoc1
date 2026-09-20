import hero480Avif from "@/assets/optimized/hero-student-480.avif";
import hero768Avif from "@/assets/optimized/hero-student-768.avif";
import hero1200Avif from "@/assets/optimized/hero-student-1200.avif";
import hero1600Avif from "@/assets/optimized/hero-student-1600.avif";
import hero480Webp from "@/assets/optimized/hero-student-480.webp";
import hero768Webp from "@/assets/optimized/hero-student-768.webp";
import hero1200Webp from "@/assets/optimized/hero-student-1200.webp";
import hero1600Webp from "@/assets/optimized/hero-student-1600.webp";

import visa480Avif from "@/assets/optimized/gallery-visa-480.avif";
import visa768Avif from "@/assets/optimized/gallery-visa-768.avif";
import visa1200Avif from "@/assets/optimized/gallery-visa-1200.avif";
import visa1600Avif from "@/assets/optimized/gallery-visa-1600.avif";
import visa480Webp from "@/assets/optimized/gallery-visa-480.webp";
import visa768Webp from "@/assets/optimized/gallery-visa-768.webp";
import visa1200Webp from "@/assets/optimized/gallery-visa-1200.webp";
import visa1600Webp from "@/assets/optimized/gallery-visa-1600.webp";

import campus480Avif from "@/assets/optimized/gallery-campus-480.avif";
import campus768Avif from "@/assets/optimized/gallery-campus-768.avif";
import campus1200Avif from "@/assets/optimized/gallery-campus-1200.avif";
import campus1600Avif from "@/assets/optimized/gallery-campus-1600.avif";
import campus480Webp from "@/assets/optimized/gallery-campus-480.webp";
import campus768Webp from "@/assets/optimized/gallery-campus-768.webp";
import campus1200Webp from "@/assets/optimized/gallery-campus-1200.webp";
import campus1600Webp from "@/assets/optimized/gallery-campus-1600.webp";

import dorm480Avif from "@/assets/optimized/gallery-dorm-room-480.avif";
import dorm768Avif from "@/assets/optimized/gallery-dorm-room-768.avif";
import dorm1200Avif from "@/assets/optimized/gallery-dorm-room-1200.avif";
import dorm1600Avif from "@/assets/optimized/gallery-dorm-room-1600.avif";
import dorm480Webp from "@/assets/optimized/gallery-dorm-room-480.webp";
import dorm768Webp from "@/assets/optimized/gallery-dorm-room-768.webp";
import dorm1200Webp from "@/assets/optimized/gallery-dorm-room-1200.webp";
import dorm1600Webp from "@/assets/optimized/gallery-dorm-room-1600.webp";

import airport480Avif from "@/assets/optimized/gallery-airport-480.avif";
import airport768Avif from "@/assets/optimized/gallery-airport-768.avif";
import airport1200Avif from "@/assets/optimized/gallery-airport-1200.avif";
import airport1600Avif from "@/assets/optimized/gallery-airport-1600.avif";
import airport480Webp from "@/assets/optimized/gallery-airport-480.webp";
import airport768Webp from "@/assets/optimized/gallery-airport-768.webp";
import airport1200Webp from "@/assets/optimized/gallery-airport-1200.webp";
import airport1600Webp from "@/assets/optimized/gallery-airport-1600.webp";

export const heroResponsive = {
  srcSet: `${hero480Webp} 480w, ${hero768Webp} 768w, ${hero1200Webp} 1200w, ${hero1600Webp} 1600w`,
  avifSrcSet: `${hero480Avif} 480w, ${hero768Avif} 768w, ${hero1200Avif} 1200w, ${hero1600Avif} 1600w`,
  fallbackSrc: hero1600Webp,
  sizes: "(max-width: 768px) 100vw, 52vw",
};

export const galleryResponsive = {
  visa: {
    srcSet: `${visa480Webp} 480w, ${visa768Webp} 768w, ${visa1200Webp} 1200w, ${visa1600Webp} 1600w`,
    avifSrcSet: `${visa480Avif} 480w, ${visa768Avif} 768w, ${visa1200Avif} 1200w, ${visa1600Avif} 1600w`,
    fallbackSrc: visa1600Webp,
    sizes: "(max-width: 768px) 100vw, 50vw",
  },
  campus: {
    srcSet: `${campus480Webp} 480w, ${campus768Webp} 768w, ${campus1200Webp} 1200w, ${campus1600Webp} 1600w`,
    avifSrcSet: `${campus480Avif} 480w, ${campus768Avif} 768w, ${campus1200Avif} 1200w, ${campus1600Avif} 1600w`,
    fallbackSrc: campus1600Webp,
    sizes: "(max-width: 768px) 100vw, 50vw",
  },
  dormRoom: {
    srcSet: `${dorm480Webp} 480w, ${dorm768Webp} 768w, ${dorm1200Webp} 1200w, ${dorm1600Webp} 1600w`,
    avifSrcSet: `${dorm480Avif} 480w, ${dorm768Avif} 768w, ${dorm1200Avif} 1200w, ${dorm1600Avif} 1600w`,
    fallbackSrc: dorm1600Webp,
    sizes: "(max-width: 768px) 100vw, 50vw",
  },
  airport: {
    srcSet: `${airport480Webp} 480w, ${airport768Webp} 768w, ${airport1200Webp} 1200w, ${airport1600Webp} 1600w`,
    avifSrcSet: `${airport480Avif} 480w, ${airport768Avif} 768w, ${airport1200Avif} 1200w, ${airport1600Avif} 1600w`,
    fallbackSrc: airport1600Webp,
    sizes: "(max-width: 768px) 100vw, 50vw",
  },
};
