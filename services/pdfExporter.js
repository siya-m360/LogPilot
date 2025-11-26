const exportToPdf = async (steps) => {
    if (!window.jspdf) {
        throw new Error("jsPDF library not found on window object. Make sure it's loaded correctly via the script tag.");
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 30;
    let yPos = margin;

    doc.setFontSize(22);
    doc.text("Process Documentation", margin, yPos);
    yPos += 30;
    doc.setFontSize(12);
    doc.setTextColor(150);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, yPos);
    doc.setTextColor(0);
    yPos += 30;

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        const stepContentHeight = 150; // Estimate space for text and image
        if (yPos > pageHeight - stepContentHeight) {
            doc.addPage();
            yPos = margin;
        }

        doc.setFontSize(16);
        doc.text(`Step ${i + 1}`, margin, yPos);
        yPos += 20;

        doc.setFontSize(12);
        const descriptionLines = doc.splitTextToSize(step.description, pageWidth - margin * 2);
        doc.text(descriptionLines, margin, yPos);
        yPos += descriptionLines.length * 15;
        yPos += 10;

        try {
            const img = new Image();
            img.src = step.screenshot;
            await new Promise(resolve => { img.onload = resolve; });

            const imgWidth = img.width;
            const imgHeight = img.height;
            const ratio = imgWidth / imgHeight;
            const displayWidth = pageWidth - margin * 2;
            const displayHeight = displayWidth / ratio;
            
            if (yPos + displayHeight > pageHeight - margin) {
                doc.addPage();
                yPos = margin;
            }

            doc.addImage(step.screenshot, 'PNG', margin, yPos, displayWidth, displayHeight);
            yPos += displayHeight + 20;

        } catch (e) {
            console.error(`Could not process image for step ${i + 1}:`, e);
            doc.setTextColor(255, 0, 0);
            doc.text("[Error: Screenshot could not be embedded]", margin, yPos);
            doc.setTextColor(0, 0, 0);
            yPos += 20;
        }
        
        yPos += 10;
    }

    doc.save('ScribeFlow_Process_Documentation.pdf');
};

window.exportToPdf = exportToPdf;