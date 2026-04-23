# 🎨 Handoff Studio

> The ultimate Figma companion that bridges the gap between design and development by instantly generating production-ready code.

## ✨ Key Features

- **Deep Element Inspection:** Instantly inspect any Figma node to extract precise design properties, layout rules, and spacing.
- **Multi-Platform Code Generation:** Seamlessly generate clean, semantic code tailored for your stack:
  - **CSS & Tailwind CSS**
  - **React**
  - **SwiftUI**
  - **Flutter**
- **Design Token Extraction:** Automatically pull and format colors, typography, and variants into usable platform-specific tokens.
- **Contextual Insights:** Get automated, severity-based feedback (Critical, Warning, Info) on design structures to prevent implementation bottlenecks like deep nesting or missing styles.
- **Anonymous User Tracking:** Includes secure, anonymous usage tracking via Firebase to help continuously improve the plugin experience.

## 🛠 Built With

- **Figma Plugin API (Manifest v3):** Native integration for optimal performance.
- **React & Tailwind CSS:** Powering a sleek, responsive, and high-end user interface.
- **Firebase:** Handling seamless anonymous authentication and Firestore telemetry.
- **TypeScript:** Ensuring a robust, strongly typed architecture for the code generation engine.

## 🛡 Clean Code Philosophy

Handoff Studio is engineered with a custom **Semantic AST (Abstract Syntax Tree) Parser** designed to eliminate "Div Soup". Rather than blindly translating every Figma layer into a literal DOM element, our engine intelligently flattens nested structures and redundant wrappers. 

We prioritize generating professional, maintainable component patterns:
- **React / Web:** Produces semantic HTML and structure compatible with modern UI libraries like **shadcn/ui**.
- **SwiftUI:** Uses native, idiomatic `VStack`, `HStack`, and `ZStack` layouts.
- **Flutter:** Generates clean widget trees without unnecessary nesting.

## 🚀 Getting Started (For Developers)

Follow these steps to run Handoff Studio locally for development:

### Prerequisites

- [Node.js](https://nodejs.org/) installed
- [Figma Desktop App](https://www.figma.com/downloads/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Emlex007/handoff-studio.git
   cd "handoff-studio"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the plugin:**
   ```bash
   npm run build
   ```

### Loading the Plugin in Figma

1. Open the Figma Desktop App.
2. Go to **Plugins** > **Manage Plugins** > **Development** > **Import plugin from manifest...**
3. Select the `manifest.json` file located in the root of this project.
4. Open any Figma file, right-click on the canvas, navigate to **Plugins** > **Development**, and select **Handoff Studio** to run it.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to explore the codebase and propose enhancements.

## 📝 License

This project is licensed under the MIT License.
