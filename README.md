# ScribeFlow - Process Recorder



---

## 📖 Overview

ScribeFlow is an intelligent browser extension that captures your interactions on web pages, records each step with screenshots, and generates comprehensive process documentation. Perfect for creating tutorials, documenting workflows, or building step-by-step guides.

### ✨ Key Features

- 🎯 **Automatic Step Recording** - Captures clicks and interactions with visual highlights
- 📸 **Screenshot Capture** - Automatically takes screenshots at each step
- 📝 **Multiple Export Formats** - Export your documentation as:
  - Markdown (with images in a ZIP archive)
  - PDF documents
  - Microsoft Word documents
- 🎨 **Visual Highlights** - Highlights clicked elements for better clarity
- 💾 **Local Storage** - Saves your recordings in the browser
- ⚡ **Lightweight** - Built with modern web technologies for optimal performance

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or higher recommended)
- A modern browser that supports Chrome Extensions (Chrome, Edge, Brave, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd LogPilot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load the extension in your browser**
   - Open your browser and navigate to the extensions page:
     - Chrome: `chrome://extensions/`
     - Edge: `edge://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder (or the project root if no dist folder exists)

### Development

To run the project in development mode with hot-reloading:

```bash
npm run dev
```

## 📚 Usage

1. **Start Recording**
   - Click the ScribeFlow extension icon in your browser toolbar
   - Click "Start Recording" to begin capturing your workflow

2. **Interact with the Page**
   - Navigate and click on elements as you normally would
   - Each interaction will be automatically captured with a screenshot

3. **Stop Recording**
   - Click the extension icon again
   - Click "Stop Recording" to finish

4. **Export Documentation**
   - Choose your preferred export format (Markdown, PDF, or Word)
   - Your documentation will be downloaded with all screenshots included

## 🛠️ Technology Stack

- **React** - UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **docx** - Word document generation
- **html2canvas** - Screenshot capture
- **jsPDF** - PDF generation
- **JSZip** - Archive creation for Markdown exports

## 📁 Project Structure

```
LogPilot/
├── components/          # React components
│   ├── DemoArea.tsx    # Main recording area
│   ├── StepsDisplay.tsx # Step visualization
│   └── Header.tsx      # Extension header
├── services/           # Export services
│   ├── markdownExporter.ts
│   ├── pdfExporter.ts
│   └── wordExporter.ts
├── background.ts       # Service worker
├── content.ts          # Content script
├── popup.tsx           # Extension popup UI
├── manifest.json       # Extension manifest
└── types.ts            # TypeScript type definitions
```

## 🔧 Configuration

The extension uses the following permissions:
- `activeTab` - To interact with the current tab
- `scripting` - To inject content scripts
- `storage` - To save recordings locally
- `tabs` - To access tab information

## 📝 Export Formats

### Markdown Export
- Creates a ZIP archive containing:
  - `documentation.md` - Formatted markdown file
  - `images/` folder - All step screenshots

### PDF Export
- Single PDF document with embedded images
- Professional formatting with step numbers and descriptions

### Word Export
- Microsoft Word document (.docx)
- Includes all screenshots and formatted text

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

Built with modern web technologies to make process documentation effortless and beautiful.

---

<div align="center">
  Made with ❤️ for better documentation by Siya 
</div>
