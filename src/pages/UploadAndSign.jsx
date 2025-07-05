import React, { useState, useRef, useEffect, useMemo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument } from "pdf-lib";
import Draggable from "react-draggable";
import { toast } from "react-toastify";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const UploadAndSign = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [signatureImage, setSignatureImage] = useState(null);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });

  const signatureRef = useRef(null);

  // Memoized URLs
  const pdfUrl = useMemo(() => pdfFile ? URL.createObjectURL(pdfFile) : null, [pdfFile]);
  const signatureUrl = useMemo(() => signatureImage ? URL.createObjectURL(signatureImage) : null, [signatureImage]);

  // Cleanup Blob URLs
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      if (signatureUrl) URL.revokeObjectURL(signatureUrl);
    };
  }, [pdfUrl, signatureUrl]);

  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    if (file?.type === "application/pdf") {
      setPdfFile(file);
    } else {
      toast.error("Please upload a valid PDF.");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file?.type.startsWith("image/")) {
      setSignatureImage(file);
    } else {
      toast.error("Please upload an image (JPG or PNG).");
    }
  };

  // Fix: onLoadSuccess gets page object, not {width, height}
  const onPdfLoadSuccess = (page) => {
    const viewport = page.getViewport({ scale: 1 });
    setPageDimensions({ width: viewport.width, height: viewport.height });
  };

  const handleDragStop = (e, data) => {
    setPosition({ x: data.x, y: data.y });
  };

  const handleDownload = async () => {
    if (!pdfFile || !signatureImage) return;

    const existingPdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();

    // Calculate scaling
    const renderedWidth = 600; // width you render the PDF at
    const scale = renderedWidth / (pageDimensions.width || 1);
    const x = position.x / scale;
    const y = height - position.y / scale - 50;

    const imgBytes = await signatureImage.arrayBuffer();
    const ext = signatureImage.type.split("/")[1];
    const embeddedImg = ext === "png"
      ? await pdfDoc.embedPng(imgBytes)
      : await pdfDoc.embedJpg(imgBytes);

    const imgDims = embeddedImg.scale(0.5);
    page.drawImage(embeddedImg, {
      x,
      y,
      width: imgDims.width,
      height: imgDims.height,
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "signed-document.pdf";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">📄 Upload & Sign PDF</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div>
          <label className="block mb-1 font-medium">Upload PDF:</label>
          <input type="file" accept="application/pdf" onChange={handlePdfChange} />
        </div>
        <div>
          <label className="block mb-1 font-medium">Upload Signature Image:</label>
          <input type="file" accept="image/*" onChange={handleImageChange} />
        </div>
      </div>

      {pdfUrl && (
        <div style={{ position: "relative", width: 600 }} className="border shadow rounded overflow-hidden">
          <Document file={pdfUrl}>
            <Page
              pageNumber={1}
              width={600}
              onLoadSuccess={onPdfLoadSuccess}
            />
          </Document>

          {signatureUrl && (
            <Draggable
              onStop={handleDragStop}
              nodeRef={signatureRef}
              bounds="parent"
              position={position}
            >
              <img
                ref={signatureRef}
                src={signatureUrl}
                alt="Signature"
                className="absolute cursor-move border border-gray-300 rounded shadow"
                style={{
                  top: position.y,
                  left: position.x,
                  width: "120px",
                }}
              />
            </Draggable>
          )}
        </div>
      )}

      {pdfUrl && signatureImage && (
        <button
          onClick={handleDownload}
          className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          📝 Sign & Download
        </button>
      )}
    </div>
  );
};

export default UploadAndSign;
