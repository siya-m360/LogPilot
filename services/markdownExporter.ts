import { Step } from '../types';

declare global {
    interface Window {
        JSZip: any;
        exportToMarkdown: typeof exportToMarkdown;
    }
}

async function base64ToBlob(base64: string): Promise<Blob> {
    const res = await fetch(base64);
    return res.blob();
}

export const exportToMarkdown = async (steps: Step[]): Promise<void> => {
    if (!window.JSZip) {
        throw new Error("JSZip library not found on window object. Make sure it's loaded correctly via the script tag.");
    }
    
    const zip = new window.JSZip();
    let markdownContent = "# Process Documentation\n\n";
    markdownContent += `*Generated on: ${new Date().toLocaleString()}*\n\n---\n\n`;

    const imagesFolder = zip.folder("images");
    if (!imagesFolder) {
        throw new Error("Could not create images folder in zip.");
    }

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const imageName = `step-${i + 1}.png`;

        markdownContent += `## Step ${i + 1}\n\n`;
        markdownContent += `**Action:** ${step.description}\n\n`;
        markdownContent += `![Screenshot for Step ${i + 1}](./images/${imageName})\n\n---\n\n`;
        
        try {
             // fetch needs the base64 prefix removed
            const imageBlob = await base64ToBlob(step.screenshot);
            imagesFolder.file(imageName, imageBlob);
        } catch(error) {
             console.error(`Could not process image for step ${i + 1}:`, error);
        }
    }

    zip.file("documentation.md", markdownContent);

    const zipBlob = await zip.generateAsync({ type: "blob" });
    
    const link = document.createElement("a");
    link.href = URL.createObjectURL(zipBlob);
    link.download = "ScribeFlow_Markdown_Export.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.exportToMarkdown = exportToMarkdown;
