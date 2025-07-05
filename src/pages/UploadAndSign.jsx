import React, { useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import Draggable from "react-draggable";
import { toast } from "react-toastify";
import API from "../utils/api";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const UploadAndSign = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [signatureText, setSignatureText] = useState("Harish Kumar");
  const [font, setFont] = useState("Cursive");
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });

  const draggableRef = useRef(null);

  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      const url = URL.createObjectURL(file);
      setPdfFile(file);
      setPdfUrl(url);
    } else {
      toast.error("Please upload a valid PDF file.");
    }
  };

  const handleDragStop = (e, data) => {
    setPosition({ x: data.x, y: data.y });
  };

  const onPdfLoadSuccess = ({ width, height }) => {
    setPageDimensions({ width, height });
  };
  const uploadToBackend = async (pdfBlob) => {
    const formData = new FormData();
    const file = new File([pdfBlob], ${Date.now()}-signed-document.pdf, {
      type: "application/pdf",
    });

    formData.append("pdf", file);

    try {
      await API.post("/docs/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: Bearer ${localStorage.getItem("token")},
        },
      });
      toast.success("✅ Signed document uploaded to My Documents");
    } catch (err) {
      toast.error("❌ Upload failed");
      console.error(err.response?.data || err.message);
    }
  };

  const handleDownloadSignedPDF = async () => {
    if (!pdfFile || !pageDimensions.width) return;

    const existingPdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();

    const scaleFactor = 600 / pageDimensions.width;
    const actualX = position.x / scaleFactor;
    const actualY = height - position.y / scaleFactor - 20;

    const fontToUse = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText(signatureText, {
      x: actualX,
      y: actualY,
      size: 18,
      font: fontToUse,
      color: rgb(0, 0, 0),
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });

    // Upload to backend
    await uploadToBackend(blob);

    // Trigger download
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "signed-document.pdf";
    link.click();
  };

  return (
    <div className="flex flex-col items-center p-6 min-h-screen bg-gradient-to-br from-gray-50 to-blue-100">
      <h2 className="text-3xl font-bold mb-6 text-blue-600">Upload & Sign Document</h2>

      <div className="mb-4 space-y-2">
        <input
          type="file"
          accept="application/pdf"
          onChange={handlePdfChange}
          className="mb-2"
        />
        <input
          type="text"
          value={signatureText}
          onChange={(e) => setSignatureText(e.target.value)}
          placeholder="Enter signature text"
          className="border px-2 py-1 rounded mr-2"
        />
        <select
          value={font}
          onChange={(e) => setFont(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="Cursive">Cursive</option>
          <option value="Serif">Serif</option>
          <option value="Monospace">Monospace</option>
          <option value="Fantasy">Fantasy</option>
        </select>
      </div>

      {pdfUrl && (
        <div
          style={{ position: "relative", width: 600 }}
          className="border rounded shadow overflow-hidden mt-4"
        >
          <Document file={pdfUrl}>
            <Page
              pageNumber={1}
              width={600}
              onLoadSuccess={onPdfLoadSuccess}
            />
          </Document>

          <Draggable
            onStop={handleDragStop}
            nodeRef={draggableRef}
            bounds="parent"
          >
            <div
              ref={draggableRef}
              style={{
                position: "absolute",
                top: position.y,
                left: position.x,
                fontFamily: font,
                fontSize: "20px",
                backgroundColor: "#fff8",
                padding: "4px 8px",
                borderRadius: "4px",
                cursor: "grab",
                touchAction: "none",
                zIndex: 10,
              }}
            >
              ✍ {signatureText}
            </div>
          </Draggable>
        </div>
      )}

      {pdfUrl && (
        <button
          onClick={handleDownloadSignedPDF}
          className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
        >
          Download & Upload Signed PDF
        </button>
      )}
    </div>
  );
};

export default UploadAndSign;
