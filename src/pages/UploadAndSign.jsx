import React, { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import Draggable from "react-draggable";
import { toast } from "react-toastify";
import API from "../utils/api";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const RENDER_WIDTH = 600; // Constant width used for rendering the PDF

const UploadAndSign = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [signatureText, setSignatureText] = useState("Harish Kumar");
  const [font, setFont] = useState("Helvetica");
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });
  const [isSigning, setIsSigning] = useState(false);

  const draggableRef = useRef(null);

  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    if (file?.type === "application/pdf") {
      setPdfFile(file);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
    } else {
      toast.error("Please upload a valid PDF.");
    }
  };

  const handleDragStop = (e, data) => {
    setPosition({ x: data.x, y: data.y });
  };

  const onPdfLoadSuccess = (page) => {
    const { width, height } = page.getViewport({ scale: 1 });
    setPageDimensions({ width, height });
  };

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const uploadToBackend = async (pdfBlob) => {
    const file = new File([pdfBlob], `${Date.now()}-signed.pdf`, {
      type: "application/pdf",
    });

    const formData = new FormData();
    formData.append("pdf", file);

    console.log("📤 Uploading file:", file);
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("User not authenticated.");
      return;
    }

    try {
      const res = await API.post("/docs/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("✅ Upload response:", res.data);
      toast.success("✅ Signed PDF uploaded to backend!");
    } catch (err) {
      toast.error("❌ Upload failed");
      console.error("Upload error:", err.response?.data || err.message);
    }
  };

  const handleDownload = async () => {
    if (!pdfFile || !pageDimensions.width) return;
    setIsSigning(true);

    try {
      const existingPdfBytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const page = pdfDoc.getPages()[0];
      const { width, height } = page.getSize();

      const scaleFactor = RENDER_WIDTH / pageDimensions.width;
      const actualX = position.x / scaleFactor;
      const actualY = height - position.y / scaleFactor - 20;

      const selectedFont = await pdfDoc.embedFont(
        StandardFonts[font] || StandardFonts.Helvetica
      );

      page.drawText(signatureText, {
        x: actualX,
        y: actualY,
        size: 18,
        font: selectedFont,
        color: rgb(0, 0, 0),
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });

      await uploadToBackend(blob);

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "signed-document.pdf";
      link.click();
    } catch (err) {
      toast.error("❌ Something went wrong during signing.");
      console.error(err);
    }

    setIsSigning(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">Upload & Sign PDF</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input type="file" accept="application/pdf" onChange={handlePdfChange} />
        <input
          type="text"
          value={signatureText}
          onChange={(e) => setSignatureText(e.target.value)}
          placeholder="Type your signature"
          className="border px-3 py-1 rounded"
        />
        <select
          value={font}
          onChange={(e) => setFont(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="Helvetica">Helvetica</option>
          <option value="Courier">Courier</option>
          <option value="TimesRoman">Times Roman</option>
        </select>
      </div>

      {pdfUrl && (
        <div style={{ position: "relative", width: RENDER_WIDTH }} className="border shadow rounded">
          <Document file={pdfUrl}>
            <Page pageNumber={1} width={RENDER_WIDTH} onLoadSuccess={onPdfLoadSuccess} />
          </Document>

          <Draggable nodeRef={draggableRef} onStop={handleDragStop} bounds="parent">
            <div
              ref={draggableRef}
              className="absolute text-black bg-white/80 px-2 py-1 rounded shadow border border-gray-300 cursor-move"
              style={{
                fontFamily: font,
                fontSize: "18px",
                top: position.y,
                left: position.x,
                zIndex: 10,
              }}
            >
              ✍️ {signatureText}
            </div>
          </Draggable>
        </div>
      )}

      {pdfUrl && (
        <button
          onClick={handleDownload}
          disabled={isSigning}
          className={`mt-6 px-6 py-2 rounded text-white ${
            isSigning ? "bg-gray-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isSigning ? "Signing..." : "Sign & Download"}
        </button>
      )}
    </div>
  );
};

export default UploadAndSign;
