import { useState } from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { Image as ImageIcon, Maximize2, X } from 'lucide-react';

const showcaseItems = [
  { id: 1, title: 'API Dashboard', image: '/assets/showcase-1.png', span: 'col-span-2 row-span-2' },
  { id: 2, title: 'Test Runner', image: '/assets/showcase-2.png', span: 'col-span-1 row-span-1' },
  { id: 3, title: 'Response Viewer', image: '/assets/showcase-3.png', span: 'col-span-1 row-span-1' },
  { id: 4, title: 'Performance Metrics', image: '/assets/showcase-4.png', span: 'col-span-1 row-span-1' },
  { id: 5, title: 'Security Scanner', image: '/assets/showcase-5.png', span: 'col-span-1 row-span-1' },
  { id: 6, title: 'Team Collaboration', image: '/assets/showcase-6.png', span: 'col-span-2 row-span-1' },
];

function GalleryItem({ item, isVisible, index, onExpand }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      data-testid={`gallery-item-${item.id}`}
      className={`${item.span} relative group rounded-2xl overflow-hidden landing-card-bg border landing-border hover:border-[#ff5b1f]/40 cursor-pointer transition-all duration-500 ${isVisible ? 'animate-slide-in-bottom' : 'opacity-0 translate-y-8'}`}
      style={{ animationDelay: `${index * 0.1}s`, minHeight: item.span.includes('row-span-2') ? '320px' : '160px' }}
      onClick={() => onExpand(item)}
    >
      {!imgError ? (
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full img-placeholder-shimmer flex flex-col items-center justify-center gap-3">
          <ImageIcon className="w-10 h-10 text-[#ff5b1f]/20" />
          <span className="text-xs landing-text-secondary">{item.title}</span>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0e1629]/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">{item.title}</span>
          <Maximize2 className="w-4 h-4 text-white/70" />
        </div>
      </div>
    </div>
  );
}

export default function ShowcaseGallery() {
  const [ref, isVisible] = useScrollReveal();
  const [expanded, setExpanded] = useState(null);

  return (
    <section data-testid="showcase-section" ref={ref} className="relative z-10 py-20 border-b landing-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-12 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <h2 data-testid="showcase-title" className="text-3xl font-bold landing-text-primary font-heading">
            See It In Action
          </h2>
          <p className="text-sm landing-text-secondary mt-2 max-w-lg mx-auto">
            Screenshots from the ProbeStack platform
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[160px]">
          {showcaseItems.map((item, i) => (
            <GalleryItem key={item.id} item={item} isVisible={isVisible} index={i} onExpand={setExpanded} />
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {expanded && (
        <div
          data-testid="gallery-lightbox"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
          onClick={() => setExpanded(null)}
        >
          <button className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors" onClick={() => setExpanded(null)}>
            <X className="w-8 h-8" />
          </button>
          <div className="max-w-4xl max-h-[80vh] rounded-2xl overflow-hidden border border-dark-600 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <img
              src={expanded.image}
              alt={expanded.title}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.parentElement.innerHTML = `<div class="w-full h-96 img-placeholder flex items-center justify-center"><span class="text-lg landing-text-secondary">${expanded.title} - Image Placeholder</span></div>`;
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
