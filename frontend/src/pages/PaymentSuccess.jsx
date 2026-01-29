import { useParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function PaymentSuccess() {
  const { orderId } = useParams();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Your payment for Order #{orderId} has been received.
        </p>
        
        <div className="bg-green-50 rounded-xl p-4 mb-6">
          <p className="text-green-700 text-sm">
            ✅ Order confirmed! Check WhatsApp for order updates.
          </p>
        </div>

        <p className="text-gray-500 text-sm">
          You can close this window now.
        </p>
      </div>
    </div>
  );
}
