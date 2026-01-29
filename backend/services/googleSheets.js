const { google } = require('googleapis');

// Google Sheets configuration
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Sheet1';

// Sheet names for different order statuses
const SHEET_NAMES = {
  new: 'neworders',
  delivered: 'delivered',
  cancelled: 'cancelled',
  selfpick: 'selfpick'
};

// Status colors (RGB values 0-1)
const STATUS_COLORS = {
  pending: { red: 1, green: 0.95, blue: 0.8 },
  confirmed: { red: 0.85, green: 0.92, blue: 1 },
  preparing: { red: 1, green: 0.9, blue: 0.8 },
  ready: { red: 0.9, green: 0.85, blue: 1 },
  out_for_delivery: { red: 0.85, green: 0.88, blue: 1 },
  delivered: { red: 0.85, green: 1, blue: 0.85 },
  cancelled: { red: 1, green: 0.85, blue: 0.85 },
  selfpick: { red: 0.9, green: 0.95, blue: 1 },
  ready_for_pickup: { red: 0.85, green: 0.9, blue: 1 },
  picked_up: { red: 0.8, green: 1, blue: 0.9 }
};

// Status display labels
const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'On the Way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  selfpick: 'Self Pickup',
  ready_for_pickup: 'Ready for Pickup',
  picked_up: 'Picked Up'
};

// Initialize Google Sheets API with Service Account
const getAuthClient = () => {
  try {
    const keyData = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyData) {
      console.error('❌ GOOGLE_SERVICE_ACCOUNT_KEY not set');
      return null;
    }
    const credentials = JSON.parse(keyData);
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
  } catch (error) {
    console.error('❌ Error parsing Google credentials:', error.message);
    return null;
  }
};

const googleSheets = {
  // Get sheet info by type
  async getSheetByType(sheets, sheetType) {
    try {
      const sheetName = SHEET_NAMES[sheetType];
      if (!sheetName) return null;
      
      const response = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const sheet = response.data.sheets.find(s => 
        s.properties.title.toLowerCase() === sheetName.toLowerCase()
      );
      
      return sheet ? { sheetId: sheet.properties.sheetId, sheetName: sheet.properties.title } : null;
    } catch (error) {
      console.error('Error getting sheet:', error.message);
      return null;
    }
  },

  // Find order in a sheet
  async findOrderInSheet(sheets, sheetName, orderId) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A:K`
      });
      
      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === orderId);
      
      return rowIndex === -1 ? null : { rowIndex, rowData: rows[rowIndex] };
    } catch (error) {
      console.error(`Error finding order in ${sheetName}:`, error.message);
      return null;
    }
  },

  // Add date header to sheet
  async addDateHeader(sheets, sheetName, sheetId) {
    try {
      const istOptions = { timeZone: 'Asia/Kolkata' };
      const date = new Date();
      const dateStr = date.toLocaleDateString('en-IN', istOptions);
      const dayName = date.toLocaleDateString('en-IN', { ...istOptions, weekday: 'long' });
      const year = date.toLocaleDateString('en-IN', { ...istOptions, year: 'numeric' });
      const dateHeaderText = `📅 ${dayName}, ${dateStr} (${year})`;

      // Check if header exists
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A:A`
      });
      
      const rows = response.data.values || [];
      if (rows.some(row => row[0] && row[0].includes(dateStr))) return;

      // Add header (11 columns now)
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A:K`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: { values: [[dateHeaderText, '', '', '', '', '', '', '', '', '', '']] }
      });

      // Style header
      const getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A:A`
      });
      const headerRowIndex = (getResponse.data.values || []).findIndex(row => row[0] === dateHeaderText);
      
      if (headerRowIndex !== -1) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          resource: {
            requests: [
              {
                repeatCell: {
                  range: { sheetId, startRowIndex: headerRowIndex, endRowIndex: headerRowIndex + 1, startColumnIndex: 0, endColumnIndex: 11 },
                  cell: {
                    userEnteredFormat: {
                      backgroundColor: { red: 0.2, green: 0.4, blue: 0.6 },
                      textFormat: { bold: true, fontSize: 12, foregroundColor: { red: 1, green: 1, blue: 1 } },
                      horizontalAlignment: 'CENTER'
                    }
                  },
                  fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
                }
              },
              {
                mergeCells: {
                  range: { sheetId, startRowIndex: headerRowIndex, endRowIndex: headerRowIndex + 1, startColumnIndex: 0, endColumnIndex: 11 },
                  mergeType: 'MERGE_ALL'
                }
              }
            ]
          }
        });
      }
    } catch (error) {
      console.error('Error adding date header:', error.message);
    }
  },

  // Update row color
  async updateRowColor(sheets, sheetId, rowIndex, status) {
    try {
      const color = STATUS_COLORS[status] || STATUS_COLORS.pending;
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{
            repeatCell: {
              range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 0, endColumnIndex: 11 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: color,
                  textFormat: { foregroundColor: { red: 0, green: 0, blue: 0 } }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat.foregroundColor)'
            }
          }]
        }
      });
    } catch (error) {
      console.error('Error updating row color:', error.message);
    }
  },

  // Add order to a specific sheet (with duplicate check)
  async addOrderToSheet(sheets, sheetType, rowData, paymentStatus, orderStatus, colorStatus) {
    try {
      const sheet = await this.getSheetByType(sheets, sheetType);
      if (!sheet) return false;

      const orderId = rowData[0];
      
      // Check if order already exists in this sheet
      const existingOrder = await this.findOrderInSheet(sheets, sheet.sheetName, orderId);
      if (existingOrder) {
        console.log(`⏭️ Order ${orderId} already exists in ${sheet.sheetName}, skipping add`);
        return true; // Return true since order is already there
      }

      await this.addDateHeader(sheets, sheet.sheetName, sheet.sheetId);

      // Prepare row data (11 columns: OrderID, Time, Phone, Name, Items, Total, PaymentMethod, PaymentStatus, OrderStatus, Address, DeliveryPartner)
      const newRowData = [...rowData];
      while (newRowData.length < 11) newRowData.push('');
      newRowData[7] = STATUS_LABELS[paymentStatus] || paymentStatus;
      newRowData[8] = STATUS_LABELS[orderStatus] || orderStatus;

      // Add row
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheet.sheetName}!A:K`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: { values: [newRowData] }
      });

      // Apply color
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheet.sheetName}!A:A`
      });
      const rows = response.data.values || [];
      const newRowIndex = rows.findIndex(row => row[0] === newRowData[0]);
      if (newRowIndex !== -1) {
        await this.updateRowColor(sheets, sheet.sheetId, newRowIndex, colorStatus);
      }

      console.log(`✅ Order added to ${sheet.sheetName}:`, newRowData[0]);
      return true;
    } catch (error) {
      console.error(`Error adding order to ${sheetType}:`, error.message);
      return false;
    }
  },

  // Delete order from a sheet
  async deleteOrderFromSheet(sheets, sheetId, rowIndex) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{
            deleteDimension: {
              range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 }
            }
          }]
        }
      });
      return true;
    } catch (error) {
      console.error('Error deleting row:', error.message);
      return false;
    }
  },

  // Add new order to neworders sheet (both delivery and self-pickup)
  async addOrder(order) {
    try {
      const auth = getAuthClient();
      if (!auth) return false;
      
      const sheets = google.sheets({ version: 'v4', auth });
      
      // All orders go to neworders sheet (both delivery and pickup)
      const sheet = await this.getSheetByType(sheets, 'new');
      if (!sheet) return false;

      await this.addDateHeader(sheets, sheet.sheetName, sheet.sheetId);

      const date = new Date(order.createdAt || Date.now());
      const istOptions = { timeZone: 'Asia/Kolkata' };
      const itemsStr = order.items.map(item => `${item.name} x${item.quantity} (₹${item.price * item.quantity})`).join(', ');

      // Determine payment method label based on service type
      let paymentMethodLabel = 'UPI/App';
      if (order.paymentMethod === 'cod') {
        if (order.serviceType === 'pickup') {
          paymentMethodLabel = 'Pay at Hotel';
        } else {
          paymentMethodLabel = 'COD';
        }
      }

      // Determine payment status label
      let paymentStatusLabel = 'Pending';
      if (order.paymentStatus === 'paid') {
        paymentStatusLabel = 'Paid';
      } else if (order.paymentMethod === 'cod') {
        if (order.serviceType === 'pickup') {
          paymentStatusLabel = 'Pay at Hotel';
        } else {
          paymentStatusLabel = 'Pending';
        }
      }

      // New column structure: OrderID, Time, Phone, Name, Items, Total, PaymentMethod, PaymentStatus, OrderStatus, Address, DeliveryPartner
      const row = [
        order.orderId,
        date.toLocaleTimeString('en-IN', istOptions),
        order.customer?.phone || '',
        order.customer?.name || '',
        itemsStr,
        order.totalAmount,
        paymentMethodLabel,
        paymentStatusLabel,
        STATUS_LABELS[order.status] || order.status || 'Pending',
        order.serviceType === 'pickup' ? 'Self Pickup' : (order.deliveryAddress?.address || ''),
        '' // Delivery Partner (empty for pickup, or delivery partner name for delivery)
      ];

      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheet.sheetName}!A:K`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: { values: [row] }
      });

      const updatedRange = response.data.updates?.updatedRange;
      if (updatedRange) {
        const match = updatedRange.match(/!A(\d+):/);
        if (match) {
          // Use selfpick color for pickup orders, otherwise use order status color
          const colorStatus = order.serviceType === 'pickup' ? 'selfpick' : (order.status || 'pending');
          await this.updateRowColor(sheets, sheet.sheetId, parseInt(match[1]) - 1, colorStatus);
        }
      }

      console.log(`✅ Order added to Google Sheet (${sheet.sheetName}):`, order.orderId);
      return true;
    } catch (error) {
      console.error('❌ Google Sheets add order error:', error.message);
      return false;
    }
  },

  // Main function to update order status
  async updateOrderStatus(orderId, status, paymentStatus = null, actualPaymentMethod = null) {
    try {
      console.log('📊 updateOrderStatus:', { orderId, status, paymentStatus, actualPaymentMethod });
      
      const auth = getAuthClient();
      if (!auth) return false;
      
      const sheets = google.sheets({ version: 'v4', auth });

      // Handle delivered/completed orders - move from neworders to appropriate sheet
      if (status === 'delivered' || status === 'picked_up') {
        const newSheet = await this.getSheetByType(sheets, 'new');
        if (!newSheet) return false;
        
        const orderData = await this.findOrderInSheet(sheets, newSheet.sheetName, orderId);
        if (!orderData) {
          console.log('❌ Order not found in neworders sheet');
          return false;
        }

        // Check if this is a pickup order by looking at the address column (column 10, index 9)
        const isPickupOrder = orderData.rowData[9] === 'Self Pickup' || orderId.startsWith('S');
        
        // If actualPaymentMethod is provided for pickup orders, update payment status to show Cash/UPI
        let finalPaymentStatus = paymentStatus || 'paid';
        if (isPickupOrder && actualPaymentMethod) {
          finalPaymentStatus = actualPaymentMethod === 'cash' ? 'Paid (Cash)' : 'Paid (UPI)';
          // Also update column K (delivery partner/payment method column) with Cash or UPI
          orderData.rowData[10] = actualPaymentMethod === 'cash' ? 'Cash' : 'UPI';
        }
        
        if (isPickupOrder) {
          // Pickup orders go to selfpick sheet when completed
          console.log('📦 Moving completed pickup order to selfpick sheet:', orderId, 'Payment:', finalPaymentStatus);
          await this.addOrderToSheet(sheets, 'selfpick', orderData.rowData, finalPaymentStatus, 'picked_up', 'picked_up');
        } else {
          // Delivery orders go to delivered sheet
          console.log('🚚 Moving completed delivery order to delivered sheet:', orderId);
          await this.addOrderToSheet(sheets, 'delivered', orderData.rowData, finalPaymentStatus, 'delivered', 'delivered');
        }
        
        // Delete from neworders
        await this.deleteOrderFromSheet(sheets, newSheet.sheetId, orderData.rowIndex);
        return true;
      }

      // Handle cancelled orders - just move to cancelled sheet (no refund logic)
      if (status === 'cancelled') {
        const newSheet = await this.getSheetByType(sheets, 'new');
        let orderData = null;
        
        if (newSheet) {
          orderData = await this.findOrderInSheet(sheets, newSheet.sheetName, orderId);
        }
        
        if (!orderData) {
          console.log('⚠️ Order not found in neworders sheet, trying to fetch from database...');
          // Try to get order data from database
          try {
            const Order = require('../models/Order');
            const dbOrder = await Order.findOne({ orderId });
            
            if (dbOrder) {
              const date = new Date(dbOrder.createdAt || Date.now());
              const istOptions = { timeZone: 'Asia/Kolkata' };
              const itemsStr = dbOrder.items.map(item => `${item.name} x${item.quantity} (₹${item.price * item.quantity})`).join(', ');
              
              orderData = {
                rowData: [
                  dbOrder.orderId,
                  date.toLocaleTimeString('en-IN', istOptions),
                  dbOrder.customer?.phone || '',
                  dbOrder.customer?.name || '',
                  itemsStr,
                  dbOrder.totalAmount,
                  (dbOrder.paymentMethod || 'upi').toUpperCase(),
                  STATUS_LABELS[dbOrder.paymentStatus] || 'Pending',
                  'Cancelled',
                  dbOrder.deliveryAddress?.address || dbOrder.serviceType === 'selfpick' ? 'Self Pickup' : '',
                  dbOrder.deliveryPartnerName || ''
                ],
                rowIndex: -1
              };
              console.log('✅ Created order data from database for:', orderId);
            }
          } catch (dbErr) {
            console.error('Error fetching order from database:', dbErr.message);
          }
        }
        
        if (!orderData) {
          console.log('❌ Order not found in neworders sheet or database');
          return false;
        }

        // Add to cancelled sheet
        await this.addOrderToSheet(sheets, 'cancelled', orderData.rowData, paymentStatus || 'cancelled', 'cancelled', 'cancelled');
        
        // Delete from neworders only if it was found there
        if (newSheet && orderData.rowIndex !== -1) {
          await this.deleteOrderFromSheet(sheets, newSheet.sheetId, orderData.rowIndex);
        }
        return true;
      }

      // Handle refunded orders - REMOVED (no longer needed)
      // Handle refund_failed orders - REMOVED (no longer needed)

      // For other statuses, update in neworders sheet
      const newSheet = await this.getSheetByType(sheets, 'new');
      if (!newSheet) return false;
      
      const orderData = await this.findOrderInSheet(sheets, newSheet.sheetName, orderId);
      if (!orderData) {
        console.log('❌ Order not found in neworders sheet');
        return false;
      }

      const updates = [];
      if (status) {
        updates.push({ range: `${newSheet.sheetName}!I${orderData.rowIndex + 1}`, values: [[STATUS_LABELS[status] || status]] });
      }
      if (paymentStatus) {
        updates.push({ range: `${newSheet.sheetName}!H${orderData.rowIndex + 1}`, values: [[STATUS_LABELS[paymentStatus] || paymentStatus]] });
      }

      if (updates.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          resource: { valueInputOption: 'RAW', data: updates }
        });
      }
      await this.updateRowColor(sheets, newSheet.sheetId, orderData.rowIndex, status);
      
      console.log('✅ Order status updated:', orderId, status);
      return true;
    } catch (error) {
      console.error('❌ Google Sheets update error:', error.message);
      return false;
    }
  },

  // Initialize sheet with headers
  async initializeSheet() {
    try {
      const auth = getAuthClient();
      const sheets = google.sheets({ version: 'v4', auth });
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1:K1`
      });
      
      if (!response.data.values || response.data.values.length === 0) {
        const headers = ['Order ID', 'Time', 'Customer Phone', 'Customer Name', 'Items', 'Total Amount', 'Payment Method', 'Payment Status', 'Order Status', 'Delivery Address', 'Delivery Partner'];
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A1:K1`,
          valueInputOption: 'RAW',
          resource: { values: [headers] }
        });
      }
      return true;
    } catch (error) {
      console.error('❌ Google Sheets init error:', error.message);
      return false;
    }
  },

  // Update delivery partner name in Google Sheet
  async updateDeliveryPartner(orderId, deliveryPartnerName) {
    try {
      const auth = getAuthClient();
      if (!auth) return false;
      
      const sheets = google.sheets({ version: 'v4', auth });
      const newSheet = await this.getSheetByType(sheets, 'new');
      if (!newSheet) return false;
      
      const orderData = await this.findOrderInSheet(sheets, newSheet.sheetName, orderId);
      if (!orderData) {
        console.log('❌ Order not found in neworders sheet for delivery partner update');
        return false;
      }
      
      // Add delivery partner name to column K (11th column)
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${newSheet.sheetName}!K${orderData.rowIndex + 1}`,
        valueInputOption: 'RAW',
        resource: { values: [[deliveryPartnerName]] }
      });
      
      console.log('✅ Delivery partner updated in Google Sheet:', orderId, deliveryPartnerName);
      return true;
    } catch (error) {
      console.error('❌ Google Sheets delivery partner update error:', error.message);
      return false;
    }
  },

  // Update actual payment method for self-pickup orders (Cash or UPI)
  async updateActualPaymentMethod(orderId, actualPaymentMethod) {
    try {
      const auth = getAuthClient();
      if (!auth) return false;
      
      const sheets = google.sheets({ version: 'v4', auth });
      
      // Try to find in neworders sheet first
      let sheet = await this.getSheetByType(sheets, 'new');
      let orderData = null;
      
      if (sheet) {
        orderData = await this.findOrderInSheet(sheets, sheet.sheetName, orderId);
      }
      
      // If not in neworders, try selfpick sheet (for completed pickup orders)
      if (!orderData) {
        sheet = await this.getSheetByType(sheets, 'selfpick');
        if (sheet) {
          orderData = await this.findOrderInSheet(sheets, sheet.sheetName, orderId);
        }
      }
      
      if (!orderData) {
        console.log('❌ Order not found in neworders or selfpick sheet for actual payment method update');
        return false;
      }
      
      // Update actual payment method in column K (11th column) - shows "Cash" or "UPI"
      const paymentLabel = actualPaymentMethod === 'cash' ? 'Cash' : 'UPI';
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheet.sheetName}!K${orderData.rowIndex + 1}`,
        valueInputOption: 'RAW',
        resource: { values: [[paymentLabel]] }
      });
      
      // Update payment status to "Paid (Cash)" or "Paid (UPI)"
      const paymentStatusLabel = actualPaymentMethod === 'cash' ? 'Paid (Cash)' : 'Paid (UPI)';
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheet.sheetName}!H${orderData.rowIndex + 1}`,
        valueInputOption: 'RAW',
        resource: { values: [[paymentStatusLabel]] }
      });
      
      console.log('✅ Actual payment method updated in Google Sheet:', orderId, paymentLabel);
      return true;
    } catch (error) {
      console.error('❌ Google Sheets actual payment method update error:', error.message);
      return false;
    }
  },

  // Update payment method in Google Sheet (for COD orders showing actual collection method)
  async updatePaymentMethod(orderId, paymentMethodLabel) {
    try {
      const auth = getAuthClient();
      if (!auth) return false;
      
      const sheets = google.sheets({ version: 'v4', auth });
      
      // Try to find in neworders sheet first
      let sheet = await this.getSheetByType(sheets, 'new');
      let orderData = null;
      
      if (sheet) {
        orderData = await this.findOrderInSheet(sheets, sheet.sheetName, orderId);
      }
      
      // If not in neworders, try selfpick sheet
      if (!orderData) {
        sheet = await this.getSheetByType(sheets, 'selfpick');
        if (sheet) {
          orderData = await this.findOrderInSheet(sheets, sheet.sheetName, orderId);
        }
      }
      
      // If not in selfpick, try delivered sheet
      if (!orderData) {
        sheet = await this.getSheetByType(sheets, 'delivered');
        if (sheet) {
          orderData = await this.findOrderInSheet(sheets, sheet.sheetName, orderId);
        }
      }
      
      if (!orderData) {
        console.log('❌ Order not found for payment method update');
        return false;
      }
      
      // Update payment method in column G (7th column)
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheet.sheetName}!G${orderData.rowIndex + 1}`,
        valueInputOption: 'RAW',
        resource: { values: [[paymentMethodLabel]] }
      });
      
      console.log('✅ Payment method updated in Google Sheet:', orderId, paymentMethodLabel);
      return true;
    } catch (error) {
      console.error('❌ Google Sheets payment method update error:', error.message);
      return false;
    }
  },

  // Clean up empty date headers from all sheets
  async cleanupEmptyDateHeaders() {
    try {
      const auth = getAuthClient();
      if (!auth) return false;
      
      const sheets = google.sheets({ version: 'v4', auth });
      const sheetTypes = ['new', 'delivered', 'cancelled', 'refunded', 'refundprocessing', 'refundfailed'];
      
      let totalRemoved = 0;
      
      for (const sheetType of sheetTypes) {
        const sheet = await this.getSheetByType(sheets, sheetType);
        if (!sheet) continue;
        
        try {
          // Get all rows from the sheet
          const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheet.sheetName}!A:A`
          });
          
          const rows = response.data.values || [];
          const rowsToDelete = [];
          
          // Find date header rows (they start with 📅)
          for (let i = 0; i < rows.length; i++) {
            const cellValue = rows[i]?.[0] || '';
            if (cellValue.startsWith('📅')) {
              // Check if next row is another date header or empty (no orders under this date)
              const nextRow = rows[i + 1]?.[0] || '';
              const isNextRowDateHeader = nextRow.startsWith('📅');
              const isNextRowEmpty = !nextRow || nextRow.trim() === '';
              const isLastRow = i === rows.length - 1;
              
              // If next row is another date header, empty, or this is the last row - this date header has no orders
              if (isNextRowDateHeader || isNextRowEmpty || isLastRow) {
                rowsToDelete.push(i);
              }
            }
          }
          
          // Delete rows from bottom to top to maintain correct indices
          if (rowsToDelete.length > 0) {
            rowsToDelete.sort((a, b) => b - a); // Sort descending
            
            for (const rowIndex of rowsToDelete) {
              await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                resource: {
                  requests: [{
                    deleteDimension: {
                      range: {
                        sheetId: sheet.sheetId,
                        dimension: 'ROWS',
                        startIndex: rowIndex,
                        endIndex: rowIndex + 1
                      }
                    }
                  }]
                }
              });
              totalRemoved++;
            }
            
            console.log(`🗑️ Removed ${rowsToDelete.length} empty date headers from ${sheet.sheetName}`);
          }
        } catch (sheetError) {
          console.error(`Error cleaning ${sheet.sheetName}:`, sheetError.message);
        }
      }
      
      if (totalRemoved > 0) {
        console.log(`✅ Total empty date headers removed: ${totalRemoved}`);
      } else {
        console.log('📅 No empty date headers to remove');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error cleaning up empty date headers:', error.message);
      return false;
    }
  }
};

module.exports = googleSheets;
