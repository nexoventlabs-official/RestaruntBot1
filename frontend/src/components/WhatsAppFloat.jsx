import { WhatsAppIcon } from './Icons';

const WHATSAPP_NUMBER = '15551831644';

export default function WhatsAppFloat() {
  const handleClick = () => {
    const message = encodeURIComponent('Hi');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-24 md:bottom-6 left-4 md:left-6 z-50 bg-green-500 hover:bg-green-600 text-white p-3 md:p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group"
      aria-label="Chat on WhatsApp"
    >
      <WhatsAppIcon className="w-6 h-6 md:w-7 md:h-7" />
      <span className="absolute left-full ml-3 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden md:block">
        Chat with us
      </span>
    </button>
  );
}
