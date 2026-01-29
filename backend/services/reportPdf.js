const PDFDocument = require('pdfkit');
const https = require('https');
const http = require('http');

const REPORT_TYPE_LABELS = {
  today: "Today's Report",
  weekly: 'Weekly Report',
  monthly: 'Monthly Report',
  yearly: 'Annual Report',
  custom: 'Custom Range Report'
};

// Format currency for PDF (using Rs. since Helvetica doesn't support ₹)
const formatCurrency = (val) => `Rs.${(val || 0).toLocaleString('en-IN')}`;

// Validate if buffer is a valid image
const isValidImage = (buffer) => {
  if (!buffer || buffer.length < 8) return false;
  
  // Check for PNG signature
  const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  const isPng = pngSignature.every((byte, i) => buffer[i] === byte);
  
  // Check for JPEG signature
  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  
  // Check for GIF signature
  const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
  
  return isPng || isJpeg || isGif;
};

// Fetch image from URL and return as buffer
const fetchImageBuffer = (url) => {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }
    
    const protocol = url.startsWith('https') ? https : http;
    const timeout = setTimeout(() => resolve(null), 10000); // 10s timeout
    
    const makeRequest = (requestUrl, redirectCount = 0) => {
      if (redirectCount > 5) {
        clearTimeout(timeout);
        resolve(null);
        return;
      }
      
      const reqProtocol = requestUrl.startsWith('https') ? https : http;
      
      reqProtocol.get(requestUrl, (res) => {
        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let redirectUrl = res.headers.location;
          // Handle relative redirects
          if (redirectUrl.startsWith('/')) {
            const urlObj = new URL(requestUrl);
            redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
          }
          makeRequest(redirectUrl, redirectCount + 1);
          return;
        }
        
        if (res.statusCode !== 200) {
          clearTimeout(timeout);
          resolve(null);
          return;
        }
        
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          clearTimeout(timeout);
          const buffer = Buffer.concat(chunks);
          // Validate image before returning
          if (isValidImage(buffer)) {
            resolve(buffer);
          } else {
            resolve(null);
          }
        });
        res.on('error', () => {
          clearTimeout(timeout);
          resolve(null);
        });
      }).on('error', () => {
        clearTimeout(timeout);
        resolve(null);
      });
    };
    
    makeRequest(url);
  });
};

// Pre-fetch all images for items
const prefetchImages = async (items) => {
  const imageMap = {};
  const uniqueItems = [];
  const seenNames = new Set();
  
  // Deduplicate items by name
  for (const item of items) {
    if (item.name && !seenNames.has(item.name)) {
      seenNames.add(item.name);
      uniqueItems.push(item);
    }
  }
  
  const promises = uniqueItems.map(async (item) => {
    if (item.image) {
      try {
        const buffer = await fetchImageBuffer(item.image);
        if (buffer) {
          imageMap[item.name] = buffer;
        }
      } catch (e) {
        // Silently fail for individual images
      }
    }
  });
  await Promise.all(promises);
  return imageMap;
};

const generateReportPdf = async (reportData, reportType) => {
  // Pre-fetch images for all items
  const allItems = [
    ...(reportData.topSellingItems || []),
    ...(reportData.leastSellingItems || []),
    ...(reportData.allItemsSold || [])
  ];
  const imageMap = await prefetchImages(allItems);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Colors matching admin panel
      const primaryColor = '#e63946';
      const darkColor = '#1c1d21';
      const grayColor = '#61636b';
      const borderColor = '#e5e7eb';
      
      // Table settings - matching admin panel (40x40 images)
      const imgSize = 32; // Image size matching admin panel proportionally
      const rowHeight = 44; // Row height to accommodate images
      const tableWidth = 515; // Full width table
      const tableStartX = 40;

      // Column widths matching admin panel proportions
      const cols = {
        sno: 35,
        image: 45,
        name: 140,
        rating: 70,
        interest: 70,
        qty: 55,
        revenue: 100
      };

      // Header
      doc.rect(0, 0, doc.page.width, 120).fill(primaryColor);
      doc.fillColor('white').fontSize(28).font('Helvetica-Bold')
        .text('FoodAdmin', 50, 40);
      doc.fontSize(12).font('Helvetica')
        .text('Restaurant Management System', 50, 75);
      
      // Generate report title with date range
      const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      let reportTitle = 'Report';
      
      if (reportData.dateRange) {
        const fromDate = formatDate(reportData.dateRange.start);
        const toDate = formatDate(reportData.dateRange.end);
        
        switch (reportType) {
          case 'today':
            reportTitle = `Today's Report (${fromDate})`;
            break;
          case 'weekly':
            reportTitle = `Weekly Report (${fromDate} - ${toDate})`;
            break;
          case 'monthly':
            reportTitle = `Monthly Report (${fromDate} - ${toDate})`;
            break;
          case 'yearly':
            reportTitle = `Annual Report (${fromDate} - ${toDate})`;
            break;
          case 'custom':
            reportTitle = `${fromDate} - ${toDate}`;
            break;
          default:
            reportTitle = REPORT_TYPE_LABELS[reportType] || 'Report';
        }
      } else {
        reportTitle = REPORT_TYPE_LABELS[reportType] || 'Report';
      }
      
      doc.fontSize(14).font('Helvetica-Bold')
        .text(reportTitle, 50, 95);

      // Date info
      const dateStr = new Date().toLocaleDateString('en-IN', { 
        day: '2-digit', month: 'long', year: 'numeric' 
      });
      doc.fontSize(10).font('Helvetica').fillColor('white')
        .text(`Generated: ${dateStr}`, doc.page.width - 200, 50, { width: 150, align: 'right' });

      let y = 145;

      // Summary Section
      doc.fillColor(darkColor).fontSize(16).font('Helvetica-Bold')
        .text('Summary', 40, y);
      y += 30;

      // Summary boxes - matching admin panel cards
      const summaryData = [
        { label: 'Total Revenue', value: formatCurrency(reportData.totalRevenue), color: '#22c55e' },
        { label: 'Total Orders', value: String(reportData.totalOrders || 0), color: '#3b82f6' },
        { label: 'Items Sold', value: String(reportData.totalItemsSold || 0), color: '#f97316' },
        { label: 'Avg Order Value', value: formatCurrency(reportData.avgOrderValue), color: '#e63946' }
      ];

      const boxWidth = 120;
      const boxHeight = 65;
      summaryData.forEach((item, i) => {
        const x = 40 + (i * (boxWidth + 12));
        // Card background
        doc.roundedRect(x, y, boxWidth, boxHeight, 8).fillAndStroke('#ffffff', borderColor);
        // Color indicator bar
        doc.rect(x, y, 4, boxHeight).fill(item.color);
        // Label
        doc.fillColor(grayColor).fontSize(9).font('Helvetica')
          .text(item.label, x + 12, y + 12, { width: boxWidth - 20 });
        // Value
        doc.fillColor(darkColor).fontSize(18).font('Helvetica-Bold')
          .text(item.value, x + 12, y + 32, { width: boxWidth - 20 });
      });
      y += boxHeight + 20;

      // Order Status Section
      doc.fillColor(darkColor).fontSize(14).font('Helvetica-Bold')
        .text('Order Status Breakdown', 40, y);
      y += 25;

      const statusData = [
        { label: 'Delivered', value: reportData.deliveredOrders || 0, color: '#22c55e' },
        { label: 'Cancelled', value: reportData.cancelledOrders || 0, color: '#ef4444' },
        { label: 'Refunded', value: reportData.refundedOrders || 0, color: '#f97316' },
        { label: 'COD Orders', value: reportData.codOrders || 0, color: '#3b82f6' },
        { label: 'UPI Orders', value: reportData.upiOrders || 0, color: '#8b5cf6' }
      ];

      const statusBoxWidth = 95;
      statusData.forEach((item, i) => {
        const x = 40 + (i * (statusBoxWidth + 8));
        doc.roundedRect(x, y, statusBoxWidth, 50, 6).fillAndStroke('#ffffff', borderColor);
        doc.rect(x, y, 3, 50).fill(item.color);
        doc.fillColor(item.color).fontSize(20).font('Helvetica-Bold')
          .text(String(item.value), x + 10, y + 10);
        doc.fillColor(grayColor).fontSize(8).font('Helvetica')
          .text(item.label, x + 10, y + 32);
      });
      y += 70;

      // Helper function to calculate interest level
      const getInterestLevel = (quantity, allItemsList) => {
        if (!allItemsList || allItemsList.length === 0) return 'low';
        const quantities = allItemsList.map(i => i.quantity || 0);
        const avgQty = quantities.reduce((a, b) => a + b, 0) / quantities.length;
        
        if (quantity >= avgQty * 1.5) return 'high';
        if (quantity >= avgQty * 0.5) return 'constant';
        return 'low';
      };

      // Helper function to draw table header - matching admin panel style
      const drawTableHeader = (startY) => {
        // Header background - matching bg-dark-50
        doc.rect(tableStartX, startY, tableWidth, 28).fill('#f9fafb');
        
        // Header text
        doc.fillColor('#4b5563').fontSize(9).font('Helvetica-Bold');
        let x = tableStartX;
        doc.text('S.No', x + 8, startY + 10, { width: cols.sno });
        x += cols.sno;
        doc.text('Image', x + 4, startY + 10, { width: cols.image });
        x += cols.image;
        doc.text('Item Name', x + 4, startY + 10, { width: cols.name });
        x += cols.name;
        doc.text('Rating', x + 4, startY + 10, { width: cols.rating, align: 'center' });
        x += cols.rating;
        doc.text('Interest', x + 4, startY + 10, { width: cols.interest, align: 'center' });
        x += cols.interest;
        doc.text('Qty Sold', x + 4, startY + 10, { width: cols.qty, align: 'right' });
        x += cols.qty;
        doc.text('Revenue', x + 4, startY + 10, { width: cols.revenue - 8, align: 'right' });
        
        return startY + 28;
      };

      // Helper function to draw placeholder image
      const drawPlaceholder = (imgX, imgY) => {
        doc.roundedRect(imgX, imgY, imgSize, imgSize, 4).fillAndStroke('#f3f4f6', borderColor);
        doc.fillColor('#9ca3af').fontSize(12).font('Helvetica')
          .text('N/A', imgX + 4, imgY + imgSize/2 - 6, { width: imgSize - 8, align: 'center' });
      };

      // Helper function to draw fire icon (for top selling)
      const drawFireIcon = (x, y, size = 14) => {
        doc.save();
        const s = size / 14; // scale factor
        doc.translate(x, y);
        doc.scale(s);
        // Flame shape
        doc.path('M7 0C7 0 3 4 3 8C3 10.5 4.5 12.5 7 13C5.5 11.5 5.5 9 7 7C8.5 9 8.5 11.5 7 13C9.5 12.5 11 10.5 11 8C11 4 7 0 7 0Z')
          .fill('#ef4444');
        doc.restore();
      };

      // Helper function to draw chart down icon (for least selling)
      const drawChartDownIcon = (x, y, size = 14) => {
        doc.save();
        doc.translate(x, y);
        const s = size / 14;
        doc.scale(s);
        // Down arrow with line
        doc.moveTo(2, 2).lineTo(2, 12).stroke('#ef4444');
        doc.moveTo(2, 12).lineTo(12, 12).stroke('#ef4444');
        doc.moveTo(4, 4).lineTo(7, 7).lineTo(9, 5).lineTo(12, 10).strokeColor('#ef4444').lineWidth(1.5).stroke();
        // Arrow head
        doc.path('M12 10L10 7L12 8Z').fill('#ef4444');
        doc.restore();
      };

      // Helper function to draw package/box icon (for all items)
      const drawPackageIcon = (x, y, size = 14) => {
        doc.save();
        doc.translate(x, y);
        const s = size / 14;
        doc.scale(s);
        // Box outline
        doc.rect(1, 3, 12, 10).strokeColor('#3b82f6').lineWidth(1.2).stroke();
        // Top flaps
        doc.moveTo(1, 3).lineTo(7, 0).lineTo(13, 3).strokeColor('#3b82f6').stroke();
        // Center line
        doc.moveTo(7, 0).lineTo(7, 8).stroke();
        doc.moveTo(1, 3).lineTo(7, 6).lineTo(13, 3).stroke();
        doc.restore();
      };

      // Helper function to draw star icon
      const drawStarIcon = (x, y, size = 10) => {
        doc.save();
        doc.translate(x, y);
        const s = size / 10;
        doc.scale(s);
        doc.path('M5 0L6.1 3.5H10L6.9 5.5L8 9L5 7L2 9L3.1 5.5L0 3.5H3.9Z')
          .fill('#f59e0b');
        doc.restore();
      };

      // Helper function to draw trend up arrow
      const drawTrendUp = (x, y, size = 10) => {
        doc.save();
        doc.translate(x, y);
        const s = size / 10;
        doc.scale(s);
        doc.path('M5 0L10 6H6V10H4V6H0Z').fill('#22c55e');
        doc.restore();
      };

      // Helper function to draw trend down arrow
      const drawTrendDown = (x, y, size = 10) => {
        doc.save();
        doc.translate(x, y);
        const s = size / 10;
        doc.scale(s);
        doc.path('M5 10L10 4H6V0H4V4H0Z').fill('#ef4444');
        doc.restore();
      };

      // Helper function to draw stable/minus icon
      const drawStable = (x, y, size = 10) => {
        doc.save();
        doc.translate(x, y);
        doc.rect(0, 3, size, 4).fill('#eab308');
        doc.restore();
      };

      // Helper function to draw item row - matching admin panel style
      const drawItemRow = (item, idx, startY, allItemsList) => {
        const rowY = startY;
        
        // Alternating row background for better readability
        if (idx % 2 === 1) {
          doc.rect(tableStartX, rowY, tableWidth, rowHeight).fill('#fafafa');
        }
        
        // Row border bottom
        doc.moveTo(tableStartX, rowY + rowHeight).lineTo(tableStartX + tableWidth, rowY + rowHeight).stroke(borderColor);
        
        let x = tableStartX;
        const textY = rowY + (rowHeight - 10) / 2;
        const imgY = rowY + (rowHeight - imgSize) / 2;
        
        // S.No
        doc.fillColor('#6b7280').fontSize(9).font('Helvetica')
          .text(String(idx + 1), x + 8, textY, { width: cols.sno });
        x += cols.sno;
        
        // Image - with proper error handling to not break the table
        const imgBuffer = imageMap[item.name];
        const imgX = x + 4;
        
        let imageDrawn = false;
        if (imgBuffer) {
          try {
            doc.save();
            doc.roundedRect(imgX, imgY, imgSize, imgSize, 4).clip();
            doc.image(imgBuffer, imgX, imgY, { cover: [imgSize, imgSize], align: 'center', valign: 'center' });
            doc.restore();
            doc.roundedRect(imgX, imgY, imgSize, imgSize, 4).stroke(borderColor);
            imageDrawn = true;
          } catch (e) {
            // Image failed to render, will draw placeholder
            doc.restore(); // Make sure to restore even on error
          }
        }
        
        if (!imageDrawn) {
          drawPlaceholder(imgX, imgY);
        }
        x += cols.image;
        
        // Item Name
        doc.fillColor(darkColor).fontSize(9).font('Helvetica')
          .text(item.name || '-', x + 4, textY, { width: cols.name - 8, lineBreak: false });
        x += cols.name;
        
        // Rating column - with star icon
        if (item.totalRatings > 0) {
          drawStarIcon(x + 8, textY, 10);
          doc.fillColor(darkColor).fontSize(9).font('Helvetica').text(`${(item.avgRating || 0).toFixed(1)}`, x + 20, textY, { width: 22 });
          doc.fillColor(grayColor).fontSize(7).text(`(${item.totalRatings})`, x + 42, textY + 1, { width: 25 });
        } else {
          doc.fillColor('#9ca3af').fontSize(9).font('Helvetica').text('-', x + 4, textY, { width: cols.rating, align: 'center' });
        }
        x += cols.rating;
        
        // Interest column with badge and icon
        const interest = getInterestLevel(item.quantity, allItemsList);
        const interestConfig = {
          high: { color: '#22c55e', bg: '#f0fdf4', label: 'High', drawIcon: drawTrendUp },
          constant: { color: '#eab308', bg: '#fefce8', label: 'Stable', drawIcon: drawStable },
          low: { color: '#ef4444', bg: '#fef2f2', label: 'Low', drawIcon: drawTrendDown }
        };
        const { color: interestColor, bg: interestBg, label: interestLabel, drawIcon } = interestConfig[interest];
        
        // Draw badge background
        const badgeWidth = 52;
        const badgeHeight = 18;
        const badgeX = x + (cols.interest - badgeWidth) / 2;
        const badgeY = textY - 4;
        doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 9).fill(interestBg);
        // Draw icon
        drawIcon(badgeX + 6, badgeY + 4, 10);
        // Draw label
        doc.fillColor(interestColor).fontSize(8).font('Helvetica-Bold')
          .text(interestLabel, badgeX + 18, badgeY + 5, { width: badgeWidth - 22 });
        x += cols.interest;
        
        // Qty Sold
        doc.fillColor(darkColor).fontSize(9).font('Helvetica')
          .text(String(item.quantity || 0), x + 4, textY, { width: cols.qty - 8, align: 'right' });
        x += cols.qty;
        
        // Revenue
        doc.fillColor(darkColor).fontSize(9).font('Helvetica')
          .text(formatCurrency(item.revenue), x + 4, textY, { width: cols.revenue - 12, align: 'right' });
        
        return rowY + rowHeight;
      };

      // Helper function to draw complete item table - matching admin panel card style
      const drawItemTable = (title, iconType, items, startY, allItemsList, showAll = false) => {
        let currentY = startY;
        
        // Check if we need a new page
        if (currentY > 650) {
          doc.addPage();
          currentY = 50;
        }
        
        // Table card container - matching admin panel rounded-xl shadow-card
        const itemsToShow = showAll ? items : items.slice(0, 5);
        const tableHeight = 28 + (itemsToShow.length * rowHeight) + 20; // header + rows + padding
        
        // Card background with shadow effect
        doc.rect(tableStartX - 2, currentY - 2, tableWidth + 4, tableHeight + 40).fill('#f8f9fa');
        doc.roundedRect(tableStartX, currentY, tableWidth, tableHeight + 36, 8).fill('#ffffff');
        doc.roundedRect(tableStartX, currentY, tableWidth, tableHeight + 36, 8).stroke(borderColor);
        
        // Title section - matching admin panel header
        doc.rect(tableStartX, currentY, tableWidth, 32).fill('#ffffff');
        doc.roundedRect(tableStartX, currentY, tableWidth, 32, 8).stroke(borderColor);
        doc.moveTo(tableStartX, currentY + 32).lineTo(tableStartX + tableWidth, currentY + 32).stroke(borderColor);
        
        // Draw icon based on type
        const iconX = tableStartX + 12;
        const iconY = currentY + 9;
        if (iconType === 'fire') {
          drawFireIcon(iconX, iconY, 14);
        } else if (iconType === 'chartDown') {
          drawChartDownIcon(iconX, iconY, 14);
        } else if (iconType === 'package') {
          drawPackageIcon(iconX, iconY, 14);
        }
        
        // Title text
        doc.fillColor(darkColor).fontSize(12).font('Helvetica-Bold')
          .text(title, tableStartX + 30, currentY + 10);
        currentY += 36;

        // Table header
        currentY = drawTableHeader(currentY);

        // Table rows
        doc.font('Helvetica').fontSize(9);
        for (let idx = 0; idx < itemsToShow.length; idx++) {
          const item = itemsToShow[idx];
          
          // Check if we need a new page
          if (currentY > 720) {
            doc.addPage();
            currentY = 50;
            // Redraw table header on new page
            currentY = drawTableHeader(currentY);
          }
          
          try {
            currentY = drawItemRow(item, idx, currentY, allItemsList);
          } catch (rowError) {
            // If row fails, skip to next row
            currentY += rowHeight;
          }
        }
        
        // No data message
        if (itemsToShow.length === 0) {
          doc.fillColor('#9ca3af').fontSize(10).font('Helvetica')
            .text('No data available', tableStartX, currentY + 20, { width: tableWidth, align: 'center' });
          currentY += 50;
        }
        
        return currentY + 20;
      };

      // Top Selling Items (with fire icon)
      if (reportData.topSellingItems && reportData.topSellingItems.length > 0) {
        y = drawItemTable('Top Selling Items', 'fire', reportData.topSellingItems, y, reportData.allItemsSold || []);
      }

      // Least Selling Items (with chart down icon)
      if (reportData.leastSellingItems && reportData.leastSellingItems.length > 0) {
        y = drawItemTable('Least Selling Items', 'chartDown', reportData.leastSellingItems, y, reportData.allItemsSold || []);
      }

      // All Items Sold - show ALL items on new page (with package icon)
      if (reportData.allItemsSold && reportData.allItemsSold.length > 0) {
        doc.addPage();
        y = 50;
        y = drawItemTable('All Items Sold', 'package', reportData.allItemsSold, y, reportData.allItemsSold, true);
      }

      // Footer on last page
      doc.fillColor(grayColor).fontSize(8).font('Helvetica')
        .text('This is a computer-generated report. No signature required.', 50, doc.page.height - 50, { align: 'center', width: doc.page.width - 100 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateReportPdf };
