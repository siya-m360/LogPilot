import { Step } from '../types';

declare global {
    interface Window {
        docx: any;
        exportToDocx: typeof exportToDocx;
    }
}

async function base64ToBuffer(base64: string): Promise<ArrayBuffer> {
    const res = await fetch(base64);
    return res.arrayBuffer();
}

export const exportToDocx = async (steps: Step[]): Promise<void> => {
    if (!window.docx) {
        const errorMessage = "DOCX library not found on window object. Make sure it's loaded correctly via the script tag.";
        console.error(errorMessage);
        throw new Error(errorMessage);
    }

    const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel } = window.docx;

    if (!steps || steps.length === 0) {
        console.warn("No steps to export.");
        return;
    }

    const docChildren = [
        new Paragraph({
            heading: HeadingLevel.TITLE,
            children: [new TextRun("Process Documentation")],
        }),
        new Paragraph({
            text: `Generated on: ${new Date().toLocaleString()}`,
            style: "aside",
        }),
        new Paragraph(" "), // Spacer
    ];

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        
        docChildren.push(
            new Paragraph({
                heading: HeadingLevel.HEADING_2,
                children: [new TextRun(`Step ${i + 1}`)],
            })
        );
        
        docChildren.push(
            new Paragraph({
                children: [new TextRun({ text: step.description, italics: true })],
            })
        );
        
        try {
            const imageBuffer = await base64ToBuffer(step.screenshot);
            docChildren.push(
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: imageBuffer,
                            transformation: {
                                width: 500,
                                height: 300, // Approximate height, aspect ratio is maintained
                            },
                        }),
                    ],
                })
            );
        } catch (error) {
            console.error(`Could not process image for step ${i + 1}:`, error);
            docChildren.push(
                new Paragraph({
                    children: [new TextRun({ text: "[Error: Screenshot could not be embedded]", color: "FF0000" })],
                })
            );
        }
        
         docChildren.push(new Paragraph(" ")); // Spacer
    }

    const doc = new Document({
        sections: [{
            children: docChildren,
        }],
        styles: {
            paragraphStyles: [{
                id: "aside",
                name: "Aside",
                basedOn: "Normal",
                next: "Normal",
                run: {
                    color: "999999",
                    italics: true,
                },
                paragraph: {
                    indent: { left: 720 },
                    spacing: { before: 200, after: 200 },
                },
            }],
        }
    });

    const blob = await Packer.toBlob(doc);

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "ScribeFlow_Process_Documentation.docx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.exportToDocx = exportToDocx;