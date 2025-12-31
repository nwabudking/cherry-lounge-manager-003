import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

interface ExportPDFButtonProps {
  startDate: Date;
  endDate: Date;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalItems: number;
  topItems: { name: string; quantity: number; revenue: number }[];
  salesByType: { type: string; value: number }[];
  salesByPayment: { type: string; value: number }[];
  revenueByDay: { date: string; revenue: number }[];
  isPersonalView?: boolean;
  roleName?: string;
}

export const ExportPDFButton = ({
  startDate,
  endDate,
  totalRevenue,
  totalOrders,
  averageOrderValue,
  totalItems,
  topItems,
  salesByType,
  salesByPayment,
  revenueByDay,
  isPersonalView,
  roleName,
}: ExportPDFButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Sales Report", pageWidth / 2, 20, { align: "center" });
      
      // Date Range
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      const dateRangeText = `${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")}`;
      doc.text(dateRangeText, pageWidth / 2, 28, { align: "center" });
      
      // Personal view indicator
      if (isPersonalView && roleName) {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Personal Report - ${roleName}`, pageWidth / 2, 35, { align: "center" });
        doc.setTextColor(0);
      }

      let yPos = isPersonalView ? 45 : 40;

      // Summary Metrics Section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Summary Metrics", 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [["Metric", "Value"]],
        body: [
          ["Total Revenue", `₦${totalRevenue.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`],
          ["Total Orders", totalOrders.toString()],
          ["Average Order Value", `₦${averageOrderValue.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`],
          ["Total Items Sold", totalItems.toString()],
        ],
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Top Selling Items
      if (topItems.length > 0) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Top Selling Items", 14, yPos);
        yPos += 8;

        autoTable(doc, {
          startY: yPos,
          head: [["Item", "Quantity", "Revenue"]],
          body: topItems.map((item) => [
            item.name,
            item.quantity.toString(),
            `₦${item.revenue.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`,
          ]),
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246] },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Check if we need a new page
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      // Sales by Order Type
      if (salesByType.length > 0) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Sales by Order Type", 14, yPos);
        yPos += 8;

        autoTable(doc, {
          startY: yPos,
          head: [["Order Type", "Amount"]],
          body: salesByType.map((item) => [
            item.type.charAt(0).toUpperCase() + item.type.slice(1),
            `₦${item.value.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`,
          ]),
          theme: "striped",
          headStyles: { fillColor: [34, 197, 94] },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Check if we need a new page
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      // Sales by Payment Method
      if (salesByPayment.length > 0) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Sales by Payment Method", 14, yPos);
        yPos += 8;

        autoTable(doc, {
          startY: yPos,
          head: [["Payment Method", "Amount"]],
          body: salesByPayment.map((item) => [
            item.type.charAt(0).toUpperCase() + item.type.slice(1),
            `₦${item.value.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`,
          ]),
          theme: "striped",
          headStyles: { fillColor: [168, 85, 247] },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Check if we need a new page
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      // Daily Revenue
      if (revenueByDay.length > 0) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Daily Revenue Breakdown", 14, yPos);
        yPos += 8;

        autoTable(doc, {
          startY: yPos,
          head: [["Date", "Revenue"]],
          body: revenueByDay.map((item) => [
            item.date,
            `₦${item.revenue.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`,
          ]),
          theme: "striped",
          headStyles: { fillColor: [249, 115, 22] },
        });
      }

      // Footer with generation date
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128);
        doc.text(
          `Generated on ${format(new Date(), "MMM d, yyyy 'at' h:mm a")} | Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      // Save the PDF
      const fileName = `sales-report-${format(startDate, "yyyy-MM-dd")}-to-${format(endDate, "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);
      
      toast.success("Report exported successfully");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export report");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExportPDF}
      disabled={isExporting}
      className="gap-2"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      Export PDF
    </Button>
  );
};
