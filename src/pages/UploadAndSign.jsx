import React, { useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb } from "pdf-lib";
import Draggable from "react-draggable";
import { toast } from "react-toastify";
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const UploadAndSign = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [signatureImage, setSignatureImage] = useState(null);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });

  const signatureRef = useRef(null);

  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    if (file?.type === "application/pdf") {
      setPdfFile(file);
      setPdfUrl(URL.createObjectURL(file));
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

  const onPdfLoadSuccess = ({ width, height }) => {
    setPageDimensions({ width, height });
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

    const scale = 600 / pageDimensions.width;
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

          {signatureImage && (
            <Draggable
              onStop={handleDragStop}
              nodeRef={signatureRef}
              bounds="parent"
            >
              <img
                ref={signatureRef}
                src={URL.createObjectURL(signatureImage)}
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
