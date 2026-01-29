const SibApiV3Sdk = require('sib-api-v3-sdk');

const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const brevoMail = {
  async sendOrderConfirmation(email, orderDetails) {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = `Order Confirmed - ${orderDetails.orderId}`;
    sendSmtpEmail.htmlContent = `
      <h2>Order Confirmed!</h2>
      <p>Thank you for your order.</p>
      <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
      <p><strong>Total:</strong> ₹${orderDetails.totalAmount}</p>
      <p><strong>Service:</strong> ${orderDetails.serviceType}</p>
      <h3>Items:</h3>
      <ul>${orderDetails.items.map(i => `<li>${i.name} x ${i.quantity} - ₹${i.price * i.quantity}</li>`).join('')}</ul>
      <p>We'll notify you when your order is ready!</p>
    `;
    sendSmtpEmail.sender = { name: process.env.BREVO_FROM_NAME, email: process.env.BREVO_FROM_EMAIL };
    sendSmtpEmail.to = [{ email }];

    try {
      await apiInstance.sendTransacEmail(sendSmtpEmail);
      return true;
    } catch (error) {
      console.error('Brevo email error:', error.message);
      return false;
    }
  },

  async sendDeliveryPartnerNotification(email, partnerName, orderDetails) {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = `🛵 New Order Assigned - ${orderDetails.orderId}`;
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #267E3E 0%, #1B5E2E 100%); padding: 25px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🛵 New Order Assigned!</h1>
        </div>
        
        <div style="padding: 25px; background: #f8f9fb; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333;">Hi <strong>${partnerName}</strong>,</p>
          <p style="color: #555;">A new order has been assigned to you. Please check your app for details.</p>
          
          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #267E3E;">
            <h3 style="color: #267E3E; margin-top: 0;">Order Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Order ID:</td>
                <td style="padding: 8px 0; text-align: right;"><strong>${orderDetails.orderId}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Customer:</td>
                <td style="padding: 8px 0; text-align: right;"><strong>${orderDetails.customerName}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Phone:</td>
                <td style="padding: 8px 0; text-align: right;"><strong>${orderDetails.customerPhone}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Amount:</td>
                <td style="padding: 8px 0; text-align: right;"><strong style="color: #267E3E;">₹${orderDetails.totalAmount}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Payment:</td>
                <td style="padding: 8px 0; text-align: right;"><strong>${orderDetails.paymentMethod === 'cod' ? '💵 Cash on Delivery' : '💳 UPI (Prepaid)'}</strong></td>
              </tr>
            </table>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">📍 Delivery Address</h3>
            <p style="color: #555; margin: 0; line-height: 1.6;">${orderDetails.deliveryAddress}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">🍽️ Items (${orderDetails.items.length})</h3>
            <ul style="margin: 0; padding-left: 20px; color: #555;">
              ${orderDetails.items.map(i => `<li style="padding: 5px 0;">${i.name} × ${i.quantity}</li>`).join('')}
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 25px;">
            <p style="color: #888; font-size: 14px;">Open your delivery app to accept and start the delivery.</p>
          </div>
        </div>
        
        <div style="padding: 15px; text-align: center; color: #888; font-size: 12px;">
          <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
      </div>
    `;
    sendSmtpEmail.sender = { name: process.env.BREVO_FROM_NAME || 'FoodAdmin', email: process.env.BREVO_FROM_EMAIL };
    sendSmtpEmail.to = [{ email }];

    try {
      await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`📧 Delivery notification email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Brevo delivery notification email error:', error.message);
      return false;
    }
  },

  async sendStatusUpdate(email, orderId, status, message) {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = `Order ${orderId} - ${status}`;
    sendSmtpEmail.htmlContent = `
      <h2>Order Update</h2>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Status:</strong> ${status}</p>
      <p>${message}</p>
    `;
    sendSmtpEmail.sender = { name: process.env.BREVO_FROM_NAME, email: process.env.BREVO_FROM_EMAIL };
    sendSmtpEmail.to = [{ email }];

    try {
      await apiInstance.sendTransacEmail(sendSmtpEmail);
      return true;
    } catch (error) {
      console.error('Brevo email error:', error.message);
      return false;
    }
  },

  async sendReportEmail(email, subject, reportData, reportType, pdfBuffer) {
    const REPORT_TYPE_LABELS = {
      today: "Today's Report",
      weekly: 'Weekly Report',
      monthly: 'Monthly Report',
      yearly: 'Annual Report',
      custom: 'Custom Range Report'
    };
    
    const reportLabel = REPORT_TYPE_LABELS[reportType] || 'Report';
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #e63946; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">FoodAdmin</h1>
          <p style="color: white; margin: 5px 0 0 0;">Restaurant Management System</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fb;">
          <h2 style="color: #1c1d21; margin-top: 0;">${reportLabel}</h2>
          <p style="color: #61636b;">Generated on ${dateStr}</p>
          
          <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #1c1d21; margin-top: 0;">Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e2e3e5;"><strong>Total Revenue</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e3e5; text-align: right;">₹${(reportData.totalRevenue || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e2e3e5;"><strong>Total Orders</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e3e5; text-align: right;">${reportData.totalOrders || 0}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e2e3e5;"><strong>Items Sold</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e2e3e5; text-align: right;">${reportData.totalItemsSold || 0}</td>
              </tr>
              <tr>
                <td style="padding: 10px;"><strong>Avg Order Value</strong></td>
                <td style="padding: 10px; text-align: right;">₹${(reportData.avgOrderValue || 0).toLocaleString()}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 10px;">
            <h3 style="color: #1c1d21; margin-top: 0;">Order Status</h3>
            <p>✅ Delivered: <strong>${reportData.deliveredOrders || 0}</strong></p>
            <p>❌ Cancelled: <strong>${reportData.cancelledOrders || 0}</strong></p>
            <p>🔄 Refunded: <strong>${reportData.refundedOrders || 0}</strong></p>
            <p>💵 COD: <strong>${reportData.codOrders || 0}</strong> | 💳 UPI: <strong>${reportData.upiOrders || 0}</strong></p>
          </div>
        </div>
        
        <div style="padding: 20px; text-align: center; color: #61636b; font-size: 12px;">
          <p>This is an automated report from FoodAdmin.</p>
          <p>Please find the detailed PDF report attached.</p>
        </div>
      </div>
    `;
    sendSmtpEmail.sender = { name: process.env.BREVO_FROM_NAME || 'FoodAdmin', email: process.env.BREVO_FROM_EMAIL };
    sendSmtpEmail.to = [{ email }];
    sendSmtpEmail.attachment = [{
      content: pdfBuffer.toString('base64'),
      name: `FoodAdmin_${reportType}_Report_${new Date().toISOString().split('T')[0]}.pdf`
    }];

    try {
      await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`📧 Report email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Brevo report email error:', error.message);
      throw error;
    }
  }
};

module.exports = brevoMail;
