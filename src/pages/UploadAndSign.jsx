import React, { useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument } from "pdf-lib";
import Draggable from "react-draggable";
import { toast } from "react-toastify";
import API from "../utils/api";

// PDF.js worker setup (for create-react-app)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PREVIEW_WIDTH = 600;
const PREVIEW_SIG_WIDTH = 120; // match the inline style on the draggable image

const UploadAndSign = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [signatureImg, setSignatureImg] = useState(null);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });
  const draggableRef = useRef(null);

  // PDF file upload
  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      setPdfUrl(URL.createObjectURL(file));
    } else {
      toast.error("Please upload a valid PDF.");
    }
  };

  // Signature image upload (PNG/JPG)
  const handleSignatureChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setSignatureImg(reader.result);
      reader.readAsDataURL(file);
    } else {
      toast.error("Please upload an image (PNG/JPG).");
    }
  };

  // Track position for draggable element
  const handleDragStop = (e, data) => {
    setPosition({ x: data.x, y: data.y });
  };

  // Correctly capture page width & height from react-pdf
  const onPageLoadSuccess = (page) => {
    // originalWidth/originalHeight are in points (default PDF-lib 1/72 inch)
    setPageDimensions({
      width: page.originalWidth,
      height: page.originalHeight,
    });
  };

  // Upload PDF to backend (unchanged)
  const uploadToBackend = async (pdfBlob) => {
    const file = new File([pdfBlob], `${Date.now()}-signed.pdf`, {
      type: "application/pdf",
    });
    const formData = new FormData();
    formData.append("pdf", file);

    try {
      await API.post("/docs/upload", formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success("✅ Signed PDF uploaded to backend!");
    } catch (err) {
      toast.error("❌ Upload failed");
      console.error(err.response?.data || err.message);
    }
  };

  // Main signature logic - scaling and placement fixed!
  const handleDownload = async () => {
    if (!pdfFile || !signatureImg || !pageDimensions.width) return;

    const existingPdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const page = pdfDoc.getPages()[0];
    const { width: pdfWidth, height: pdfHeight } = page.getSize();

    // Calculate scaling between preview and actual PDF
    const scaleX = pdfWidth / PREVIEW_WIDTH;
    const scaleY = pdfHeight / pageDimensions.height;

    // Placement: UI origin is top-left, PDF-lib is bottom-left.
    // Convert preview X/Y to PDF X/Y
    // Drag X, Y are relative to the preview top-left corner.
    const sigPreviewWidth = PREVIEW_SIG_WIDTH;
    const sigPreviewHeight = (PREVIEW_SIG_WIDTH * pageDimensions.height) / pageDimensions.width; // maintain aspect ratio

    // Calculate the actual signature image width/height for the PDF
    const imageRes = await fetch(signatureImg);
    const imageBytes = await imageRes.arrayBuffer();

    let signatureImage;
    if (signatureImg.startsWith("data:image/png")) {
      signatureImage = await pdfDoc.embedPng(imageBytes);
    } else {
      signatureImage = await pdfDoc.embedJpg(imageBytes);
    }
    // Scale signature in PDF so that visually it's the same size as preview
    const sigScale = (sigPreviewWidth * scaleX) / signatureImage.width;
    const sigDims = signatureImage.scale(sigScale);

    // Position: 
    // Left = position.x * scaleX
    // Bottom = (height - ((position.y + sigPreviewHeight) * scaleY))
    const actualX = position.x * scaleX;
    const actualY = pdfHeight - ((position.y + sigPreviewHeight) * scaleY);

    page.drawImage(signatureImage, {
      x: actualX,
      y: actualY,
      width: sigDims.width,
      height: sigDims.height,
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });

    await uploadToBackend(blob);

    // Trigger download + revoke object URL to prevent memory leaks
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "signed-document.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">
        Upload & Sign PDF
      </h1>

      {/* Upload controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input type="file" accept="application/pdf" onChange={handlePdfChange} />
        <input type="file" accept="image/*" onChange={handleSignatureChange} />
      </div>

      {/* PDF Preview */}
      {pdfUrl && (
        <div
          style={{ position: "relative", width: PREVIEW_WIDTH, minHeight: 50 }}
          className="border shadow rounded"
        >
          <Document file={pdfUrl}>
            <Page
              pageNumber={1}
              width={PREVIEW_WIDTH}
              onLoadSuccess={onPageLoadSuccess}
            />
          </Document>
          {/* Draggable Signature Preview */}
          {signatureImg && (
            <Draggable
              nodeRef={draggableRef}
              onStop={handleDragStop}
              bounds="parent"
              position={position}
            >
              <div
                ref={draggableRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  zIndex: 10,
                  pointerEvents: "all",
                }}
              >
                <img
                  src={signatureImg}
                  alt="Signature"
                  style={{
                    width: PREVIEW_SIG_WIDTH,
                    cursor: "move",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    background: "#fff",
                  }}
                  draggable={false}
                />
              </div>
            </Draggable>
          )}
        </div>
      )}

      {/* Download button */}
      {pdfUrl && signatureImg && (
        <button
          onClick={handleDownload}
          className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Sign & Download
        </button>
      )}
    </div>
  );
};

export default UploadAndSign;
