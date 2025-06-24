# Karabiner Settings Builder

*Built on Replit with ❤️*

A modern, visual web application for creating, editing, and managing Karabiner-Elements configurations. Say goodbye to manually editing complex JSON files and hello to an intuitive interface that makes keyboard customization accessible to everyone.

![Karabiner Settings Builder Interface](./docs/screenshot.png)

## 🎯 Philosophy

**Keyboard customization should be powerful yet approachable.** 

Karabiner-Elements is an incredibly powerful tool for macOS keyboard customization, but its JSON-based configuration can be intimidating. This application bridges that gap by providing:

- **Visual Rule Creation** - Build complex keyboard modifications through an intuitive interface
- **Real-time Validation** - Catch errors before they break your setup
- **Smart Recommendations** - AI-powered suggestions based on your hardware and workflow
- **Git-style Diff Views** - See exactly what changes when you modify your configuration
- **Device-Specific Targeting** - Create rules that work only with specific keyboards or macro pads

The goal isn't to replace Karabiner-Elements, but to make it more accessible while maintaining full compatibility with the original JSON format.

## ✨ Key Features

### 🎨 Visual Rule Editor
- Drag-and-drop rule reordering
- Device-specific conditions (Logitech ERGO K860, ACK05 macro pads, etc.)
- Simultaneous key combinations and complex modifiers
- Real-time JSON preview with syntax highlighting

### 🤖 Smart Recommendations
- AI-powered suggestions based on your connected devices
- Context-aware rule proposals for productivity workflows
- One-click addition of recommended shortcuts

### 📊 Advanced Diff Views
- Unified JSON diff showing configuration changes
- Color-coded highlighting for different change types:
  - **Gray (•)** - Imported baseline rules
  - **Green (+)** - Manual additions
  - **Purple (+)** - AI recommendations
- Proper JSON indentation for easy review

### 🔧 Developer Experience
- Auto-import for development workflow
- Hot reload with Vite
- TypeScript throughout the stack
- Comprehensive validation with Zod schemas

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL (automatically provided on Replit)

### Installation

1. **Clone or Fork on Replit**
   ```bash
   # This project is designed to run on Replit
   # Simply fork this repository in your Replit workspace
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Access the Application**
   - Open your browser to the Replit-provided URL
   - The app will automatically import sample configuration data

### Basic Usage

1. **Import Existing Configuration**
   - Drag and drop your existing `karabiner.json` file into the sidebar
   - Or use the file upload button to browse for your configuration

2. **Create New Rules**
   - Click "Add Rule" to create keyboard modifications
   - Use the visual editor to set up key mappings
   - Add device conditions to target specific hardware

3. **Get Smart Recommendations**
   - Visit the "Recommendations" tab
   - Review AI-generated rule suggestions
   - Click "Add" to include helpful shortcuts

4. **Review Changes**
   - Use the "Changes" tab to see a unified diff
   - Review all modifications before export
   - Ensure proper JSON structure and syntax

5. **Export Configuration**
   - Click "Export" to download your `karabiner.json`
   - Copy the JSON directly from the preview tab
   - Import into Karabiner-Elements preferences

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Wouter** for lightweight routing
- **TanStack Query** for server state management
- **Shadcn/ui** components built on Radix UI
- **Tailwind CSS** for styling
- **Vite** for development and builds

### Backend
- **Node.js** with Express
- **PostgreSQL** with Drizzle ORM
- **Zod** for validation
- **TypeScript** throughout

### Deployment
- **Replit Deployments** for hosting
- **Neon Database** for PostgreSQL
- **Environment-based configuration**

## 🎯 Supported Hardware

The application includes smart recommendations for:

- **Logitech ERGO K860** - Ergonomic wireless keyboard
- **ACK05 Macro Pad** - 12-button programmable macro device
- **DOIO Devices** - Configurable via Wave app
- **Generic Keyboards** - Standard key mapping support

## 🔄 Development Workflow

This project includes several developer-friendly features:

### Auto-Import
During development, the application automatically imports sample Karabiner configuration data, eliminating the need to manually upload files during iteration.

### Hot Reload
Changes to both frontend and backend code trigger automatic reloads, maintaining development state when possible.

### Type Safety
Shared TypeScript schemas ensure consistency between client and server, with comprehensive validation at API boundaries.

## 📁 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Route components  
│   │   ├── lib/           # Utilities and helpers
│   │   └── hooks/         # Custom React hooks
├── server/                # Express backend
│   ├── routes.ts         # API endpoints
│   ├── storage.ts        # Database interface
│   └── dev-data.json     # Development seed data
├── shared/               # Shared TypeScript schemas
│   └── schema.ts         # Zod validation schemas
└── docs/                 # Documentation assets
```

## 🤝 Contributing

This project welcomes contributions! Key areas for improvement:

- **Hardware Support** - Add device profiles for more keyboards/macro pads
- **Rule Templates** - Create pre-built rule sets for common workflows
- **Validation Rules** - Enhance conflict detection and validation
- **Export Formats** - Support additional configuration formats
- **Performance** - Optimize for larger configuration files

## 📝 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **Karabiner-Elements** - The incredible tool that makes keyboard customization possible
- **Replit** - For providing an excellent development and deployment platform
- **The Community** - For feedback, testing, and feature requests

---

**Built with modern web technologies on Replit** 🚀

*Making keyboard customization accessible to everyone, one rule at a time.*