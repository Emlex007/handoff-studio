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

## 🚀 Getting Started

Handoff Studio is pre-compiled and ready to use out-of-the-box. You do not need to install Node.js or run any build commands!

### Installation

1. **Download the repository:**
   Clone the repository or download the ZIP file and extract it.
   ```bash
   git clone https://github.com/Emlex007/handoff-studio.git
   ```

2. **Load into Figma:**
   - Open the Figma Desktop App.
   - Go to **Plugins** > **Manage Plugins** > **Development** > **Import plugin from manifest...**
   - Select the `manifest.json` file located in the root folder of the downloaded project.

3. **Run the Plugin:**
   - Open any Figma file.
   - Right-click on the canvas, navigate to **Plugins** > **Development**, and select **Handoff Studio** to run it.

### For Contributors (Optional)

If you wish to modify the source code, you will need to install dependencies and rebuild the plugin:
```bash
npm install
npm run build
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to explore the codebase and propose enhancements.

## 📝 License

This project is licensed under the MIT License.
