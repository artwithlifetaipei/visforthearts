import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] selection:bg-black selection:text-white">
      {/* Navigation */}
      <nav className="flex justify-between items-center p-8 border-b border-gray-200">
        <div className="text-2xl font-serif tracking-[0.2em] font-bold">
          VIS FOR THE ARTS
        </div>
        <div className="flex gap-12 text-[10px] uppercase tracking-[0.3em] font-light">
          <a href="#" className="hover:opacity-50 transition-opacity">Festival</a>
          <a href="#" className="hover:opacity-50 transition-opacity">Galleries</a>
          <a href="#" className="hover:opacity-50 transition-opacity">Visit</a>
          <div className="flex gap-2 border-l pl-8 border-gray-300">
            <span className="cursor-pointer font-bold">EN</span>
            <span className="text-gray-300">/</span>
            <span className="cursor-pointer hover:opacity-50 transition-opacity text-gray-400">CH</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-8 py-24 md:py-48 flex flex-col items-center text-center">
        <h1 className="text-6xl md:text-8xl font-serif mb-8 tracking-tighter animate-in fade-in slide-in-from-bottom-8 duration-1000">
          Celebrating <br />
          <span className="italic">Contemporary</span> Creativity.
        </h1>
        <p className="max-w-xl text-sm md:text-base leading-relaxed tracking-wide text-gray-500 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
          Join us for the 2024 edition of VIS FOR THE ARTS, 
          showcasing over 100 international artists at the 
          Hong Kong Convention & Exhibition Centre.
        </p>
        <div className="mt-16 animate-in fade-in zoom-in duration-1000 delay-500">
          <button className="px-12 py-4 bg-black text-white text-[10px] uppercase tracking-[0.4em] hover:bg-gray-800 transition-colors">
            Explore Program
          </button>
        </div>
      </section>

      {/* Footer Info */}
      <footer className="fixed bottom-8 left-8 right-8 flex justify-between items-end text-[10px] uppercase tracking-widest text-gray-400">
        <div>15—28 October 2024</div>
        <div>HKCEC, Hong Kong</div>
      </footer>
    </main>
  );
}
